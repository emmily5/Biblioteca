# Biblioteca de Secoes

Sistema web para organizar secoes reutilizaveis de HTML, CSS e JavaScript, com screenshots armazenados como WebP.

A aplicacao foi migrada para Cloudflare/serverless:

- Frontend estatico em `public/`, servido por Workers Static Assets.
- API em `src/worker.js`, executada por Cloudflare Workers.
- Dados em Cloudflare D1.
- Imagens em Cloudflare R2 privado, servidas pela rota autenticada `/api/images/:key`.
- Controle de acesso recomendado via Cloudflare Access/Zero Trust no dominio inteiro.

## Estrutura

```text
.
├── public/
│   ├── index.html
│   └── assets/
│       ├── css/style.css
│       ├── img/logo.jpeg
│       └── js/main.js
├── src/
│   └── worker.js
├── migrations/
│   ├── 0001_init.sql
│   └── 0002_seed_current_db.sql
├── wrangler.toml
├── style.scss
├── package.json
└── db.json
```

`db.json` fica apenas como referencia/backup dos dados antigos. O runtime usa D1.

## Comandos Locais

```bash
npm install
npm run d1:migrate:local
npm run dev
```

O `wrangler dev` sobe frontend e API juntos. Por padrao, acesse:

```text
http://localhost:8787
```

## Criar Recursos Na Cloudflare

Crie o bucket R2 privado:

```bash
npx wrangler r2 bucket create biblioteca-secoes-images
```

Crie o banco D1:

```bash
npx wrangler d1 create biblioteca-secoes-db
```

Depois copie o `database_id` real retornado pelo comando para `wrangler.toml`, substituindo:

```toml
database_id = "00000000-0000-0000-0000-000000000000"
```

## Aplicar Banco Em Producao

```bash
npm run d1:migrate:remote
```

As migrations criam:

- `categories`
- `components`
- indice `idx_components_cat_id`
- foreign key com cascade de categorias para componentes

## Deploy

```bash
npm run deploy
```

O deploy publica:

- Worker API
- Static Assets de `public/`
- binding D1 `DB`
- binding R2 `IMAGES`

## Cloudflare Access

Configure em Cloudflare Zero Trust:

1. Acesse Zero Trust > Access > Applications.
2. Crie uma aplicacao Self-hosted.
3. Use o dominio completo da aplicacao.
4. Proteja o dominio inteiro, nao apenas `/api`.
5. Permita somente os emails, grupos ou dominio corporativo desejado.

O bucket R2 deve permanecer privado. As imagens passam pelo Worker em `/api/images/:key`, entao tambem ficam protegidas pelo Access.

## API

Base: `/api`

Categorias:

- `GET /api/categories`
- `POST /api/categories`
- `PUT /api/categories/:id`
- `DELETE /api/categories/:id`

Componentes:

- `GET /api/components`
- `GET /api/components?catId=:id`
- `POST /api/components`
- `PUT /api/components/:id`
- `DELETE /api/components/:id`

Imagens:

- `POST /api/images`
  - `multipart/form-data`
  - campo `file`
  - aceita somente `image/webp`
- `GET /api/images/:key`

## Fluxo De Imagem

No navegador:

- Se o arquivo enviado ja for WebP, ele e usado diretamente.
- Se for PNG/JPG/JPEG, o frontend converte para WebP via `canvas.toBlob`.
- O WebP e enviado para `/api/images`.
- O componente salva somente a URL retornada, por exemplo `/api/images/screenshots/...webp`.

O banco nao armazena base64.

## Estilos

```bash
npm run build:css
npm run watch:css
```

`style.scss` compila para `public/assets/css/style.css`.
