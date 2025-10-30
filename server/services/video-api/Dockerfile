# Video-API Service Dockerfile
FROM node:18-alpine

# Install ffmpeg for video processing
RUN apk add --no-cache ffmpeg

# Set working directory
WORKDIR /app

# Copy shared utilities
COPY server/shared ./shared

# Copy service package files
COPY server/services/video-api/package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy service source code
COPY server/services/video-api/src ./src

# Set environment variables
ENV NODE_ENV=production
ENV SERVICE_NAME=video-api
ENV PORT=8080

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:8080/healthz', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the service
CMD ["node", "src/index.js"]
