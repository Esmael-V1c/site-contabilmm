# Google Ads e Analytics: preparação para ativação futura

**Estado atual:** a integração está preparada e desativada. Nenhuma conta Google foi conectada, nenhuma tag Google é baixada e nenhum anúncio foi alterado. `googleAdsId`, `ga4Id`, os rótulos e `allowedHosts` estão vazios em `config.js`. O domínio previsto é `assessoriacontabilmm.com`; configurar esse nome não publica o site.

## Como ativar quando os identificadores estiverem disponíveis

1. Publique e confirme o site no domínio final com HTTPS. Teste os contatos e as informações da empresa.
2. No Google Ads, obtenha o **ID da tag Google Ads**, iniciado por `AW-`, e os **rótulos das ações de conversão**. São identificadores públicos da tag; não é necessário colocar senha, chave de API ou credencial no projeto.
3. Em `config.js`, preencha `measurement.googleAdsId` com o ID `AW-` real. Em `conversionLabels`, preencha cada rótulo correspondente, sem incluir o ID ou a barra. Deixe vazio qualquer canal que não deva gerar conversão no Ads.
4. Preencha `measurement.allowedHosts` somente com o domínio de produção efetivamente configurado. Para o domínio previsto, use `["assessoriacontabilmm.com"]`. Acrescente `www.assessoriacontabilmm.com` apenas se essa variante realmente servir o site. A correspondência é exata, sem protocolo, barra ou porta. Domínios de preview e ambiente local devem permanecer fora dessa lista.
5. Opcionalmente, preencha `measurement.ga4Id` com o ID de um fluxo web GA4 (`G-`). **Antes de ativá-lo, desative “Medição otimizada/melhorada” (Enhanced measurement) no fluxo de dados**, inclusive cliques de saída, interações com formulário, pesquisa e page views automáticas de navegação. Esta implementação envia seus próprios eventos. Isso evita captura extra de URLs/textos e métricas duplicadas.
6. Na configuração da tag/conta, não habilite coleta automática de dados fornecidos pelo usuário ou conversões otimizadas (enhanced conversions) sem uma implementação específica. Este projeto não envia nomes, e-mails, telefones, conteúdo de mensagens ou dados dos campos do formulário ao Google.
7. Não instale outra tag direta ou um contêiner GTM medindo as mesmas ações em paralelo. Se a mesma ação for importada do GA4 e medida diretamente no Ads, escolha uma única fonte para usá-la como conversão principal.
8. Confirme o funcionamento em produção com Tag Assistant e o diagnóstico de conversões da conta, conforme o roteiro abaixo. A medição só funciona após autorização no aviso de privacidade.

## Eventos e significado

| Ação no site | Evento GA4 | Campo do rótulo no Ads | Uso sugerido no Ads |
| --- | --- | --- | --- |
| Abertura do WhatsApp | `contact_click`, método `whatsapp` | `whatsapp_click` | Secundária: intenção de contato |
| Abertura do Gmail/e-mail | `contact_click`, método `email` | `email_click` | Secundária: intenção de contato |
| Clique em link de telefone | `contact_click`, método `phone` | `phone_click` | Secundária: intenção de contato |
| Formulário com resposta HTTP 2xx | `generate_lead`, método `form` | `form_submit` | Principal somente após ativar e validar o recebimento real |
| Visualização da página após consentimento | `page_view` | Nenhum | Apenas GA4 |

Um clique no WhatsApp ou Gmail **não confirma que uma mensagem foi enviada**, nem que um cliente foi contratado. Use essas ações como secundárias para avaliar o interesse; otimizar lances apenas por cliques pode favorecer contatos sem qualidade. Para leads, normalmente utilize a contagem “Uma” por interação com anúncio, conforme a estratégia validada na conta.

Os formulários usam `contactMethod: "whatsapp"` e abrem uma mensagem pronta com os campos preenchidos. A abertura é tratada como `whatsapp_click`/`contact_click`, com a posição `home` ou `contact`; não dispara `generate_lead` nem `form_submit`, pois o visitante ainda precisa confirmar o envio no WhatsApp. Os dados preenchidos e a URL da mensagem não são enviados à medição. O modo opcional `contactMethod: "endpoint"` usa `contactEndpoint`, atualmente vazio: somente uma resposta HTTP 2xx permite registrar o recebimento pelo serviço. Isso não confirma qualificação comercial. Para otimizar por clientes ou propostas efetivas, uma etapa posterior deverá integrar os resultados reais de atendimento/CRM.

## Consentimento e limites

- O módulo usa Consent Mode v2 básico: inicia `analytics_storage`, `ad_storage`, `ad_user_data` e `ad_personalization` como `denied`; não faz download de tags Google antes do aceite.
- Ao aceitar, apenas o armazenamento necessário às integrações configuradas é concedido. Personalização de anúncios e Google Signals permanecem desabilitados; não há remarketing nesta implementação.
- A chave local `mm-measurement-consent-v1` registra “accepted” ou “declined”. A preferência antiga `mm-cookie-preference` era de um aviso informativo e não autoriza as novas métricas.
- “Preferências de cookies” no rodapé reabre o aviso. Ao recusar, o módulo transmite o estado negado à tag já carregada, descarta os eventos pendentes e para de enviar novos eventos. A escolha é sincronizada entre abas da mesma origem. A revogação não apaga retroativamente dados enviados durante um aceite anterior.
- Se o armazenamento do navegador estiver bloqueado, a escolha funciona durante a página atual e será solicitada novamente. Sem IDs ou fora dos domínios autorizados, o aviso fica oculto inicialmente, pode ser consultado no rodapé e não salva um aceite antecipado.
- O módulo bloqueia medição em HTTP, localhost, IPs, portas de desenvolvimento e nomes fora de `allowedHosts`. Sem consentimento, a navegação e os contatos continuam funcionando normalmente.
- O código transmite apenas método do contato, intenção/posição predefinidas e categoria estática da página. Não transmite o URL do WhatsApp/Gmail, a mensagem pronta, o texto do botão nem o conteúdo digitado no formulário.
- A URL de página enviada descarta fragmentos e parâmetros livres. Preserva somente `gclid`, `gbraid`, `wbraid`, `gclsrc` e os seis parâmetros `utm_source`, `utm_medium`, `utm_campaign`, `utm_id`, `utm_term`, `utm_content`, com até 200 caracteres ASCII de identificador (letras, números, `_`, `-`, `.`, `~`). Nomes de campanha devem ser códigos descritivos, **nunca dados pessoais**. Espaços, e-mails e outros caracteres não passam por esse filtro. O referrer conserva apenas a origem, sem caminho ou consulta.
- A tag oficial gerencia a atribuição de campanhas após o aceite. O projeto não cria armazenamento próprio de identificadores de anúncios. Configurações adicionais feitas na conta Google podem alterar o comportamento da tag; revise-as ao ativar.

## Contrato para manutenção

Carregue `config.js`, `measurement.js` e `script.js`, nessa ordem, usando `defer`.

O módulo reconhece links HTTPS de `api.whatsapp.com`, `wa.me`, `web.whatsapp.com`, links de `mail.google.com/mail/`, `mailto:` e `tel:`. Ele nunca bloqueia a navegação para aguardar o Google. Os atributos opcionais dos links são:

- `data-contact-intent`: `abrir_empresa`, `trocar_contador`, `servico` ou `geral`.
- `data-contact-placement`: `header`, `footer`, `floating`, `home`, `services` ou `contact`.

Valores fora dessas listas são substituídos por `geral` e `contact`. Cada evento inclui `page_type`, derivado da rota conhecida, sem depender do título ou texto da página. Repetições da mesma ação/intenção/posição em menos de 1,5 segundo são descartadas.

No modo `endpoint`, chamar apenas após resposta bem-sucedida do serviço (nunca na abertura do WhatsApp):

```js
window.MMMeasurement?.trackFormSuccess({ intent: "geral", placement: "contact" });
```

Nunca passe `FormData`, o nome, e-mail, telefone ou mensagem para essa API. Não dispare esse hook na validação, no clique do botão, em erros de rede nem na janela de “envio não configurado”.

Controles do aviso: `[data-cookie="accepted"]`, `[data-cookie="declined"]`, `[data-cookie-settings]`, `.cookie-notice` e `[data-cookie-description]`.

## Validação antes de habilitar campanhas

Os testes locais não fazem requisições ao Google:

```sh
node --test tests/measurement.test.cjs
```

No site de produção, após configurar os IDs:

1. Em uma sessão sem a preferência salva, confira que nenhum script/requisição Google de medição ocorre antes da escolha ou após uma recusa inicial.
2. Aceite e confira no Tag Assistant o ID correto, os estados de consentimento e uma única visualização no GA4. O código não envia `page_view` ao Ads.
3. Clique uma vez em cada tipo de contato. Confirme um `contact_click` no GA4 e, se configurado, uma conversão enviada apenas ao rótulo correspondente do Ads. O botão continua abrindo o canal normalmente.
4. Confirme que nome, e-mail, telefone, mensagem e consultas arbitrárias não aparecem nos parâmetros enviados. Revise também as opções automáticas da propriedade/tag.
5. Recuse pelas preferências e confira que novos cliques/envios não geram eventos do módulo. Repita em outra aba.
6. Com o endpoint realmente ativo, valide que só um envio recebido com sucesso registra `generate_lead`; erro, campos inválidos e endpoint ausente não devem fazê-lo.
7. Confira a categoria, origem e status de cada ação no Google Ads antes de incluí-la nas metas de lances. Validação local não comprova recebimento na conta; isso depende dos IDs e da implantação real.

## Documentação oficial consultada

- [Configurar Consent Mode](https://developers.google.com/tag-platform/security/guides/consent)
- [Consentimento básico e avançado](https://developers.google.com/tag-platform/security/concepts/consent-mode)
- [Direcionar eventos a destinos específicos com send_to](https://developers.google.com/tag-platform/gtagjs/routing)
- [Eventos de medição otimizada do GA4](https://support.google.com/analytics/answer/9216061)
