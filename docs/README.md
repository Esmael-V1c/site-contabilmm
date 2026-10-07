# Documentação

O [README principal](../README.md) apresenta o site e o início rápido.

| Preciso de… | Consulte |
| --- | --- |
| Entender formulários, carrosséis e arquivos | [Guia técnico](GUIA-TECNICO.md) |
| Preparar domínio, SEO e divulgação | [SEO e divulgação](SEO-E-DIVULGACAO.md) |
| Publicar uma versão acessível pela internet | [GitHub Pages](GITHUB-PAGES.md) |
| Configurar Google Ads, GA4 e consentimento | [Medição](MEDICAO.md) |
| Alterar o código e validar a entrega | [Contribuição](../CONTRIBUTING.md) |

## Rotina de manutenção

1. Edite o conteúdo ou a configuração e confira as páginas com `npm start`.
2. Se alterar SEO, execute `npm run seo` e revise os arquivos gerados.
3. Execute `npm run check`, `npm test` e `python scripts/validate.py`.
4. Registre a alteração em um commit e abra um pull request descrevendo o efeito para o visitante.

O script `scripts/import_reference.py` é uma ferramenta de importação e sobrescreve páginas. Ele não faz parte da rotina de validação nem precisa ser executado para iniciar o site.
