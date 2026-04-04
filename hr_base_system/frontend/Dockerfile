# Stage 1: Build the React application
FROM node:20.19.0-slim AS builder

# Build arguments for environment variables
ARG VITE_API_BASE_URL
ARG NODE_ENV=production

# Set environment variables for build
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV NODE_ENV=${NODE_ENV}

WORKDIR /usr/src/monorepo

# Copy root package files
COPY package*.json ./

# Copy packages
COPY packages/ ./packages/

# Copy backend and frontend
COPY backend/ ./backend/
COPY frontend/ ./frontend/

# Install all dependencies for all workspaces including devDependencies
RUN npm install --include=dev

# Build types package first
WORKDIR /usr/src/monorepo/packages/types
RUN npm run build

# Install frontend-specific dependencies including Linux Rollup binary
# This ensures vite and all dev tools are available
WORKDIR /usr/src/monorepo/frontend
RUN npm install --include=dev @rollup/rollup-linux-x64-gnu

# Build frontend from its own directory
RUN npm run build

# Verify frontend build output
WORKDIR /usr/src/monorepo/frontend
RUN ls -la dist || (echo "Frontend build failed" && exit 1)

# Stage 2: Create the production image with Nginx
FROM nginx:1.27-alpine

# Copy built files from builder
COPY --from=builder /usr/src/monorepo/frontend/dist /usr/share/nginx/html

# Copy the nginx config file
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Fix permissions for nginx user
RUN chown -R nginx:nginx /usr/share/nginx/html && \
        chmod -R 755 /usr/share/nginx/html && \
        chown -R nginx:nginx /var/cache/nginx && \
        chown -R nginx:nginx /var/log/nginx && \
        chown -R nginx:nginx /etc/nginx/conf.d && \
        touch /var/run/nginx.pid && \
        chown nginx:nginx /var/run/nginx.pid

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/ || exit 1

# Run as non-root user for security
USER nginx

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
