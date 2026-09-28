"""Importa o conteúdo público da referência como páginas HTML locais editáveis.

Não importa JavaScript, rastreadores nem integrações de envio do site original.
Execute apenas para atualizar a referência; sobrescreve as páginas geradas.
"""
from concurrent.futures import ThreadPoolExecutor
from html import escape
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlparse, parse_qs, unquote
from urllib.request import Request, urlopen
import json
import re

ROOT = Path(__file__).resolve().parent.parent
BASE = 'https://www.contabilmm.com'
ROUTES = {'/': 'index.html', '/services': 'servicos.html', '/contact': 'contato.html', '/about': 'sobre.html', '/blog': 'blog.html'}
VOID = set('area base br col embed hr img input link meta param source track wbr'.split())

class Element:
    def __init__(self, tag='', attrs=(), parent=None):
        self.tag, self.attrs, self.parent, self.children = tag, dict(attrs), parent, []
    def find(self, tag=None):
        for child in self.children:
            if isinstance(child, Element):
                if tag is None or child.tag == tag:
                    yield child
                yield from child.find(tag)
    def text(self):
        return ''.join(c.text() if isinstance(c, Element) else c for c in self.children)
    def remove(self):
        if self.parent and self in self.parent.children:
            self.parent.children.remove(self)
    def render(self):
        attrs = ''.join(' '+k+(('="'+escape(str(v), quote=True)+'"') if v is not None else '') for k,v in self.attrs.items())
        content = ''.join(c.render() if isinstance(c, Element) else escape(c, quote=False) for c in self.children)
        if not self.tag:
            return content
        return '<'+self.tag+attrs+'>'+(content+'</'+self.tag+'>' if self.tag not in VOID else '')

class Parser(HTMLParser):
    def __init__(self, html):
        super().__init__(convert_charrefs=True)
        self.root = Element()
        self.current = self.root
        self.feed(html)
    def handle_starttag(self, tag, attrs):
        node = Element(tag, attrs, self.current)
        self.current.children.append(node)
        if tag not in VOID:
            self.current = node
    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in VOID:
            self.handle_endtag(tag)
    def handle_endtag(self, tag):
        node = self.current
        while node.parent:
            if node.tag == tag:
                self.current = node.parent
                return
            node = node.parent
    def handle_data(self, data):
        self.current.children.append(data)

def get(url):
    for attempt in range(3):
        try:
            with urlopen(Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0.0.0 Safari/537.36'}), timeout=45) as response:
                return response.read()
        except Exception:
            if attempt == 2:
                print('Falha ao acessar: '+url, flush=True)
                raise

assets = {}
def local_asset(url):
    url = urljoin(BASE, url)
    parts = urlparse(url)
    if parts.path == '/_next/image':
        url = urljoin(BASE, parse_qs(parts.query)['url'][0])
        parts = urlparse(url)
    filename = unquote(parts.path.split('/')[-1])
    path = 'assets/'+filename
    assets[url] = path
    return path

def header(route):
    labels = ['Home', 'Serviços', 'Contato', 'Sobre nós', 'Blog']
    links = ''.join(f'<a href="{file}"'+(' aria-current="page"' if path == route else '')+f'>{label}</a>' for (path,file),label in zip(list(ROUTES.items())[:5], labels))
    return f'''<a class="skip-link" href="#conteudo">Pular para o conteúdo</a>
<header class="site-header"><div class="header-inner">
<a href="index.html" class="brand" aria-label="Contabil MM — página inicial"><img src="assets/contabil-mm-logo.png" alt="Contabil MM Assessoria" width="85" height="85"></a>
<button class="menu-toggle" type="button" aria-label="Abrir menu" aria-controls="navigation" aria-expanded="false"><span></span><span></span><span></span></button>
<nav id="navigation" aria-label="Navegação principal">{links}</nav>
<a class="header-contact" href="contato.html">Entre em contato</a></div></header>'''

def main():
    (ROOT/'assets').mkdir(exist_ok=True)
    (ROOT/'.reference').mkdir(exist_ok=True)
    pages = {}
    for route in list(ROUTES):
        cached = ROOT/'.reference'/ROUTES[route]
        if cached.exists():
            data = cached.read_text(encoding='utf-8')
        else:
            try:
                data = get(BASE+route).decode('utf-8')
            except Exception:
                if route != '/blog':
                    raise
                home = Parser(pages['/']).root
                footer = next(home.find('footer')).render()
                data = '<html><head><title>ContabilidadeMM | Blog</title></head><body class="__className_44151c"><main class="local-blog" id="conteudo"><section class="blog-intro"><h1>Blog</h1><p>Informação para cuidar do seu negócio.</p></section><section class="blog-unavailable"><h2>Conteúdo temporariamente indisponível</h2><p>Os artigos do site de referência não estão disponíveis no momento. Acesse o blog oficial para verificar novas publicações.</p><a href="https://www.contabilmm.com/blog" target="_blank" rel="noopener noreferrer">Acessar blog oficial</a></section></main>'+footer+'</body></html>'
        pages[route] = data
        cached.write_text(data, encoding='utf-8')
    # Include article pages actually linked from the reference blog.
    blog = Parser(pages['/blog']).root
    article_paths = list(dict.fromkeys(a.attrs.get('href') for a in blog.find('a') if a.attrs.get('href','').startswith('/blog/')))
    for i, path in enumerate(article_paths):
        try:
            pages[path] = get(BASE+path).decode('utf-8')
            ROUTES[path] = f'artigo-{i+1}.html'
        except Exception as exc:
            print(f'Artigo não disponível: {path}: {exc}')
    homepage = Parser(pages['/']).root
    css_urls = [n.attrs['href'] for n in homepage.find('link') if n.attrs.get('rel') == 'stylesheet']
    css = '\n'.join(get(urljoin(BASE, url)).decode('utf-8') for url in css_urls)
    def replace_font(match):
        url = match.group(1).strip('\"\'')
        absolute = urljoin(urljoin(BASE, css_urls[0]), url)
        return 'url("'+Path(local_asset(absolute)).name+'")'
    css = re.sub(r'url\(([^)]+)\)', replace_font, css)
    (ROOT/'assets'/'reference.css').write_text(css, encoding='utf-8')
    for route, raw in pages.items():
        doc = Parser(raw).root
        body = next(doc.find('body'))
        # Remove the original responsive headers (replaced with accessible local navigation).
        for child in list(body.children):
            if isinstance(child, Element):
                if child.tag == 'aside' or (child.tag == 'div' and ('fixed w-screen' in child.attrs.get('class','') or 'top-0 z-' in child.attrs.get('class',''))):
                    child.remove()
        for node in list(body.find()):
            if node.tag in ('script', 'noscript'):
                node.remove()
                continue
            node.attrs.pop('data-nimg', None)
            if 'style' in node.attrs:
                node.attrs['style'] = node.attrs['style'].replace('color:transparent', '')
            if node.tag == 'img':
                node.attrs['src'] = local_asset(node.attrs['src'])
                node.attrs.pop('srcset', None)
                node.attrs.pop('srcSet', None)
                node.attrs['decoding'] = 'async'
                if node.attrs.get('alt') in ('service_people_working','Methodology icon'):
                    node.attrs['alt'] = ''
            if node.tag == 'a':
                if list(node.find('a')):
                    node.tag = 'article'
                    node.attrs.pop('href', None)
                    node.attrs['class'] = node.attrs.get('class', '').replace('pointer-events-none', '').replace('lg:pointer-events-auto', '').strip()
                    continue
                href = node.attrs.get('href', '')
                if href in ROUTES:
                    node.attrs['href'] = ROUTES[href]
                elif href.startswith('/services/'):
                    node.attrs['href'] = 'servicos.html'
                elif href.startswith('/'):
                    node.attrs['href'] = BASE+href
                if node.attrs.get('target'):
                    node.attrs.update(target='_blank', rel='noopener noreferrer')
                if node.text().strip() in ('WhatsApp', 'Email'):
                    node.attrs['href'] = 'contato.html#formulario'
                    node.attrs.pop('target', None)
            if node.tag == 'p' and list(node.find('p')):
                node.tag = 'div'
            if node.tag == 'form':
                node.attrs.update(id='formulario', **{'data-contact-form': '', 'novalidate': ''})
                node.attrs.pop('action', None)
                fields = list(node.find('input'))+list(node.find('textarea'))
                names = ['nome', 'email', 'empresa', 'cargo', 'telefone', 'mensagem']
                labels = ['Nome', 'E-mail', 'Empresa', 'Cargo', 'Telefone', 'Descrição']
                for i, field in enumerate(fields):
                    if i >= len(names):
                        continue
                    field.attrs.update(name=names[i], id='campo-'+names[i], **{'aria-label': labels[i]})
                    if i < 2:
                        field.attrs['required'] = ''
                    if i == 1:
                        field.attrs['type'] = 'email'
                        field.attrs['autocomplete'] = 'email'
                    if i == 0:
                        field.attrs['autocomplete'] = 'name'
                    if i == 4:
                        field.attrs.update(type='tel', autocomplete='tel')
        # Replace server-only map loader with an accessible map preview.
        for node in list(body.find('div')):
            if node.text().strip() == 'Carregando mapa...' and len(node.children) == 1:
                node.children = []
                map_parser = Parser('<iframe class="location-map" title="Mapa: Contabil MM em Vila Galvão, Guarulhos" loading="lazy" src="https://www.openstreetmap.org/export/embed.html?bbox=-46.583%2C-23.463%2C-46.553%2C-23.442&amp;layer=mapnik&amp;marker=-23.45251%2C-46.567439"></iframe>')
                node.children = map_parser.root.children
        title = next(doc.find('title')).text()
        body.attrs['id'] = 'topo'
        body_html = body.render()
        body_html = body_html.replace('Venha com agente', 'Venha com a gente').replace('e dereta', 'e direta')
        body_html = body_html.replace('<main>', '<main id="conteudo">', 1)
        if 'id="conteudo"' not in body_html:
            body_html = body_html.replace('<section ', '<section id="conteudo" ', 1)
        opening_end = body_html.index('>')+1
        body_html = body_html[:opening_end]+header(route)+body_html[opening_end:]
        body_html = body_html.replace('</body>', '''<div class="cookie-notice" role="region" aria-label="Preferências de cookies" hidden><p>Nós utilizamos <strong>cookies</strong> no nosso site.</p><div><button type="button" data-cookie="declined">Recusar</button><button type="button" data-cookie="accepted">Permitir</button></div></div>
<dialog id="contact-dialog" aria-labelledby="contact-dialog-title"><button type="button" class="dialog-close" aria-label="Fechar">×</button><h2 id="contact-dialog-title">Envio de mensagem</h2><p id="contact-feedback"></p><a class="official-contact" href="https://www.contabilmm.com/contact" target="_blank" rel="noopener noreferrer">Abrir contato oficial</a></dialog>
<script src="config.js"></script><script src="script.js"></script></body>''')
        html = '<!DOCTYPE html>\n<html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>'+escape(title)+'</title><meta name="description" content="Assessoria Contábil MM. Desde 1981, contabilidade, gestão fiscal e soluções para sua empresa em Guarulhos."><link rel="icon" href="assets/contabil-mm-logo.png"><link rel="stylesheet" href="style.css"></head>'+body_html+'</html>'
        (ROOT/ROUTES[route]).write_text(html.replace('><', '>\n<'), encoding='utf-8')
        print(f'Página: {ROUTES[route]}')
    local_asset('/contabil-mm-logo.png')
    failures = []
    def download(item):
        url, path = item
        try:
            target = ROOT/path
            if not target.exists():
                target.write_bytes(get(url))
            return None
        except Exception as exc:
            return f'{url}: {exc}'
    with ThreadPoolExecutor(max_workers=8) as pool:
        failures = [error for error in pool.map(download, list(assets.items())) if error]
    (ROOT/'assets'/'sources.json').write_text(json.dumps(assets, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'{len(pages)} páginas, {len(assets)} imagens e fontes locais.')
    if failures:
        print('\n'.join(failures))
        raise SystemExit(1)

if __name__ == '__main__':
    main()
