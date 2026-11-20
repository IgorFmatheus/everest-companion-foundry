# Everest — Vampire Companion

Módulo independente para **FoundryVTT 13**. Abre https://everestkitchen.com.br/companion em uma janela móvel e redimensionável. Não depende do sistema de regras instalado.

## Instalação pelo manifesto

No Foundry, abra **Add-on Modules → Install Module** e cole no campo **Manifest URL**:

```text
https://github.com/IgorFmatheus/everest-companion-foundry/releases/latest/download/module.json
```

Clique em **Install**, entre no mundo e ative **Everest — Vampire Companion** em **Gerenciar Módulos**.
O mesmo endereço estável acompanha as próximas releases e permite atualizar pelo Foundry.

## Instalação manual

1. Copie `module.json`, `scripts/` e `styles/` para `Data/modules/everest-companion/` na pasta de dados do Foundry.
2. Reinicie o Foundry e ative **Everest — Vampire Companion** em Gerenciar Módulos no seu mundo.
3. Abra a aba de configurações e clique em **Vampire Companion**, ou use **Shift+C**. O atalho pode ser alterado nas configurações de teclado.
4. Ative o dispositivo com sua chave do companion, caso solicitado. A conta do Foundry não substitui a autenticação do companion.

Macro opcional:

```js
game.modules.get("everest-companion").api.open();
```

## Hospedagem

O site precisa publicar a alteração que permite `frame-ancestors https://vampire.everestkitchen.com.br` exclusivamente nas páginas `/companion`. O servidor não deve enviar `X-Frame-Options: DENY` nessas páginas. A variável `COMPANION_FRAME_ANCESTORS` aceita origens HTTPS exatas separadas por vírgula; não use caminhos ou curingas.

Foundry: `https://vampire.everestkitchen.com.br/`.
Companion: `https://everestkitchen.com.br/companion`.

Ambos usam HTTPS e o mesmo domínio base, permitindo manter o cookie HttpOnly `SameSite=Strict`. Cada navegador mantém sua própria sessão. Acesso ao Foundry por IP, localhost, outro domínio ou outro protocolo exige uma solução de autenticação diferente. O endereço configurado no módulo não modifica a lista de origens permitidas no servidor.

## Desempenho e uso

O módulo não inclui React, bibliotecas ou cópia do backend. O companion carrega apenas ao abrir a janela. Abrir novamente traz a mesma janela para frente; redimensionar preserva o iframe e a conexão de eventos. Minimizar mantém a aplicação conectada para receber mensagens; fechar encerra o iframe. Uma janela fechada não recebe notificações pelo módulo.

Som depende de interação do jogador dentro do companion. Notificações visuais continuam no celular; notificações do sistema podem ser restritas em iframes. Use **Abrir em outra aba** se precisar das permissões completas do navegador.

## Distribuição

Este repositório é independente e não precisa de dependências npm. A GitHub Action valida o JavaScript,
o manifesto e o conteúdo do ZIP em pushes e pull requests. Ao enviar uma tag `vX.Y.Z`, ela publica
uma release com `module.json`, `everest-companion.zip` e `SHA256SUMS.txt` usando o token automático
do GitHub Actions; não exige cadastrar um segredo extra.

Para uma nova versão:

1. Altere `version` e o segmento `vX.Y.Z` de `download` no `module.json`.
2. Faça commit e envie para `main`.
3. Crie e envie a tag correspondente, por exemplo:

```sh
git tag v0.1.1
git push origin v0.1.1
```

A automação rejeita tags que não correspondem à versão do manifesto. `manifest` permanece apontando
para `releases/latest/download/module.json`; `download` aponta para o ZIP daquela versão específica.
O ZIP contém apenas o manifesto, o README e os arquivos JavaScript/CSS usados pelo módulo.

Para empacotar localmente com Python 3.9 ou superior:

```sh
python scripts/package.py
```

Os arquivos são gerados em `dist/`, ignorado pelo Git.

## Validação em uma mesa

O código usa a API ApplicationV2 do Foundry 13. Antes de distribuir, confirme no Foundry real: ativação individual de dois jogadores, reconexão ao reabrir, mensagens em tempo real, som após interação, minimizar/restaurar, redimensionar e acesso a arquivos/mapa/notícias/fórum. Testes locais não substituem essa validação com o servidor e os navegadores da mesa.
