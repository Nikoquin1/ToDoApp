## Descripción
<!-- Qué cambia y por qué -->

## Tipo de cambio
- [ ] feat (nueva funcionalidad)
- [ ] fix (corrección de bug)
- [ ] docs (documentación)
- [ ] refactor (cambio interno sin afectar comportamiento)
- [ ] chore (infra, dependencias, build)
- [ ] test (tests nuevos o ajustados)

## Cómo probar
docker build -t todoapp:local .
docker run --rm -p 3000:3000 \
  -e NODE_ENV=production \
  -e SQLITE_DB_LOCATION=/data/todo.db \
  -v $(pwd)/.data:/data \
  --name todoapp \
  todoapp:local
# App en http://localhost:3000

