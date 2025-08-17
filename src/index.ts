import { spawn, ChildProcess } from 'child_process';
import { bin as cloudflaredPath } from 'cloudflared';

class ProcessManager {
  private gatewayProcess: ChildProcess | null = null;
  private tunnelProcess: ChildProcess | null = null;
  private isShuttingDown = false;

  constructor() {
    // Handle graceful shutdown
    process.on('SIGTERM', () => this.shutdown());
    process.on('SIGINT', () => this.shutdown());
    process.on('uncaughtException', (err) => {
      console.error('Uncaught exception:', err);
      this.shutdown();
    });
  }

  async start() {
    console.log('Starting Drizzle Studio Gateway and Cloudflare Tunnel...');
    
    try {
      await this.startDrizzleGateway();
      await this.startCloudflaredTunnel();
      
      console.log('Both services started successfully!');
      
      // Keep the process alive
      this.keepAlive();
    } catch (error) {
      console.error('Failed to start services:', error);
      this.shutdown();
    }
  }

  private async startDrizzleGateway(): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log('Starting Drizzle Studio Gateway...');
      
      const gatewayPath = '/usr/local/bin/gateway';
      const port = process.env.PORT || '4983';
      const storePath = process.env.STORE_PATH || '/app/data';
      
      const env: Record<string, string> = {
        ...process.env,
        PORT: port,
        STORE_PATH: storePath,
      };

      if (process.env.MASTERPASS) {
        env.MASTERPASS = process.env.MASTERPASS;
      }

      this.gatewayProcess = spawn(gatewayPath, [], {
        env,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      this.gatewayProcess.stdout?.on('data', (data) => {
        process.stdout.write(`[Gateway] ${data}`);
      });

      this.gatewayProcess.stderr?.on('data', (data) => {
        process.stderr.write(`[Gateway] ${data}`);
      });

      this.gatewayProcess.on('close', (code) => {
        console.log(`Drizzle Gateway process exited with code ${code}`);
        if (!this.isShuttingDown) {
          this.shutdown();
        }
      });

      this.gatewayProcess.on('error', (err) => {
        console.error('Failed to start Drizzle Gateway:', err);
        reject(err);
      });

      // Give gateway a moment to start
      setTimeout(() => {
        if (this.gatewayProcess && !this.gatewayProcess.killed) {
          console.log(`Drizzle Gateway started on port ${port}`);
          resolve();
        } else {
          reject(new Error('Gateway failed to start'));
        }
      }, 2000);
    });
  }

  private async startCloudflaredTunnel(): Promise<void> {
    return new Promise((resolve, reject) => {
      const tunnelToken = process.env.CLOUDFLARE_TUNNEL_TOKEN;

      if (!tunnelToken) {
        console.error('CLOUDFLARE_TUNNEL_TOKEN environment variable is not set. Skipping tunnel.');
        resolve(); // Don't fail if tunnel token is not provided
        return;
      }

      console.log('Starting Cloudflare tunnel...');

      const args = ['tunnel', '--no-autoupdate', 'run', '--token', tunnelToken];
      this.tunnelProcess = spawn(cloudflaredPath, args, {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      this.tunnelProcess.stdout?.on('data', (data) => {
        process.stdout.write(`[Tunnel] ${data}`);
      });

      this.tunnelProcess.stderr?.on('data', (data) => {
        process.stderr.write(`[Tunnel] ${data}`);
      });

      this.tunnelProcess.on('close', (code) => {
        console.log(`Cloudflare tunnel process exited with code ${code}`);
        if (!this.isShuttingDown) {
          this.shutdown();
        }
      });

      this.tunnelProcess.on('error', (err) => {
        console.error('Failed to start Cloudflare tunnel:', err);
        reject(err);
      });

      // Give tunnel a moment to start
      setTimeout(() => {
        if (this.tunnelProcess && !this.tunnelProcess.killed) {
          console.log('Cloudflare tunnel started');
          resolve();
        } else {
          reject(new Error('Tunnel failed to start'));
        }
      }, 3000);
    });
  }

  private keepAlive() {
    // Keep the process running
    const keepAliveInterval = setInterval(() => {
      if (this.isShuttingDown) {
        clearInterval(keepAliveInterval);
      }
    }, 5000);
  }

  private shutdown() {
    if (this.isShuttingDown) return;
    
    this.isShuttingDown = true;
    console.log('Shutting down services...');

    const promises: Promise<void>[] = [];

    if (this.gatewayProcess) {
      promises.push(this.killProcess(this.gatewayProcess, 'Gateway'));
    }

    if (this.tunnelProcess) {
      promises.push(this.killProcess(this.tunnelProcess, 'Tunnel'));
    }

    Promise.all(promises).then(() => {
      console.log('All services stopped');
      process.exit(0);
    }).catch(() => {
      console.log('Forced shutdown');
      process.exit(1);
    });
  }

  private killProcess(proc: ChildProcess, name: string): Promise<void> {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        console.log(`Force killing ${name} process`);
        proc.kill('SIGKILL');
        resolve();
      }, 5000);

      proc.on('close', () => {
        clearTimeout(timeout);
        console.log(`${name} process stopped gracefully`);
        resolve();
      });

      proc.kill('SIGTERM');
    });
  }
}

// Start the process manager
const manager = new ProcessManager();
manager.start().catch((error) => {
  console.error('Failed to start process manager:', error);
  process.exit(1);
});