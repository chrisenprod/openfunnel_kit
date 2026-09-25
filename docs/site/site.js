const input = document.querySelector('#search');
const results = document.querySelector('#search-results');
const status = document.querySelector('#search-status');
let pages;
async function search() {
  const query = input.value.trim().toLocaleLowerCase('es');
  results.replaceChildren(); results.hidden = !query; status.textContent = '';
  if (!query) return;
  try {
    pages ||= await fetch('./search-index.json').then((response) => { if (!response.ok) throw new Error(); return response.json(); });
    if (query !== input.value.trim().toLocaleLowerCase('es')) return;
    const terms = query.split(/\s+/);
    const matches = pages.filter((page) => terms.every((term) => `${page.title} ${page.text}`.toLocaleLowerCase('es').includes(term)));
    status.textContent = `${matches.length} páginas encontradas`;
    for (const page of matches) {
      const link = document.createElement('a'); link.href = `./${page.href}`; link.textContent = page.title; results.append(link);
    }
  } catch { status.textContent = 'No se pudo cargar la búsqueda. Usa la navegación de páginas.'; }
}
input.addEventListener('input', search);
