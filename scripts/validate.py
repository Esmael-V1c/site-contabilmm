"""Validação offline dos links e recursos das páginas entregues."""
from pathlib import Path
from urllib.parse import unquote, urlparse
from import_reference import Parser
import re

ROOT = Path(__file__).resolve().parent.parent
errors = []
pages = list(ROOT.glob('*.html'))
for path in pages:
    doc = Parser(path.read_text(encoding='utf-8')).root
    if not list(doc.find('main')):
        errors.append(f'{path.name}: main ausente')
    for node in doc.find():
        if node.tag == 'a' and list(node.find('a')):
            errors.append(f'{path.name}: links aninhados')
        for attribute in ('href', 'src'):
            target = node.attrs.get(attribute, '')
            parsed = urlparse(target)
            if not target or parsed.scheme or target.startswith('#'):
                continue
            if not (ROOT/unquote(parsed.path)).is_file():
                errors.append(f'{path.name}: arquivo inexistente: {target}')
    print(f'{path.name}: {len(list(doc.find("img")))} imagens, {len(list(doc.find("form")))} formulários')
for css in [ROOT/'style.css', ROOT/'assets/reference.css']:
    for url in re.findall(r'url\([\"\']?([^\)\"\']+)', css.read_text(encoding='utf-8')):
        if not url.startswith(('http', 'data:')) and not (css.parent/url).is_file():
            errors.append(f'{css.name}: recurso ausente: {url}')
if errors:
    raise SystemExit('\n'.join(errors))
print(f'OK: {len(pages)} páginas; todos os recursos e links locais existem.')
