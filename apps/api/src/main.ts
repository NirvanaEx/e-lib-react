import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { ConfigService } from "@nestjs/config";
import { Logger } from "nestjs-pino";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { requestContextMiddleware } from "./common/request-context";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  app.use(requestContextMiddleware);
  app.use(helmet());
  app.enableCors({ origin: true, credentials: true });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true }
    })
  );
  app.setGlobalPrefix("api");

  const config = new DocumentBuilder()
    .setTitle("e-lib API")
    .setVersion("1.0")
    .addBearerAuth()
    .build();
  const doc = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("/api/docs", app, doc);

  const configService = app.get(ConfigService);
  const port = configService.get<number>("APP_PORT", 3001);
  const host = configService.get<string>("APP_HOST", "0.0.0.0");

  await app.listen(port, host);
}

bootstrap();
