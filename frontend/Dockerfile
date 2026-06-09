# syntax=docker/dockerfile:1
FROM node:22-alpine

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

# Install ALL dependencies (incl. dev: Tailwind, PostCSS, TypeScript) — they're
# needed to build. Do not set NODE_ENV=production here or npm skips dev deps.
COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund

# Copy source and build.
COPY . .
RUN npm run build

# `next start` runs in production mode regardless of NODE_ENV.
ENV NODE_ENV=production
EXPOSE 3000

# `API_BASE_URL` is injected at runtime (see docker-compose.yml).
CMD ["npm", "run", "start"]
