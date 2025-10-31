# Transcode Worker Dockerfile
FROM node:18-alpine

# Install ffmpeg for video processing
RUN apk add --no-cache ffmpeg

# Set working directory
WORKDIR /app

# Copy shared package.json and install shared dependencies first
COPY server/shared/package*.json ./server/shared/
WORKDIR /app/server/shared
RUN npm install --omit=dev

# Copy service package files and install service dependencies
WORKDIR /app
COPY server/services/transcode-worker/package*.json ./server/services/transcode-worker/
WORKDIR /app/server/services/transcode-worker
RUN npm install --omit=dev

# Copy shared utilities and service source code
WORKDIR /app
COPY server/shared ./server/shared
COPY server/services/transcode-worker/src ./server/services/transcode-worker/src

# Set working directory to service (stay in /app to match relative imports)
WORKDIR /app

# Set environment variables
ENV NODE_ENV=production
ENV SERVICE_NAME=transcode-worker

# No exposed port (this is a worker, not a web service)

# Health check - check if process is running
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD ps aux | grep -v grep | grep -q node || exit 1

# Start the worker from the correct directory
CMD ["node", "server/services/transcode-worker/src/index.js"]
