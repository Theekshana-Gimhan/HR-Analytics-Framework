FROM node:20-alpine
WORKDIR /workspace

# Copy prisma folder (schema + migrations) into image
COPY prisma /workspace/prisma
COPY run-resolve.sh /workspace/run-resolve.sh
RUN chmod +x /workspace/run-resolve.sh

# Install Prisma CLI
RUN npm install -g prisma@6

CMD ["/workspace/run-resolve.sh"]
