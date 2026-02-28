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


# Install system dependencies and PrusaSlicer
RUN apt-get update && apt-get install -y \
    wget \
    ca-certificates \
    libglu1-mesa \
    libgtk-3-0 \
    libxrender1 \
    libxi6 \
    libxrandr2 \
    libxcursor1 \
    libxinerama1 \
    libdbus-1-3 \
    libsm6 \
    libxext6 \
    libfreetype6 \
    libfontconfig1 \
    xvfb \
    && rm -rf /var/lib/apt/lists/*

# Download and install PrusaSlicer (more stable than OrcaSlicer on headless servers)
RUN cd /tmp \
    && wget -O prusa.AppImage https://github.com/prusa3d/PrusaSlicer/releases/download/version_2.7.4/PrusaSlicer-2.7.4+linux-x64-GTK3-202404141201.AppImage \
    && chmod +x prusa.AppImage \
    && ./prusa.AppImage --appimage-extract \
    && mv squashfs-root /opt/prusaslicer \
    && echo '#!/bin/bash\nexec xvfb-run -a /opt/prusaslicer/usr/bin/prusa-slicer "$@"' > /usr/local/bin/orcaslicer \
    && chmod +x /usr/local/bin/orcaslicer \
    && rm prusa.AppImage

# Verify installation
RUN echo "=== Slicer Installation Check ===" \
    && ls -la /opt/prusaslicer/usr/bin/ || echo "PrusaSlicer not found" \
    && which orcaslicer && cat /usr/local/bin/orcaslicer || echo "Wrapper not found"

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
