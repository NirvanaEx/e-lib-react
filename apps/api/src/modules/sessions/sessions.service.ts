import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../../db/database.service";
import { buildPaginationMeta } from "../../common/utils/pagination";

@Injectable()
export class SessionsService {
  constructor(private readonly dbService: DatabaseService) {}

  async logSession(userId: number, ip: string, userAgent: string) {
    await this.dbService.db("sessions").insert({
      user_id: userId,
      ip,
      user_agent: userAgent,
      created_at: this.dbService.db.fn.now()
    });
  }

  async list(params: { page: number; pageSize: number; userId?: number; from?: string; to?: string }) {
    const { page, pageSize, userId, from, to } = params;
    const query = this.dbService.db("sessions")
      .leftJoin("users", "users.id", "sessions.user_id")
      .select(
        "sessions.id",
        "sessions.user_id",
        "sessions.ip",
        "sessions.user_agent",
        "sessions.created_at",
        "users.login"
      )
      .orderBy("sessions.created_at", "desc");

    if (userId) {
      query.where("sessions.user_id", userId);
    }
    if (from) {
      query.where("sessions.created_at", ">=", from);
    }
    if (to) {
      query.where("sessions.created_at", "<=", to);
    }

    const countResult = await query
      .clone()
      .clearSelect()
      .clearOrder()
      .count<{ count: string }>("sessions.id as count")
      .first();
    const data = await query.offset((page - 1) * pageSize).limit(pageSize);

    return {
      data,
      meta: buildPaginationMeta(page, pageSize, Number(countResult?.count || 0))
    };
  }
}
