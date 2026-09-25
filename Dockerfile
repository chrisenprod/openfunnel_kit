# One multi-stage Dockerfile produces two images: api and web.
# Pin the Node version and digest so builds use the same base image.
FROM node:24.21.0-bookworm-slim@sha256:0e0ff40c39bc087845bfb27465a0df4ea419520094bc35842ff83dd8cbe6f9b6 AS node-base
WORKDIR /app

# Install only runtime dependencies for the final API image.
# Copy lockfiles first to reuse this layer when application code changes.
FROM node-base AS dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Build React with Vite, including development tools only in this stage.
# The final web image receives static output, not Node or node_modules.
FROM node-base AS frontend-build
COPY package.json package-lock.json ./
RUN npm ci
COPY vite.config.js ./
COPY scripts/build-docs.js ./scripts/build-docs.js
COPY docs/site ./docs/site
COPY docs/api/AGENTES.md ./docs/api/AGENTES.md
COPY frontend ./frontend
COPY shared ./shared
COPY landing/brand.css ./landing/brand.css
COPY landing/assets/images/openfunnel-mark.webp ./landing/assets/images/openfunnel-mark.webp
COPY landing/assets/images/07-app-watercolor.webp ./landing/assets/images/07-app-watercolor.webp
RUN npm run build

# API runtime: Node serves /api and runs the integration worker.
# Secrets are supplied by Compose at runtime, never baked into this image.
FROM node-base AS api
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3001 DATABASE_PATH=/app/data/app.sqlite
COPY --from=dependencies /app/node_modules ./node_modules
COPY package.json ./
COPY backend ./backend
COPY shared ./shared
COPY LICENSE NOTICE LICENSING.md ./
# SQLite is mounted here as a persistent volume, writable by the node user.
RUN mkdir /app/data && chown node:node /app/data
USER node
# EXPOSE documents the internal port; it does not publish it on the host.
EXPOSE 3001
# Readiness checks both the HTTP server and a real SQLite query.
HEALTHCHECK --interval=10s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3001/api/health',{signal:AbortSignal.timeout(3000)}).then(async r=>{if(!r.ok||!(await r.json()).ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "backend/server.js"]

# Web runtime: unprivileged Nginx serves the frontend and proxies /api
# to the api service. Public HTTPS is handled by Nginx on the VPS host.
FROM nginx:1.30.5-alpine@sha256:985220252f3863977e468f611ef118ebd01421289dd86ee1ae99cb068c3bce2b AS web
RUN rm -rf /usr/share/nginx/html/*
COPY deploy/app.nginx.conf /etc/nginx/nginx.conf
COPY --from=frontend-build /app/frontend/dist /usr/share/nginx/html
COPY LICENSE NOTICE LICENSING.md /usr/share/licenses/openfunnel/
COPY landing/LICENSE /usr/share/licenses/openfunnel/landing-LICENSE
USER nginx
EXPOSE 8080
# Check the frontend independently; API health is checked in its own image.
HEALTHCHECK --interval=10s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/ || exit 1
# Run Nginx in the foreground as the container main process.
ENTRYPOINT ["nginx"]
CMD ["-g", "daemon off;"]
