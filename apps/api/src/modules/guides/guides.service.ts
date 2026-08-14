import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import fs from "fs/promises";
import path from "path";
import { DatabaseService } from "../../db/database.service";
import { Lang, LANGS, normalizeLang, selectTranslation } from "../../common/utils/lang";
import { BUILTIN_GUIDES, GUIDE_KEYS, GUIDE_TITLES, GuideKey } from "./guide-content";
import { buildGuideDocx, DocxBlock } from "./guide-docx";
import { getImageSize } from "./guide-image-size";

type BlockTranslation = { lang: Lang; title: string; body: string };

export type GuideBlockInput = {
  image?: string | null;
  translations: { lang: string; title: string; body: string }[];
};

const IMAGE_CONTENT_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp"
};

@Injectable()
export class GuidesService {
  constructor(
    private readonly dbService: DatabaseService,
    private readonly config: ConfigService
  ) {}

  private get db() {
    return this.dbService.db;
  }

  private assertKey(key: string): GuideKey {
    if (!GUIDE_KEYS.includes(key as GuideKey)) throw new NotFoundException();
    return key as GuideKey;
  }

  private get defaultLang(): Lang {
    return normalizeLang(this.config.get<string>("DEFAULT_DATA_LANG")) || "ru";
  }

  // Картинки из поставки лежат рядом с кодом, загруженные — в UPLOAD_DIR/guides.
  private builtinDir() {
    return path.resolve(process.cwd(), "assets", "guides");
  }

  private uploadsDir() {
    const dir = this.config.get<string>("UPLOAD_DIR", "uploads");
    const uploadDir = path.isAbsolute(dir) ? dir : path.resolve(process.cwd(), dir);
    return path.join(uploadDir, "guides");
  }

  async resolveImagePath(image: string) {
    const [scope, ...rest] = String(image).split("/");
    const fileName = path.basename(rest.join("/"));
    if (!fileName) throw new NotFoundException();
    const contentType = IMAGE_CONTENT_TYPES[path.extname(fileName).toLowerCase()];
    if (!contentType) throw new NotFoundException();
    const dir = scope === "builtin" ? this.builtinDir() : scope === "uploads" ? this.uploadsDir() : null;
    if (!dir) throw new NotFoundException();
    const filePath = path.join(dir, fileName);
    try {
      await fs.access(filePath);
    } catch {
      throw new NotFoundException();
    }
    return { filePath, contentType };
  }

  private async imageSize(image: string) {
    try {
      const { filePath } = await this.resolveImagePath(image);
      return await getImageSize(filePath);
    } catch {
      return null;
    }
  }

  async saveImage(file: Express.Multer.File) {
    // Multer определяет каталог до загрузки .env, поэтому переносим файл в тот
    // каталог, который знает ConfigService (тот же приём, что у брендинга).
    const dir = this.uploadsDir();
    await fs.mkdir(dir, { recursive: true });
    const targetPath = path.join(dir, file.filename);
    if (path.resolve(file.path) !== path.resolve(targetPath)) {
      await fs.rename(file.path, targetPath);
    }
    return { image: `uploads/${file.filename}` };
  }

  private async getGuideRow(key: GuideKey) {
    return this.db("guides").where({ key }).first();
  }

  // Инструкция из поставки разворачивается при первом обращении. После правок
  // администратора повторно не наливается — только по кнопке «сбросить».
  private async ensureSeeded(key: GuideKey) {
    const existing = await this.getGuideRow(key);
    if (existing) return existing;
    await this.writeBlocks(key, BUILTIN_GUIDES[key].blocks);
    return this.getGuideRow(key);
  }

  private async writeBlocks(key: GuideKey, blocks: GuideBlockInput[]) {
    await this.db.transaction(async (trx) => {
      let guide = await trx("guides").where({ key }).first();
      if (!guide) {
        const [row] = await trx("guides")
          .insert({ key, is_active: true, created_at: trx.fn.now(), updated_at: trx.fn.now() })
          .returning("id");
        guide = { id: row?.id ?? row };
      } else {
        await trx("guides").where({ id: guide.id }).update({ updated_at: trx.fn.now() });
        await trx("guide_blocks").where({ guide_id: guide.id }).delete();
      }

      let order = 0;
      for (const block of blocks) {
        const [inserted] = await trx("guide_blocks")
          .insert({
            guide_id: guide.id,
            sort_order: order,
            image: block.image || null,
            created_at: trx.fn.now(),
            updated_at: trx.fn.now()
          })
          .returning("id");
        const blockId = inserted?.id ?? inserted;
        const translations = (block.translations || [])
          .filter((item) => normalizeLang(item.lang))
          .filter((item) => (item.title || "").trim() || (item.body || "").trim())
          .map((item) => ({
            block_id: blockId,
            lang: normalizeLang(item.lang),
            title: (item.title || "").trim(),
            body: item.body || ""
          }));
        if (translations.length) await trx("guide_block_translations").insert(translations);
        order += 1;
      }
    });
  }

  private async loadBlocks(key: GuideKey) {
    const guide = await this.getGuideRow(key);
    if (!guide) return { guide: null, blocks: [] as any[] };
    const rows = await this.db("guide_blocks")
      .leftJoin("guide_block_translations", "guide_blocks.id", "guide_block_translations.block_id")
      .where("guide_blocks.guide_id", guide.id)
      .orderBy([{ column: "guide_blocks.sort_order" }, { column: "guide_blocks.id" }])
      .select(
        "guide_blocks.id",
        "guide_blocks.sort_order",
        "guide_blocks.image",
        "guide_block_translations.lang",
        "guide_block_translations.title",
        "guide_block_translations.body"
      );

    const byId = new Map<number, { id: number; sortOrder: number; image: string | null; translations: BlockTranslation[] }>();
    rows.forEach((row: any) => {
      const id = Number(row.id);
      if (!byId.has(id)) {
        byId.set(id, { id, sortOrder: Number(row.sort_order), image: row.image, translations: [] });
      }
      if (row.lang) {
        byId.get(id)!.translations.push({ lang: row.lang as Lang, title: row.title, body: row.body });
      }
    });

    return { guide, blocks: [...byId.values()] };
  }

  // Состояние инструкций для меню: показывать пункт или нет.
  async listStatuses() {
    const statuses = {} as Record<GuideKey, boolean>;
    for (const key of GUIDE_KEYS) {
      const row = await this.ensureSeeded(key);
      statuses[key] = Boolean(row?.is_active);
    }
    return statuses;
  }

  // Для читателя: один язык на блок, с откатом на язык по умолчанию.
  // Выключенную инструкцию видит только тот, кто её редактирует, — иначе
  // администратор не смог бы посмотреть, что именно он выключил.
  async getGuide(key: string, lang: string | null, options: { allowInactive?: boolean } = {}) {
    const guideKey = this.assertKey(key);
    await this.ensureSeeded(guideKey);
    const preferred = normalizeLang(lang);
    const { guide, blocks } = await this.loadBlocks(guideKey);
    if (!guide?.is_active && !options.allowInactive) {
      throw new NotFoundException("Guide is disabled");
    }
    return {
      key: guideKey,
      isActive: Boolean(guide?.is_active),
      updatedAt: guide?.updated_at || null,
      blocks: await Promise.all(
        blocks.map(async (block, index) => {
          const translation = selectTranslation<BlockTranslation>(
            block.translations,
            preferred,
            this.defaultLang
          );
          const size = block.image ? await this.imageSize(block.image) : null;
          return {
            id: block.id,
            number: index + 1,
            image: block.image,
            imageWidth: size?.width || null,
            imageHeight: size?.height || null,
            title: translation?.title || "",
            body: translation?.body || ""
          };
        })
      )
    };
  }

  // Для редактора: все языки сразу.
  async getGuideForEdit(key: string) {
    const guideKey = this.assertKey(key);
    await this.ensureSeeded(guideKey);
    const { guide, blocks } = await this.loadBlocks(guideKey);
    return {
      key: guideKey,
      isActive: Boolean(guide?.is_active),
      updatedAt: guide?.updated_at || null,
      langs: LANGS,
      blocks: blocks.map((block) => ({
        id: block.id,
        image: block.image,
        translations: block.translations
      }))
    };
  }

  async updateGuide(key: string, dto: { blocks: GuideBlockInput[]; isActive?: boolean }) {
    const guideKey = this.assertKey(key);
    if (!Array.isArray(dto.blocks) || dto.blocks.length === 0) {
      throw new BadRequestException("Guide must contain at least one block");
    }
    await this.writeBlocks(guideKey, dto.blocks);
    if (dto.isActive !== undefined) {
      await this.db("guides").where({ key: guideKey }).update({ is_active: dto.isActive });
    }
    await this.cleanupUnusedImages();
    return this.getGuideForEdit(guideKey);
  }

  async setActive(key: string, isActive: boolean) {
    const guideKey = this.assertKey(key);
    await this.ensureSeeded(guideKey);
    await this.db("guides")
      .where({ key: guideKey })
      .update({ is_active: isActive, updated_at: this.db.fn.now() });
    return this.getGuideForEdit(guideKey);
  }

  async buildDocx(key: string, lang: string | null, options: { allowInactive?: boolean } = {}) {
    const guide = await this.getGuide(key, lang, options);
    const blocks = [] as DocxBlock[];
    for (const block of guide.blocks) {
      let imagePath: string | null = null;
      if (block.image) {
        try {
          imagePath = (await this.resolveImagePath(block.image)).filePath;
        } catch {
          imagePath = null;
        }
      }
      blocks.push({ number: block.number, title: block.title, body: block.body, imagePath });
    }

    const meta = GUIDE_TITLES[guide.key as GuideKey];
    const updated = guide.updatedAt ? new Date(guide.updatedAt) : new Date();
    const buffer = await buildGuideDocx({
      title: meta.title,
      subtitle: `${meta.subtitle} · обновлено ${updated.toLocaleDateString("ru-RU")}`,
      blocks
    });
    return { buffer, fileName: meta.fileName };
  }

  async resetGuide(key: string) {
    const guideKey = this.assertKey(key);
    await this.writeBlocks(guideKey, BUILTIN_GUIDES[guideKey].blocks);
    await this.cleanupUnusedImages();
    return this.getGuideForEdit(guideKey);
  }

  // Загруженная и тут же выброшенная картинка иначе осталась бы на диске навсегда.
  private async cleanupUnusedImages() {
    const dir = this.uploadsDir();
    let files: string[] = [];
    try {
      files = await fs.readdir(dir);
    } catch {
      return;
    }
    const used = new Set(
      (await this.db("guide_blocks").whereNotNull("image").select("image"))
        .map((row: any) => String(row.image))
        .filter((image) => image.startsWith("uploads/"))
        .map((image) => image.slice("uploads/".length))
    );
    const hourAgo = Date.now() - 60 * 60 * 1000;
    for (const file of files) {
      if (used.has(file)) continue;
      const filePath = path.join(dir, file);
      try {
        const stat = await fs.stat(filePath);
        if (stat.mtimeMs > hourAgo) continue;
        await fs.unlink(filePath);
      } catch {
        // файл уже исчез — ничего страшного
      }
    }
  }
}
