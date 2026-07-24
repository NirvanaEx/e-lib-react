import api from "../../shared/api/client";

export type BrandingLang = "ru" | "en" | "uz";
export type BrandingText = Partial<Record<BrandingLang, string>>;
export type BrandingHAlign = "left" | "center" | "right";
export type BrandingVAlign = "top" | "center" | "bottom";

export type BrandingSlide = {
  id: string;
  image: string | null;
  title: BrandingText;
  subtitle: BrandingText;
  hAlign: BrandingHAlign;
  vAlign: BrandingVAlign;
};

export type HeroSharedText = {
  title: BrandingText;
  subtitle: BrandingText;
  hAlign: BrandingHAlign;
  vAlign: BrandingVAlign;
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

export type AppSettings = {
  testRibbonEnabled: boolean;
  branding: SiteBranding;
};

// Public read — no auth: the login screen needs the wallpaper and logo before sign-in.
export async function fetchPublicBranding() {
  const { data } = await api.get<SiteBranding>("/public/branding");
  return data;
}

export function getBrandingImageUrl(file?: string | null) {
  if (!file) return undefined;
  const base = (api.defaults.baseURL || "").replace(/\/$/, "");
  return `${base}/public/branding/file/${encodeURIComponent(file)}`;
}

// Public read — available to any authenticated user (used to decide whether the
// test-version ribbon is shown).
export async function fetchAppSettings() {
  const { data } = await api.get<AppSettings>("/user/app-settings");
  return data;
}

// Admin read/write (dashboard content permissions).
export async function fetchAdminAppSettings() {
  const { data } = await api.get<AppSettings>("/dashboard/settings");
  return data;
}

export async function updateAppSettings(payload: { testRibbonEnabled?: boolean; branding?: SiteBranding }) {
  const { data } = await api.put<AppSettings>("/dashboard/settings", payload);
  return data;
}

export async function uploadBrandingImage(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await api.post<{ file: string }>("/dashboard/settings/branding/image", formData);
  return data;
}
