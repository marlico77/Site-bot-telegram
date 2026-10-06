# MarlicoBot

Site de downloads do MarlicoBot para Android e Windows. Busca as versões no GitHub Releases e mostra os instaladores e as novidades de cada atualização.

## Rodar localmente

Precisa de Node.js 22 ou superior.

```sh
npm start
```

Abra http://localhost:8787. Sem um repositório de versões configurado, os downloads aparecem como “em breve”.

## Deploy no Netlify

1. Importe `marlico77/Site-bot-telegram` pelo GitHub.
2. Selecione a branch `main`.
3. Deixe o diretório base e o comando de build vazios. O diretório de publicação é `public`.
4. Faça o deploy. O arquivo `netlify.toml` configura as funções e o Node.js 22.

Pode publicar antes de criar o repositório dos instaladores: o site abrirá com os downloads “em breve”. Depois, adicione `RELEASES_REPOSITORY` nas variáveis de ambiente do Netlify, disponível para **Functions**, e faça um novo deploy. Não use `npm start` como comando de build.

## Configuração

Defina estas variáveis no ambiente de hospedagem:

| Variável | Valor |
| --- | --- |
| `RELEASES_REPOSITORY` | Repositório dos instaladores, no formato `dono/repositorio` |
| `GITHUB_TOKEN` | Opcional; token de leitura para aumentar a cota de consultas ao GitHub |
| `HOST` | `127.0.0.1` por padrão; `0.0.0.0` em contêiner |
| `PORT` | `8787` por padrão |

Este repositório contém só o site. O repositório dos instaladores será configurado depois e deve ser **público**, pois os downloads vão direto do GitHub para o visitante. O código dos aplicativos pode ficar em outro repositório privado. Tokens são configurados no Netlify e nunca enviados ao navegador. `HOST` e `PORT` só são usados na execução local ou em Docker.

No Netlify, a pasta `public` contém a página e `netlify/functions` contém a API. A lógica compartilhada fica em `lib`. O servidor local e o Dockerfile continuam disponíveis para quem preferir rodar fora do Netlify.

## Publicar versões

No repositório dos instaladores, crie uma release estável e marque como **Latest**. Anexe o APK, o instalador Windows e um arquivo `updates.json`:

```json
{
  "schemaVersion": 1,
  "platforms": {
    "android": {
      "version": "1.2.3",
      "build": 11,
      "minimumBuild": 0,
      "asset": "MarlicoBot-1.2.3.apk"
    },
    "windows": {
      "version": "1.2.3",
      "build": 11,
      "minimumBuild": 0,
      "asset": "MarlicoBotPC-Setup.exe"
    }
  }
}
```

Ajuste os nomes e números aos arquivos enviados. No Android, `build` é o `versionCode`; no Windows, deve acompanhar a numeração adotada pelo atualizador. `minimumBuild` define a menor compilação aceita; deixe `0` se a atualização for opcional.

Cada release deve trazer todos os arquivos indicados no manifesto. O site usa a descrição da release como notas e atualiza a consulta a cada cinco minutos. O SHA-256 vem do GitHub; se não estiver disponível, informe `sha256` no manifesto.

## Consulta pelos aplicativos

`GET /api/v1/update?platform=android&build=11`

Aceita `android` ou `windows`. Retorna a versão disponível, o link, o hash e se a atualização é obrigatória. A integração nos aplicativos ainda está pendente.

Se o GitHub estiver indisponível, a função pode usar o último resultado por até 24 horas, com `status: stale`. Nesse caso, o cliente deve adiar a decisão sobre obrigatoriedade. Sem resultado anterior, a API retorna `503`. O cache fica na memória de cada instância; pode desaparecer a qualquer momento no Netlify. O limite de cinco minutos vale para a reutilização de uma instância, não é uma agenda de execução.

Os links `/downloads/ID` redirecionam para o GitHub. APKs e EXEs não atravessam as funções do Netlify. A API só retorna links de anexos da release configurada.
