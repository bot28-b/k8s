# ============================================
# Stage 1: Build Stage
# ============================================
FROM node:20-alpine AS builder

WORKDIR /app

# Build arguments
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

# Copy package files
COPY package*.json ./

# Install dependencies (only dev dependencies needed for building)
RUN npm install

# Copy source code
COPY . .

# Build the application
RUN npm run build

# ============================================
# Stage 2: Production Stage
# ============================================
FROM nginx:alpine

# Add metadata
LABEL maintainer="devops@example.com"
LABEL description="Kubernetes Task Manager - Frontend"

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Add a non-root user (optional for Nginx, but good practice if using unprivileged ports)
# Nginx official image runs as root to bind 80, then switches workers. 
# For strict non-root, we'd use unprivileged nginx image, but standard alpine is fine for this demo.

# Expose port
EXPOSE 80

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q --spider http://localhost/health || exit 1

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
