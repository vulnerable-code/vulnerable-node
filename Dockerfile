# NodeBazaar app image. Node 22 slim; deps copied first for layer caching.
FROM node:22-slim

# OCI labels
LABEL org.opencontainers.image.title="vulnerable-nodejs" \
      org.opencontainers.image.description="Intentionally vulnerable Node.js shop for security training (NodeBazaar)" \
      org.opencontainers.image.authors="vulnerable-nodejs contributors" \
      org.opencontainers.image.source="https://github.com/cr0hn/vulnerable-node" \
      org.opencontainers.image.licenses="MIT"

WORKDIR /app

# Copy lockfile + manifest first: npm ci layer only rebuilds when they change.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .

# App runs as the unprivileged `node` user the base image provides.
RUN chown -R node:node /app
USER node

EXPOSE 3000
CMD ["node", "server.js"]