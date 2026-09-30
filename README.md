<div align="center">
  <img src="docs/assets/repository-banner.png" alt="Site ContabilMM — presença digital para uma contabilidade próxima" width="100%">

  <h1>Site ContabilMM</h1>
  <p><strong>Uma presença digital clara, acessível e feita para aproximar pessoas.</strong></p>
  <p>Site institucional da Assessoria Contábil MM, em Guarulhos · Vila Galvão.</p>

  <p>
    <img alt="HTML5" src="https://img.shields.io/badge/HTML5-E34F26?style=flat-square&amp;logo=html5&amp;logoColor=white">
    <img alt="CSS3" src="https://img.shields.io/badge/CSS3-225189?style=flat-square&amp;logo=css&amp;logoColor=white">
    <img alt="JavaScript" src="https://img.shields.io/badge/JavaScript-EBB347?style=flat-square&amp;logo=javascript&amp;logoColor=163559">
    <img alt="Node.js 24" src="https://img.shields.io/badge/Node.js-24-417E38?style=flat-square&amp;logo=nodedotjs&amp;logoColor=white">
    <img alt="Sem dependências de aplicação" src="https://img.shields.io/badge/dependências-0-163559?style=flat-square">
  </p>

  <p>
    <a href="#comece-aqui">Comece aqui</a> ·
    <a href="#o-que-o-site-entrega">Recursos</a> ·
    <a href="docs/README.md">Documentação</a> ·
    <a href="CONTRIBUTING.md">Contribuir</a>
  </p>
</div>

---

## Sobre o projeto

Cinco páginas institucionais construídas com HTML, CSS e JavaScript, com imagens e fontes locais, navegação responsiva e contato pelo WhatsApp. O projeto partiu de uma reprodução visual de [contabilmm.com](https://www.contabilmm.com/), realizada em 25/09/2026, e recebeu ajustes de conteúdo, acessibilidade, SEO e interação.

**Sem etapa de build para navegar.** O Node.js executa o servidor de desenvolvimento, o gerador de SEO e os testes. Python é usado na validação dos arquivos HTML.

> **Estado atual:** execução local pronta. A ativação do domínio de produção e das medições Google depende de configuração. O envio do código ao GitHub não publica o site na internet.

## Prévia

![Página inicial do Site ContabilMM em uma tela de desktop](docs/assets/site-preview.png)

<sub>Captura local da página inicial em 30/09/2026. O conteúdo se adapta a telas menores.</sub>

## O que o site entrega

| Recurso | Como funciona |
| --- | --- |
| **Cinco páginas** | Início, serviços, sobre, contato e privacidade. |
| **Contato pelo WhatsApp** | Prepara uma mensagem com os dados do formulário; o visitante revisa e confirma o envio no WhatsApp. |
| **Vitrine de clientes** | 24 marcas, imagens responsivas, navegação por teclado e opção de exibição em grade. |
| **Depoimentos** | Carrossel navegável por toque e teclado, com fonte e data da avaliação geral documentadas. |
| **Acessibilidade** | Menu por teclado, foco visível e respeito à preferência de movimento reduzido. |
| **SEO estático** | Títulos, descrições e JSON-LD; canonical e sitemap condicionados ao domínio definitivo. |
| **Medição opcional** | Google Ads e GA4 preparados para configuração explícita e consentimento. |

## Comece aqui

Use **Node.js 24**. Não é necessário executar `npm install`: o projeto não possui dependências npm.

Depois de obter o repositório, abra um terminal na pasta do projeto:

```sh
npm start
```

Acesse **http://127.0.0.1:4173**. Para encerrar, pressione `Ctrl+C`.

Também é possível abrir `index.html` diretamente; o servidor local é preferível para verificar o comportamento em HTTP. Mapas incorporados e destinos externos precisam de internet.

## Comandos

| Comando | Finalidade |
| --- | --- |
| `npm start` | Abre o servidor local na porta 4173. |
| `npm run check` | Confere a sintaxe dos arquivos JavaScript. |
| `npm test` | Executa os testes de clientes, formulários, medição e SEO. |
| `npm run seo` | Atualiza metadados, robots.txt e, quando configurado, sitemap.xml. |
| `python scripts/validate.py` | Valida recursos, links, âncoras e metadados das cinco páginas. Requer Python 3. |

O workflow [Qualidade](.github/workflows/ci.yml) executa as verificações em pushes e pull requests. Ele também verifica se os metadados gerados estão sincronizados com a configuração.

## Estrutura

```text
site-contabilmm/
├── .github/              # Automação e modelos de issues / pull requests
├── assets/               # Imagens, fontes e registros de origem
│   └── clients/          # Logos originais, restaurações e variantes WebP
├── docs/                 # Guias de manutenção, SEO e medição
│   └── assets/           # Identidade visual do repositório
├── scripts/              # Geração de SEO e validação
├── tests/                # Testes com o runner nativo do Node.js
├── index.html            # Página inicial
├── servicos.html         # Serviços contábeis
├── sobre.html            # História e equipe
├── contato.html          # Formulário e atendimento
├── privacidade.html      # Privacidade e preferências de cookies
├── style.css             # Layout e adaptação para diferentes telas
├── script.js             # Navegação, animações e formulários
├── clients.js            # Vitrine de clientes
├── measurement.js        # Consentimento e eventos de medição
├── config.js             # Contato e integração opcional de medição
├── seo.config.json       # Metadados e domínio
└── server.mjs            # Servidor de desenvolvimento
```

## Configuração

- **Contato:** edite `config.js`. O modo atual abre o WhatsApp; um endpoint próprio é opcional.
- **SEO e domínio:** edite `seo.config.json` e execute `npm run seo`. `siteUrl` permanece vazio até a definição do domínio de produção.
- **Medição:** informe os IDs e os hosts permitidos em `config.js`, seguindo o [guia de medição](docs/MEDICAO.md).
- **Conteúdo e visual:** edite as páginas HTML, `style.css` e os recursos em `assets/`.

Os arquivos do frontend são públicos quando o site é hospedado. Credenciais privadas não devem ser incluídas em `config.js` nem no código enviado ao navegador.

## Documentação

| Guia | Conteúdo |
| --- | --- |
| [Índice da documentação](docs/README.md) | Caminhos para começar e manter o projeto. |
| [Guia técnico](docs/GUIA-TECNICO.md) | Formulários, animações, avaliações, clientes e detalhes operacionais. |
| [SEO e divulgação](docs/SEO-E-DIVULGACAO.md) | Domínio, metadados e preparação para lançamento. |
| [Medição](docs/MEDICAO.md) | Consentimento, eventos e configuração de Ads / GA4. |
| [Contribuição](CONTRIBUTING.md) | Fluxo de alterações e verificação antes do envio. |

## Autoria e materiais

Projeto mantido por **Esmael-V1c** para o Site ContabilMM. As origens dos recursos estão registradas em [`assets/sources.json`](assets/sources.json) e [`assets/clients/sources.json`](assets/clients/sources.json). Marcas, fotografias, fontes e materiais de terceiros mantêm seus respectivos direitos; este repositório não acrescenta uma licença de redistribuição para esses materiais.

A apresentação do repositório se inspira na navegação do [Best-README-Template](https://github.com/othneildrew/Best-README-Template) e na organização de documentação do [Astro](https://github.com/withastro/astro), com texto e identidade visual próprios.
