import { readFile, writeFile, mkdir, cp, rm } from 'node:fs/promises';
import { marked } from 'marked';

// Only these public sources are published. Never scan the documentation tree.
const pages = [
  ['index', 'Introducción', 'docs/site/index.md'],
  ['instalacion', 'Instalación', 'docs/site/instalacion.md'],
  ['configuracion', 'Configuración', 'docs/site/configuracion.md'],
  ['uso', 'Usar la app', 'docs/site/uso.md'],
  ['conocimiento', 'Conocimiento', 'docs/site/conocimiento.md'],
  ['pruebas', 'Probar agentes', 'docs/site/pruebas.md'],
  ['api', 'API para agentes', 'docs/api/AGENTES.md'],
  ['despliegue', 'Despliegue y respaldos', 'docs/site/despliegue.md'],
  ['contribuir', 'Contribuir', 'docs/site/contribuir.md'],
];
const escape = (text) => text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const output = 'dist/docs';
await rm(output, { force: true, recursive: true });
await mkdir(output, { recursive: true });
const search = [];
for (const [index, [slug, title, source]] of pages.entries()) {
  const markdown = await readFile(source, 'utf8');
  const anchors = new Map(), toc = [];
  const renderer = new marked.Renderer();
  renderer.heading = function ({ tokens, depth, text }) {
    const base = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const count = anchors.get(base) || 0; anchors.set(base, count + 1);
    const id = `${base}${count ? `-${count}` : ''}`;
    if (depth === 2) toc.push([id, text]);
    return `<h${depth} id="${id}">${this.parser.parseInline(tokens)}<a class="heading-link" href="#${id}" aria-label="Enlace a ${escape(text)}">#</a></h${depth}>`;
  };
  const body = marked.parse(markdown, { renderer });
  search.push({ title, href: `${slug}.html`, text: markdown.replace(/[`#*\[\]]/g, '') });
  const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="Documentación de OpenFunnel: ${escape(title)}"><title>${escape(title)} · OpenFunnel Docs</title><link rel="stylesheet" href="./site.css"><script src="./site.js" defer></script></head>
<body><a class="skip" href="#contenido">Saltar al contenido</a>
<header><a class="wordmark" href="./index.html">OpenFunnel <span>Docs</span></a><a href="https://github.com/chrisenprod/openfunnel_kit">Repositorio ↗</a></header>
<div class="layout"><aside><label for="search">Buscar en la documentación</label><input type="search" id="search" placeholder="Instalar, API, archivos…" autocomplete="off"><div id="search-status" role="status"></div><nav id="search-results" aria-label="Resultados de búsqueda" hidden></nav><nav aria-label="Documentación">${pages.map(([link, label]) => `<a href="./${link}.html"${link === slug ? ' aria-current="page"' : ''}>${label}</a>`).join('')}</nav></aside>
<main id="contenido" tabindex="-1"><p class="eyebrow">Documentación del proyecto</p>${toc.length ? `<details class="toc"><summary>En esta página</summary><nav aria-label="Contenido de la página">${toc.map(([id, label]) => `<a href="#${id}">${escape(label)}</a>`).join('')}</nav></details>` : ''}${body}
<nav class="page-links" aria-label="Páginas anterior y siguiente">${index ? `<a href="./${pages[index-1][0]}.html">← ${pages[index-1][1]}</a>` : '<span></span>'}${index < pages.length-1 ? `<a href="./${pages[index+1][0]}.html">${pages[index+1][1]} →</a>` : ''}</nav>
<footer><a href="https://github.com/chrisenprod/openfunnel_kit/blob/main/${source}">Editar esta página ↗</a><span>Documentación abierta · Apache-2.0</span></footer></main></div></body></html>`;
  await writeFile(`${output}/${slug}.html`, html);
}
await writeFile(`${output}/search-index.json`, JSON.stringify(search));
for (const file of ['site.css', 'site.js']) await cp(`docs/site/${file}`, `${output}/${file}`);
for (const target of ['frontend/public/docs', 'landing/public/docs']) {
  await rm(target, { force: true, recursive: true });
  await mkdir(target, { recursive: true });
  await cp(output, target, { recursive: true });
}
console.log(`Documentación: ${pages.length} páginas en dist/docs y /docs/ de app y landing.`);
