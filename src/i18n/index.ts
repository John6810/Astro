// Server-side i18n helpers. All dictionaries are imported eagerly — total
// payload is small (~30KB combined) and bundling them means zero runtime
// network fetches per request.

import en, { type Dict } from "./dictionaries/en";
import fr from "./dictionaries/fr";
import ja from "./dictionaries/ja";

const dicts = { en, fr, ja } as const;

export type Locale = keyof typeof dicts;
export type DictKey = keyof Dict;

export const LOCALES = ["en", "fr", "ja"] as const satisfies readonly Locale[];
export const DEFAULT_LOCALE: Locale = "en";

/**
 * Resolve an i18n string for the given locale.
 *
 * - Unknown locales (including `undefined`) fall back to the default (EN).
 * - Missing keys in a locale dict fall back to EN, then to the raw key itself
 *   as a last-resort signal.
 *
 * Designed for use in `.astro` templates:
 *
 *   const locale = (Astro.currentLocale ?? "en") as Locale;
 *   <h1>{t("hero_role", locale)}</h1>
 *
 * Values can contain inline HTML (e.g. <strong>) — render them with
 * `set:html` on the expression in that case.
 */
export function t(key: DictKey, locale: Locale | string | undefined): string {
  const l = (locale && (locale as string) in dicts ? locale : DEFAULT_LOCALE) as Locale;
  return dicts[l][key] ?? dicts[DEFAULT_LOCALE][key] ?? (key as string);
}

/** Narrow `Astro.currentLocale` (string | undefined) to our typed `Locale`. */
export function resolveLocale(input: string | undefined): Locale {
  return input && (input as string) in dicts ? (input as Locale) : DEFAULT_LOCALE;
}

/** Map locale -> BCP-47 tag for `<html lang>` and meta tags. */
export const HTML_LANG: Record<Locale, string> = {
  en: "en",
  fr: "fr",
  ja: "ja",
};

/** Map locale -> Open Graph locale code. */
export const OG_LOCALE: Record<Locale, string> = {
  en: "en_US",
  fr: "fr_FR",
  ja: "ja_JP",
};
