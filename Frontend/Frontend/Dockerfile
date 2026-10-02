# ==============================================================================
# Multi-stage Dockerfile for React Frontend SPA (Vite + TypeScript)
# ==============================================================================

# ==============================================================================
# Stage 1: Build stage
# ==============================================================================

FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# ------------------------------------------------------------------------------
# Install dependencies
# ------------------------------------------------------------------------------

# Copy package files first for better Docker layer caching
COPY package*.json ./

# Install Node dependencies
RUN npm ci || npm install

# ------------------------------------------------------------------------------
# Copy frontend source
# ------------------------------------------------------------------------------

COPY . .

# ------------------------------------------------------------------------------
# Render API configuration
# ------------------------------------------------------------------------------

# Vite environment variables must be available during the build.
# Render provides VITE_API_BASE_URL as a build-time environment variable.
ARG VITE_API_BASE_URL

ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

# API request timeout must cover Render free-tier cold starts (~60s).
# Default when not provided: 180000 ms.
ARG VITE_API_TIMEOUT_MS=180000

ENV VITE_API_TIMEOUT_MS=${VITE_API_TIMEOUT_MS}

# Show the API URL during build so it can be verified in Render logs
RUN echo "=============================================="
RUN echo "Building frontend..."
RUN echo "VITE_API_BASE_URL=${VITE_API_BASE_URL}"
RUN echo "VITE_API_TIMEOUT_MS=${VITE_API_TIMEOUT_MS}"
RUN echo "=============================================="

# ------------------------------------------------------------------------------
# Build React application
# ------------------------------------------------------------------------------

RUN npm run build


# ==============================================================================
# Stage 2: NGINX production server
# ==============================================================================

FROM nginx:alpine

# ------------------------------------------------------------------------------
# Copy React production build
# ------------------------------------------------------------------------------

COPY --from=builder /app/dist /usr/share/nginx/html

# ------------------------------------------------------------------------------
# SPA NGINX configuration
# ------------------------------------------------------------------------------

COPY nginx.conf /etc/nginx/conf.d/default.conf

# ------------------------------------------------------------------------------
# Expose HTTP port
# ------------------------------------------------------------------------------

EXPOSE 80

# ------------------------------------------------------------------------------
# Start NGINX
# ------------------------------------------------------------------------------

CMD ["nginx", "-g", "daemon off;"]