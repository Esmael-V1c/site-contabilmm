# Contribuindo com o Site ContabilMM

Este guia é destinado aos colaboradores com acesso ao repositório privado.

## Preparação

Use Node.js 24 e Python 3. Não há dependências npm para instalar.
Execute `npm start` e acesse http://127.0.0.1:4173.

## Fluxo de trabalho

1. Atualize sua cópia de `main` e crie uma branch descritiva, como `codex/ajuste-contato`.
2. Faça alterações pequenas, preservando os caminhos dos arquivos e os materiais de marca.
3. Atualize a documentação quando mudar o comportamento ou a configuração.
4. Execute as verificações abaixo, revise o diff e abra um pull request.

```sh
npm run check
npm test
python scripts/validate.py
```

Ao editar `seo.config.json`, execute também `npm run seo` e inclua os arquivos gerados no commit. Não use `scripts/import_reference.py` como etapa de build: ele sobrescreve páginas.

## Conferência visual e funcional

- Confira as páginas afetadas no celular e no desktop.
- Navegue pelo teclado e preserve foco visível, rótulos e textos alternativos.
- Respeite a preferência de movimento reduzido em novas animações.
- Nos formulários, confirme que a mensagem preparada corresponde aos campos. Abrir o WhatsApp não confirma o envio.
- Mantenha o registro de origem ao adicionar imagens, fontes ou logotipos.

## Commits e pull requests

Use mensagens curtas e claras, por exemplo `docs: atualiza guia de contato` ou `fix: corrige foco do menu`. Descreva o problema, a mudança e como ela foi verificada. Inclua imagens quando houver alteração visual relevante.

Relate problemas e sugestões pelos modelos de issues. Não inclua credenciais ou dados reais de clientes nos exemplos, prints, testes ou logs.
