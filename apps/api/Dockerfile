# Stage 1: Build
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY turbo.json ./
COPY apps/api/package*.json ./apps/api/

# Install dependencies
RUN npm install

# Copy source code
COPY apps/api ./apps/api
COPY packages ./packages

# Generate Prisma Client
WORKDIR /app/apps/api
RUN npx prisma generate

# Build the application
RUN npm run build

# Stage 2: Production
FROM node:20 AS production


# Install system dependencies for OrcaSlicer
RUN apt-get update && apt-get install -y \
    wget \
    ca-certificates \
    libglu1-mesa \
    libxrender1 \
    libxi6 \
    libxrandr2 \
    libxcursor1 \
    libxinerama1 \
    libsm6 \
    libxext6 \
    libfreetype6 \
    libfontconfig1 \
    libxfixes3 \
    libxcomposite1 \
    libxdamage1 \
    libwayland-client0 \
    xvfb \
    && rm -rf /var/lib/apt/lists/*

# Download and extract OrcaSlicer without AppImage (direct binary extraction)
RUN cd /tmp \
    && wget -O orcaslicer.AppImage https://github.com/SoftFever/OrcaSlicer/releases/download/v2.1.1/OrcaSlicer_Linux_V2.1.1.AppImage \
    && chmod +x orcaslicer.AppImage \
    && ./orcaslicer.AppImage --appimage-extract 2>/dev/null || true \
    && if [ -d squashfs-root ]; then \
        mv squashfs-root /opt/orcaslicer && \
        ln -s /opt/orcaslicer/usr/bin/orca-slicer /usr/local/bin/orcaslicer && \
        chmod +x /usr/local/bin/orcaslicer; \
    else \
        echo "AppImage extraction failed, trying alternative..." && \
        wget -O orcaslicer.tar.gz https://github.com/SoftFever/OrcaSlicer/releases/download/v2.1.1/OrcaSlicer_Linux_V2.1.1.tar.gz 2>/dev/null && \
        tar xzf orcaslicer.tar.gz && \
        mv OrcaSlicer /opt/orcaslicer && \
        ln -s /opt/orcaslicer/bin/orca-slicer /usr/local/bin/orcaslicer && \
        chmod +x /usr/local/bin/orcaslicer; \
    fi \
    && rm -rf /tmp/orcaslicer* /tmp/squashfs-root

# Verify installation and show what we have
RUN echo "=== OrcaSlicer Installation Check ===" \
    && ls -la /opt/ || true \
    && ls -la /opt/orcaslicer/ || true \
    && which orcaslicer || echo "WARNING: orcaslicer not in PATH" \
    && file /usr/local/bin/orcaslicer || echo "Symlink check failed"

# Install dumb-init for proper signal handling
RUN apt-get update && apt-get install -y dumb-init && rm -rf /var/lib/apt/lists/*

# Create app user
RUN groupadd -g 1001 nodejs && \
    useradd -r -u 1001 -g nodejs nodejs

# Set working directory
WORKDIR /app

# Copy package files
COPY --chown=nodejs:nodejs package*.json ./
COPY --chown=nodejs:nodejs apps/api/package*.json ./apps/api/

# Install production dependencies only
ENV NODE_ENV=production
RUN npm install --production --workspace=@robohatch/api

# Copy built application from builder
COPY --chown=nodejs:nodejs --from=builder /app/apps/api/dist ./apps/api/dist
COPY --chown=nodejs:nodejs --from=builder /app/apps/api/node_modules/.prisma ./apps/api/node_modules/.prisma
COPY --chown=nodejs:nodejs --from=builder /app/apps/api/prisma ./apps/api/prisma

# Create temp directory for STL analysis
RUN mkdir -p /tmp/stl-uploads && \
    chown -R nodejs:nodejs /tmp/stl-uploads && \
    chmod 755 /tmp/stl-uploads

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "apps/api/dist/server.js"]
