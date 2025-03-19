import React, { useState, useEffect, useRef } from "react";
import "./App.css";

function App() {
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant', content: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [currentMessage, setCurrentMessage] = useState("");
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [useRag, setUseRag] = useState(true);

  // Initialize dark mode from local storage if available
  useEffect(() => {
    const savedMode = localStorage.getItem('darkMode');
    if (savedMode === 'true') {
      setDarkMode(true);
      document.documentElement.classList.add('dark-theme');
    }
  }, []);

  // Toggle dark mode
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    if (!darkMode) {
      document.documentElement.classList.add('dark-theme');
      localStorage.setItem('darkMode', 'true');
    } else {
      document.documentElement.classList.remove('dark-theme');
      localStorage.setItem('darkMode', 'false');
    }
  };

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, currentMessage]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [prompt]);

  // Function to convert URLs to clickable links
  const linkifyText = (text: string) => {
    // Regular expression to match URLs
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    
    if (!text) return "";
    
    // Split the text by URLs and create an array of elements
    const parts = text.split(urlRegex);
    const matches = text.match(urlRegex) || [];
    
    // Create a result array with text and link elements
    const result: React.ReactNode[] = [];
    
    parts.forEach((part, index) => {
      // Add the regular text
      if (part) {
        result.push(<span key={`text-${index}`}>{part}</span>);
      }
      
      // Add the link if there's a match for this position
      if (matches[index]) {
        result.push(
          <a 
            key={`link-${index}`} 
            href={matches[index]} 
            target="_blank" 
            rel="noopener noreferrer"
            className="message-link"
          >
            {matches[index]}
          </a>
        );
      }
    });
    
    return result;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setCurrentMessage("");
    setPrompt("");
    setSidebarExpanded(false);
  };

  const toggleSidebar = () => {
    setSidebarExpanded(!sidebarExpanded);
  };

  const handleReadLinkRequest = async (url: string, question: string) => {
    setLoading(true);
    setCurrentMessage("Reading the link and preparing an answer...");
    
    try {
      const response = await fetch("http://localhost:3001/ollama/read-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          question
        }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to process the link");
      }
      
      const data = await response.json();
      const assistantMessage = { role: 'assistant' as const, content: data.response };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Error processing link:", error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `Error: I couldn't process the link. ${error instanceof Error ? error.message : ''}` 
      }]);
    } finally {
      setCurrentMessage("");
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    
    const userMessage = { role: 'user' as const, content: prompt };
    setMessages(prev => [...prev, userMessage]);
    setCurrentMessage("");
    setLoading(true);
    
    // Clear prompt after sending
    const currentPrompt = prompt;
    setPrompt("");
    
    // Check if this is a request to read a link
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = currentPrompt.match(urlRegex);
    
    const isReadLinkRequest = 
      currentPrompt.toLowerCase().includes("read") && 
      (currentPrompt.toLowerCase().includes("link") || currentPrompt.toLowerCase().includes("url")) && 
      urls && urls.length > 0;
      
    if (isReadLinkRequest) {
      // Extract the question part (what to ask about the link)
      let question = "What can you tell me about this?";
      
      // Try to extract a question from the prompt
      const afterLinkText = currentPrompt.split(urls[0])[1];
      if (afterLinkText && afterLinkText.trim().length > 0) {
        question = afterLinkText.trim();
      } else if (currentPrompt.includes("and")) {
        const questionMatch = currentPrompt.match(/read.*link.*and\s+(.*)/i);
        if (questionMatch && questionMatch[1]) {
          question = questionMatch[1].trim();
        }
      }
      
      // Process the link
      await handleReadLinkRequest(urls[0], question);
      return;
    }

    try {
      // Use the RAG endpoint if useRag is true
      const endpoint = useRag
        ? "http://localhost:3001/ollama/rag/generate-stream"
        : "http://localhost:3001/ollama/generate-stream";
        
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt,
          model: "llama3.2:latest",
          stream: true,
          useRag: useRag, // Include the RAG parameter
        }),
      });

      if (!response.body) {
        throw new Error("Streaming not supported in this browser.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let done = false;
      let buffer = "";
      let accumulatedMessage = "";

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          const chunk = decoder.decode(value);
          buffer += chunk;
          const lines = buffer.split("\n");
          buffer = lines.pop() || ""; // keep any incomplete line
          for (const line of lines) {
            if (line.trim() === "") continue;
            try {
              const jsonObj = JSON.parse(line);
              // Accumulate tokens into current message and maintain a copy
              accumulatedMessage += jsonObj.response;
              setCurrentMessage(accumulatedMessage);
            } catch (error) {
              console.error("Error parsing JSON:", line, error);
            }
          }
        }
      }

      // Make sure we capture the final message and add it to conversation
      const assistantMessage = { role: 'assistant' as const, content: accumulatedMessage };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Error during streaming:", error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `Error: ${error instanceof Error ? error.message : 'An error occurred'}` 
      }]);
    } finally {
      // Clear current message and loading state
      setCurrentMessage("");
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      <div className={`sidebar ${sidebarExpanded ? 'expanded' : ''}`}>
        <div className="sidebar-header" onClick={toggleSidebar}>
          <h1>Ollama Chat</h1>
          <div className="menu-icon">☰</div>
        </div>
        <div className="sidebar-content">
          <button className="new-chat-btn" onClick={handleNewChat}>
            <span className="icon">+</span>
            New Chat
          </button>
          <button className="theme-toggle-btn" onClick={toggleDarkMode}>
            <span className="icon">{darkMode ? '☀️' : '🌙'}</span>
            {darkMode ? 'Light Mode' : 'Dark Mode'}
          </button>
          <div className="rag-toggle">
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={useRag}
                onChange={() => setUseRag(!useRag)}
                className="toggle-input"
              />
              <span className="toggle-slider"></span>
              <span className="toggle-text">Use Knowledge Base (RAG)</span>
            </label>
          </div>
          <div className="chat-history">
            {/* Chat history items would go here */}
          </div>
        </div>
      </div>
      
      <div className="main-content">
        <div className="chat-container" ref={chatContainerRef}>
          {messages.length === 0 && !loading && (
            <div className="welcome-message">
              <h2>Welcome to Ollama Chat</h2>
              <p>Start a conversation by typing a message below.</p>
            </div>
          )}
          {messages.map((msg, index) => (
            <div key={index} className={`message-wrapper ${msg.role}`}>
              <div className="message-content">
                <div className="avatar">
                  {msg.role === 'user' ? '👤' : '🤖'}
                </div>
                <div className="message-bubble">
                  {linkifyText(msg.content)}
                </div>
              </div>
            </div>
          ))}
          {loading && currentMessage && (
            <div className="message-wrapper assistant">
              <div className="message-content">
                <div className="avatar">🤖</div>
                <div className="message-bubble">
                  {linkifyText(currentMessage)}
                  <span className="loading-dots">...</span>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="input-container">
          <form onSubmit={handleSubmit} className="input-form">
            <div className="input-wrapper">
              <textarea
                ref={textareaRef}
                className="prompt-input"
                placeholder="Type your message here... (Shift + Enter for new line)"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
              />
              <button type="submit" className="send-button" disabled={loading}>
                {loading ? (
                  <span className="loading-spinner"></span>
                ) : (
                  <span className="send-icon">➤</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default App;
