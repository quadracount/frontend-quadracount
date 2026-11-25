FROM node:24-slim AS build
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml* ./
RUN corepack enable && corepack install
RUN pnpm install --frozen-lockfile
COPY . .
# URL del GraphQL del BFF tal como la ve el NAVEGADOR (no el cluster). Vite la fija
# al construir. Por defecto, el port-forward / puerto publicado en localhost:3000.
ARG VITE_BFF_URL=http://localhost:3000/graphql
ENV VITE_BFF_URL=$VITE_BFF_URL
RUN pnpm build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
