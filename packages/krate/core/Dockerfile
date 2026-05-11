FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS build
COPY . .
RUN npm run build
RUN npm run ui:build
RUN npm prune --omit=dev

FROM node:20-alpine AS runtime
WORKDIR /app
RUN apk add --no-cache ca-certificates curl && curl -fsSL -o /usr/local/bin/kubectl https://dl.k8s.io/release/v1.32.2/bin/linux/amd64/kubectl && chmod +x /usr/local/bin/kubectl
ENV NODE_ENV=production
ENV PORT=3080
COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/web/.next/standalone ./
COPY --from=build /app/apps/web/.next/static ./apps/web/.next/static
RUN printf '{"type":"commonjs"}\n' > apps/web/package.json
COPY --from=build /app/bin ./bin
COPY --from=build /app/src ./src
COPY --from=build /app/dist ./dist
COPY --from=build /app/charts ./charts
COPY --from=build /app/examples ./examples
EXPOSE 3080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3080)+'/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "bin/krate-server.mjs"]
