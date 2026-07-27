import type {
  BrandingFocus,
  BrandingFocusOverrides,
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
// BaseLayout content padding: p: { xs: 2, md: 4 } → 32/16px on each side.
const HERO_PADDING_WIDE = 64;
const HERO_PADDING_NARROW = 32;
// BaseLayout drawerWidth — the side menu is permanent from md up.
const HERO_SIDEBAR_WIDTH = 260;

// Which framing a visitor gets, by window width. The 900px edge is the MUI md
// breakpoint where the header drops from 440 to 260 px tall and the side menu
// turns into an off-canvas drawer.
const HERO_FORMAT_BREAKPOINTS: { key: HeroFormatKey; maxWidth: number }[] = [
  { key: "phone", maxWidth: 600 },
  { key: "tablet", maxWidth: 900 },
  { key: "laptop", maxWidth: 1440 },
  { key: "desktop", maxWidth: Infinity }
];

// Reference window per format, used to draw a format the editor is not sitting on.
const HERO_REFERENCE_VIEWPORT: Record<HeroFormatKey, number> = {
  desktop: 1920,
  laptop: 1366,
  tablet: 768,
  phone: 375
};

export function resolveHeroFormatKey(viewportWidth: number): HeroFormatKey {
  return (HERO_FORMAT_BREAKPOINTS.find((entry) => viewportWidth < entry.maxWidth) ?? HERO_FORMAT_BREAKPOINTS[3]).key;
}

// Width of the home page content column — that is exactly the header width, since
// the header fills it: window minus the side menu and the page padding.
function heroContentWidth(viewportWidth: number): number {
  return viewportWidth >= 900
    ? Math.round(Math.min(2400, viewportWidth) - HERO_SIDEBAR_WIDTH - HERO_PADDING_WIDE)
    : Math.round(viewportWidth - HERO_PADDING_NARROW);
}

// The header stretches with the window, so its proportions — and with them the
// crop — differ per screen. The format the editor itself sits on is measured from
// the live window; the others use their reference window.
export function heroFormats(viewportWidth: number): HeroFormat[] {
  const current = resolveHeroFormatKey(viewportWidth);
  const widthFor = (key: HeroFormatKey) =>
    heroContentWidth(key === current ? viewportWidth : HERO_REFERENCE_VIEWPORT[key]);
  return [
    {
      key: "desktop",
      width: widthFor("desktop"),
      height: HERO_HEIGHT_WIDE,
      labelKey: "formatDesktop",
      hintKey: "formatDesktopHint",
      cardsOverlay: true
    },
    {
      key: "laptop",
      width: widthFor("laptop"),
      height: HERO_HEIGHT_WIDE,
      labelKey: "formatLaptop",
      hintKey: "formatLaptopHint",
      cardsOverlay: true
    },
    {
      key: "tablet",
      width: widthFor("tablet"),
      height: HERO_HEIGHT_NARROW,
      labelKey: "formatTablet",
      hintKey: "formatTabletHint",
      cardsOverlay: false
    },
    {
      key: "phone",
      width: widthFor("phone"),
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

// "desktop" is the base framing stored in `focus`; the narrower formats may carry
// their own and otherwise inherit it.
export const HERO_OVERRIDE_KEYS = ["laptop", "tablet", "phone"] as const;

export function normalizeHeroOverrides(value?: BrandingFocusOverrides | null): BrandingFocusOverrides {
  const result: BrandingFocusOverrides = {};
  for (const key of HERO_OVERRIDE_KEYS) {
    const focus = value?.[key];
    if (focus) result[key] = normalizeHeroFocus(focus);
  }
  return result;
}

export function heroOverrideCount(value?: BrandingFocusOverrides | null): number {
  return HERO_OVERRIDE_KEYS.filter((key) => value?.[key]).length;
}

export function heroFocusForFormat(
  base: Partial<BrandingFocus> | null | undefined,
  overrides: BrandingFocusOverrides | null | undefined,
  key: HeroFormatKey
): BrandingFocus {
  const own = key === "desktop" ? null : overrides?.[key];
  return normalizeHeroFocus(own ?? base);
}

// Framing a visitor with this window gets.
export function resolveHeroFocus(
  base: Partial<BrandingFocus> | null | undefined,
  overrides: BrandingFocusOverrides | null | undefined,
  viewportWidth: number
): BrandingFocus {
  return heroFocusForFormat(base, overrides, resolveHeroFormatKey(viewportWidth));
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
