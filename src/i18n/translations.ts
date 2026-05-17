// LEGACY shim — kept until commit 8 deletes the client-side i18n script
// (src/scripts/i18n.ts) that still imports T + Lang from this file.
//
// New code should import from "./index" (t, Locale, etc.) and from
// "./dictionaries/{en,fr,ja}" directly.
//
// Reasons this shim exists:
//   - scripts/i18n.ts still uses `T.jp` (old locale key) and `Lang = "fr"|"en"|"jp"`.
//   - We split the dicts into ./dictionaries/* in commit 2 but the client
//     swap code is removed in commit 8. Keeping this re-export keeps every
//     intermediate commit green.

import en from "./dictionaries/en";
import fr from "./dictionaries/fr";
import ja from "./dictionaries/ja";

export type Lang = "fr" | "en" | "jp";
export type Translations = Record<string, string>;
export type TranslationMap = Record<Lang, Translations>;

/** @deprecated Use `t(key, locale)` from `src/i18n/index.ts` instead. */
export const T: TranslationMap = { fr, en, jp: ja };
