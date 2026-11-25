# frontend-quadracount

Interfaz de QuadraCount en React + TypeScript + Vite, servida con nginx. Habla con el BFF **solo por GraphQL** (Apollo Client).

## Pantallas

- `/login` y `/registro`
- `/` Inicio: saldo total, tus grupos y la actividad combinada
- `/grupos/:groupId` detalle del grupo: gastos, balances, saldar cuentas (registrar pago), miembros (agregar por correo, quitar con aviso de deuda)
- `/grupos/:groupId/nuevo-gasto` nuevo gasto (texto libre o formulario)

Las rutas son privadas: sin sesión redirigen a "Iniciar sesión". Para entrar con los datos de ejemplo: `martin@quadracount.dev` / `quadra123`.

## Cómo se conecta al BFF

- `src/graphql/client.ts`: Apollo Client. Agrega `Authorization: Bearer <token>` a cada petición. Si el BFF responde `UNAUTHENTICATED` (token vencido o inválido), se cierra la sesión y se vuelve al login con un aviso.
- `src/graphql/operations.ts`: todas las consultas y mutaciones.
- `src/auth/`: sesión. El token se guarda en `localStorage` y el usuario actual sale de la consulta `me`.
- Los errores del BFF ya vienen en español; se muestran tal cual. El código (`extensions.code`) se usa para casos especiales, por ejemplo `CONFLICT` al quitar a un miembro con saldo abre el aviso de deuda.

Los datos de un grupo se piden en **dos consultas**: una con miembros, gastos y actividad (groups-service y activity-service) y otra con los saldos y el plan para saldar (balances-service). Si balances-service está caído, el resto de la pantalla sigue funcionando y el panel de saldos lo avisa. Las pantallas se actualizan solas cada 5 segundos, así que cuando balances-service vuelve, los saldos se ponen al día sin recargar.

El frontend no calcula saldos ni interpreta texto: eso lo hacen balances-service y el mcp-server. `src/lib/split.ts` solo reparte en partes iguales para el formulario (el BFF valida que las partes sumen el total).

El texto libre llama a `parseExpenseText`; hasta la Fase 5 el BFF responde que todavía no está disponible.

## Variables de entorno

| Variable | Valor por defecto | Para qué |
|---|---|---|
| `VITE_BFF_URL` | `http://localhost:3000/graphql` | URL del GraphQL del BFF **vista desde el navegador**. Vite la fija al construir. |

En Docker se pasa como argumento de build: `docker build --build-arg VITE_BFF_URL=... .`. El BFF tiene que aceptar el origen del frontend en `CORS_ORIGINS`.

## Correr

```bash
pnpm install --frozen-lockfile
pnpm dev          # http://localhost:5173, con el BFF en localhost:3000
```

Antes de hacer push: `pnpm run lint && pnpm build`.

## Docker

```bash
docker build -t frontend-quadracount .
docker run --rm -p 8080:80 frontend-quadracount
```

`nginx.conf` manda todas las rutas a `index.html` para que recargar una página no dé 404.
