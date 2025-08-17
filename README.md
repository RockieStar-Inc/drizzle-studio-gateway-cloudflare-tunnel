# Drizzle Studio Gateway with Cloudflare Tunnel

A Docker setup that combines Drizzle Studio Gateway with Cloudflare Tunnel for secure remote access to your database admin panel.

## Features

- **Drizzle Studio Gateway**: Web-based database management interface
- **Cloudflare Tunnel**: Secure public access without exposing ports
- **Bun Runtime**: Fast TypeScript/JavaScript runtime managing both processes
- **Official Base Image**: Built on top of the official Drizzle Gateway Docker image
- **Process Management**: TypeScript-based process manager for both services
- **Docker Compose**: Easy deployment and management

## Quick Start

1. **Clone and setup**:
   ```bash
   git clone <your-repo>
   cd drizzle-studio-gateway-cloudflare-tunnel
   cp .env.example .env
   ```

2. **Configure Cloudflare Tunnel**:
   - Go to [Cloudflare Zero Trust Dashboard](https://one.dash.cloudflare.com/)
   - Create a new tunnel
   - Configure it to point to `http://localhost:4983`
   - Copy the tunnel token to your `.env` file

3. **Configure database** (optional):
   - Place your database files in the `data/` directory
   - Update environment variables for database connections

4. **Run**:
   ```bash
   docker-compose up --build
   ```

## Configuration

### Environment Variables (.env)
- `CLOUDFLARE_TUNNEL_TOKEN`: Your Cloudflare tunnel token (required)
- `PORT`: Gateway port (default: 4983)
- `STORE_PATH`: Data storage path (default: /app/data)
- `MASTERPASS`: Master password for gateway access

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

## Security Notes

- Configure admin credentials through the Drizzle Gateway web interface
- Keep your `.env` file secure and never commit it
- Set `MASTERPASS` environment variable for additional security
- Cloudflare Tunnel provides secure access without exposing ports

## Development

For local development, you can expose port 4983 by uncommenting the ports section in `docker-compose.yml`.

## Troubleshooting

- Check logs: `docker-compose logs -f`
- Verify tunnel token is correct in `.env` file
- Ensure database files are accessible in the `data/` directory
- Check Cloudflare tunnel configuration in Zero Trust dashboard
- If Cloudflare token is not set, only the Gateway will start (accessible via localhost)