FROM node:18-bullseye-slim

WORKDIR /app

# Install OpenSSL and ca-certs required by Prisma native binaries
RUN apt-get update \
	&& apt-get install -y --no-install-recommends openssl ca-certificates libssl-dev \
	&& rm -rf /var/lib/apt/lists/*

# Ensure devDependencies (prisma CLI) are installed so `npx prisma` is available
ENV NPM_CONFIG_PRODUCTION=false

# Copy backend package.json so we can install prisma (devDep)
COPY backend/package.json ./
RUN npm install --no-audit --prefer-offline

# Copy Prisma schema and migrations from backend
COPY backend/prisma ./prisma

ENV NODE_ENV=production

# Default command: run Prisma migrations
CMD ["npx", "prisma", "migrate", "deploy"]
