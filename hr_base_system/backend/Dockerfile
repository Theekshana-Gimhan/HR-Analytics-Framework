# Stage 1: Build the application
FROM node:20-slim AS builder

# Install OpenSSL (required by Prisma even during build)
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

WORKDIR /usr/src/monorepo

# Copy root package files
COPY package*.json ./

# Copy packages
COPY packages/ ./packages/

# Copy backend and frontend
COPY backend/ ./backend/
COPY frontend/ ./frontend/

# Install all dependencies (including dev deps) and build backend only to ensure
# compiled artifacts are generated into `backend/dist`.
# Include dev dependencies so TypeScript and build tools are available.
# Also compile seed scripts for production use.
RUN npm install && \
	npx prisma generate --schema=backend/prisma/schema.prisma && \
	npm run build -w packages/types && \
	npm run build:production -w backend && \
	npm run build:seeds -w backend && \
	echo "Build complete" && \
	ls -la backend && \
	ls -la backend/dist || true

# Stage 2: Create the production image
FROM node:20-slim

# Install OpenSSL (required by Prisma)
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

# Copy root package files to set up workspace
COPY --from=builder /usr/src/monorepo/package*.json ./

# Copy built types package (needed for workspace resolution)
COPY --from=builder /usr/src/monorepo/packages ./packages

# Copy backend files
COPY --from=builder /usr/src/monorepo/backend/package*.json ./backend/
COPY --from=builder /usr/src/monorepo/backend/prisma ./backend/prisma

# Install all production dependencies (this will handle workspace packages correctly)
RUN npm install --production --workspace=backend && \
    cd backend && npx prisma generate

# Copy built artifacts
COPY --from=builder /usr/src/monorepo/backend/dist ./backend/dist

# Set working directory to backend
WORKDIR /usr/src/app/backend

# Sanity-check that build artifacts were copied correctly. This will cause
# the Docker build to fail early with a clear message if neither
# `dist/index.js` nor `dist/src/index.js` exist. Some TypeScript setups
# emit compiled files with the `src/` prefix preserved (e.g. `dist/src/...`) so
# accept either layout here and choose the correct entrypoint at runtime.
RUN ls -la ./dist || (echo "dist directory missing after copy" && exit 1) && \
    if [ -f ./dist/index.js ]; then \
			echo "Found ./dist/index.js"; \
		elif [ -f ./dist/src/index.js ]; then \
			echo "Found ./dist/src/index.js"; \
		else \
			echo "Neither ./dist/index.js nor ./dist/src/index.js found" && exit 1; \
		fi

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=30s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Run as non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 --home /home/appuser appuser && \
    mkdir -p /home/appuser && chown appuser:nodejs /home/appuser

# Create uploads directory for local document storage and grant ownership to appuser
RUN mkdir -p /usr/src/app/backend/uploads/documents && \
    chown -R appuser:nodejs /usr/src/app/backend/uploads

# Ensure Prisma engine binaries and generated client are accessible
RUN chmod -R a+rX /usr/src/app/node_modules/.prisma 2>/dev/null || true && \
    chmod -R a+rX /usr/src/app/node_modules/@prisma/engines 2>/dev/null || true && \
    chown -R appuser:nodejs /usr/src/app/backend/dist

USER appuser

EXPOSE 8080

# Choose the correct entry file at container start. This keeps the image
# compatible with either `outDir: ./dist` + `rootDir: src` (emits `dist/index.js`)
# or `rootDir: ./` (emits `dist/src/index.js`).
CMD ["sh", "-c", "if [ -f ./dist/index.js ]; then node ./dist/index.js; else node ./dist/src/index.js; fi"]
