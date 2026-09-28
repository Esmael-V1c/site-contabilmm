"""Corrige marcação inválida da referência e deixa o HTML legível."""
from pathlib import Path
from import_reference import Parser

ROOT = Path(__file__).resolve().parent.parent
for path in ROOT.glob('*.html'):
    doc = Parser(path.read_text(encoding='utf-8')).root
    for node in doc.find():
        if node.tag == 'a' and list(node.find('a')):
            node.tag = 'article'
            node.attrs.pop('href', None)
            node.attrs['class'] = node.attrs.get('class', '').replace('pointer-events-none', '').replace('lg:pointer-events-auto', '').strip()
        if node.tag == 'p' and list(node.find('p')):
            node.tag = 'div'
    path.write_text('<!DOCTYPE html>\n'+doc.render().replace('><', '>\n<'), encoding='utf-8')
