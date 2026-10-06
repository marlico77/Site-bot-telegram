# MarlicoBot · Site de downloads

O repositório `marlico77/Site-bot-telegram` é exclusivo deste site. Publicar somente o conteúdo de updates/, excluindo data, .env e senhas. Código Android/Windows e instaladores pertencem a outro repositório, ainda a definir. RELEASES_REPOSITORY é a configuração desse segundo repositório; não aponta para o site.

O site é público, sem cadastro, login ou upload. Publicação de versões acontece pelo navegador do GitHub. Os apps não foram alterados; a integração de atualização ainda precisa ser implementada neles. Os antigos arquivos em data foram preservados e não são mais servidos.

## Executar

Node.js 22+, sem dependências. Copie .env.example para .env e configure RELEASES_REPOSITORY=dono/repositorio quando o repositório do sistema existir.

```powershell
cd 'D:\Aplicações\Bot\updates'
node --env-file=.env server.mjs
```

Ou use variáveis do ambiente e `node server.mjs`. Sem repositório, a página abre com “em breve”. ADMIN_PASSWORD não é mais usado. GITHUB_TOKEN é opcional para repositório público e obrigatório para privado, com Contents: read. Tokens ficam somente no servidor. Os instaladores selecionados serão públicos no site mesmo se o repositório for privado.

## Publicar uma versão

1. No futuro repositório do sistema: Releases → Draft a new release.
2. Crie uma tag e escreva as novidades.
3. Anexe o APK e o instalador EXE assinados.
4. Anexe **updates.json**, baseado em updates.example.json.
5. Confira os nomes e versões e publique como release estável, marcada como Latest.

O site usa `/releases/latest` e não oferece rascunhos ou pré-lançamentos. Cada Latest deve incluir os dois instaladores e o manifesto completo; pode reaproveitar o arquivo da plataforma não modificada. Uma plataforma ausente não será oferecida. O cache atualiza em até cinco minutos.

### Manifesto

- schemaVersion: 1.
- platforms.android/windows.version: X.Y.Z.
- build: inteiro positivo crescente; Android deve ser igual ao versionCode. O build Windows do exemplo é ilustrativo, deve corresponder ao futuro cliente Windows.
- minimumBuild: menor compilação aceita; 0 = sem obrigatoriedade. Não pode exceder build.
- asset: nome exato do APK ou EXE anexo à mesma release.
- notes: opcional, substitui a descrição da release para essa plataforma.
- sha256: opcional se GitHub informar digest SHA-256; obrigatório se ausente. Se ambos existirem, devem coincidir.

Somente anexos da release configurada são aceitos, sem URLs arbitrárias. Hash verifica integridade e não substitui assinatura do pacote. Use as mesmas chaves de assinatura nas versões futuras. Nunca reutilize build para outro arquivo.

## API

`GET /api/v1/update?platform=android&build=11` (ou windows).

Retorna schemaVersion, status (ready/stale/unconfigured), checkedAt, platform, updateAvailable, mandatory, minimumBuild e release. Release contém versão, build, minimumBuild, notas, tamanho, SHA-256 e URL.

mandatory só é true se o catálogo estiver atualizado e build instalado < minimumBuild. Falhas de rede não impõem atualização. Com cache antigo, status=stale e mandatory=false: cliente deve adiar a decisão, sem apagar uma política já conhecida. Sem cache retorna 503. Após falha, aguarda um minuto para consultar novamente. Cache anterior é usado por no máximo 24h, não persiste entre reinícios e pode ainda mostrar uma versão retirada durante indisponibilidade.

O cliente futuro consultará ao iniciar e periodicamente, via HTTPS, validando hash e assinatura antes de abrir o instalador. Instalação pode exigir confirmação do Android/Windows. Não há notificações nem atualizador implementados nos apps nesta etapa.

`/api/releases` alimenta site/widget; `/downloads/ID` transmite o arquivo via servidor sem expor token. Downloads têm timeout de 120 segundos no armazenamento do GitHub. O servidor precisa de banda suficiente.

## Hospedagem e widget

Site requer Node.js ou Docker com proxy HTTPS, não apenas GitHub Pages estático. Configure PUBLIC_URL com domínio definitivo e HOST=0.0.0.0 no contêiner. Não há hospedagem pública feita nesta etapa. Variáveis podem ser injetadas pela plataforma; não enviar .env ao repositório. Cache é por processo; múltiplas instâncias aumentam consultas. Token de leitura pode aumentar a cota de consultas GitHub.

`/widget` é responsivo e aceita iframe. A página principal não permite iframe. Não há necessidade de disco persistente ou senha administrativa para esta versão.

Documentação GitHub: https://docs.github.com/en/rest/releases/releases
