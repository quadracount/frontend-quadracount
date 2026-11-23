# frontend-quadracount

Interfaz de QuadraCount: React + TypeScript + Vite, servida con nginx.

En la arquitectura del proyecto este repo habla **solo con el BFF y solo por
GraphQL** (CLAUDE.md, sección 2). No conoce los microservicios ni sus
protocolos.

## Estado

Las pantallas de la sección 7 del plan están implementadas:

| Pantalla | Ruta |
|---|---|
| Iniciar sesión / crear cuenta | `/login`, `/registro` |
| Inicio | `/` |
| Detalle del grupo | `/grupos/:groupId` |
| Nuevo gasto (texto libre y formulario) | `/grupos/:groupId/nuevo-gasto` |
| Aviso al quitar a un miembro con deuda | diálogo dentro de "Miembros" |

**Todavía no hay backend.** Las pantallas funcionan contra datos en memoria
sembrados con los ejemplos de CLAUDE.md (sección 1), así que la navegación,
los saldos, el plan para saldar, los pagos y el borrador del asistente se
pueden probar de punta a punta sin levantar nada más.

## Cómo se conecta el backend (Fase 4)

La capa de datos está aislada a propósito:

- `src/lib/types.ts` replica el schema GraphQL del BFF (sección 6.4).
- `src/data/appContext.ts` declara las operaciones con los mismos nombres que
  el schema: `myGroups`, `group`, `myActivity`, `createExpense`,
  `registerPayment`, `removeMember`, `parseExpenseText`.
- `src/data/AppProvider.tsx` es la implementación simulada.

Conectar el BFF es reemplazar `AppProvider` por una versión con Apollo Client
(y el token en el header `Authorization`). Las pantallas no cambian.

Al hacerlo hay que quitar también estas dos muletas:

1. `src/lib/interpretExpenseText.ts` — parser local del texto libre. Lo
   reemplaza la mutación `parseExpenseText`, que el BFF le pide por REST al
   mcp-server. Imita el modo `LLM_MODE=fallback`.
2. `DEMO_NOW` en `src/data/seed.ts` — fecha fija para que las etiquetas
   relativas coincidan con los mockups. Pasa a ser `new Date()`.

Las reglas de `src/lib/split.ts` (división con redondeo, saldos, plan para
saldar) viven en el backend: groups-service valida la división y
balances-service calcula los saldos. En el frontend quedan solo para la vista
previa del formulario.

## Desarrollo

```bash
# en frontend-quadracount/
corepack enable && corepack install
pnpm install --frozen-lockfile
pnpm dev
```

Antes de hacer push (convención de la sección 8 del plan):

```bash
pnpm install --frozen-lockfile && pnpm run lint && pnpm build
```

Entrar con cualquier correo del seed y la contraseña `quadra123`, por ejemplo
`martin@quadracount.dev`.

## Docker

```bash
docker build -t frontend-quadracount .
docker run --rm -p 8080:80 frontend-quadracount
```

`nginx.conf` incluye `try_files $uri $uri/ /index.html` para que recargar una
ruta de React Router no responda 404.

## Variables de entorno

Todavía ninguna. Cuando se conecte el BFF, su URL se configura con una
variable de Vite (`VITE_BFF_URL`), que se lee en tiempo de build.

## Estilo

Los colores y tipografías de la sección 7 del plan están como variables CSS en
`src/index.css`. Geist y Geist Mono se cargan desde Google Fonts en
`index.html`. Los montos llevan siempre signo (`+$12.000`, `−$8.000`) para no
depender solo del color.
