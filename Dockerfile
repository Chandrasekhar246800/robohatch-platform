# Use Node.js base image
FROM node:20-bullseye-slim

# Install dependencies for PrusaSlicer AppImage
RUN apt-get update && apt-get install -y \
    wget \
    ca-certificates \
    libgtk-3-0 \
    libglu1-mesa \
    libgomp1 \
    libwebkit2gtk-4.0-37 \
    && rm -rf /var/lib/apt/lists/*

# Download PrusaSlicer AppImage
RUN wget https://github.com/prusa3d/PrusaSlicer/releases/download/version_2.7.4/PrusaSlicer-2.7.4+linux-x64-GTK3-202401171200.AppImage \
    -O /usr/local/bin/prusa-slicer

# Make executable
RUN chmod +x /usr/local/bin/prusa-slicer

# Verify PrusaSlicer installation
RUN prusa-slicer --version

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
