import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DatabaseService } from "../../db/database.service";
import { buildPaginationMeta } from "../../common/utils/pagination";
import { getAvailableLangs, normalizeLang, selectTranslation, Lang } from "../../common/utils/lang";
import { AuditService } from "../audit/audit.service";

type SectionTranslation = { lang: Lang; title: string };

@Injectable()
export class SectionsService {
  constructor(
    private readonly dbService: DatabaseService,
    private readonly config: ConfigService,
    private readonly auditService: AuditService
  ) {}

  async list(params: { page: number; pageSize: number; q?: string }, preferredLang: string | null) {
    const { page, pageSize, q } = params;
    const baseQuery = this.dbService.db("sections")
      .leftJoin(
        "sections_translations",
        "sections.id",
        "sections_translations.section_id"
      )
      .select(
        "sections.id",
        "sections.created_at",
        "sections.updated_at",
        "sections_translations.lang",
        "sections_translations.title"
      )
      .orderBy("sections.id", "desc");

    if (q) {
      baseQuery.whereILike("sections_translations.title", `%${q}%`);
    }

    const countResult = await baseQuery
      .clone()
      .clearSelect()
      .clearOrder()
      .countDistinct<{ count: string }>("sections.id as count")
      .first();

    const rows = await baseQuery.offset((page - 1) * pageSize).limit(pageSize);

    type SectionRow = {
      id: number;
      created_at: string;
      updated_at: string;
      translations: SectionTranslation[];
    };

    const grouped = new Map<number, SectionRow>();
    rows.forEach((row: any) => {
      if (!grouped.has(row.id)) {
        grouped.set(row.id, {
          id: row.id,
          created_at: row.created_at,
          updated_at: row.updated_at,
          translations: []
        });
      }
      const current = grouped.get(row.id);
      if (row.lang && current) {
        current.translations.push({ lang: row.lang, title: row.title });
      }
    });

    const defaultLang = normalizeLang(this.config.get<string>("DEFAULT_DATA_LANG", "ru")) || "ru";
    const lang = normalizeLang(preferredLang) || null;

    const data = Array.from(grouped.values()).map((item) => {
      const picked = selectTranslation<SectionTranslation>(item.translations, lang, defaultLang);
      return {
        id: item.id,
        title: picked?.title || null,
        availableLangs: getAvailableLangs(item.translations)
      };
    });

    return {
      data,
      meta: buildPaginationMeta(page, pageSize, Number(countResult?.count || 0))
    };
  }

  async getOne(id: number, preferredLang: string | null) {
    const rows = await this.dbService.db("sections")
      .leftJoin(
        "sections_translations",
        "sections.id",
        "sections_translations.section_id"
      )
      .select(
        "sections.id",
        "sections_translations.lang",
        "sections_translations.title"
      )
      .where("sections.id", id);

    if (!rows.length) throw new NotFoundException();

    const translations: SectionTranslation[] = rows
      .filter((row) => row.lang)
      .map((row) => ({ lang: row.lang as Lang, title: row.title }));

    const defaultLang = normalizeLang(this.config.get<string>("DEFAULT_DATA_LANG", "ru")) || "ru";
    const lang = normalizeLang(preferredLang) || null;
    const picked = selectTranslation<SectionTranslation>(translations, lang, defaultLang);

    return {
      id,
      title: picked?.title || null,
      availableLangs: getAvailableLangs(translations),
      translations
    };
  }

  async create(dto: { translations: { lang: string; title: string }[] }, actorId: number) {
    const langs = new Set(dto.translations.map((t) => t.lang));
    if (langs.size === 0) throw new BadRequestException("Translations required");

    const [id] = await this.dbService.db.transaction(async (trx) => {
      const [sectionId] = await trx("sections")
        .insert({ created_at: trx.fn.now(), updated_at: trx.fn.now() })
        .returning("id");

      const rows = dto.translations.map((t) => ({
        section_id: sectionId.id || sectionId,
        lang: t.lang,
        title: t.title
      }));
      await trx("sections_translations").insert(rows);

      return [sectionId.id || sectionId];
    });

    await this.auditService.log({
      actorUserId: actorId,
      action: "SECTION_CREATED",
      entityType: "SECTION",
      entityId: id
    });

    return { id };
  }

  async update(id: number, dto: { translations?: { lang: string; title: string }[] }, actorId: number) {
    const exists = await this.dbService.db("sections").where({ id }).first();
    if (!exists) throw new NotFoundException();

    const translations = dto.translations || [];
    if (translations.length > 0) {
      await this.dbService.db.transaction(async (trx) => {
        await trx("sections_translations").where({ section_id: id }).delete();
        const rows = translations.map((t) => ({
          section_id: id,
          lang: t.lang,
          title: t.title
        }));
        await trx("sections_translations").insert(rows);
        await trx("sections").update({ updated_at: trx.fn.now() }).where({ id });
      });
    }

    await this.auditService.log({
      actorUserId: actorId,
      action: "SECTION_UPDATED",
      entityType: "SECTION",
      entityId: id
    });

    return { success: true };
  }

  async remove(id: number, actorId: number) {
    await this.dbService.db("sections").where({ id }).delete();
    await this.dbService.db("sections_translations").where({ section_id: id }).delete();

    await this.auditService.log({
      actorUserId: actorId,
      action: "SECTION_DELETED",
      entityType: "SECTION",
      entityId: id
    });

    return { success: true };
  }
}
