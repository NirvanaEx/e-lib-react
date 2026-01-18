import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../../db/database.service";
import { getRequestContextValue } from "../../common/request-context";

export interface AuditLogInput {
  actorUserId: number;
  action: string;
  entityType: string;
  entityId: number;
  diff?: any;
  meta?: any;
  ip?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  constructor(private readonly dbService: DatabaseService) {}

  async log(input: AuditLogInput) {
    const ip = input.ip || getRequestContextValue<string>("ip") || null;
    const userAgent = input.userAgent || getRequestContextValue<string>("userAgent") || null;

    await this.dbService.db("audit_logs").insert({
      actor_user_id: input.actorUserId,
      action: input.action,
      entity_type: input.entityType,
      entity_id: input.entityId,
      diff: input.diff || null,
      meta: input.meta || null,
      ip,
      user_agent: userAgent,
      created_at: this.dbService.db.fn.now()
    });
  }

  async list(params: {
    page: number;
    pageSize: number;
    actorId?: number;
    action?: string;
    entityType?: string;
    from?: string;
    to?: string;
  }) {
    const { page, pageSize, actorId, action, entityType, from, to } = params;
    const query = this.dbService.db("audit_logs")
      .leftJoin("users", "users.id", "audit_logs.actor_user_id")
      .select(
        "audit_logs.id",
        "audit_logs.actor_user_id",
        "users.login as actor_login",
        "users.surname as actor_surname",
        "users.name as actor_name",
        "users.patronymic as actor_patronymic",
        "audit_logs.action",
        "audit_logs.entity_type",
        "audit_logs.entity_id",
        "audit_logs.diff",
        "audit_logs.meta",
        "audit_logs.ip",
        "audit_logs.user_agent",
        "audit_logs.created_at"
      )
      .orderBy("audit_logs.created_at", "desc");

    if (actorId) query.where("audit_logs.actor_user_id", actorId);
    if (action) query.where("audit_logs.action", action);
    if (entityType) query.where("audit_logs.entity_type", entityType);
    if (from) query.where("audit_logs.created_at", ">=", from);
    if (to) query.where("audit_logs.created_at", "<=", to);

    const countResult = await query
      .clone()
      .clearSelect()
      .clearOrder()
      .count<{ count: string }>("audit_logs.id as count")
      .first();
    const data = await query.offset((page - 1) * pageSize).limit(pageSize);

    return {
      data,
      meta: { page, pageSize, total: Number(countResult?.count || 0) }
    };
  }
}
