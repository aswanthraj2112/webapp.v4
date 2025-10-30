# Admin Service Dockerfile
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy shared package.json and install shared dependencies first
COPY server/shared/package*.json ./server/shared/
WORKDIR /app/server/shared
RUN npm install --omit=dev

# Copy service package files and install service dependencies
WORKDIR /app
COPY server/services/admin-service/package*.json ./server/services/admin-service/
WORKDIR /app/server/services/admin-service
RUN npm install --omit=dev

# Copy shared utilities and service source code
WORKDIR /app
COPY server/shared ./server/shared
COPY server/services/admin-service/src ./server/services/admin-service/src

# Set working directory to service
WORKDIR /app/server/services/admin-service

# Set environment variables
ENV NODE_ENV=production
ENV SERVICE_NAME=admin-service
ENV PORT=8080

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:8080/healthz', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the service
CMD ["node", "src/index.js"]
