# Use Node.js base image
## Multi-stage Dockerfile
## Builder: installs build tools, dependencies, runs prisma generate and builds TypeScript
FROM node:20-bullseye-slim AS builder

# Install build tools needed for native modules (bcrypt, node-gyp, prisma client generation)
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
        python3 \
        make \
        g++ \
        libssl-dev \
        ca-certificates \
        wget \
        bzip2 \
        && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files and prisma schema first for better caching
COPY apps/api/package*.json ./
COPY apps/api/prisma ./prisma

# Install dependencies (use npm install when lockfile missing)
RUN npm install --no-audit --prefer-offline

# Run prisma generate early to prepare client
RUN npx prisma generate --schema=./prisma/schema.prisma || true

# Copy remaining source and build
COPY apps/api/ .
RUN npm run build

## Runtime image: smaller, contains only runtime deps and built artifacts
FROM node:20-bullseye-slim

# Runtime libraries required by PrusaSlicer and app runtime

# Keep runtime minimal. PrusaSlicer and GTK libs removed to avoid large downloads in CI.
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy built app and node_modules from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma

# PrusaSlicer removed from image build to keep CI builds reliable. If you need PrusaSlicer,
# build/run it in a dedicated image or install it at runtime on a machine that requires it.

EXPOSE 8080

# Start the application
CMD ["npm", "run", "start"]
