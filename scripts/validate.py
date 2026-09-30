"""Validação offline dos links e recursos das páginas entregues."""
from pathlib import Path
from urllib.parse import unquote, urlparse
from import_reference import Parser
import re
import json

ROOT = Path(__file__).resolve().parent.parent
errors = []
pages = list(ROOT.glob('*.html'))
titles = set()
descriptions = set()
documents = {path.name: Parser(path.read_text(encoding='utf-8')).root for path in pages}
for path in pages:
    doc = documents[path.name]
    if not list(doc.find('main')):
        errors.append(f'{path.name}: main ausente')
    if len(list(doc.find('h1'))) != 1:
        errors.append(f'{path.name}: deve ter um título principal h1')
    title_nodes = list(doc.find('title'))
    title = title_nodes[0].text() if len(title_nodes) == 1 else ''
    if not title or title in titles:
        errors.append(f'{path.name}: título ausente ou duplicado')
    titles.add(title)
    description_nodes = [n for n in doc.find('meta') if n.attrs.get('name') == 'description']
    description = description_nodes[0].attrs.get('content', '') if len(description_nodes) == 1 else ''
    if not description or description in descriptions:
        errors.append(f'{path.name}: descrição ausente ou duplicada')
    descriptions.add(description)
    for node in doc.find('script'):
        if node.attrs.get('type') == 'application/ld+json':
            try:
                data = json.loads(node.text())
                if data.get('@context') != 'https://schema.org':
                    errors.append(f'{path.name}: contexto JSON-LD inválido')
            except ValueError:
                errors.append(f'{path.name}: JSON-LD inválido')
    for node in doc.find():
        if node.tag == 'a' and list(node.find('a')):
            errors.append(f'{path.name}: links aninhados')
        for attribute in ('href', 'src'):
            target = node.attrs.get(attribute, '')
            parsed = urlparse(target)
            if not target or parsed.scheme:
                continue
            local_path = ROOT/unquote(parsed.path) if parsed.path else path
            if not local_path.is_file():
                errors.append(f'{path.name}: arquivo inexistente: {target}')
            if parsed.fragment and local_path.name in documents:
                ids = {n.attrs.get('id') for n in documents[local_path.name].find()}
                if unquote(parsed.fragment) not in ids:
                    errors.append(f'{path.name}: seção inexistente: {target}')
    print(f'{path.name}: {len(list(doc.find("img")))} imagens, {len(list(doc.find("form")))} formulários')
for css in [ROOT/'style.css', ROOT/'assets/reference.css']:
    for url in re.findall(r'url\([\"\']?([^\)\"\']+)', css.read_text(encoding='utf-8')):
        if not url.startswith(('http', 'data:')) and not (css.parent/url).is_file():
            errors.append(f'{css.name}: recurso ausente: {url}')
if errors:
    raise SystemExit('\n'.join(errors))
print(f'OK: {len(pages)} páginas; todos os recursos e links locais existem.')
