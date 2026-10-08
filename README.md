# Plataforma de Membros — template

Área de membros própria para cursos em vídeo: vitrine com carrossel 3D, cursos → módulos → aulas,
progresso do aluno, materiais, comentários, avaliações, convites com nível de acesso e painel admin.

Este repositório é **só a estrutura**: o código que recebe os dados. Não vem banco, vídeo, aluno
nem conteúdo. Você sobe os seus.

> Leia primeiro **[docs/ARQUITETURA.md](docs/ARQUITETURA.md)**. Ele explica as decisões, o que
> deu errado em produção e o que dá para simplificar no seu caso.

## Stack

| Camada | Tecnologia |
|---|---|
| Front | React 18 + Vite + TypeScript + Tailwind (PWA instalável) |
| API | Node.js + Express |
| Banco | SQLite (`better-sqlite3`), um arquivo, criado sozinho no 1º start |
| Login | JWT + bcrypt, papéis `admin` / `member` |
| Vídeo | YouTube, link externo, arquivo local ou **Cloudflare R2 com URL assinada** |
| Processo | PM2 atrás de um proxy reverso com HTTPS (nginx, Traefik ou Caddy) |

## Subir local

```bash
cp .env.example .env          # preencha JWT_SECRET (mín. 32 caracteres), ADMIN_EMAIL, ADMIN_PASSWORD
npm install
npm run seed                  # cria o banco, o admin e 1 curso de exemplo
cd client && npm install && npm run build && cd ..
npm start                     # http://localhost:3004

# desenvolvimento com hot reload (API + Vite):
npm run dev
```

O banco (`data/*.db`) e a pasta `uploads/` são criados no primeiro start e ficam fora do git.

## Produção (resumo)

1. VPS com Node 20+ e PM2 (`pm2 start ecosystem.config.cjs`).
2. Proxy reverso do seu domínio para a porta da app, com HTTPS.
3. `.env` de produção com `SITE_URL` = seu domínio (senão o link do e-mail de senha aponta para localhost).
4. Vídeos no R2 (ou outro host de vídeo). **Não use Google Drive** (motivo no ARQUITETURA.md).
5. Backup diário do arquivo `.db` para fora do servidor.
