# Dockerfile
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
