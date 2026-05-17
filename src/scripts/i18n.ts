// Small client-side helpers that survive the i18n migration:
//   1. Email obfuscation — assemble the mailto: address client-side so
//      naive scrapers don't pick it up from the HTML.
//   2. Theme toggle — flip the .dark class on <html> and persist the
//      choice in localStorage.
//
// The historical role of this file (DOM-scan and swap [data-i18n]
// elements per locale) is gone — strings are resolved server-side via
// the t() helper and the locale-routed pages /, /fr/, /ja/. The file
// keeps its name only to avoid churn in the existing <script> imports;
// it could be renamed when convenient.

// Obfuscated email — assemble client-side
const em = ["hi", "jonathan-aerts", "dev"].join("@").replace(/@([^@]+)$/, ".$1");
document.querySelectorAll<HTMLAnchorElement>("[data-email-link]").forEach((a) => {
  a.href = "mailto:" + em;
});
document.querySelectorAll<HTMLElement>("[data-email-text]").forEach((el) => {
  el.textContent = em;
});

// Theme toggle (sun/moon)
function syncThemeIcon() {
  const dark = document.documentElement.classList.contains("dark");
  document.querySelectorAll<HTMLElement>("[data-theme-icon]").forEach((el) => {
    el.dataset.theme = dark ? "dark" : "light";
  });
}
document.querySelectorAll<HTMLButtonElement>("[data-theme-toggle]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {}
    syncThemeIcon();
  });
});
syncThemeIcon();
