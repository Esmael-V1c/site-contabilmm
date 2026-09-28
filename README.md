# Contabil MM — versão local

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
- `contato.html`: formulário de contato.
- `style.css`: ajustes visuais e adaptação para celular.
- `assets/reference.css`: estilos da referência, incluindo fontes locais.
- `script.js`: menu responsivo, preferência de cookies e validação/envio do formulário.
- `config.js`: configuração do endereço de envio.
- `assets/`: imagens, logotipos e fontes; `sources.json` registra suas URLs de origem.
- `server.mjs`: servidor local opcional, limitado a 127.0.0.1.

## Formulário

Para ativar o envio real, preencha `contactEndpoint` em `config.js` com seu próprio endpoint. Ele deverá aceitar POST com JSON contendo `nome`, `email`, `empresa`, `cargo`, `telefone` e `mensagem`, e responder com HTTP 2xx quando a mensagem for recebida. Se estiver em outro domínio, configure CORS no serviço.

Sem essa configuração, os campos são validados e uma janela informa que nenhum dado foi enviado, com acesso ao formulário oficial. Não há uma confirmação falsa de envio e não se utiliza a integração privada do site original. O serviço de recebimento deve aplicar sua própria validação e proteção contra spam.

Os atalhos de WhatsApp usam o número fornecido da assessoria: (11) 99100-1754. Os links de e-mail do rodapé e da seção de atendimento abrem a tela de nova mensagem do Gmail em outra aba com o destinatário contabilmm@yahoo.com.br, informado pela assessoria. Isso não configura o envio do formulário.

A página de contato apresenta informações de atendimento abaixo da seção de WhatsApp: horário presencial e remoto das 8h30 às 17h30, endereço na Rua Treze de Maio, 582, com link para o Google Maps, e e-mail.

O rodapé inclui endereço com link para o perfil da Contabil MM no Google Maps, aberto em nova aba, e ícones de WhatsApp, Instagram e e-mail com cores de destaque. A localização usa o mesmo perfil verificado na seção de depoimentos.

## Recursos e limites

As quatro páginas, imagens e fontes estão salvas localmente. Os mapas incorporados usam OpenStreetMap e precisam de internet; links externos também. Nenhum rastreador do site original foi importado. A escolha no aviso de cookies é guardada apenas no navegador.

O HTML foi corrigido para evitar links aninhados presentes na referência. O menu funciona por toque e teclado, e as animações da referência não impedem a leitura do conteúdo. Os textos e materiais de marca foram mantidos para atender à fidelidade solicitada.

## Animação das seções

Imagens e textos entram com um fade de 750 ms quando aparecem na tela pela primeira vez. O `IntersectionObserver` deixa de observar cada elemento após a entrada, de modo que voltar à seção não repete o efeito. O estado existe apenas na página atual e reinicia ao recarregar. Cards de avaliação são animados como um único bloco. Elementos focados pelo teclado ficam visíveis imediatamente; a preferência de movimento reduzido é respeitada. Sem JavaScript, o conteúdo permanece visível.

## Depoimentos

A seção usa dez cards de texto, com resumos fiéis às avaliações antes exibidas nas imagens `assets/avaliacao_1.jpeg` a `assets/avaliacao_10.jpeg`. Os arquivos originais foram preservados como referência; as fotos não aparecem no carrossel. As notas individuais são de 5 estrelas, conforme essas avaliações.

A nota geral de **5,0 em 191 avaliações** foi consultada no [perfil da Assessoria Contábil MM no Google Maps](https://www.google.com/maps/?cid=4580796176665174713) em **25/09/2026**. É uma informação estática com data de consulta, sem atualização automática. Para atualizá-la, edite o bloco `reviews-summary` em `index.html` após verificar novamente a fonte.

As setas percorrem um card por vez; o celular também permite arrastar. O carrossel aceita as teclas ←, →, Home e End quando está em foco, respeita a preferência de movimento reduzido e desativa as setas nos limites.

## Verificação

```sh
npm run check
python scripts/validate.py
```

O segundo comando exige Python 3 (somente biblioteca padrão). Ele verifica arquivos referenciados, links locais e estrutura básica. `scripts/import_reference.py` registra a rotina de importação; ela usa a cache em `.reference/` e sobrescreve as páginas geradas, portanto preserve suas edições antes de utilizá-la. A pasta `.reference/` não é necessária para executar o site.
