# Publicação no GitHub Pages

O workflow `Qualidade` está preparado para validar e publicar o site a partir de `main`.

## Endereço e acesso

[Abrir Site ContabilMM](https://esmael-v1c.github.io/site-contabilmm/)

O repositório é público, conforme autorizado pelo proprietário em 07/10/2026, para usar o GitHub Pages gratuito. O site pode ser acessado pelo navegador em outros computadores e celulares. O código e o histórico do repositório também são públicos.

## Configuração

1. Em **Settings → Pages**, escolha **GitHub Actions** como origem.
2. Em **Settings → Secrets and variables → Actions → Variables**, defina `PAGES_ENABLED` como `true`.
3. Execute **Actions → Qualidade → Run workflow**, selecionando `main`.
4. Após a publicação, consulte o endereço informado pelo ambiente `github-pages`.

A origem GitHub Actions e a variável `PAGES_ENABLED=true` já estão configuradas. Cada novo push em `main` passa pelas validações antes da atualização do site. Pull requests são validados, mas não publicados. A execução manual permite republicar a versão atual quando necessário.

## Pacote de publicação

```sh
npm run build:pages
```

O comando recria `_site/` com as cinco páginas, CSS, JavaScript e recursos visuais. A pasta gerada é ignorada pelo Git. Documentação, testes, ferramentas de desenvolvimento, originais de logos e registros internos de importação ficam fora do pacote publicado.

Os links relativos existentes permitem abrir o site no subdiretório `/site-contabilmm/`. O servidor `server.mjs` é usado apenas no desenvolvimento. Os formulários continuam abrindo o WhatsApp para confirmação do visitante.

`siteUrl` e as medições continuam com sua configuração existente: o endereço do Pages não ativa automaticamente o domínio de produção, Google Ads ou GA4.

Referência: [disponibilidade do GitHub Pages por plano](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages).
