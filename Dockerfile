FROM node:24.21.0-bookworm-slim@sha256:0e0ff40c39bc087845bfb27465a0df4ea419520094bc35842ff83dd8cbe6f9b6 AS node-base
WORKDIR /app

FROM node-base AS dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

FROM node-base AS frontend-build
COPY package.json package-lock.json ./
RUN npm ci
COPY vite.config.js ./
COPY frontend ./frontend
COPY shared ./shared
COPY landing/brand.css ./landing/brand.css
COPY landing/assets/images/openfunnel-mark.webp ./landing/assets/images/openfunnel-mark.webp
RUN npm run build

FROM node-base AS api
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3001 DATABASE_PATH=/app/data/app.sqlite
COPY --from=dependencies /app/node_modules ./node_modules
COPY package.json ./
COPY backend ./backend
COPY shared ./shared
COPY LICENSE NOTICE LICENSING.md ./
RUN mkdir /app/data && chown node:node /app/data
USER node
EXPOSE 3001
HEALTHCHECK --interval=10s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3001/api/health',{signal:AbortSignal.timeout(3000)}).then(async r=>{if(!r.ok||!(await r.json()).ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "backend/server.js"]

FROM nginx:1.30.5-alpine@sha256:985220252f3863977e468f611ef118ebd01421289dd86ee1ae99cb068c3bce2b AS web
RUN rm -rf /usr/share/nginx/html/*
COPY deploy/app.nginx.conf /etc/nginx/nginx.conf
COPY --from=frontend-build /app/frontend/dist /usr/share/nginx/html
COPY LICENSE NOTICE LICENSING.md /usr/share/licenses/openfunnel/
COPY landing/LICENSE /usr/share/licenses/openfunnel/landing-LICENSE
USER nginx
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/ || exit 1
ENTRYPOINT ["nginx"]
CMD ["-g", "daemon off;"]
