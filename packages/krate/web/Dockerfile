FROM node:20-alpine AS deps
WORKDIR /app
COPY packages/krate/web/package.json ./packages/krate/web/
COPY packages/krate/core/package.json ./packages/krate/core/
COPY package.json package-lock.json ./
RUN npm install --prefix packages/krate/web --legacy-peer-deps --ignore-scripts 2>/dev/null; exit 0

FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/packages/krate/web/node_modules ./packages/krate/web/node_modules
COPY packages/krate/web ./packages/krate/web
COPY packages/krate/core/src ./packages/krate/core/src
WORKDIR /app/packages/krate/web
RUN npx next build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
COPY --from=build /app/packages/krate/web/.next/standalone ./
COPY --from=build /app/packages/krate/web/.next/static ./packages/krate/web/.next/static
EXPOSE 3000
CMD ["node", "packages/krate/web/server.js"]
