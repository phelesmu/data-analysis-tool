# --- Build stage ---------------------------------------------------------
FROM node:22-alpine AS builder
WORKDIR /app

# Install deps first to leverage docker layer cache
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# Copy source and build
COPY . .
RUN npm run build

# --- Runtime stage -------------------------------------------------------
FROM nginx:1.27-alpine AS runtime

# Replace default site with our SPA-friendly config
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built static assets
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null 2>&1 || exit 1

CMD ["nginx", "-g", "daemon off;"]
