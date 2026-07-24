import type { BrandingHAlign, BrandingText, BrandingVAlign } from "../../features/settings/app-settings.api";

// Picks the slide text for the active language with a sensible fallback chain.
export function resolveBrandingText(text: BrandingText | undefined, lang: string): string {
  if (!text) return "";
  const short = (lang || "ru").split("-")[0] as keyof BrandingText;
  return text[short] || text.ru || text.en || text.uz || "";
}

// Dark scrim behind the hero text; leans towards the side the text sits on so
// the opposite side of the photo stays visible.
export function heroOverlayGradient(hAlign: BrandingHAlign, hasText: boolean): string | null {
  if (!hasText) return null;
  if (hAlign === "right") {
    return "linear-gradient(265deg, rgba(8, 28, 57, 0.93) 0%, rgba(10, 34, 66, 0.8) 35%, rgba(12, 42, 82, 0.22) 68%, rgba(12, 42, 82, 0.05) 100%)";
  }
  if (hAlign === "center") {
    return "linear-gradient(rgba(8, 28, 57, 0.6), rgba(8, 28, 57, 0.6))";
  }
  return "linear-gradient(95deg, rgba(8, 28, 57, 0.93) 0%, rgba(10, 34, 66, 0.8) 35%, rgba(12, 42, 82, 0.22) 68%, rgba(12, 42, 82, 0.05) 100%)";
}

export const heroJustifyContent: Record<BrandingHAlign, string> = {
  left: "flex-start",
  center: "center",
  right: "flex-end"
};

export const heroAlignItems: Record<BrandingVAlign, string> = {
  top: "flex-start",
  center: "center",
  bottom: "flex-end"
};
