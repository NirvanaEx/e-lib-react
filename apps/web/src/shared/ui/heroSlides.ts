import type {
  BrandingFocus,
  BrandingHAlign,
  BrandingText,
  BrandingVAlign
} from "../../features/settings/app-settings.api";

export const HERO_MIN_ZOOM = 100;
export const HERO_MAX_ZOOM = 300;

// Plain `cover` centered on the middle of the photo.
export const DEFAULT_HERO_FOCUS: BrandingFocus = { x: 50, y: 50, zoom: HERO_MIN_ZOOM };

export type HeroFormatKey = "desktop" | "laptop" | "tablet" | "phone";

export type HeroFormat = {
  key: HeroFormatKey;
  // Box the header actually occupies on that screen — the height comes from
  // HeroCarousel (minHeight xs 260 / md 440), the width from the content column.
  width: number;
  height: number;
  labelKey: string;
  hintKey: string;
  // On md+ the home page stat cards sit on top of the bottom of the header.
  cardsOverlay: boolean;
};

const HERO_HEIGHT_WIDE = 440;
const HERO_HEIGHT_NARROW = 260;
// BaseLayout content padding: p: { xs: 2, md: 4 } → 32px on each side.
const HERO_CONTENT_PADDING = 64;
// BaseLayout drawerWidth — the side menu is permanent from md up.
const HERO_SIDEBAR_WIDTH = 260;
// Reference desktop used when the editor itself sits on a small screen.
const HERO_MIN_REFERENCE_WIDTH = 1366;
// Same content column on a 1366px laptop (1366 − 260 − 64).
const HERO_LAPTOP_WIDTH = 1040;

// Width of the home page content column — that is exactly the header width, since
// the header fills it: viewport minus the side menu and the page padding.
function heroContentWidth(viewportWidth: number): number {
  const reference = Math.max(HERO_MIN_REFERENCE_WIDTH, viewportWidth);
  return Math.round(Math.min(2400, reference) - HERO_SIDEBAR_WIDTH - HERO_CONTENT_PADDING);
}

// The header stretches with the window, so its proportions — and with them the
// crop — differ per screen. The widest case is measured from the live viewport
// instead of guessed; the rest are the standard narrow layouts.
export function heroFormats(viewportWidth: number): HeroFormat[] {
  return [
    {
      key: "desktop",
      width: heroContentWidth(viewportWidth),
      height: HERO_HEIGHT_WIDE,
      labelKey: "formatDesktop",
      hintKey: "formatDesktopHint",
      cardsOverlay: true
    },
    {
      key: "laptop",
      width: HERO_LAPTOP_WIDTH,
      height: HERO_HEIGHT_WIDE,
      labelKey: "formatLaptop",
      hintKey: "formatLaptopHint",
      cardsOverlay: true
    },
    {
      key: "tablet",
      width: 736,
      height: HERO_HEIGHT_NARROW,
      labelKey: "formatTablet",
      hintKey: "formatTabletHint",
      cardsOverlay: false
    },
    {
      key: "phone",
      width: 343,
      height: HERO_HEIGHT_NARROW,
      labelKey: "formatPhone",
      hintKey: "formatPhoneHint",
      cardsOverlay: false
    }
  ];
}

export const heroFormatRatio = (format: HeroFormat) => format.width / format.height;

export function clampHeroFocusValue(value: unknown, fallback: number, min: number, max: number): number {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(max, Math.max(min, Math.round(num)));
}

// Slides saved before the framing controls existed carry no focus at all.
export function normalizeHeroFocus(focus?: Partial<BrandingFocus> | null): BrandingFocus {
  return {
    x: clampHeroFocusValue(focus?.x, DEFAULT_HERO_FOCUS.x, 0, 100),
    y: clampHeroFocusValue(focus?.y, DEFAULT_HERO_FOCUS.y, 0, 100),
    zoom: clampHeroFocusValue(focus?.zoom, HERO_MIN_ZOOM, HERO_MIN_ZOOM, HERO_MAX_ZOOM)
  };
}

export function isDefaultHeroFocus(focus?: Partial<BrandingFocus> | null): boolean {
  const value = normalizeHeroFocus(focus);
  return value.x === DEFAULT_HERO_FOCUS.x && value.y === DEFAULT_HERO_FOCUS.y && value.zoom === DEFAULT_HERO_FOCUS.zoom;
}

// The part of the photo left visible by `object-fit: cover` + focal point + zoom,
// as fractions (0..1) of the original image. Drives the frames drawn over the
// photo in the framing dialog, and matches heroFocusSx pixel for pixel.
export function heroVisibleRegion(imageRatio: number, frameRatio: number, focus: BrandingFocus) {
  const zoom = Math.max(1, focus.zoom / 100);
  const width = Math.min(1, frameRatio / imageRatio) / zoom;
  const height = Math.min(1, imageRatio / frameRatio) / zoom;
  return {
    width,
    height,
    left: (1 - width) * (focus.x / 100),
    top: (1 - height) * (focus.y / 100)
  };
}

// `cover` keeps the image point at (x%, y%) pinned to the same relative spot of
// the box, so scaling around that very point zooms without shifting the subject.
export function heroFocusSx(focus: BrandingFocus) {
  return {
    objectFit: "cover" as const,
    objectPosition: `${focus.x}% ${focus.y}%`,
    transform: focus.zoom === 100 ? "none" : `scale(${focus.zoom / 100})`,
    transformOrigin: `${focus.x}% ${focus.y}%`
  };
}

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
