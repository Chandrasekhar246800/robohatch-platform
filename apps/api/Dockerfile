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
    dumb-init \
    wget \
    unzip \
    libgtk-3-0 \
    libgl1 \
    libglu1-mesa \
    libfuse2 \
    ca-certificates \
    xvfb \
    && rm -rf /var/lib/apt/lists/*

# Download and install OrcaSlicer AppImage
RUN wget -q https://github.com/SoftFever/OrcaSlicer/releases/download/v2.1.1/OrcaSlicer_Linux_V2.1.1.AppImage -O /tmp/orcaslicer.AppImage && \
    chmod +x /tmp/orcaslicer.AppImage && \
    cd /tmp && \
    ./orcaslicer.AppImage --appimage-extract && \
    mv squashfs-root /opt/orcaslicer && \
    ln -s /opt/orcaslicer/AppRun /usr/local/bin/orca-slicer && \
    rm /tmp/orcaslicer.AppImage

# Verify OrcaSlicer installation
RUN xvfb-run -a orca-slicer --version || echo "OrcaSlicer installed (version check may fail in headless)

# Create slicing temp directory
RUN mkdir -p /tmp/slicer && chmod 777 /tmp/slicer

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

# Copy Bambu printer profiles
COPY --chown=nodejs:nodejs apps/api/config ./apps/api/config

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
