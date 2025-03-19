const path = require('path');
const nodeExternals = require('webpack-node-externals');

module.exports = function (options, webpack) {
  return {
    ...options,
    entry: {
      main: './apps/ollama/src/main.ts',
    },
    externals: [
      nodeExternals(),
      'sharp',
      'onnxruntime-node',
    ],
    module: {
      rules: [
        {
          test: /\.ts$/,
          exclude: /node_modules/,
          loader: 'ts-loader',
          options: {
            transpileOnly: true,
          },
        },
        {
          test: /\.(node|wasm)$/,
          use: 'ignore-loader',
        },
      ],
    },
    output: {
      filename: 'main.js',
      path: path.join(__dirname, 'dist/apps/ollama'),
    },
    resolve: {
      extensions: ['.js', '.ts', '.json'],
      alias: {
        '@app': path.resolve(__dirname, 'apps/ollama/src'),
      },
    },
    target: 'node',
  };
}; 