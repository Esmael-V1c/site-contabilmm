import { cpSync, existsSync, lstatSync, mkdirSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = realpathSync(fileURLToPath(new URL('..', import.meta.url)));
const output = path.resolve(root, '_site');
const pages = ['index.html', 'servicos.html', 'sobre.html', 'contato.html', 'privacidade.html'];
const files = [...pages, 'style.css', 'script.js', 'clients.js', 'measurement.js', 'config.js', 'robots.txt'];

// O pacote público contém somente as páginas e os recursos do site.
if (path.dirname(output) !== root || path.basename(output) !== '_site') {
  throw new Error('Diretório de publicação inválido.');
}
if (existsSync(output)) {
  if (lstatSync(output).isSymbolicLink() || realpathSync(output) !== output) {
    throw new Error('A pasta _site não pode ser um link para outro diretório.');
  }
  rmSync(output, { recursive: true });
}
mkdirSync(output);
for (const file of files) cpSync(path.join(root, file), path.join(output, file));
cpSync(path.join(root, 'assets'), path.join(output, 'assets'), {
  recursive: true,
  filter: source => {
    const relative = path.relative(path.join(root, 'assets'), source).split(path.sep);
    return !relative.some(part => part.startsWith('.') || ['originals', 'restored', 'sources.json', 'restoration-notes.json'].includes(part));
  }
});
if (existsSync(path.join(root, 'sitemap.xml'))) {
  cpSync(path.join(root, 'sitemap.xml'), path.join(output, 'sitemap.xml'));
}
writeFileSync(path.join(output, '.nojekyll'), '');
console.log(`GitHub Pages: ${pages.length} páginas preparadas em _site/.`);
