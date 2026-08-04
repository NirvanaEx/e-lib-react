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
import { PositionsModule } from "./modules/positions/positions.module";
import { SectionsModule } from "./modules/sections/sections.module";
import { CategoriesModule } from "./modules/categories/categories.module";
import { FilesModule } from "./modules/files/files.module";
import { DownloadsModule } from "./modules/downloads/downloads.module";
import { SessionsModule } from "./modules/sessions/sessions.module";
import { StatsModule } from "./modules/stats/stats.module";
import { AuditModule } from "./modules/audit/audit.module";
import { HealthModule } from "./modules/health/health.module";
import { ContentPagesModule } from "./modules/content-pages/content-pages.module";
import { GuidesModule } from "./modules/guides/guides.module";
import { AppSettingsModule } from "./modules/app-settings/app-settings.module";
import { SeedModule } from "./modules/seed/seed.module";
import { ScheduleModule } from "@nestjs/schedule";
import { ThrottlerModule, ThrottlerGuard, seconds } from "@nestjs/throttler";
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
    // @nestjs/throttler v5 counts `ttl` in MILLISECONDS. The previous
    // `{ ttl: 60 }` meant a 60 ms window, which let brute-force traffic
    // through unthrottled. The global bucket is generous because the SPA
    // fires many parallel queries per screen (and offices share one NAT IP);
    // login has its own strict bucket in AuthController.
    ThrottlerModule.forRoot({
      throttlers: [{ name: "default", ttl: seconds(60), limit: 300 }]
    }),
    ScheduleModule.forRoot(),
    DatabaseModule,
    AuthModule,
    UsersModule,
    RolesModule,
    DepartmentsModule,
    PositionsModule,
    SectionsModule,
    CategoriesModule,
    FilesModule,
    DownloadsModule,
    SessionsModule,
    StatsModule,
    AuditModule,
    ContentPagesModule,
    GuidesModule,
    AppSettingsModule,
    SeedModule,
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
