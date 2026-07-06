# ==========================================
# Phase 1: Dependency Installation & Build
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

# Install build-essential tools if needed for native packages
RUN apk add --no-cache libc6-compat

# Copy package descriptors first to maximize layer caching
COPY package*.json ./

# Install all dependencies (including devDependencies for building)
RUN npm ci

# Copy application source code
COPY . .

# Run production compilation of frontend and backend
RUN npm run build

# Remove development dependencies to keep production image tiny
RUN npm prune --production


# ==========================================
# Phase 2: Production Execution Environment
# ==========================================
FROM node:20-alpine AS runner

WORKDIR /app

# Set production environment variable
ENV NODE_ENV=production
ENV PORT=3000

# Create low-privilege system user for security hardening
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs

# Copy only the compiled artifacts and minimal production package.json
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# Set file ownership to non-root user
USER nodejs

# Port 3000 is the hardcoded container routing target
EXPOSE 3000

# Start server using bundled ESM/CJS production script
CMD ["node", "dist/server.cjs"]
