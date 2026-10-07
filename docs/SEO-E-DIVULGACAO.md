# SEO local e divulgação da Contabil MM

## Situação desta entrega

O site está preparado para a assessoria de Guarulhos, com conteúdo local, títulos e descrições exclusivos, hierarquia de títulos, links por serviço e dados estruturados AccountingService. O domínio **previsto** é `https://assessoriacontabilmm.com`, mas permanece inativo em `seo.config.json`: `plannedSiteUrl` é só referência; `siteUrl` está vazio por solicitação do usuário. Nenhum domínio foi comprado ou configurado, nenhum site foi publicado e nenhuma campanha foi alterada.

`robots.txt` permite a leitura das páginas e dos recursos visuais e exclui rotas auxiliares. Isso orienta robôs, mas não protege arquivos confidenciais. Não publique segredos nem a pasta `.git`. Os dados estruturados não incluem avaliação própria nem horários semanais: ainda faltam os dias de atendimento confirmados. A faixa de 8h00 às 17h30 continua visível na página Contato.

Os metadados são HTML estático; não dependem de JavaScript para serem lidos. O CSS da referência passou a ser solicitado diretamente no HTML, removendo a dependência de um `@import` em série. A apresentação inicial é imediatamente visível, enquanto as demais seções mantêm seu fade. Não foi realizada medição de desempenho em um domínio público.

## Ativar SEO no domínio definitivo

1. Configure a hospedagem e o HTTPS quando for publicar. Escolha uma única variante de domínio, com ou sem `www`, e redirecione as demais para ela no provedor. O servidor `server.mjs` é apenas para desenvolvimento local.
2. Em `seo.config.json`, copie o domínio confirmado para `siteUrl`, por exemplo `https://assessoriacontabilmm.com`. Manter `plannedSiteUrl` preenchido sozinho não ativa nada.
3. Execute `npm run seo`. O comando atualiza títulos, descrições, dados estruturados, endereços canônicos, URLs de compartilhamento e gera `sitemap.xml` com as cinco páginas. A página inicial usa `/`; as internas usam seus arquivos `.html`. Publique novamente os arquivos gerados.
4. Confira que as cinco páginas, `robots.txt` e `sitemap.xml` respondem corretamente no domínio final. Redirecione `/index.html` para `/` se o provedor permitir, preservando os parâmetros de campanha. Não redirecione páginas inexistentes indiscriminadamente para a página inicial: elas devem retornar 404.
5. Verifique a propriedade no Google Search Console. Para propriedade de domínio, use o registro DNS fornecido pelo Google. Para a opção de prefixo de URL com tag HTML, cole somente o token em `searchConsoleVerification` e execute `npm run seo` novamente.
6. Envie o sitemap no Search Console, inspecione as URLs e valide os dados estruturados no Rich Results Test. A validação técnica não garante exibição de recursos especiais ou determinada posição.
7. Ambientes públicos de teste devem usar autenticação ou `noindex` configurado na hospedagem. Não deixe uma configuração de preview desindexando o domínio de produção. A configuração padrão do projeto não adiciona `noindex` global.

Gerador: `scripts/build-seo.mjs`. Edite os metadados em `seo.config.json`, não dentro do bloco `CONTABIL-MM:SEO` gerado nas páginas. A geração é idempotente. Sem `siteUrl`, não são inventados canonicals ou sitemaps.

## Divulgação local fora do código

A recomendação para o lançamento é manter o Perfil da Empresa no Google consistente com o site: nome, endereço, telefone, serviços e horários reais. Confirme a categoria apropriada, informe os dias de atendimento, publique fotos reais e responda às avaliações. A posição local considera relevância, distância e destaque; anúncios pagos não compram uma classificação orgânica melhor. [Orientação oficial do Google](https://support.google.com/business/answer/7091?hl=pt-BR).

O endereço de referência já usado no site é Rua Treze de Maio, 582, Vila Galvão, Guarulhos — SP; telefone/WhatsApp (11) 99100-1754; e-mail contabilmm@yahoo.com.br. Confira esses dados no perfil público antes do lançamento. Não publique novas regiões, credenciais profissionais ou resultados comerciais sem confirmação da assessoria.

## Google Ads preparado

A instalação e os testes estão detalhados em [MEDICAO.md](MEDICAO.md). Os identificadores permanecem vazios e nenhuma tag Google é baixada na configuração atual. A implementação usa gtag diretamente, com consentimento, e não instala Google Tag Manager em paralelo.

Os três cards identificam a intenção do contato: abrir empresa, trocar de contador e solicitar serviço. Os links flutuantes e do rodapé também identificam sua posição. São cliques de interesse, não conversas ou vendas confirmadas. Recomendo manter essas ações como secundárias até validar os resultados reais do atendimento. Uma ação secundária pode participar dos lances se for incluída em uma meta personalizada; revise também as metas da campanha. [Conversões principais e secundárias](https://support.google.com/google-ads/answer/11461796?hl=pt-BR).

Para uma futura campanha focada em Guarulhos, avalie segmentar a cidade e revisar a opção de presença física habitual. A opção padrão também pode incluir interesse pela região; a escolha deve refletir quem vocês conseguem atender. Nenhuma segmentação ou verba foi alterada nesta entrega. [Opções de local do Google Ads](https://support.google.com/google-ads/answer/1722038?hl=pt-BR).

Destinos já existentes para os anúncios e sitelinks, após a publicação:

- Página inicial: `/`.
- Abertura de empresa: `/servicos.html#abertura-empresa`.
- Fiscal e tributária: `/servicos.html#fiscal-tributaria`.
- Folha de pagamento: `/servicos.html#folha-pagamento`.
- Consultoria: `/servicos.html#consultoria`.
- Planejamento tributário: `/servicos.html#planejamento-tributario`.
- Contato direto: `/contato.html#contact-whatsapp-title`.
- Endereço e horário: `/contato.html#attendance-info-title`.

Exemplo de parâmetros opcionais para organizar campanhas: `?utm_source=google&utm_medium=cpc&utm_campaign=contabilidade_guarulhos`. Use códigos de campanha sem dados pessoais. O módulo preserva os identificadores de atribuição permitidos após o consentimento; não altera links para acrescentar informações dos visitantes.

## Verificar antes da ativação

```sh
npm run seo
npm run check
npm test
python scripts/validate.py
```

Os testes usam dados simulados e não enviam eventos ao Google. Depois dos IDs reais e da publicação, valide a recepção com Tag Assistant, GA4 e os diagnósticos da conta Google Ads. Até lá, não é possível afirmar que a conta está conectada, que houve indexação ou que o custo por contato melhorou.

Referências técnicas: [dados estruturados de empresas locais](https://developers.google.com/search/docs/appearance/structured-data/local-business), [Consent Mode](https://developers.google.com/tag-platform/security/guides/consent), [cliques como conversão](https://support.google.com/google-ads/answer/6331304).
