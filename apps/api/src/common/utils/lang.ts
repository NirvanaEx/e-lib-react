export type Lang = "ru" | "en" | "uz";

export const LANGS: Lang[] = ["ru", "en", "uz"];

export function normalizeLang(value: any): Lang | null {
  if (!value) return null;
  const v = String(value).toLowerCase();
  if (v === "ru" || v === "en" || v === "uz") return v as Lang;
  return null;
}

export function selectTranslation<T extends { lang: Lang }>(
  translations: T[],
  preferred: Lang | null,
  defaultLang: Lang
): T | null {
  if (!translations || translations.length === 0) return null;
  const preferredHit = preferred
    ? translations.find((t) => t.lang === preferred)
    : null;
  if (preferredHit) return preferredHit;
  const defaultHit = translations.find((t) => t.lang === defaultLang);
  if (defaultHit) return defaultHit;
  const ruHit = translations.find((t) => t.lang === "ru");
  if (ruHit) return ruHit;
  return translations[0] || null;
}

export function getAvailableLangs<T extends { lang: Lang }>(
  translations: T[]
): Lang[] {
  return translations.map((t) => t.lang);
}
