# PDF Excel AI Frontend

Aplicacao Angular para enviar PDFs, visualizar o preview dos dados extraidos e descarregar o ficheiro Excel gerado pela API.

## Responsabilidades deste repositório

- interface para upload de PDF
- preview tabular dos dados extraidos
- download do ficheiro `.xlsx`
- configuracao da URL da API em runtime
- build e deploy independentes do backend

## Stack

- Angular 18
- TypeScript 5
- Nginx
- Docker
- GitHub Actions

## Configuracao da API

O frontend le a URL base da API a partir de `src/assets/runtime-config.js` durante o desenvolvimento local.

Valor default:

```javascript
window.__APP_CONFIG__ = {
  apiBaseUrl: 'http://localhost:8081/api'
};
```

No container Docker, o ficheiro e gerado automaticamente a partir da variavel `API_BASE_URL`.

## Executar localmente

```bash
npm install
npm start
```

Aplicacao disponivel em `http://localhost:4200`.

## Build de producao

```bash
npm run build
```

## Docker

### Build da imagem

```bash
docker build -t pdf-excel-ai-frontend .
```

### Executar container

```bash
docker run --rm -p 4200:80 \
  -e API_BASE_URL=https://teu-backend.exemplo.com/api \
  pdf-excel-ai-frontend
```

### Docker Compose

```bash
docker compose up --build
```

O `docker-compose.yml` deste repositório sobe apenas o frontend.

### Stack local com backend + frontend

Para subir os dois containers juntos localmente, usa o ficheiro `docker-compose.local.yml` no repositório backend:

```bash
cd ../pdf-excel-ai-backend
docker compose -f docker-compose.local.yml up --build
```

O frontend fica em `http://localhost:4200` e consome o backend em `http://localhost:8081/api`.

O upload aceita PDF e imagens (`png`, `jpg`, `jpeg`, `webp`, `tiff`). Para imagens e PDFs escaneados, o backend pode usar OCR local quando configurado.

### Backend com GitHub Models

O backend pode ser configurado para usar GitHub Models com um token GitHub que tenha permissao `models:read`.

Exemplo de `.env` no repositório backend:

```dotenv
AI_PROVIDER=github-models
AI_API_URL=https://models.github.ai/inference/chat/completions
AI_API_KEY=ghp_o_teu_token_aqui
AI_MODEL=openai/gpt-4.1-mini
AI_GITHUB_API_VERSION=2026-03-10
APP_CORS_ALLOWED_ORIGINS=http://localhost:4200
```

## GitHub Actions

### CI

Ficheiro: `.github/workflows/ci.yml`

- instala dependencias com `npm ci`
- gera o build com `npm run build`

### Deploy no GitHub Pages

Ficheiro: `.github/workflows/deploy-pages.yml`

- gera o `runtime-config.js` com base no segredo `FRONTEND_API_BASE_URL`
- publica o build estatico no GitHub Pages

### Publicacao da imagem Docker

Ficheiro: `.github/workflows/frontend-image.yml`

- gera a imagem Docker a partir da raiz deste repositório quando uma tag `v*` e criada
- publica no GitHub Container Registry (`ghcr.io`)

### Versionamento semantico automatico

Ficheiro: `.github/workflows/release-version.yml`

- executa quando um pull request e merged para `main`
- incrementa a versao no `package.json` e `package-lock.json`
- atualiza a versao default do `Dockerfile`
- cria commit automatico e tag Git `vX.Y.Z`

Labels suportadas no pull request:

- `semver:major`
- `semver:minor`
- `semver:patch`

Se nenhuma label existir, o workflow usa `patch`.

## Publicacao recomendada

- GitHub Pages para o site estatico
- backend hospedado separadamente com uma URL terminando em `/api`
- segredo `FRONTEND_API_BASE_URL` configurado no repositório do GitHub
