# Guia técnico — Site ContabilMM

Reprodução visual de https://www.contabilmm.com/, realizada em 25/09/2026. Projeto em HTML, CSS e JavaScript, sem instalação de dependências.

## Como abrir

Abra `index.html` no navegador, ou execute na pasta do projeto:

```sh
npm start
```

Depois acesse http://127.0.0.1:4173. Para parar o servidor, pressione Ctrl+C no terminal.

## Arquivos

- `index.html`: página inicial com apresentação, serviços, clientes, depoimentos e formulário.
- `servicos.html`: serviços contábeis.
- `sobre.html`: história e equipe.
- `contato.html`: formulário, WhatsApp e informações de atendimento.
- `privacidade.html`: dados de contato, ferramentas de medição e preferências de cookies.
- `style.css`: ajustes visuais e adaptação para celular.
- `assets/reference.css`: estilos da referência, incluindo fontes locais.
- `script.js`: menu responsivo, animações e validação/envio do formulário.
- `measurement.js`: Google Ads/GA4 opcionais com consentimento e eventos de contato.
- `config.js`: modo de contato e número do WhatsApp; endpoint opcional e IDs/hosts de medição ainda vazios.
- `seo.config.json`: metadados e domínio previsto; domínio ativo ainda vazio.
- `scripts/build-seo.mjs`: gerador dos metadados estáticos, robots.txt e futuro sitemap.
- `assets/`: imagens, logotipos e fontes; `sources.json` registra suas URLs de origem.
- `server.mjs`: servidor local opcional, limitado a 127.0.0.1.

## Formulário

Os formulários da página inicial e da página Contato já estão configurados para abrir o WhatsApp **(11) 99100-1754** com uma mensagem organizada: nome, e-mail, empresa, cargo, telefone, descrição e página de origem. Campos opcionais vazios aparecem como “Não informado”. O visitante precisa revisar a mensagem e tocar em **Enviar no WhatsApp** para que a assessoria a receba. Abrir a conversa não confirma o envio.

Em `config.js`, `contactMethod: "whatsapp"` ativa esse fluxo e `contactWhatsAppNumber: "5511991001754"` define o destinatário dos formulários. Use somente dígitos, incluindo país (55) e DDD (11). Não é necessário preencher `contactEndpoint`, contratar um serviço ou criar uma chave de API. Essa configuração altera o destino dos formulários; os demais atalhos de contato estão no HTML.

Para conferir manualmente: atualize o site, preencha um formulário com dados de teste, clique em “Continuar no WhatsApp” e confira o destinatário e todos os campos na mensagem pronta. No computador, entre no WhatsApp Web ou abra o aplicativo se solicitado; no celular, abra o WhatsApp. Para testar o recebimento, envie a mensagem de teste pelo próprio WhatsApp. Caso a conversa não abra automaticamente, use o link “Abrir WhatsApp com os dados preenchidos” exibido abaixo do formulário. Os campos permanecem preenchidos e a mensagem é atualizada ao enviar novamente após uma edição.

Para usar futuramente um serviço próprio, altere `contactMethod` para `"endpoint"`, preencha `contactEndpoint` e ajuste os textos de orientação das páginas. O serviço deverá aceitar POST JSON com `nome`, `email`, `empresa`, `cargo`, `telefone` e `mensagem`, responder HTTP 2xx quando receber a solicitação e aplicar validação e proteção contra spam. Configure CORS se ele estiver em outro domínio. Não coloque chaves privadas no `config.js`, pois o arquivo é público.

Referência: [clique para conversa do WhatsApp](https://faq.whatsapp.com/5913398998672934/?locale=pt_BR).

Os atalhos de WhatsApp usam o número fornecido da assessoria: (11) 99100-1754. Os links de e-mail do rodapé e da seção de atendimento abrem a tela de nova mensagem do Gmail em outra aba com o destinatário contabilmm@yahoo.com.br, informado pela assessoria. Isso não configura o envio do formulário.

A página de contato apresenta informações de atendimento abaixo da seção de WhatsApp: horário presencial e remoto das 8h00 às 17h30, endereço na Rua Treze de Maio, 582, com link para o Google Maps, e e-mail.

O rodapé inclui endereço com link para o perfil da Contabil MM no Google Maps, aberto em nova aba, e ícones de WhatsApp, Instagram e e-mail com cores de destaque. A localização usa o mesmo perfil verificado na seção de depoimentos.

## Recursos e limites

As cinco páginas, imagens e fontes estão salvas localmente. Os mapas incorporados usam OpenStreetMap e precisam de internet; links externos também. Nenhum rastreador do site original foi importado. A preferência de medição é guardada no navegador. As tags de Ads/Analytics estão preparadas, mas dependem de configuração e consentimento para carregar.

O HTML foi corrigido para evitar links aninhados presentes na referência. O menu funciona por toque e teclado, e as animações da referência não impedem a leitura do conteúdo. Os textos principais, títulos e descrições destacam a atuação em Guarulhos e Vila Galvão, mantendo os materiais de marca.

## Animação das seções

A apresentação inicial é exibida imediatamente. Nas demais seções, imagens e textos entram com um fade de 750 ms quando aparecem na tela pela primeira vez. O `IntersectionObserver` deixa de observar cada elemento após a entrada, de modo que voltar à seção não repete o efeito. O estado existe apenas na página atual e reinicia ao recarregar. Cards de avaliação são animados como um único bloco. Elementos focados pelo teclado ficam visíveis imediatamente; a preferência de movimento reduzido é respeitada. Sem JavaScript, o conteúdo permanece visível.

## Depoimentos

A seção usa dez cards de texto, com resumos fiéis às avaliações antes exibidas nas imagens `assets/avaliacao_1.jpeg` a `assets/avaliacao_10.jpeg`. Os arquivos originais foram preservados como referência; as fotos não aparecem no carrossel. As notas individuais são de 5 estrelas, conforme essas avaliações.

A nota geral de **5,0 em 191 avaliações** foi consultada no [perfil da Assessoria Contábil MM no Google Maps](https://www.google.com/maps/?cid=4580796176665174713) em **25/09/2026**. É uma informação estática com data de consulta, sem atualização automática. Para atualizá-la, edite o bloco `reviews-summary` em `index.html` após verificar novamente a fonte.

As setas percorrem um card por vez; o celular também permite arrastar. O carrossel aceita as teclas ←, →, Home e End quando está em foco, respeita a preferência de movimento reduzido e desativa as setas nos limites.

## Verificação

```sh
npm run seo
npm run check
npm test
python scripts/validate.py
```

O último comando exige Python 3 (somente biblioteca padrão). Ele verifica arquivos referenciados, links locais e âncoras, títulos, descrições e JSON-LD. `scripts/import_reference.py` registra a rotina de importação; ela usa a cache em `.reference/` e sobrescreve as páginas geradas, portanto preserve suas edições antes de utilizá-la. A pasta `.reference/` não é necessária para executar o site.

## SEO e Google Ads

O domínio previsto é `assessoriacontabilmm.com`. Nenhum domínio ou rastreador foi ativado: `siteUrl`, os IDs Google e `allowedHosts` continuam vazios. Consulte [o guia de SEO e lançamento](SEO-E-DIVULGACAO.md) e [o guia de medição](MEDICAO.md) para preencher as configurações e validar quando houver publicação.

O gerador já prepara metadados de Guarulhos e dados estruturados do escritório em HTML estático. Canonicals e sitemap são gerados somente após a ativação explícita do domínio. Cliques de WhatsApp/e-mail são separados de formulários confirmados; não representam vendas.

## Vitrine de empresas

A seção `#empresas` da página inicial reúne 24 logos (10 existentes e 14 enviados) em uma única lista HTML, sem duplicar o conteúdo entre celular e desktop. O título e os indicadores de clientes foram atualizados para +400 conforme informado pela assessoria.

A página `sobre.html` também exibe as mesmas 24 empresas, imediatamente acima de `assets/start_about_us_page.png`. A variante `.clients-showcase--compact` acompanha a largura da imagem, com título em escala menor, logos de 100–112 px de altura e espaçamentos reduzidos. Ela compartilha `clients.js`, incluindo movimento contínuo, pausa por interação, setas e visualização em grade. Ao atualizar a lista de empresas, mantenha os cards das duas páginas sincronizados; os arquivos de imagem são compartilhados.

O layout parte do celular, com arraste horizontal nativo e parte do próximo card visível. Em telas maiores, aumenta o número de cards. `clients.js` acrescenta setas, navegação por teclado, indicador da posição, pausa/retomada e botão para exibir toda a lista em grade. Sem JavaScript, as empresas continuam acessíveis por rolagem.

A faixa desliza continuamente da direita para a esquerda a 24 pixels por segundo, sem intervalos entre cards e sem salto na junção entre o fim e o começo. O movimento ocorre apenas quando a lista está visível e a aba está ativa. Passar o mouse sobre um card suspende o movimento até a saída do ponteiro; passar sobre o título ou o fundo não pausa. Ao tocar, usar teclado ou navegar manualmente, ela pausa até ser reativada pelo botão “Ativar exibição”. A preferência de movimento reduzido desativa a animação. Cópias exclusivamente visuais completam o ciclo, ficam fora da leitura acessível e da navegação por teclado e são ocultadas na grade “Ver todas”.

Os 14 originais estão em `assets/clients/originals/`. As cinco restaurações feitas com a ferramenta integrada de edição de imagens estão em `assets/clients/restored/` (LL Solução Gráfica, Rassul, Guarutech, Trilhofer e Central Auto Vidros). Os prompts estão em `assets/clients/restoration-notes.json`. As imagens exibidas usam WebP, dimensões explícitas, `srcset` e carregamento sob demanda. `assets/clients/sources.json` registra as origens e variantes. Nenhum endereço de site foi inventado para as novas empresas.
