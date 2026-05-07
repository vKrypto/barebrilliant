# syntax=docker/dockerfile:1.7

# --- build stage: produce static dist/ via Vite ---
FROM node:22-alpine AS build
WORKDIR /app

# Vite bakes VITE_* env vars into the bundle at build time, so they MUST
# be passed in as build args (not runtime env).
ARG VITE_API_BASE=""
ARG VITE_BASE="/"
ENV VITE_API_BASE=${VITE_API_BASE} \
    VITE_BASE=${VITE_BASE}

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# --- runtime stage: serve dist/ with nginx ---
FROM nginx:alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null 2>&1 || exit 1
