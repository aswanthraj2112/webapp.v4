# Multi-stage Dockerfile for combined webapp
FROM node:22-slim as backend-build

# Install FFmpeg and other system dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app/server

# Copy server package files
COPY server/package*.json ./

# Install server dependencies
RUN npm ci --only=production

# Copy server application code
COPY server/ ./

# Create directories for uploads
RUN mkdir -p src/public/videos src/public/thumbs

# Frontend build stage
FROM node:22-slim as frontend-build

WORKDIR /app/client

# Copy client package files
COPY client/package*.json ./

# Install client dependencies
RUN npm ci

# Copy client application code
COPY client/ ./

# Production stage
FROM node:22-slim as production

# Install FFmpeg for video processing
RUN apt-get update && apt-get install -y \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy backend from backend-build stage
COPY --from=backend-build /app/server ./server

# Copy frontend from frontend-build stage  
COPY --from=frontend-build /app/client ./client

# Copy root level files
COPY package.json ./
COPY start-app.sh ./
RUN chmod +x start-app.sh

# Set AWS region for Secrets Manager
ENV AWS_REGION=ap-southeast-2

# Create startup script that runs both services
RUN echo '#!/bin/bash\n\
    cd /app/server && npm start &\n\
    cd /app/client && npm run dev -- --host 0.0.0.0 --port 3000 &\n\
    wait' > /app/start-combined.sh && chmod +x /app/start-combined.sh

# Expose both ports
EXPOSE 8080 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD curl -f http://n11817143-videoapp.cab432.com:8080/api/health || exit 1

# Start both services
CMD ["/app/start-combined.sh"]