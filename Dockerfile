# Stage 1: Build stage with Bun
FROM oven/bun:1 AS builder

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package.json bun.lockb* ./
RUN bun install --frozen-lockfile

# Copy TypeScript source code
COPY src/ ./src/
COPY tsconfig.json ./

# Stage 2: Final stage using Drizzle Gateway image
FROM ghcr.io/drizzle-team/gateway:latest

# Install Bun runtime (using their official Docker image's bun binary)
COPY --from=oven/bun:1 /usr/local/bin/bun /usr/local/bin/bun

# Set working directory
WORKDIR /app

# Copy application files from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src ./src
COPY --from=builder /app/tsconfig.json ./
COPY --from=builder /app/package.json ./

# Create data directory for persistent storage
VOLUME /app/data

# Expose the Drizzle Gateway port
EXPOSE 4983

# Start our TypeScript process manager
CMD ["bun", "run", "src/index.ts"]