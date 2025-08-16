# Drizzle Studio Gateway with Cloudflare Tunnel

A Docker setup that combines Drizzle Studio Gateway with Cloudflare Tunnel for secure remote access to your database admin panel.

## Features

- **Drizzle Studio Gateway**: Web-based database management interface
- **Cloudflare Tunnel**: Secure public access without exposing ports
- **Bun Runtime**: Fast TypeScript/JavaScript runtime
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

3. **Configure database**:
   - Edit `config/gateway.config.json`
   - Update admin credentials and database connections
   - Place your database files in the `data/` directory

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

### Gateway Config (config/gateway.config.json)
Configure admin users, regular users, and database connections. See the example file for structure.

## Directory Structure

```
.
├── config/
│   └── gateway.config.json   # Gateway configuration
├── data/                     # Database files (persistent)
├── src/
│   └── index.ts             # Cloudflare tunnel wrapper
├── .env                     # Environment variables
├── docker-compose.yml       # Docker Compose configuration
├── Dockerfile              # Multi-stage Docker build
└── entrypoint.sh           # Container startup script
```

## Security Notes

- Change default admin password in `gateway.config.json`
- Keep your `.env` file secure and never commit it
- The container runs as non-root user for security
- Cloudflare Tunnel provides secure access without exposing ports

## Development

For local development, you can expose port 4983 by uncommenting the ports section in `docker-compose.yml`.

## Troubleshooting

- Check logs: `docker-compose logs -f`
- Verify tunnel token is correct
- Ensure database files are accessible in the `data/` directory
- Check Cloudflare tunnel configuration in Zero Trust dashboard