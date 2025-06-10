FROM node:22 AS build-stage

WORKDIR /app

RUN npm i -g pnpm
RUN corepack enable

COPY .npmrc package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

# SSR
FROM node:22-slim AS production-stage

WORKDIR /app

COPY --from=build-stage /app/.output ./.output

EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]
