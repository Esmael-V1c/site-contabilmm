const assert = require('node:assert/strict');
const { test } = require('node:test');
const { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

function fixture(t) {
  const root = mkdtempSync(path.join(tmpdir(), 'contabil-mm-publication-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  for (const dir of ['scripts', 'deploy', 'assets/licenses', 'assets/clients/originals', 'assets/clients/restored', 'docs']) {
    mkdirSync(path.join(root, dir), { recursive: true });
  }
  cpSync(path.join(__dirname, '../scripts/build-pages.mjs'), path.join(root, 'scripts/build-pages.mjs'));
  cpSync(path.join(__dirname, '../deploy/locaweb.htaccess'), path.join(root, 'deploy/locaweb.htaccess'));
  for (const file of ['index.html', 'servicos.html', 'sobre.html', 'contato.html', 'privacidade.html']) {
    writeFileSync(path.join(root, file), '<html><head><title>Site</title></head><body>MM</body></html>');
  }
  for (const file of ['style.css', 'script.js', 'clients.js', 'measurement.js', 'config.js', 'robots.txt', 'sitemap.xml', 'assets/logo.svg', 'assets/licenses/font.txt', 'assets/clients/originals/logo.jpg', 'assets/clients/restored/logo.png', 'assets/sources.json', 'docs/internal.txt']) {
    writeFileSync(path.join(root, file), 'fixture');
  }
  writeFileSync(path.join(root, 'seo.config.json'), JSON.stringify({ siteUrl: 'https://assessoriacontabilmm.com' }));
  return {
    root,
    output: path.join(root, '_site'),
    build: (...args) => execFileSync(process.execPath, [path.join(root, 'scripts/build-pages.mjs'), ...args]),
    read: file => readFileSync(path.join(root, '_site', file), 'utf8'),
    has: file => existsSync(path.join(root, '_site', file)),
  };
}

test('pacote Locaweb mantém indexação, regras do domínio, sitemap e licenças sem arquivos internos', t => {
  const f = fixture(t);
  f.build('--locaweb');
  assert.doesNotMatch(f.read('index.html'), /noindex/);
  assert.match(f.read('.htaccess'), /https:\/\/assessoriacontabilmm\.com/);
  assert.ok(f.has('sitemap.xml'));
  assert.ok(f.has('assets/licenses/font.txt'));
  assert.ok(f.has('assets/logo.svg'));
  for (const file of ['docs', 'scripts', 'seo.config.json', 'assets/sources.json', 'assets/clients/originals', 'assets/clients/restored', '.nojekyll']) assert.equal(f.has(file), false, file);
});

test('prévia Pages usa noindex sem alterar HTML fonte nem levar regras Apache', t => {
  const f = fixture(t);
  f.build();
  assert.match(f.read('index.html'), /name="robots" content="noindex, follow"/);
  assert.doesNotMatch(readFileSync(path.join(f.root, 'index.html'), 'utf8'), /noindex/);
  assert.equal(f.has('.htaccess'), false);
  assert.ok(f.has('.nojekyll'));
});

test('trocar o destino recria o pacote sem carregar noindex ou arquivos da publicação anterior', t => {
  const f = fixture(t);
  f.build();
  writeFileSync(path.join(f.output, 'obsolete.txt'), 'old');
  f.build('--locaweb');
  assert.doesNotMatch(f.read('index.html'), /noindex/);
  assert.equal(f.has('obsolete.txt'), false);
  assert.equal(f.has('.nojekyll'), false);
  assert.ok(f.has('.htaccess'));
});
