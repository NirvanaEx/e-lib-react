import path from "path";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { JwtAuthGuard } from "./common/guards/jwt-auth.guard";
import { RolesGuard } from "./common/guards/roles.guard";
import { AccessGuard } from "./common/guards/access.guard";
import { TempPasswordGuard } from "./common/guards/temp-password.guard";
import { DatabaseModule } from "./db/database.module";
import { AuthModule } from "./modules/auth/auth.module";
import { UsersModule } from "./modules/users/users.module";
import { RolesModule } from "./modules/roles/roles.module";
import { DepartmentsModule } from "./modules/departments/departments.module";
import { SectionsModule } from "./modules/sections/sections.module";
import { CategoriesModule } from "./modules/categories/categories.module";
import { FilesModule } from "./modules/files/files.module";
import { DownloadsModule } from "./modules/downloads/downloads.module";
import { SessionsModule } from "./modules/sessions/sessions.module";
import { StatsModule } from "./modules/stats/stats.module";
import { AuditModule } from "./modules/audit/audit.module";
import { HealthModule } from "./modules/health/health.module";
import { ContentPagesModule } from "./modules/content-pages/content-pages.module";
import { ScheduleModule } from "@nestjs/schedule";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { LoggerModule } from "nestjs-pino";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        path.resolve(__dirname, "../../..", ".env"),
        path.resolve(process.cwd(), ".env")
      ]
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        transport: process.env.NODE_ENV !== "production" ? { target: "pino-pretty" } : undefined
      }
    }),
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60, limit: 30 }]
    }),
    ScheduleModule.forRoot(),
    DatabaseModule,
    AuthModule,
    UsersModule,
    RolesModule,
    DepartmentsModule,
    SectionsModule,
    CategoriesModule,
    FilesModule,
    DownloadsModule,
    SessionsModule,
    StatsModule,
    AuditModule,
    ContentPagesModule,
    HealthModule
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: TempPasswordGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: AccessGuard }
  ]
})
export class AppModule {}
