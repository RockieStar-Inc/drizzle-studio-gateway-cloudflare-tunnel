import { spawn } from 'child_process';
import { bin as cloudflaredPath } from 'cloudflared';

function startTunnel() {
  const tunnelToken = process.env.CLOUDFLARE_TUNNEL_TOKEN;

  if (!tunnelToken) {
    console.error('FATAL: CLOUDFLARE_TUNNEL_TOKEN environment variable is not set.');
    process.exit(1);
  }

  console.log('Starting Cloudflare tunnel...');

  const args = ['tunnel', '--no-autoupdate', 'run', '--token', tunnelToken];
  const cloudflaredProcess = spawn(cloudflaredPath, args, {
    stdio: 'inherit', // Pipe stdout/stderr to the parent process for logging
  });

  cloudflaredProcess.on('close', (code) => {
    console.log(`Cloudflare tunnel process exited with code ${code}.`);
    // The entrypoint script will handle container shutdown.
    // We exit here to signal that this process has terminated.
    process.exit(code ?? 1);
  });

  cloudflaredProcess.on('error', (err) => {
    console.error('Failed to start Cloudflare tunnel process:', err);
    process.exit(1);
  });

  console.log('Cloudflare tunnel process has been started.');
}

startTunnel();