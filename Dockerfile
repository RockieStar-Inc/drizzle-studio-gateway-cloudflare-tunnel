# Stage 1: Extract the Drizzle Gateway binary
FROM ghcr.io/drizzle-team/gateway:latest as gateway

# Stage 2: Build our Bun/TypeScript application
FROM oven/bun:1-slim as builder
WORKDIR /app
COPY package.json bun.lockb* ./
RUN bun install --frozen-lockfile
COPY . .

# Stage 3: Create the final, lean production image
FROM oven/bun:1-slim
WORKDIR /app

# --- Security: Create a non-root user to run the application ---
RUN useradd --create-home --shell /bin/bash appuser

# Copy the gateway binary from the first stage
COPY --from=gateway /app/gateway /usr/local/bin/gateway
RUN chmod +x /usr/local/bin/gateway

# Copy our application code and dependencies from the builder stage
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src ./src
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/bun.lockb* ./
COPY --from=builder /app/tsconfig.json ./tsconfig.json

# Copy and set permissions for the entrypoint script
COPY --chown=appuser:appuser entrypoint.sh .
RUN chmod +x entrypoint.sh

# Change to non-root user
USER appuser

# Expose the Drizzle Gateway port
EXPOSE 4983

# Set the entrypoint to our script
ENTRYPOINT ["./entrypoint.sh"]