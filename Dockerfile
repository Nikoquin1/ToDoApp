# ---- deps-dev: instala dependencias incl. dev (para correr jest/supertest) ----
FROM node:20-alpine AS deps-dev
WORKDIR /app

# Toolchain para módulos nativos (sqlite3)
RUN apk add --no-cache python3 make g++ sqlite-dev

COPY package.json yarn.lock ./
RUN corepack enable \
 && corepack prepare yarn@1.22.22 --activate \
 && yarn config set registry https://registry.npmjs.org/ \
 && yarn install --frozen-lockfile --network-timeout 600000

# ---- test-runner: contenedor que corre los tests ----
FROM node:20-alpine AS test-runner
WORKDIR /app
RUN apk add --no-cache sqlite-libs
COPY --from=deps-dev /app/node_modules ./node_modules
COPY . .
# Vars por defecto; en Compose pasaremos las de MySQL
ENV NODE_ENV=test
CMD ["yarn", "test:ci"]

# ---- (tu imagen de producción ORIGINAL) ----
FROM node:20-alpine

# Toolchain para módulos nativos (sqlite3)
RUN apk add --no-cache python3 make g++ sqlite-dev

WORKDIR /app

# Copiamos manifiestos primero (cache de dependencias)
COPY package.json yarn.lock ./

# ⚠️ Cambios clave: usar registry de npm + subir timeout
RUN corepack enable \
  && corepack prepare yarn@1.22.22 --activate \
  && yarn config set registry https://registry.npmjs.org/ \
  && yarn install --frozen-lockfile --network-timeout 600000

# Resto del código
COPY . .

# Punto de montaje (por si el volumen no está)
RUN mkdir -p /data

ENV NODE_ENV=production
ENV PORT=3000
ENV SQLITE_DB_LOCATION=/data/todo.db

EXPOSE 3000
CMD ["node", "src/index.js"]
