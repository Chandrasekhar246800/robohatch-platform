# Use Node.js base image
FROM node:20-bullseye-slim

# Install PrusaSlicer dependencies and download binary
RUN apt-get update && apt-get install -y \
    wget \
    ca-certificates \
    libgtk-3-0 \
    libglu1-mesa \
    openssl \
    && rm -rf /var/lib/apt/lists/*

# Download and extract PrusaSlicer AppImage
RUN wget -O /tmp/prusaslicer.AppImage https://github.com/prusa3d/PrusaSlicer/releases/download/version_2.7.4/PrusaSlicer-2.7.4+linux-x64-GTK3-202401171200.AppImage \
    && chmod +x /tmp/prusaslicer.AppImage \
    && cd /tmp \
    && ./prusaslicer.AppImage --appimage-extract \
    && mv squashfs-root /opt/prusaslicer \
    && ln -s /opt/prusaslicer/usr/bin/prusa-slicer /usr/local/bin/prusa-slicer \
    && rm /tmp/prusaslicer.AppImage

# Set working directory for API service
WORKDIR /app

# Copy API package files
COPY apps/api/package*.json ./
COPY apps/api/prisma ./prisma

# Install API dependencies
RUN npm install

# Copy API source code and slicer config
COPY apps/api/src ./src
COPY apps/api/tsconfig.json ./

# Build the API
RUN npm run build

# Expose port
EXPOSE 8080

# Start command
CMD ["npm", "run", "start"]
