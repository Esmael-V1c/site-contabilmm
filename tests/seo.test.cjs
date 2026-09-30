const assert = require("node:assert/strict");
const { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { test } = require("node:test");
const { pathToFileURL } = require("node:url");

const root = path.resolve(__dirname, "..");
const modulePromise = import(pathToFileURL(path.join(root, "scripts/build-seo.mjs")).href);
const sourceConfig = JSON.parse(readFileSync(path.join(root, "seo.config.json"), "utf8"));
const pages = ["index.html", "servicos.html", "sobre.html", "contato.html"];
const originalHtml = `<!doctype html><html lang="pt-BR"><head>
<meta charset="utf-8"><title>Título anterior</title>
<meta content="Descrição anterior" name="description">
<link rel="stylesheet" href="style.css">
<meta name="author" content="Equipe MM">
<script>window.manual = "preservado";</script>
</head><body><main><h1>Conteúdo preservado</h1></main></body></html>`;

function fixture(t, configChanges = {}, withPrivacy = false) {
  const directory = mkdtempSync(path.join(os.tmpdir(), "contabil-mm-seo-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const config = { ...structuredClone(sourceConfig), siteUrl: "", searchConsoleVerification: "", ...configChanges };
  writeFileSync(path.join(directory, "seo.config.json"), JSON.stringify(config));
  for (const file of [...pages, ...(withPrivacy ? ["privacidade.html"] : [])]) {
    writeFileSync(path.join(directory, file), originalHtml);
  }
  return { directory, config, read: (file) => readFileSync(path.join(directory, file), "utf8") };
}

function schemaFrom(html) {
  return JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
}

test("domínio vazio não inventa URL pública nem desindexa as páginas", async (t) => {
  const { buildSeo } = await modulePromise;
  const f = fixture(t);
  const result = buildSeo(f.directory);
  assert.equal(result.sitemap, false);
  assert.equal(existsSync(path.join(f.directory, "sitemap.xml")), false);
  assert.doesNotMatch(f.read("robots.txt"), /Sitemap:|Disallow: \/\s*$/m);
  assert.match(f.read("robots.txt"), /Disallow: \/\.reference\//);
  const titles = new Set();
  for (const file of pages) {
    const html = f.read(file);
    assert.doesNotMatch(html, /rel="canonical"|property="og:url"|noindex|127\.0\.0\.1|localhost/);
    assert.equal((html.match(/<title>/g) || []).length, 1);
    assert.equal((html.match(/name="description"/g) || []).length, 1);
    titles.add(html.match(/<title>([^<]*)<\/title>/)[1]);
    const business = schemaFrom(html)["@graph"][0];
    assert.equal(business["@type"], "AccountingService");
    assert.equal(business.telephone, "+5511991001754");
    assert.equal(business.address.addressLocality, "Guarulhos");
    assert.equal(business.email, "contabilmm@yahoo.com.br");
    assert.equal(business.foundingDate, "1981");
    assert.equal(business.url, undefined);
    assert.equal(business.aggregateRating, undefined);
    assert.equal(business.openingHoursSpecification, undefined);
  }
  assert.equal(titles.size, 4);
});

test("domínio definitivo gera canonical, metadados sociais, sitemap e dados estruturados", async (t) => {
  const { buildSeo } = await modulePromise;
  const f = fixture(t, { siteUrl: "https://www.contabilmm.com/", searchConsoleVerification: "abc_X-123" }, true);
  const result = buildSeo(f.directory);
  assert.equal(result.siteUrl, "https://www.contabilmm.com");
  assert.equal(result.pages.length, 5);
  const home = f.read("index.html");
  assert.match(home, /rel="canonical" href="https:\/\/www\.contabilmm\.com\/"/);
  assert.match(home, /property="og:locale" content="pt_BR"/);
  assert.match(home, /property="og:image" content="https:\/\/www\.contabilmm\.com\/assets\/contabil-mm-logo\.png"/);
  assert.match(home, /name="google-site-verification" content="abc_X-123"/);
  assert.equal(schemaFrom(home)["@graph"][1]["@type"], "WebSite");
  const service = f.read("servicos.html");
  assert.match(service, /rel="canonical" href="https:\/\/www\.contabilmm\.com\/servicos\.html"/);
  const breadcrumbs = schemaFrom(service)["@graph"][1];
  assert.equal(breadcrumbs["@type"], "BreadcrumbList");
  assert.equal(breadcrumbs.itemListElement[1].item, "https://www.contabilmm.com/servicos.html");
  const sitemap = f.read("sitemap.xml");
  assert.equal((sitemap.match(/<url>/g) || []).length, 5);
  assert.match(sitemap, /<loc>https:\/\/www\.contabilmm\.com\/<\/loc>/);
  assert.doesNotMatch(sitemap, /index\.html|lastmod/);
  assert.match(f.read("robots.txt"), /Sitemap: https:\/\/www\.contabilmm\.com\/sitemap\.xml/);
});

test("segunda execução é idêntica e preserva estilos, scripts e conteúdo manual", async (t) => {
  const { buildSeo } = await modulePromise;
  const f = fixture(t, { siteUrl: "https://www.contabilmm.com" });
  buildSeo(f.directory);
  const files = [...pages, "robots.txt", "sitemap.xml"];
  const first = files.map(f.read);
  buildSeo(f.directory);
  assert.deepEqual(files.map(f.read), first);
  for (const file of pages) {
    const html = f.read(file);
    assert.match(html, /<link rel="stylesheet" href="style\.css">/);
    assert.match(html, /<meta name="author" content="Equipe MM">/);
    assert.match(html, /<script>window\.manual = "preservado";<\/script>/);
    assert.match(html, /<main><h1>Conteúdo preservado<\/h1><\/main>/);
  }
});

test("domínio planejado só se torna ativo quando copiado explicitamente para siteUrl", async (t) => {
  const { buildSeo } = await modulePromise;
  const f = fixture(t, { plannedSiteUrl: "https://assessoriacontabilmm.com" }, true);
  buildSeo(f.directory);
  assert.doesNotMatch(f.read("index.html"), /assessoriacontabilmm\.com/);
  assert.equal(existsSync(path.join(f.directory, "sitemap.xml")), false);
  f.config.siteUrl = f.config.plannedSiteUrl;
  writeFileSync(path.join(f.directory, "seo.config.json"), JSON.stringify(f.config));
  buildSeo(f.directory);
  assert.match(f.read("index.html"), /rel="canonical" href="https:\/\/assessoriacontabilmm\.com\/"/);
  assert.match(f.read("sitemap.xml"), /<loc>https:\/\/assessoriacontabilmm\.com\/privacidade\.html<\/loc>/);
});

test("domínios locais, caminhos, URLs inseguras e previews são rejeitados antes de escrever", async (t) => {
  const { buildSeo } = await modulePromise;
  for (const siteUrl of ["http://www.contabilmm.com", "https://localhost", "https://127.0.0.1", "https://[::1]", "https://contabilmm.local", "https://preview.vercel.app", "https://contabilmm.netlify.app", "https://www.contabilmm.com/contato.html", "https://www.contabilmm.com/?id=1", "https://user:pass@www.contabilmm.com", "https://www.contabilmm.com:4173", "javascript:alert(1)"]) {
    const f = fixture(t, { siteUrl });
    assert.throws(() => buildSeo(f.directory), /siteUrl/);
    assert.equal(f.read("index.html"), originalHtml);
    assert.equal(existsSync(path.join(f.directory, "robots.txt")), false);
  }
});

test("textos malformados são escapados no HTML e não encerram o JSON-LD", async (t) => {
  const { buildSeo } = await modulePromise;
  const dangerous = 'MM </script><script>alert("x")</script> & "contabilidade"';
  const config = structuredClone(sourceConfig);
  config.pages["index.html"].title = dangerous;
  config.pages["index.html"].description = dangerous;
  const f = fixture(t, { siteUrl: "https://www.contabilmm.com", siteName: dangerous, pages: config.pages });
  buildSeo(f.directory);
  const html = f.read("index.html");
  assert.doesNotMatch(html, /<script>alert/);
  assert.match(html, /&lt;\/script&gt;&lt;script&gt;alert\(&quot;x&quot;\)/);
  assert.match(html, /\\u003c\/script\\u003e/);
  assert.equal(schemaFrom(html)["@graph"][1].name, dangerous);
  const badToken = fixture(t, { searchConsoleVerification: '\"><script>alert(1)</script>' });
  assert.throws(() => buildSeo(badToken.directory), /searchConsoleVerification/);
  assert.equal(badToken.read("index.html"), originalHtml);
});

test("limpar domínio remove somente sitemap gerado e URLs canônicas anteriores", async (t) => {
  const { buildSeo } = await modulePromise;
  const f = fixture(t, { siteUrl: "https://www.contabilmm.com" });
  buildSeo(f.directory);
  f.config.siteUrl = "";
  writeFileSync(path.join(f.directory, "seo.config.json"), JSON.stringify(f.config));
  buildSeo(f.directory);
  assert.equal(existsSync(path.join(f.directory, "sitemap.xml")), false);
  assert.doesNotMatch(f.read("index.html"), /rel="canonical"|property="og:url"/);
  assert.doesNotMatch(f.read("robots.txt"), /Sitemap:/);
  writeFileSync(path.join(f.directory, "sitemap.xml"), "<!-- Mapa mantido manualmente -->");
  assert.throws(() => buildSeo(f.directory), /sitemap.xml manual/);
});
