import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DatabaseService } from "../../db/database.service";
import { getAvailableLangs, normalizeLang, selectTranslation, Lang } from "../../common/utils/lang";

type ContentTranslation = { lang: Lang; title: string; body: string };

const DISPLAY_MODES = ["once", "every_login"] as const;

@Injectable()
export class ContentPagesService {
  constructor(
    private readonly dbService: DatabaseService,
    private readonly config: ConfigService
  ) {}

  private mapTranslations(rows: any[]): ContentTranslation[] {
    return rows
      .filter((row) => row.lang)
      .map((row) => ({
        lang: row.lang as Lang,
        title: row.title,
        body: row.body
      }));
  }

  async getAdminPage(key: string) {
    const rows = await this.dbService
      .db("content_pages")
      .leftJoin(
        "content_page_translations",
        "content_pages.id",
        "content_page_translations.page_id"
      )
      .select(
        "content_pages.id",
        "content_pages.key",
        "content_pages.display_mode",
        "content_pages.requires_acceptance",
        "content_pages.is_active",
        "content_pages.created_at",
        "content_pages.updated_at",
        "content_page_translations.lang",
        "content_page_translations.title",
        "content_page_translations.body"
      )
      .where("content_pages.key", key);

    if (!rows.length) throw new NotFoundException();

    const base = rows[0];
    const translations = this.mapTranslations(rows);

    return {
      key: base.key,
      displayMode: base.display_mode,
      requiresAcceptance: Boolean(base.requires_acceptance),
      isActive: Boolean(base.is_active),
      availableLangs: getAvailableLangs(translations),
      translations,
      createdAt: base.created_at,
      updatedAt: base.updated_at
    };
  }

  async updatePage(
    key: string,
    dto: {
      translations: { lang: string; title: string; body: string }[];
      displayMode: string;
      isActive?: boolean;
      requiresAcceptance?: boolean;
    }
  ) {
    if (!DISPLAY_MODES.includes(dto.displayMode as any)) {
      throw new BadRequestException("Unsupported display mode");
    }
    if (!dto.translations || dto.translations.length === 0) {
      throw new BadRequestException("Translations required");
    }

    await this.dbService.db.transaction(async (trx) => {
      const existing = await trx("content_pages").where({ key }).first();
      let pageId = existing?.id;

      if (existing) {
        await trx("content_pages")
          .where({ id: existing.id })
          .update({
            display_mode: dto.displayMode,
            requires_acceptance:
              dto.requiresAcceptance !== undefined
                ? dto.requiresAcceptance
                : existing.requires_acceptance,
            is_active: dto.isActive !== undefined ? dto.isActive : existing.is_active,
            updated_at: trx.fn.now()
          });
      } else {
        const [row] = await trx("content_pages")
          .insert({
            key,
            display_mode: dto.displayMode,
            requires_acceptance: dto.requiresAcceptance ?? true,
            is_active: dto.isActive ?? true,
            created_at: trx.fn.now(),
            updated_at: trx.fn.now()
          })
          .returning("id");
        pageId = row?.id || row;
      }

      if (!pageId) {
        throw new BadRequestException("Content page not found");
      }

      await trx("content_page_translations").where({ page_id: pageId }).delete();
      await trx("content_page_translations").insert(
        dto.translations.map((translation) => ({
          page_id: pageId,
          lang: translation.lang,
          title: translation.title,
          body: translation.body
        }))
      );
    });

    return { success: true };
  }

  async getUserPage(key: string, userId: number, preferredLang: string | null) {
    const rows = await this.dbService
      .db("content_pages")
      .leftJoin(
        "content_page_translations",
        "content_pages.id",
        "content_page_translations.page_id"
      )
      .select(
        "content_pages.id",
        "content_pages.key",
        "content_pages.display_mode",
        "content_pages.requires_acceptance",
        "content_pages.is_active",
        "content_pages.created_at",
        "content_pages.updated_at",
        "content_page_translations.lang",
        "content_page_translations.title",
        "content_page_translations.body"
      )
      .where("content_pages.key", key);

    if (!rows.length) return null;

    const base = rows[0];
    if (!base.is_active) return null;

    const translations = this.mapTranslations(rows);
    const defaultLang = normalizeLang(this.config.get<string>("DEFAULT_DATA_LANG", "ru")) || "ru";
    const lang = normalizeLang(preferredLang) || null;
    const picked = selectTranslation<ContentTranslation>(translations, lang, defaultLang);

    const acceptance = await this.dbService
      .db("content_page_acceptances")
      .where({ page_id: base.id, user_id: userId })
      .first();

    const acceptedAt = acceptance?.accepted_at ? new Date(acceptance.accepted_at) : null;
    const updatedAt = base.updated_at ? new Date(base.updated_at) : null;

    let shouldShow = false;
    if (base.display_mode === "every_login") {
      shouldShow = true;
    } else if (!acceptedAt) {
      shouldShow = true;
    } else if (updatedAt && acceptedAt < updatedAt) {
      shouldShow = true;
    }

    return {
      key: base.key,
      title: picked?.title || null,
      body: picked?.body || null,
      displayMode: base.display_mode,
      requiresAcceptance: Boolean(base.requires_acceptance),
      isActive: Boolean(base.is_active),
      availableLangs: getAvailableLangs(translations),
      shouldShow,
      updatedAt: base.updated_at
    };
  }

  async acceptPage(key: string, userId: number) {
    const page = await this.dbService.db("content_pages").where({ key }).first();
    if (!page || !page.is_active) throw new NotFoundException();

    const existing = await this.dbService
      .db("content_page_acceptances")
      .where({ page_id: page.id, user_id: userId })
      .first();

    if (existing) {
      await this.dbService
        .db("content_page_acceptances")
        .where({ page_id: page.id, user_id: userId })
        .update({ accepted_at: this.dbService.db.fn.now() });
    } else {
      await this.dbService
        .db("content_page_acceptances")
        .insert({ page_id: page.id, user_id: userId, accepted_at: this.dbService.db.fn.now() });
    }

    return { success: true };
  }
}
