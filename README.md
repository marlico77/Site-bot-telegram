# MarlicoBot

Site de downloads do MarlicoBot para Android e Windows. Busca as versões no GitHub Releases e mostra os instaladores e as novidades de cada atualização.

## Rodar localmente

Precisa de Node.js 22 ou superior.

```sh
npm start
```

Abra http://localhost:8787. Sem um repositório de versões configurado, os downloads aparecem como “em breve”.

## Configuração

Defina estas variáveis no ambiente de hospedagem:

| Variável | Valor |
| --- | --- |
| `RELEASES_REPOSITORY` | Repositório dos instaladores, no formato `dono/repositorio` |
| `PUBLIC_URL` | Endereço público do site |
| `GITHUB_TOKEN` | Token com leitura de conteúdo, se o repositório for privado |
| `HOST` | `127.0.0.1` por padrão; `0.0.0.0` em contêiner |
| `PORT` | `8787` por padrão |

Este repositório contém só o site. O repositório dos instaladores será configurado depois. Os arquivos oferecidos aqui são públicos, mesmo que venham de um repositório privado.

Para hospedar, use um servidor Node.js ou o Dockerfile incluído. GitHub Pages sozinho não executa o servidor.

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

Se o GitHub estiver indisponível, o servidor pode usar o último resultado por até 24 horas, com `status: stale`. Nesse caso, o cliente deve adiar a decisão sobre obrigatoriedade. Sem resultado anterior, a API retorna `503`.
