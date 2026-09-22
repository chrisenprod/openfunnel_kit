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
  toggle.setAttribute('aria-pressed', String(theme === 'dark'));
  toggle.title = theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro';
  document.querySelector('meta[name="theme-color"]').content = theme === 'dark' ? '#061120' : '#f5f8ff';
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
