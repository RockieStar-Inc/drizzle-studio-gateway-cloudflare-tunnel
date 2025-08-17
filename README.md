# Drizzle Studio Gateway with Cloudflare Tunnel

A Docker setup that combines Drizzle Studio Gateway with Cloudflare Tunnel for secure remote access to your database admin panel.

## Features

- **Drizzle Studio Gateway**: Web-based database management interface
- **Cloudflare Tunnel**: Secure public access without exposing ports (permanent or temporary)
- **Cross-Platform**: Works on macOS, Linux, Windows, and Docker
- **Multiple Installation Options**:
  - Standalone executables for all platforms
  - Pre-built Docker image from GitHub Container Registry
  - Build from source with Docker
  - Run directly with Bun runtime
- **Automatic Binary Management**: Downloads Drizzle Gateway binary for your platform
- **Process Management**: TypeScript-based process manager for both services

## Quick Start

### Option 1: Using Standalone Binary (Simplest)

Download the pre-built binary for your platform from the [latest release](https://github.com/RockieStar-Inc/drizzle-studio-gateway-cloudflare-tunnel/releases/latest):

```bash
# macOS (Apple Silicon)
curl -L https://github.com/RockieStar-Inc/drizzle-studio-gateway-cloudflare-tunnel/releases/latest/download/drizzle-gateway-macos-arm64.tar.gz | tar -xz
chmod +x drizzle-gateway-macos-arm64

# macOS (Intel)
curl -L https://github.com/RockieStar-Inc/drizzle-studio-gateway-cloudflare-tunnel/releases/latest/download/drizzle-gateway-macos-x64.tar.gz | tar -xz
chmod +x drizzle-gateway-macos-x64

# Linux x64
curl -L https://github.com/RockieStar-Inc/drizzle-studio-gateway-cloudflare-tunnel/releases/latest/download/drizzle-gateway-linux-x64.tar.gz | tar -xz
chmod +x drizzle-gateway-linux-x64

# Linux ARM64
curl -L https://github.com/RockieStar-Inc/drizzle-studio-gateway-cloudflare-tunnel/releases/latest/download/drizzle-gateway-linux-arm64.tar.gz | tar -xz
chmod +x drizzle-gateway-linux-arm64
```

Run with environment variables:
```bash
DRIZZLE_GATEWAY_MASTERPASS=your-secure-password \
CLOUDFLARE_TUNNEL_TOKEN=your-token \
./drizzle-gateway-<platform>
```

### Option 2: Using Pre-built Docker Image (Recommended for Production)

1. **Create project directory**:
   ```bash
   mkdir drizzle-gateway && cd drizzle-gateway
   ```

2. **Download docker-compose.yml and .env.example**:
   ```bash
   curl -O https://raw.githubusercontent.com/RockieStar-Inc/drizzle-studio-gateway-cloudflare-tunnel/main/docker-compose.yml
   curl -O https://raw.githubusercontent.com/RockieStar-Inc/drizzle-studio-gateway-cloudflare-tunnel/main/.env.example
   cp .env.example .env
   ```

3. **Run with Docker Compose**:
   ```bash
   docker-compose up -d
   ```

### Option 3: Build from Source

1. **Clone and setup**:
   ```bash
   git clone https://github.com/RockieStar-Inc/drizzle-studio-gateway-cloudflare-tunnel.git
   cd drizzle-studio-gateway-cloudflare-tunnel
   cp .env.example .env
   ```

2. **Configure Cloudflare Tunnel** (optional):
   - For permanent tunnel:
     - Go to [Cloudflare Zero Trust Dashboard](https://one.dash.cloudflare.com/)
     - Create a new tunnel
     - Configure it to point to `http://localhost:4983`
     - Copy the tunnel token to your `.env` file
   - For temporary tunnel:
     - Leave `CLOUDFLARE_TUNNEL_TOKEN` unset
     - A random `*.trycloudflare.com` URL will be generated

3. **Build and run locally**:
   ```bash
   # Uncomment the build line in docker-compose.yml
   docker-compose up --build
   ```

### Option 4: Run from Source with Bun (macOS/Linux)

1. **Clone repository**:
   ```bash
   git clone https://github.com/RockieStar-Inc/drizzle-studio-gateway-cloudflare-tunnel.git
   cd drizzle-studio-gateway-cloudflare-tunnel
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Setup environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Run locally**:
   ```bash
   npm start
   ```

## Configuration

### Environment Variables (.env)

#### Required/Recommended
- `DRIZZLE_GATEWAY_MASTERPASS`: Master password for Drizzle Studio Gateway access (highly recommended for production)
  - This password protects your database management interface
  - The application will log the environment variable name and password length on startup
  - Falls back to `MASTERPASS` if not set (for backward compatibility)

#### Cloudflare Tunnel
- `CLOUDFLARE_TUNNEL_TOKEN`: Your Cloudflare tunnel token
  - Leave empty for temporary tunnel with random `*.trycloudflare.com` URL
  - Set for permanent tunnel with your custom domain

#### Optional Settings
- `PORT`: Gateway port (default: 4983)
- `STORE_PATH`: Data storage path (default: /app/data in Docker, ./data locally)

### Gateway Configuration
The Drizzle Gateway uses its built-in configuration. You can access the web interface at the tunnel URL or locally at http://localhost:4983 (if port is exposed) to configure databases and users through the UI.

## Directory Structure

```
.
├── data/                     # Database files (persistent)
├── src/
│   └── index.ts             # TypeScript process manager for both services
├── .env                     # Environment variables
├── docker-compose.yml       # Docker Compose configuration
├── Dockerfile              # Built on official Drizzle Gateway image
├── package.json            # Bun dependencies
└── tsconfig.json           # TypeScript configuration
```

## Security Best Practices

### Authentication
- **Always set `DRIZZLE_GATEWAY_MASTERPASS`** in production environments
- Use a strong, unique password (minimum 16 characters recommended)
- The password length is logged on startup for verification (password itself is never logged)
- Configure additional user credentials through the Drizzle Gateway web interface

### Environment Security
- Keep your `.env` file secure and never commit it to version control
- Use secrets management for production deployments
- Rotate passwords regularly

### Network Security
- Cloudflare Tunnel provides secure access without exposing ports directly
- For permanent tunnels, configure access policies in Cloudflare Zero Trust
- Temporary tunnels should only be used for development/testing

## Docker Image

### Using the Pre-built Image

The pre-built Docker image is available at:
```bash
docker pull ghcr.io/rockiestar-inc/drizzle-studio-gateway-cloudflare-tunnel:main
```

### Quick Run with Docker

```bash
# With environment file
docker run -d \
  --name drizzle-gateway \
  --env-file .env \
  -v $(pwd)/data:/app/data \
  ghcr.io/rockiestar-inc/drizzle-studio-gateway-cloudflare-tunnel:main

# With inline environment variables
docker run -d \
  --name drizzle-gateway \
  -e DRIZZLE_GATEWAY_MASTERPASS=your-secure-password \
  -e CLOUDFLARE_TUNNEL_TOKEN=your-tunnel-token \
  -v $(pwd)/data:/app/data \
  ghcr.io/rockiestar-inc/drizzle-studio-gateway-cloudflare-tunnel:main
```

## Development

### Local Development
- For local development, expose port 4983 by uncommenting the ports section in `docker-compose.yml`
- The application automatically downloads platform-specific Drizzle Gateway binaries for macOS/Linux
- Binaries are cached in `node_modules/.bin` for subsequent runs

### Building Standalone Executables

You can build standalone executables using Bun's compile feature:

```bash
# Build for current platform
bun build --compile --minify --sourcemap ./src/index.ts --outfile drizzle-gateway

# Cross-compile for other platforms
bun build --compile --target=bun-linux-x64 --minify ./src/index.ts --outfile drizzle-gateway-linux-x64
bun build --compile --target=bun-darwin-arm64 --minify ./src/index.ts --outfile drizzle-gateway-macos-arm64
bun build --compile --target=bun-windows-x64 --minify ./src/index.ts --outfile drizzle-gateway-windows.exe
```

Available targets:
- `bun-linux-x64` - Linux x64
- `bun-linux-arm64` - Linux ARM64
- `bun-darwin-x64` - macOS x64 (Intel)
- `bun-darwin-arm64` - macOS ARM64 (Apple Silicon)
- `bun-windows-x64` - Windows x64

### Release Process

Releases are automated via GitHub Actions. When you create a git tag:

```bash
git tag v1.0.0
git push origin v1.0.0
```

The workflow will:
1. Build executables for all platforms
2. Create a GitHub release with the binaries
3. Push updated Docker images

## Troubleshooting

- Check logs: `docker-compose logs -f`
- If using permanent tunnel, verify token is correct in `.env` file
- Ensure database files are accessible in the `data/` directory
- Check Cloudflare tunnel configuration in Zero Trust dashboard (for permanent tunnels)
- If no token is set, look for the temporary `*.trycloudflare.com` URL in the logs