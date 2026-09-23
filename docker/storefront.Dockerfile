# syntax=docker/dockerfile:1

# -------------------------------------------------------------- dev ----
# The stage `docker-compose.yml` targets by default: the real Vite dev server
# (HMR) against ./storefront bind-mounted at runtime, instead of a one-shot
# production build. The COPY below only makes the image runnable standalone
# (e.g. `docker build --target dev` without compose's volumes); compose's
# bind mount overlays it with the live source on every start.
FROM node:22-alpine AS dev
WORKDIR /app

ARG VITE_BASE=/
ARG VITE_LAMBDA_URL=
ARG VITE_TENANT_NAME=barebrilliant.local
ARG VITE_CATALOG_BASE=
ARG VITE_MEDIA_BASE=
ARG SW_VERSION=docker-dev
ENV VITE_BASE=${VITE_BASE} \
    VITE_LAMBDA_URL=${VITE_LAMBDA_URL} \
    VITE_TENANT_NAME=${VITE_TENANT_NAME} \
    VITE_CATALOG_BASE=${VITE_CATALOG_BASE} \
    VITE_MEDIA_BASE=${VITE_MEDIA_BASE} \
    SW_VERSION=${SW_VERSION} \
    CHOKIDAR_USEPOLLING=true

COPY storefront/package.json storefront/yarn.lock ./
RUN yarn install --frozen-lockfile --network-timeout 600000

COPY storefront/ ./
EXPOSE 5173
CMD ["yarn", "dev", "--host", "0.0.0.0", "--port", "5173"]

# ------------------------------------------------------------ build ----
FROM node:22-alpine AS build
WORKDIR /app

# Vite inlines VITE_* at build time — they must be present during `yarn build`,
# so they come in as build args (set from docker-compose.yml / .env).
ARG VITE_BASE=/
ARG VITE_LAMBDA_URL=
ARG VITE_TENANT_NAME=barebrilliant.local
ARG VITE_CATALOG_BASE=
ARG VITE_MEDIA_BASE=
ARG SW_VERSION=docker
ENV VITE_BASE=${VITE_BASE} \
    VITE_LAMBDA_URL=${VITE_LAMBDA_URL} \
    VITE_TENANT_NAME=${VITE_TENANT_NAME} \
    VITE_CATALOG_BASE=${VITE_CATALOG_BASE} \
    VITE_MEDIA_BASE=${VITE_MEDIA_BASE} \
    SW_VERSION=${SW_VERSION}

# Deps first for layer caching. The lockfile carries every platform's optional
# binaries (rollup, sharp), so --frozen-lockfile resolves fine on alpine/musl.
COPY storefront/package.json storefront/yarn.lock ./
RUN yarn install --frozen-lockfile --network-timeout 600000

COPY storefront/ ./
# `yarn build` = gen-build-config (fills the SW template with SW_VERSION +
# VITE_BASE) -> vite build -> make-spa-fallback (dist/404.html).
RUN yarn build

# ------------------------------------------------------------ serve ----
FROM nginx:1.27-alpine AS serve
RUN rm -f /etc/nginx/conf.d/default.conf
COPY docker/nginx-storefront.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
