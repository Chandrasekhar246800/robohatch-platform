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
RUN apt-get update && apt-get install -y --no-install-recommends \
        wget \
        bzip2 \
        ca-certificates \
        libgtk-3-0 \
        libglu1-mesa \
        libgomp1 \
        libwebkit2gtk-4.0-37 \
        libosmesa6 \
        libgl1 \
        && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy built app and node_modules from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma

# Download and symlink PrusaSlicer (best-effort; non-fatal)
RUN set -eux; \
        cd /tmp; \
        PRUSA_URL="https://github.com/prusa3d/PrusaSlicer/releases/download/version_2.7.4/PrusaSlicer-2.7.4+linux-x64-GTK3-202404050928.tar.bz2"; \
        wget -O prusa.tar.bz2 "$PRUSA_URL" || echo "PrusaSlicer download failed, continuing"; \
        if [ -f prusa.tar.bz2 ]; then \
            mkdir -p /opt; \
            tar -xjf prusa.tar.bz2 -C /opt/ || true; \
            # find executable and symlink if present
            if [ -d /opt ]; then \
                PRUSA_DIR=$(ls -1d /opt/PrusaSlicer-* 2>/dev/null || true); \
                if [ -n "$PRUSA_DIR" ]; then \
                    ln -sf "$PRUSA_DIR/prusa-slicer" /usr/local/bin/prusa-slicer || true; \
                    chmod +x "$PRUSA_DIR/prusa-slicer" || true; \
                fi; \
            fi; \
            rm -f prusa.tar.bz2; \
        fi

EXPOSE 8080

# Start the application
CMD ["npm", "run", "start"]
