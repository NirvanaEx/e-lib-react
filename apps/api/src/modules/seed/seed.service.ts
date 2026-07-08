import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import path from "path";
import fs from "fs/promises";
import { DatabaseService } from "../../db/database.service";
import { AuditService } from "../audit/audit.service";
import { LANGS, Lang } from "../../common/utils/lang";
import { buildDemoPdf } from "./demo-pdf";
import {
  DEMO_DEPARTMENTS,
  DEMO_DOCUMENTS,
  PRESET_CATEGORIES,
  PRESET_SECTIONS,
  SeedTitles
} from "./seed.data";

type SeedCounters = { created: number; skipped: number };

const LANG_LABELS: Record<Lang, string> = {
  ru: "Russian",
  en: "English",
  uz: "Uzbek"
};

@Injectable()
export class SeedService {
  constructor(
    private readonly dbService: DatabaseService,
    private readonly config: ConfigService,
    private readonly auditService: AuditService
  ) {}

  private get db() {
    return this.dbService.db;
  }

  private getUploadDir() {
    const dir = this.config.get<string>("UPLOAD_DIR", "uploads");
    return path.isAbsolute(dir) ? dir : path.resolve(process.cwd(), dir);
  }

  private async findSectionIdByRuTitle(title: string) {
    const row = await this.db("sections_translations")
      .where({ lang: "ru", title })
      .first();
    return row ? Number(row.section_id) : null;
  }

  private async findCategoryIdByRuTitle(sectionId: number, title: string) {
    const row = await this.db("categories_translations")
      .join("categories", "categories.id", "categories_translations.category_id")
      .where({
        "categories_translations.lang": "ru",
        "categories_translations.title": title,
        "categories.section_id": sectionId
      })
      .select("categories.id")
      .first();
    return row ? Number(row.id) : null;
  }

  private translationRows(titles: SeedTitles, key: string, id: number) {
    return LANGS.map((lang) => ({ [key]: id, lang, title: titles[lang] }));
  }

  async getStatus() {
    const countOf = async (table: string, deletedAware = false) => {
      const query = this.db(table).count<{ count: string }>("id as count");
      if (deletedAware) query.whereNull("deleted_at");
      const row = await query.first();
      return Number(row?.count || 0);
    };

    const presetSections = [] as any[];
    for (const preset of PRESET_SECTIONS) {
      const existingId = await this.findSectionIdByRuTitle(preset.titles.ru);
      presetSections.push({
        key: preset.key,
        icon: preset.icon,
        iconColor: preset.iconColor,
        titles: preset.titles,
        exists: existingId !== null
      });
    }

    return {
      counts: {
        sections: await countOf("sections"),
        categories: await countOf("categories"),
        departments: await countOf("departments"),
        files: await countOf("file_items", true)
      },
      presetSections,
      demo: {
        departments: DEMO_DEPARTMENTS.reduce(
          (acc, dept) => acc + 1 + (dept.children?.length || 0),
          0
        ),
        categories: PRESET_CATEGORIES.length,
        documents: DEMO_DOCUMENTS.length
      }
    };
  }

  async seedSections(actorId: number) {
    const result: SeedCounters = { created: 0, skipped: 0 };
    const idsByKey = new Map<string, number>();

    for (const preset of PRESET_SECTIONS) {
      const existingId = await this.findSectionIdByRuTitle(preset.titles.ru);
      if (existingId) {
        idsByKey.set(preset.key, existingId);
        result.skipped += 1;
        continue;
      }

      const id = await this.db.transaction(async (trx) => {
        const [inserted] = await trx("sections")
          .insert({
            icon: preset.icon,
            icon_color: preset.iconColor,
            created_at: trx.fn.now(),
            updated_at: trx.fn.now()
          })
          .returning("id");
        const sectionId = Number(inserted.id || inserted);
        await trx("sections_translations").insert(
          this.translationRows(preset.titles, "section_id", sectionId)
        );
        return sectionId;
      });

      idsByKey.set(preset.key, id);
      result.created += 1;
    }

    await this.auditService.log({
      actorUserId: actorId,
      action: "SEED_SECTIONS",
      entityType: "SYSTEM",
      entityId: 0,
      meta: result
    });

    return { sections: result, idsByKey };
  }

  private async seedDepartments() {
    const result: SeedCounters = { created: 0, skipped: 0 };
    const idsByName = new Map<string, number>();

    const ensureDepartment = async (
      name: string,
      parentId: number | null,
      depth: number
    ) => {
      const query = this.db("departments").where({ name });
      if (parentId === null) {
        query.whereNull("parent_id");
      } else {
        query.where({ parent_id: parentId });
      }
      const existing = await query.first();
      if (existing) {
        idsByName.set(name, Number(existing.id));
        result.skipped += 1;
        return Number(existing.id);
      }
      const [inserted] = await this.db("departments")
        .insert({
          name,
          parent_id: parentId,
          depth,
          created_at: this.db.fn.now(),
          updated_at: this.db.fn.now()
        })
        .returning("id");
      const id = Number(inserted.id || inserted);
      idsByName.set(name, id);
      result.created += 1;
      return id;
    };

    for (const dept of DEMO_DEPARTMENTS) {
      const rootId = await ensureDepartment(dept.name, null, 1);
      for (const childName of dept.children || []) {
        await ensureDepartment(childName, rootId, 2);
      }
    }

    return { departments: result, idsByName };
  }

  private async seedCategories(sectionIdsByKey: Map<string, number>) {
    const result: SeedCounters = { created: 0, skipped: 0 };
    const idsByKey = new Map<string, number>();

    for (const preset of PRESET_CATEGORIES) {
      const sectionId = sectionIdsByKey.get(preset.sectionKey);
      if (!sectionId) {
        result.skipped += 1;
        continue;
      }
      const existingId = await this.findCategoryIdByRuTitle(sectionId, preset.titles.ru);
      if (existingId) {
        idsByKey.set(preset.key, existingId);
        result.skipped += 1;
        continue;
      }

      const id = await this.db.transaction(async (trx) => {
        const [inserted] = await trx("categories")
          .insert({
            section_id: sectionId,
            parent_id: null,
            depth: 1,
            icon: preset.icon,
            icon_color: preset.iconColor,
            created_at: trx.fn.now(),
            updated_at: trx.fn.now()
          })
          .returning("id");
        const categoryId = Number(inserted.id || inserted);
        await trx("categories_translations").insert(
          this.translationRows(preset.titles, "category_id", categoryId)
        );
        return categoryId;
      });

      idsByKey.set(preset.key, id);
      result.created += 1;
    }

    return { categories: result, idsByKey };
  }

  private async writeDemoAsset(docKey: string, lang: Lang, title: string) {
    const now = new Date();
    const year = String(now.getFullYear());
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const dir = path.join(this.getUploadDir(), year, month, day);
    await fs.mkdir(dir, { recursive: true });

    const originalName = `${docKey}_${lang}.pdf`;
    let target = path.join(dir, originalName);
    let counter = 1;
    while (true) {
      try {
        await fs.access(target);
        target = path.join(dir, `${docKey}_${lang}_${counter}.pdf`);
        counter += 1;
      } catch (_err) {
        break;
      }
    }

    const buffer = buildDemoPdf(title, [
      `Language: ${LANG_LABELS[lang]}`,
      "Document generated automatically for demonstration purposes.",
      "E-LIB — normative library demo content."
    ]);
    await fs.writeFile(target, buffer);

    return {
      originalName,
      path: target,
      size: buffer.length,
      mime: "application/pdf"
    };
  }

  private async seedDocuments(
    actorId: number,
    sectionIdsByKey: Map<string, number>,
    categoryIdsByKey: Map<string, number>,
    departmentIdsByName: Map<string, number>
  ) {
    const result: SeedCounters = { created: 0, skipped: 0 };

    for (let index = 0; index < DEMO_DOCUMENTS.length; index += 1) {
      const doc = DEMO_DOCUMENTS[index];
      const sectionId = sectionIdsByKey.get(doc.sectionKey);
      if (!sectionId) {
        result.skipped += 1;
        continue;
      }

      const existing = await this.db("file_translations")
        .join("file_items", "file_items.id", "file_translations.file_item_id")
        .where({ "file_translations.lang": "ru", "file_translations.title": doc.titles.ru })
        .whereNull("file_items.deleted_at")
        .first();
      if (existing) {
        result.skipped += 1;
        continue;
      }

      const createdAt = new Date(Date.now() - (index * 9 + 3) * 24 * 60 * 60 * 1000);
      const assets = [] as {
        lang: Lang;
        originalName: string;
        path: string;
        size: number;
        mime: string;
      }[];
      for (const lang of doc.assetLangs) {
        const asset = await this.writeDemoAsset(doc.key, lang, doc.titles.en);
        assets.push({ lang, ...asset });
      }

      await this.db.transaction(async (trx) => {
        const [insertedItem] = await trx("file_items")
          .insert({
            section_id: sectionId,
            category_id: doc.categoryKey ? categoryIdsByKey.get(doc.categoryKey) || null : null,
            access_type: doc.accessType,
            created_by: actorId,
            created_at: createdAt,
            updated_at: createdAt
          })
          .returning("id");
        const fileItemId = Number(insertedItem.id || insertedItem);

        await trx("file_translations").insert(
          LANGS.map((lang) => ({
            file_item_id: fileItemId,
            lang,
            title: doc.titles[lang],
            description: doc.descriptions?.[lang] || null
          }))
        );

        const [insertedVersion] = await trx("file_versions")
          .insert({
            file_item_id: fileItemId,
            version_number: 1,
            comment: null,
            created_by: actorId,
            created_at: createdAt,
            updated_at: createdAt
          })
          .returning("id");
        const versionId = Number(insertedVersion.id || insertedVersion);

        await trx("file_version_assets").insert(
          assets.map((asset) => ({
            file_version_id: versionId,
            lang: asset.lang,
            original_name: asset.originalName,
            mime: asset.mime,
            size: asset.size,
            path: asset.path,
            checksum: null,
            created_at: createdAt,
            updated_at: createdAt
          }))
        );

        await trx("file_items")
          .update({ current_version_id: versionId })
          .where({ id: fileItemId });

        if (doc.accessType !== "public" && doc.departmentName) {
          const departmentId = departmentIdsByName.get(doc.departmentName);
          if (departmentId) {
            await trx("file_access_departments").insert({
              file_item_id: fileItemId,
              department_id: departmentId
            });
          }
        }
      });

      result.created += 1;
    }

    return { documents: result };
  }

  async seedDemo(actorId: number) {
    const { sections, idsByKey: sectionIds } = await this.seedSections(actorId);
    const { departments, idsByName: departmentIds } = await this.seedDepartments();
    const { categories, idsByKey: categoryIds } = await this.seedCategories(sectionIds);
    const { documents } = await this.seedDocuments(
      actorId,
      sectionIds,
      categoryIds,
      departmentIds
    );

    const result = { sections, departments, categories, documents };

    await this.auditService.log({
      actorUserId: actorId,
      action: "SEED_DEMO_DATA",
      entityType: "SYSTEM",
      entityId: 0,
      meta: result
    });

    return result;
  }
}
