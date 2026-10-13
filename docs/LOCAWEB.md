# Publicação definitiva na Locaweb

Domínio confirmado pelo responsável: **https://assessoriacontabilmm.com**, sem `www`.

## Estado em 13/10/2026

- Domínio principal resolve para `179.188.55.15`; `www` é alias do domínio principal.
- HTTPS responde nos dois endereços, mas a raiz retornou HTTP 403 com o título "Hospedagem Locaweb". Isso não confirma a publicação do site nem a configuração final de redirecionamentos.
- Canonicals, URLs sociais, JSON-LD, sitemap e robots do projeto foram preparados para o domínio definitivo.
- O envio dos arquivos à Locaweb requer acesso ao painel/FTP. O GitHub Actions atualiza somente a prévia do GitHub Pages.

## Gerar o pacote

```sh
npm run seo
npm run check
npm test
python scripts/validate.py
npm run build:locaweb
```

Publique **o conteúdo de `_site/`** na raiz do site, geralmente `public_html/`. `index.html` deve ficar diretamente nessa raiz. O ZIP entregue contém os mesmos arquivos, sem a pasta `_site` envolvendo o conteúdo.

O pacote inclui as cinco páginas, CSS, JavaScript, recursos, licenças, `robots.txt`, `sitemap.xml` e `.htaccess`. Código de desenvolvimento, testes, `.git`, originais de logos e registros internos de importação não fazem parte do pacote. A preparação técnica e a declaração do responsável sobre as autorizações estão em [Direitos autorais](DIREITOS-AUTORAIS.md).

## Envio e configuração

1. No painel da Locaweb, abra Hospedagem de Sites → Administrar → Arquivos e FTP. Confirme a pasta raiz indicada para este domínio.
2. Faça uma cópia de qualquer conteúdo existente antes de substituir arquivos. Se houver um `.htaccess` mantido pela Locaweb, integre as regras de `deploy/locaweb.htaccess` sem apagar diretivas específicas do provedor.
3. Confirme o SSL ativo tanto no domínio principal quanto no `www`, inclusive para que o redirecionamento de `https://www...` funcione. Só então ative o `.htaccess` do pacote.
4. Envie todos os arquivos, incluindo o `.htaccess` oculto, com pastas e nomes preservados. Não deixe o ZIP disponível dentro da pasta pública após extraí-lo.
5. Confira as páginas em HTTPS, imagens, navegação por celular e formulário WhatsApp. Confirme que `http://...`, `https://www...` e `/index.html` retornam 301 para a variante correta, mantendo os parâmetros de campanha.
6. Acesse `/sitemap.xml` e `/robots.txt`. Depois de validar o site, cadastre a propriedade no Google Search Console e envie o sitemap. Não foi inventado um token de verificação do Google.

O `.htaccess` mantém o caminho de validação do Let's Encrypt, não redireciona páginas inexistentes para a home e desativa a listagem de diretórios. As regras precisam ser verificadas no Apache da hospedagem após o envio; o servidor local Node.js não executa `.htaccess`.

## Prévia no GitHub Pages

`npm run build:pages` gera a prévia com `noindex, follow` nas páginas, mantendo os canonicals do domínio definitivo. `npm run build:locaweb` gera a versão indexável, com o `.htaccess`. Ambos recriam `_site/`; sempre use o comando correspondente ao destino antes de enviar arquivos.

O domínio não foi associado ao GitHub Pages: a hospedagem definitiva escolhida é a Locaweb. IDs de Ads/GA4 continuam vazios; este trabalho não ativou rastreadores nem campanhas.

Referências: [WebFTP](https://www.locaweb.com.br/ajuda/wiki/como-acessar-o-webftp-hospedagem-de-sites/), [HTTPS na hospedagem Linux](https://www.locaweb.com.br/ajuda/wiki/como-forcar-o-https-hospedagem-de-sites/), [certificado Let's Encrypt](https://www.locaweb.com.br/ajuda/wiki/como-emitir-o-certificado-lets-encrypt-hospedagem-de-sites/).
