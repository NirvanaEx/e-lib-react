import { Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { randomUUID } from "crypto";
import fs from "fs/promises";
import path from "path";
import { DatabaseService } from "../../db/database.service";

const TEST_RIBBON_KEY = "test_ribbon_enabled";
const BRANDING_KEY = "site_branding";

const BRANDING_CONTENT_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif"
};

const LANGS = ["ru", "en", "uz"] as const;
const H_ALIGNS = ["left", "center", "right"] as const;
const V_ALIGNS = ["top", "center", "bottom"] as const;
const MAX_SLIDES = 12;
const MIN_HERO_INTERVAL = 2;
const MAX_HERO_INTERVAL = 120;
const MAX_TEXT_LENGTH = 400;
// Grace period before an uploaded-but-never-saved image is swept from disk.
const ORPHAN_MAX_AGE_MS = 60 * 60 * 1000;

export type BrandingText = { ru?: string; en?: string; uz?: string };

export type BrandingSlide = {
  id: string;
  image: string | null;
  title: BrandingText;
  subtitle: BrandingText;
  hAlign: (typeof H_ALIGNS)[number];
  vAlign: (typeof V_ALIGNS)[number];
};

export type HeroSharedText = {
  title: BrandingText;
  subtitle: BrandingText;
  hAlign: (typeof H_ALIGNS)[number];
  vAlign: (typeof V_ALIGNS)[number];
};

export type SiteBranding = {
  heroSlides: BrandingSlide[];
  heroIntervalSec: number;
  // "perSlide" — every slide carries its own text; "shared" — one text block
  // stays on screen while only the images rotate.
  heroTextMode: "perSlide" | "shared";
  heroSharedText: HeroSharedText;
  logoLight: string | null;
  logoDark: string | null;
  loginBackground: string | null;
};

export type PublicSettings = {
  testRibbonEnabled: boolean;
  branding: SiteBranding;
};

const DEFAULT_BRANDING: SiteBranding = {
  heroSlides: [],
  heroIntervalSec: 7,
  heroTextMode: "perSlide",
  heroSharedText: { title: {}, subtitle: {}, hAlign: "left", vAlign: "center" },
  logoLight: null,
  logoDark: null,
  loginBackground: null
};

function sanitizeHAlign(value: unknown): (typeof H_ALIGNS)[number] {
  return H_ALIGNS.includes(value as (typeof H_ALIGNS)[number]) ? (value as (typeof H_ALIGNS)[number]) : "left";
}

function sanitizeVAlign(value: unknown): (typeof V_ALIGNS)[number] {
  return V_ALIGNS.includes(value as (typeof V_ALIGNS)[number]) ? (value as (typeof V_ALIGNS)[number]) : "center";
}

function sanitizeText(value: unknown): BrandingText {
  const source = (value || {}) as Record<string, unknown>;
  const result: BrandingText = {};
  for (const lang of LANGS) {
    const text = typeof source[lang] === "string" ? (source[lang] as string).trim() : "";
    if (text) result[lang] = text.slice(0, MAX_TEXT_LENGTH);
  }
  return result;
}

function sanitizeFileName(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const name = path.basename(value.trim());
  return BRANDING_CONTENT_TYPES[path.extname(name).toLowerCase()] ? name : null;
}

// The stored JSON and the admin payload go through the same normalization, so a
// hand-crafted request can never persist paths, scripts or unknown fields.
function sanitizeBranding(value: unknown): SiteBranding {
  const source = (value || {}) as Record<string, unknown>;
  const slides = Array.isArray(source.heroSlides) ? source.heroSlides.slice(0, MAX_SLIDES) : [];
  const interval = Number(source.heroIntervalSec);
  const sharedText = (source.heroSharedText || {}) as Record<string, unknown>;
  return {
    heroSlides: slides.map((slide) => {
      const raw = (slide || {}) as Record<string, unknown>;
      return {
        id: typeof raw.id === "string" && raw.id ? raw.id.slice(0, 64) : randomUUID(),
        image: sanitizeFileName(raw.image),
        title: sanitizeText(raw.title),
        subtitle: sanitizeText(raw.subtitle),
        hAlign: sanitizeHAlign(raw.hAlign),
        vAlign: sanitizeVAlign(raw.vAlign)
      };
    }),
    heroIntervalSec: Number.isFinite(interval)
      ? Math.min(MAX_HERO_INTERVAL, Math.max(MIN_HERO_INTERVAL, Math.round(interval)))
      : DEFAULT_BRANDING.heroIntervalSec,
    heroTextMode: source.heroTextMode === "shared" ? "shared" : "perSlide",
    heroSharedText: {
      title: sanitizeText(sharedText.title),
      subtitle: sanitizeText(sharedText.subtitle),
      hAlign: sanitizeHAlign(sharedText.hAlign),
      vAlign: sanitizeVAlign(sharedText.vAlign)
    },
    // `logo` is the legacy single-theme field kept as a read fallback.
    logoLight: sanitizeFileName(source.logoLight ?? source.logo),
    logoDark: sanitizeFileName(source.logoDark),
    loginBackground: sanitizeFileName(source.loginBackground)
  };
}

@Injectable()
export class AppSettingsService {
  constructor(
    private readonly dbService: DatabaseService,
    private readonly config: ConfigService
  ) {}

  private async getValue(key: string): Promise<string | null> {
    const row = await this.dbService.db("app_settings").where({ key }).first();
    return row?.value ?? null;
  }

  private async setValue(key: string, value: string): Promise<void> {
    const existing = await this.dbService.db("app_settings").where({ key }).first();
    if (existing) {
      await this.dbService
        .db("app_settings")
        .where({ key })
        .update({ value, updated_at: this.dbService.db.fn.now() });
    } else {
      await this.dbService.db("app_settings").insert({
        key,
        value,
        created_at: this.dbService.db.fn.now(),
        updated_at: this.dbService.db.fn.now()
      });
    }
  }

  getBrandingDir() {
    const dir = this.config.get<string>("UPLOAD_DIR", "uploads");
    const uploadDir = path.isAbsolute(dir) ? dir : path.resolve(process.cwd(), dir);
    return path.join(uploadDir, "branding");
  }

  async getBranding(): Promise<SiteBranding> {
    const raw = await this.getValue(BRANDING_KEY);
    if (!raw) return DEFAULT_BRANDING;
    try {
      return sanitizeBranding(JSON.parse(raw));
    } catch {
      return DEFAULT_BRANDING;
    }
  }

  async getPublicSettings(): Promise<PublicSettings> {
    const testRibbon = await this.getValue(TEST_RIBBON_KEY);
    return {
      // Default to enabled when the setting has never been stored.
      testRibbonEnabled: testRibbon === null ? true : testRibbon === "true",
      branding: await this.getBranding()
    };
  }

  async updateSettings(dto: { testRibbonEnabled?: boolean; branding?: unknown }): Promise<PublicSettings> {
    if (dto.testRibbonEnabled !== undefined) {
      await this.setValue(TEST_RIBBON_KEY, dto.testRibbonEnabled ? "true" : "false");
    }
    if (dto.branding !== undefined) {
      const previous = await this.getBranding();
      const next = sanitizeBranding(dto.branding);
      await this.setValue(BRANDING_KEY, JSON.stringify(next));
      await this.cleanupBrandingFiles(previous, next);
    }
    return this.getPublicSettings();
  }

  async saveBrandingImage(file: Express.Multer.File) {
    // Multer resolves its destination before .env is loaded, so move the file
    // into the ConfigService-resolved uploads dir (same pattern as setAvatar).
    const dir = this.getBrandingDir();
    await fs.mkdir(dir, { recursive: true });
    const targetPath = path.join(dir, file.filename);
    if (path.resolve(file.path) !== path.resolve(targetPath)) {
      await fs.rename(file.path, targetPath);
    }
    return { file: file.filename };
  }

  async getBrandingFile(name: string) {
    const fileName = path.basename(name);
    const contentType = BRANDING_CONTENT_TYPES[path.extname(fileName).toLowerCase()];
    if (!contentType) throw new NotFoundException();
    const filePath = path.join(this.getBrandingDir(), fileName);
    try {
      await fs.access(filePath);
    } catch {
      throw new NotFoundException();
    }
    return { filePath, contentType };
  }

  private collectFiles(branding: SiteBranding): Set<string> {
    const files = new Set<string>();
    if (branding.logoLight) files.add(branding.logoLight);
    if (branding.logoDark) files.add(branding.logoDark);
    if (branding.loginBackground) files.add(branding.loginBackground);
    branding.heroSlides.forEach((slide) => {
      if (slide.image) files.add(slide.image);
    });
    return files;
  }

  // Deletes images dropped by this update right away and sweeps stale uploads
  // that were never referenced (the admin uploaded a file but abandoned the form).
  private async cleanupBrandingFiles(previous: SiteBranding, next: SiteBranding) {
    const keep = this.collectFiles(next);
    const dir = this.getBrandingDir();
    for (const file of this.collectFiles(previous)) {
      if (!keep.has(file)) {
        await fs.unlink(path.join(dir, file)).catch(() => undefined);
      }
    }
    let entries: string[] = [];
    try {
      entries = await fs.readdir(dir);
    } catch {
      return;
    }
    const now = Date.now();
    for (const entry of entries) {
      if (keep.has(entry)) continue;
      const filePath = path.join(dir, entry);
      const stat = await fs.stat(filePath).catch(() => null);
      if (stat?.isFile() && now - stat.mtimeMs > ORPHAN_MAX_AGE_MS) {
        await fs.unlink(filePath).catch(() => undefined);
      }
    }
  }
}
