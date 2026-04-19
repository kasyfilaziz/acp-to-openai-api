FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache dumb-init

COPY package*.json ./

RUN npm ci --only=production

COPY dist/ ./dist/
COPY config.yaml ./

ENV NODE_ENV=production

EXPOSE 8080

USER node

CMD ["dumb-init", "node", "dist/index.js"]