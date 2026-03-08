# Use Node.js base image
FROM node:20-bullseye-slim

# Install dependencies for PrusaSlicer
RUN apt-get update && apt-get install -y \
    wget \
    ca-certificates \
    libgtk-3-0 \
    libglu1-mesa \
    libgomp1 \
    libwebkit2gtk-4.0-37 \
    libosmesa6 \
    libgl1 \
    && rm -rf /var/lib/apt/lists/*

# Download and install PrusaSlicer standalone Linux tarball (v2024-04-05)
RUN cd /tmp && \
    wget --no-check-certificate -O PrusaSlicer.tar.bz2 "https://github.com/prusa3d/PrusaSlicer/releases/download/version_2.7.4/PrusaSlicer-2.7.4%2Blinux-x64-GTK3-202404050928.tar.bz2" && \
    echo "Downloaded PrusaSlicer tarball" && \
    tar -xjf PrusaSlicer.tar.bz2 && \
    echo "Extracted tarball, contents:" && ls -la && \
    mv PrusaSlicer-2.7.4+linux-x64-GTK3-202404050928 /opt/prusa-slicer && \
    ln -s /opt/prusa-slicer/prusa-slicer /usr/local/bin/prusa-slicer && \
    rm PrusaSlicer.tar.bz2 && \
    echo "PrusaSlicer installation completed"

# Verify PrusaSlicer installation
RUN which prusa-slicer && ls -la /opt/prusa-slicer/ && prusa-slicer --help || echo "PrusaSlicer installed"

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
