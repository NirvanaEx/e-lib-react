import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { ConfigService } from "@nestjs/config";
import { Logger } from "nestjs-pino";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { requestContextMiddleware } from "./common/request-context";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });
  const configService = app.get(ConfigService);
  const isProd = configService.get<string>("NODE_ENV") === "production";
  app.useLogger(app.get(Logger));
  // Client IPs drive the login lockout, the throttler and the audit trail.
  // Only honour X-Forwarded-For when a proxy is actually in front of us —
  // otherwise the header is attacker-controlled and defeats all three.
  // Value: "false" (default), "true", a hop count, or an express trust-proxy
  // expression such as "loopback, 10.0.0.0/8".
  const trustProxy = (configService.get<string>("TRUST_PROXY", "") || "").trim();
  if (trustProxy && trustProxy !== "false") {
    const hops = Number(trustProxy);
    app.set("trust proxy", trustProxy === "true" ? 1 : Number.isFinite(hops) ? hops : trustProxy);
  }
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
  // Content-Disposition нужен клиенту, чтобы взять имя скачиваемого файла.
  // В проде фронт и API за одним nginx и CORS не работает, а в dev без
  // exposedHeaders браузер прячет заголовок и файл сохраняется под кодовым именем.
  app.enableCors({
    origin: corsOrigin,
    credentials: true,
    exposedHeaders: ["Content-Disposition"]
  });
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
