FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:1.27-alpine
ARG APP_VERSION=0.0.2
LABEL org.opencontainers.image.version=$APP_VERSION
COPY docker/runtime-config.template.js /usr/share/nginx/html/assets/runtime-config.template.js
COPY docker/40-runtime-config.sh /docker-entrypoint.d/40-runtime-config.sh
RUN chmod +x /docker-entrypoint.d/40-runtime-config.sh
COPY --from=build /app/dist/pdf-excel-ai-frontend/browser /usr/share/nginx/html

EXPOSE 80