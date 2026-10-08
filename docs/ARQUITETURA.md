# Arquitetura da plataforma — e o que aprendemos rodando em produção

Este documento descreve como a plataforma foi montada e por quê. O objetivo é você decidir o que
copiar, o que simplificar e o que trocar no seu caso. Os números citados vêm da operação real: cerca
de 40 aulas e algumas dezenas de GB de vídeo.

---

## 1. Visão geral

```
 Aluno (browser / PWA no celular)
        │  HTTPS
        ▼
 Proxy reverso (nginx/Traefik) ── HTTPS, HSTS
        │
        ▼
 Express (Node)  ──── SQLite (1 arquivo .db)
   ├─ /api/auth          login, cadastro por convite, reset de senha
   ├─ /api/courses       vitrine, cursos, módulos
   ├─ /api/lessons       aula + URL do vídeo (só p/ quem tem acesso)
   ├─ /api/materials     PDFs e anexos da aula
   ├─ /api/ratings       avaliação de curso, comentários
   ├─ /api/admin         CRUD de tudo + alunos + convites
   ├─ /api/upload        capas, materiais
   └─ serve o build do React (client/dist)
        │
        │  gera URL assinada (6h) — o vídeo NÃO passa pelo servidor
        ▼
 Cloudflare R2 (bucket privado) ──► vídeo direto para o browser
```

**Princípio:** tudo numa VPS barata, sem dependência de SaaS no caminho do login e do banco. O
único serviço externo no caminho crítico é o armazenamento de vídeo.

---

## 2. O "looping" da vitrine (carrossel 3D)

Arquivo: `client/src/components/ui/Carousel3D.tsx`, usado em `client/src/pages/Home.tsx`.

- Os cards dos cursos ficam distribuídos num **anel 3D**: cada card recebe
  `rotateY(i × 360/n) translateZ(raio)`, e o anel inteiro gira com `rotateY(ângulo)`.
- Um `setInterval` gira o anel devagar o tempo todo (−0,15° a cada 16ms). Como é um círculo,
  não tem fim: é isso que dá o efeito de "looping" infinito.
- Arrastar com o dedo ou o mouse (ou usar a roda do mouse) muda o ângulo e pausa o giro enquanto
  o aluno segura. Os pointer events ficam no `document`, para o arraste continuar mesmo saindo do
  card.
- **Clique × arraste:** só navega se o ponteiro andou menos de 8px. Sem isso, todo arraste abria um
  curso sem querer.
- Bloqueamos o gesto de "voltar página" do navegador (`overscroll-behavior-x: none`), que no
  iPhone disparava junto com o arraste.
- Na home também aparecem as **próximas aulas** (aulas com `release_date` futura, com data e
  categoria). Isso faz o aluno voltar: ele vê o que vai ser liberado.

**Para simplificar:** se você tiver poucos cursos (até 3), uma grade simples converte igual. O
carrossel brilha a partir de uns 5 cursos.

---

## 3. Modelo de dados

| Tabela | Para que serve |
|---|---|
| `users` | aluno/admin, hash de senha (bcrypt), `role`, `tier` (nível de acesso), `is_active` |
| `courses` | curso: título, capa, categoria, ordem, `required_tier` |
| `lessons` | aula: módulo, ordem, `video_type`, `video_url`, duração, `required_tier` opcional |
| `materials` | anexos da aula (PDF, planilha) |
| `user_progress` | aula concluída por aluno |
| `lesson_views` | quem assistiu o quê e quando (base do "continuar assistindo" e das métricas) |
| `course_ratings` / `lesson_comments` | avaliação e comentários |
| `invite_links` | link de convite que já define o `tier` de quem se cadastra |
| `student_registrations` | cadastros vindos de convite |
| `referral_links` / `referral_applications` | indicação de aluno para aluno |
| `password_resets` | token de redefinição de senha, com validade |
| `ai_tools` | vitrine de ferramentas recomendadas (opcional) |
| `recordings` | gravações de mentoria que o admin publica como aula com 1 clique |

### Níveis de acesso (tier)

- `users.tier`: o nível do aluno.
- `courses.required_tier`: o nível mínimo para ver o curso.
- `lessons.required_tier`: `NULL` herda do curso. Preenchido, sobrescreve, o que permite deixar a
  aula 1 aberta como degustação e travar o resto.
- `invite_links.tier`: o convite já cadastra o aluno no nível certo. Você vende o produto e manda
  o link, sem configurar nada à mão.

Quem não tem nível vê a aula **com cadeado** e um modal de upgrade (`UpgradeModal.tsx`). Isso
transforma a área de membros em vitrine de upsell.

Os níveis vêm como `basic` e `premium`; renomeie à vontade.

**Default seguro:** o tier padrão de aluno novo é o **mais baixo** (`basic`). Erro de cadastro nunca libera
conteúdo pago.

---

## 4. Hospedagem dos vídeos (a decisão mais importante)

### O que tentamos primeiro: Google Drive em iframe. Não faça isso.

O arquivo estava público ("qualquer pessoa com o link"), e mesmo assim **parte dos alunos via
"Não foi possível carregar o vídeo"**. A causa: o player do Drive dentro de outro site depende de
cookie de sessão Google. Safari/iPhone, aba anônima e Chrome com cookies de terceiros bloqueados não
mandam esse cookie, e o Drive responde 401. Resultado: funciona para uns, falha para outros, e o
suporte não consegue reproduzir. Não tem conserto no código: o Drive não é host de vídeo.

### O que usamos hoje: Cloudflare R2 + URL assinada

Arquivo: `server/r2.js`.

1. O bucket é **privado**: nenhum vídeo tem link público.
2. Quando um aluno **com acesso** abre a aula, a API gera uma **URL assinada que vale 6h**. A
   assinatura é calculada localmente, sem chamada de rede, então é instantânea.
3. O browser baixa o vídeo **direto do R2**. A VPS não gasta banda nem disco com vídeo.
4. Quem não tem acesso à aula **nunca recebe o link**: a verificação de tier acontece antes de
   gerar a URL.
5. No banco a aula guarda `video_url = "r2://aulas/7.mp4"`, e a API troca pela URL assinada na
   resposta.

**Custo real:** cerca de 37 GB por **US$ 0,40/mês** (10 GB grátis, e o R2 **não cobra banda de
saída**, que é o que encarece S3 e similares em plataforma de vídeo).

### Dois detalhes que travam se você esquecer

- **`faststart` no MP4.** Sem ele o browser precisa baixar o arquivo inteiro antes do primeiro
  frame. Rode, sem recodificar:
  `ffmpeg -i entrada.mp4 -c copy -movflags +faststart saida.mp4`
- **CSP.** Com `helmet`, adicione `media-src https://*.r2.cloudflarestorage.com`. Sem isso o
  browser recusa o vídeo em silêncio: tela preta e nenhum erro na página.

### Alternativas, por perfil

| Opção | Quando escolher | Custo | Proteção |
|---|---|---|---|
| **YouTube não listado** | começando, poucos alunos, conteúdo não muito sensível | grátis | baixa (o link vaza) |
| **Panda Video / Vimeo** | quer player pronto, DRM, estatística, sem mexer em infra | R$/mês por plano | alta |
| **Cloudflare Stream / Bunny Stream** | quer HLS adaptativo (qualidade ajusta à internet) | por minuto armazenado/assistido | alta |
| **Cloudflare R2 (este projeto)** | muito vídeo, custo mínimo, aceita configurar | centavos | média-alta (link expira) |

O campo `video_type` aceita `youtube`, `external` e `local`, então dá para começar no YouTube e
migrar aula por aula depois.

---

## 5. Login e sessão

- JWT com validade de 7 dias, guardado no `localStorage`. Bcrypt nas senhas.
- **Rate limit só nas rotas que conferem senha** (login, reset), com `skipSuccessfulRequests`.

> **Erro que cometemos:** o limite de 10 req/15min estava em todo `/api/auth`, inclusive no
> `/auth/me`, que o app chama **a cada carregamento de página**. Na 11ª página o aluno levava
> bloqueio, o front entendia como "sessão expirada" e deslogava. Alunos na mesma rede (ou no 4G,
> com IP compartilhado) dividiam o mesmo limite. Para o aluno, aparecia "meu acesso expirou".

- **No front, só HTTP 401 desloga.** Erro 429, 500 ou queda de rede mantém o token e mostra aviso.
- Reset de senha por e-mail exige `SMTP_*` **e** `SITE_URL` corretos. Teste o fluxo inteiro
  antes de liberar alunos: no nosso caso ele nunca tinha funcionado e ninguém sabia.
- O remetente do e-mail deve ser um domínio **verificado** (SPF/DKIM), ou o e-mail cai no spam.

---

## 6. Performance e cache (o que derrubou a experiência)

- **Capas:** começamos com PNGs de 5–7 MB cada, e a home pesava 43 MB (mais de 1 minuto no 4G).
  Convertidas para JPEG (cerca de 1600px, qualidade 80), ficou em 1,3 MB. Comprima toda imagem
  que sobe.
- **`index.html` nunca em cache longo.** Ele precisa de `no-cache`. Só os arquivos com hash no nome
  (`assets/index-abc123.js`) levam cache de 30 dias. Se o HTML fica cacheado, depois de cada deploy
  o aluno vê tela branca pedindo arquivos que não existem mais.
- **Service worker (PWA):** o fallback "sem rede → devolve o index.html" só pode valer para
  **navegação**, nunca para fonte, imagem ou script externo. Ao mudar o SW, troque o `CACHE_NAME`
  para limpar o cache antigo no browser dos alunos.
- **HTTPS** fica num lugar só (o proxy). Redirecionar também no Express pode gerar loop.

---

## 7. Painel admin

`client/src/pages/Admin.tsx` + `server/routes/admin.js`:

- CRUD de cursos, módulos, aulas e materiais, com upload de capa.
- Alunos: ativar/desativar, trocar tier, ver progresso.
- Convites: gerar link com tier e validade.
- Gravações: publicar uma gravação de mentoria como aula nova.
- Métricas básicas: views por aula e conclusão por curso.

---

## 7.1 Fora deste template

Na plataforma original existiam módulos ligados ao negócio específico: NPS que travava conteúdo,
páginas de evento presencial, webhook com CRM. Eles foram retirados. Se precisar de algo assim,
crie como rota nova em `server/routes/` e registre em `server/index.js`.

## 8. Checklist para colocar a sua no ar

- [ ] `.env` de produção completo (`JWT_SECRET` longo e aleatório, `SITE_URL`, SMTP, R2)
- [ ] Admin criado via `ADMIN_EMAIL` / `ADMIN_PASSWORD` e senha trocada no 1º acesso
- [ ] Vídeos com `faststart`, fora do Google Drive
- [ ] CSP com `media-src` do seu host de vídeo
- [ ] Imagens comprimidas
- [ ] Reset de senha testado de ponta a ponta, num e-mail que não é o seu
- [ ] Testado no **iPhone/Safari** (onde aparecem os problemas de cookie e de gesto)
- [ ] Backup diário do `.db` para fora da VPS
- [ ] Log de acesso ligado no proxy, para enxergar o que o aluno enfrenta

## 9. O que dá para simplificar

| Se você... | Pode tirar |
|---|---|
| vende um produto só | o sistema de tier (todo aluno ativo vê tudo) |
| não faz mentoria gravada | `recordings` |
| não tem programa de indicação | `referral_*` |
| não quer PWA | `sw.js`, `manifest.json`, `usePWA` |
| não quer notificação push | `notifications` (sem `VAPID_*` no `.env` ela já fica desligada) |
| prefere não manter servidor | troque Express + SQLite por Supabase (auth + Postgres prontos) e hospede o front na Vercel/Netlify. Sobra só a função que assina a URL do vídeo |
