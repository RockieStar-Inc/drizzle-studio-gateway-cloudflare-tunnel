# Use Bun's slim image as base
FROM oven/bun:1-slim

# Install curl for downloading Drizzle Gateway
RUN apt-get update && apt-get install -y curl && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Download and setup Drizzle Gateway binary
RUN curl -Lo /usr/local/bin/drizzle-gateway https://pub-e240a4fd7085425baf4a7951e7611520.r2.dev/drizzle-gateway-1.0.2-linux-x64 && \
    chmod +x /usr/local/bin/drizzle-gateway

# Copy package files and install dependencies
COPY package.json bun.lockb* ./
RUN bun install --frozen-lockfile

# Copy TypeScript source code
COPY src/ ./src/
COPY tsconfig.json ./

# Create data directory for persistent storage
VOLUME /app/data

# Expose the Drizzle Gateway port
EXPOSE 4983

# Map the more specific env var to what Drizzle Gateway expects
ENV MASTERPASS=$DRIZZLE_GATEWAY_MASTERPASS

# Start our TypeScript process manager
CMD ["bun", "run", "src/index.ts"]