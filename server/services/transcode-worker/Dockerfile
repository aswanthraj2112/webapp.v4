# Transcode Worker Dockerfile
FROM node:18-alpine

# Install ffmpeg for video processing
RUN apk add --no-cache ffmpeg

# Set working directory
WORKDIR /app

# Copy shared utilities
COPY server/shared ./shared

# Copy service package files
COPY server/services/transcode-worker/package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy service source code
COPY server/services/transcode-worker/src ./src

# Set environment variables
ENV NODE_ENV=production
ENV SERVICE_NAME=transcode-worker

# No exposed port (this is a worker, not a web service)

# Health check - check if process is running
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD ps aux | grep -v grep | grep -q node || exit 1

# Start the worker
CMD ["node", "src/index.js"]
