# ── Stage 1: deps ────────────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# ── Stage 2: final image ─────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

# Security: run as non-root
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

# Copy deps from Stage 1
COPY --from=deps /app/node_modules ./node_modules

# Copy source
COPY --chown=nodejs:nodejs . .

# Create uploads directory
RUN mkdir -p uploads/source uploads/output && chown -R nodejs:nodejs uploads

USER nodejs

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:5000/api/health || exit 1

CMD ["node", "server.js"]
