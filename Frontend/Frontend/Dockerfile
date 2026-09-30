# ==============================================================================
# Multi-stage Dockerfile for React Frontend SPA (Vite + TypeScript)
# ==============================================================================

# Stage 1: Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package descriptors and install dependencies
COPY package*.json ./
RUN npm ci || npm install

# Copy frontend source files
COPY . .

# Set default relative API base URL for NGINX proxying
ENV VITE_API_BASE_URL=/api

# Build React production static assets
RUN npm run build

# Stage 2: NGINX production stage
FROM nginx:alpine

# Copy built production assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom NGINX configuration for SPA routing fallback
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
