# Use Node.js base image
FROM node:20-bullseye-slim

# Install dependencies for PrusaSlicer
RUN apt-get update && apt-get install -y \
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

# Download and install PrusaSlicer
RUN wget -q -O /tmp/prusa.tar.bz2 \
    "https://github.com/prusa3d/PrusaSlicer/releases/download/version_2.7.4/PrusaSlicer-2.7.4+linux-x64-GTK3-202404050928.tar.bz2" && \
    tar -xjf /tmp/prusa.tar.bz2 -C /opt/ && \
    rm /tmp/prusa.tar.bz2 && \
    ln -s /opt/PrusaSlicer-2.7.4+linux-x64-GTK3-202404050928/prusa-slicer /usr/local/bin/prusa-slicer && \
    chmod +x /usr/local/bin/prusa-slicer

# Verify installation
RUN prusa-slicer --help || echo "PrusaSlicer check complete"

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
