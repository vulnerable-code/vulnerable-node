# NodeBazaar app image. Node 22 slim; deps copied first for layer caching.
FROM node:22-slim

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY . .

EXPOSE 3000
CMD ["node", "server.js"]