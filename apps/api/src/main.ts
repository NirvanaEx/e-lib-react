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
  const configService = app.get(ConfigService);
  const isProd = configService.get<string>("NODE_ENV") === "production";
  app.useLogger(app.get(Logger));
  app.use(requestContextMiddleware);
  app.use(helmet());
  const corsOrigins = (configService.get<string>("CORS_ORIGINS", "") || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  const corsOrigin =
    corsOrigins.length > 0
      ? (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
          if (!origin) return callback(null, true);
          if (corsOrigins.includes(origin)) return callback(null, true);
          return callback(new Error("Not allowed by CORS"));
        }
      : isProd
        ? false
        : true;
  app.enableCors({ origin: corsOrigin, credentials: true });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true }
    })
  );
  app.setGlobalPrefix("api");

  const swaggerEnabled =
    configService.get<string>("SWAGGER_ENABLED") === "true" || !isProd;
  if (swaggerEnabled) {
    const config = new DocumentBuilder()
      .setTitle("e-lib API")
      .setVersion("1.0")
      .addBearerAuth()
      .build();
    const doc = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup("/api/docs", app, doc);
  }
  const port = configService.get<number>("APP_PORT", 3001);
  const host = configService.get<string>("APP_HOST", "0.0.0.0");

  await app.listen(port, host);
}

bootstrap();
