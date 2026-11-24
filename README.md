# frontend-quadracount

Interfaz de QuadraCount en React + TypeScript + Vite, servida con nginx.

## Pantallas

- `/login` y `/registro`
- `/` Inicio
- `/grupos/:groupId` detalle del grupo
- `/grupos/:groupId/nuevo-gasto` nuevo gasto (texto libre o formulario)

## Estado

Todavía no hay backend, así que las pantallas usan datos en memoria (`src/data/`) con los ejemplos del plan. Para entrar: `martin@quadracount.dev` / `quadra123`.

`src/data/appContext.ts` tiene las mismas operaciones que el schema GraphQL del BFF. Cuando el BFF esté listo se cambia `AppProvider` por Apollo Client y se borran `src/lib/interpretExpenseText.ts` y la fecha fija `DEMO_NOW`.

## Correr

```bash
pnpm install --frozen-lockfile
pnpm dev
```

Antes de hacer push: `pnpm run lint && pnpm build`.

## Docker

```bash
docker build -t frontend-quadracount .
docker run --rm -p 8080:80 frontend-quadracount
```

`nginx.conf` manda todas las rutas a `index.html` para que recargar una página no dé 404.
