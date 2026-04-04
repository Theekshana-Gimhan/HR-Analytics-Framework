FROM node:20-alpine
WORKDIR /workspace

# Copy prisma folder from backend into image
COPY backend/prisma /workspace/prisma
COPY ops/dev-migrations/prisma-resolve/run-resolve.sh /workspace/run-resolve.sh
RUN chmod +x /workspace/run-resolve.sh

# Install Prisma CLI
RUN npm install -g prisma@6

CMD ["/workspace/run-resolve.sh"]
