import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

test('Public docs: explicit sources, relative links and anchors, standalone and bundled copies', () => {
  execFileSync(process.execPath, ['scripts/build-docs.js']);
  const root = resolve('dist/docs');
  const files = readdirSync(root);
  assert.equal(files.filter((file) => file.endsWith('.html')).length, 9);
  assert.equal(files.length, 12);
  for (const file of files.filter((file) => file.endsWith('.html'))) {
    const html = readFileSync(resolve(root, file), 'utf8');
    assert.match(html, /lang="es"/); assert.match(html, /aria-current="page"/);
    assert.ok(!html.includes('/private/') && !html.includes('docs/qa') && !html.includes('referencias-visuales'));
    for (const [, value] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
      if (/^https?:/.test(value)) continue;
      assert.ok(!value.startsWith('/'), `Relative link: ${value}`);
      const [path, anchor] = value.split('#');
      const destination = path ? resolve(dirname(resolve(root, file)), path) : resolve(root, file);
      assert.ok(destination.startsWith(root), value);
      assert.ok(existsSync(destination), `${file}: ${value}`);
      if (anchor) assert.ok(readFileSync(destination, 'utf8').includes(`id="${anchor}"`), `${file}: ${value}`);
    }
    for (const bundled of ['frontend/public/docs', 'landing/public/docs']) assert.equal(readFileSync(`${bundled}/${file}`, 'utf8'), html);
  }
  const search = JSON.parse(readFileSync(`${root}/search-index.json`, 'utf8'));
  assert.equal(search.length, 9);
  assert.ok(search.some((page) => page.text.includes('BLOB')));
  assert.ok(search.every((page) => existsSync(`${root}/${page.href}`)));
});
