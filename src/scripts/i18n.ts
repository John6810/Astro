import { T, type Lang } from '../i18n/translations';

const LANGS: Lang[] = ['fr', 'en', 'jp'];

function applyLang(lang: Lang) {
  const t = T[lang];
  if (!t) return;

  document.querySelectorAll<HTMLElement>('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (key && t[key]) el.textContent = t[key];
  });

  LANGS.forEach(l => {
    document.querySelectorAll<HTMLElement>('[data-lang="' + l + '"]').forEach(btn => {
      const active = l === lang;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', String(active));
    });
  });

  document.documentElement.lang = lang === 'jp' ? 'ja' : lang;
  try { localStorage.setItem('preferred-lang', lang); } catch {}
}

document.querySelectorAll<HTMLButtonElement>('[data-lang]').forEach(btn => {
  btn.addEventListener('click', () => applyLang(btn.dataset.lang as Lang));
});

function detectLang(): Lang {
  const browserLang = (navigator.language || 'en').toLowerCase();
  if (browserLang.startsWith('ja')) return 'jp';
  if (browserLang.startsWith('fr')) return 'fr';
  if (browserLang.startsWith('en')) return 'en';
  return 'en';
}

// Focus on FR layout for now — no auto language switching.
// To re-enable, uncomment the block below and re-add the FR/EN/JP switcher in Header.astro.
// const storedLang = (() => {
//   try { return localStorage.getItem('preferred-lang') as Lang | null; }
//   catch { return null; }
// })();
// applyLang(storedLang && LANGS.includes(storedLang) ? storedLang : detectLang());
void detectLang; // keep helper alive to avoid TS "unused" warnings

// Obfuscated email — assemble client-side
const em = ['hi', 'jonathan-aerts', 'dev'].join('@').replace(/@([^@]+)$/, '.$1');
document.querySelectorAll<HTMLAnchorElement>('[data-email-link]').forEach(a => { a.href = 'mailto:' + em; });
document.querySelectorAll<HTMLElement>('[data-email-text]').forEach(el => { el.textContent = em; });

// Theme toggle
function syncTheme() {
  const dark = document.documentElement.classList.contains('dark');
  document.querySelectorAll<HTMLElement>('[data-theme-icon]').forEach(el => {
    el.dataset.theme = dark ? 'dark' : 'light';
  });
}
document.querySelectorAll<HTMLButtonElement>('[data-theme-toggle]').forEach(btn => {
  btn.addEventListener('click', () => {
    const next = !document.documentElement.classList.contains('dark');
    document.documentElement.classList.toggle('dark', next);
    try { localStorage.setItem('theme', next ? 'dark' : 'light'); } catch {}
    syncTheme();
  });
});
syncTheme();

// Mobile nav toggle
const navToggle = document.getElementById('nav-toggle');
const navPanel = document.getElementById('nav-panel');
if (navToggle && navPanel) {
  navToggle.addEventListener('click', () => {
    const open = navPanel.classList.toggle('is-open');
    navToggle.setAttribute('aria-expanded', String(open));
  });
  navPanel.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      navPanel.classList.remove('is-open');
      navToggle.setAttribute('aria-expanded', 'false');
    });
  });
}
