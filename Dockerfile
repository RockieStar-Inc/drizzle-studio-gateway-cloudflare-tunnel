# Use the official Drizzle Gateway image as base
FROM ghcr.io/drizzle-team/gateway:latest

# Install Bun
RUN apt-get update && apt-get install -y curl unzip && \
    curl -fsSL https://bun.sh/install | bash && \
    ln -s /root/.bun/bin/bun /usr/local/bin/bun && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package.json bun.lockb* ./
RUN bun install --frozen-lockfile

# Copy TypeScript source code
COPY src/ ./src/
COPY tsconfig.json ./

# Create data directory for persistent storage
RUN mkdir -p /app/data

# Expose the Drizzle Gateway port
EXPOSE 4983

# Start our TypeScript process manager
CMD ["bun", "run", "src/index.ts"]