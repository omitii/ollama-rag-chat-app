import { NestFactory } from '@nestjs/core';
import { OllamaModule } from './ollama.module';

async function bootstrap() {
  const app = await NestFactory.create(OllamaModule);
  app.enableCors()
  await app.listen(process.env.port ?? 3001);
}
bootstrap();
