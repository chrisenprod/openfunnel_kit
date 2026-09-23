const root = document.documentElement;
const toggle = document.querySelector('.theme-toggle');
const systemTheme = matchMedia('(prefers-color-scheme: dark)');
const storageKey = 'openfunnel-theme';
let preference;

try { preference = localStorage.getItem(storageKey); } catch {}
if (preference !== 'light' && preference !== 'dark') preference = null;

function applyTheme() {
  const theme = preference ?? (systemTheme.matches ? 'dark' : 'light');
  root.dataset.theme = theme;
  document.querySelectorAll('source[data-theme-light]').forEach((source) => {
    source.media = theme === 'light' ? 'all' : 'not all';
  });
  toggle.setAttribute('aria-pressed', String(theme === 'dark'));
  toggle.title = theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro';
  document.querySelector('meta[name="theme-color"]').content = '#102f75';
}

toggle.addEventListener('click', () => {
  preference = root.dataset.theme === 'dark' ? 'light' : 'dark';
  try { localStorage.setItem(storageKey, preference); } catch {}
  applyTheme();
});

systemTheme.addEventListener('change', applyTheme);
window.addEventListener('storage', (event) => {
  if (event.key !== storageKey && event.key !== null) return;
  preference = event.newValue === 'light' || event.newValue === 'dark' ? event.newValue : null;
  applyTheme();
});

applyTheme();
toggle.hidden = false;
