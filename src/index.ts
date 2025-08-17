import { spawn, ChildProcess } from 'child_process';
import { bin, tunnel as createTunnel, install } from 'cloudflared';
import fs from 'fs';
import path from 'path';
import https from 'https';
import { createWriteStream } from 'fs';
import { platform, arch } from 'os';

class ProcessManager {
  private gatewayProcess: ChildProcess | null = null;
  private tunnel: ReturnType<typeof createTunnel> | null = null;
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

  private async downloadFile(url: string, dest: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const file = createWriteStream(dest);
      https.get(url, (response) => {
        if (response.statusCode === 302 || response.statusCode === 301) {
          // Handle redirect
          const redirectUrl = response.headers.location;
          if (redirectUrl) {
            https.get(redirectUrl, (redirectResponse) => {
              redirectResponse.pipe(file);
              file.on('finish', () => {
                file.close();
                resolve();
              });
            }).on('error', reject);
          }
        } else {
          response.pipe(file);
          file.on('finish', () => {
            file.close();
            resolve();
          });
        }
      }).on('error', reject);
    });
  }

  private async ensureDrizzleGateway(): Promise<string> {
    // Determine the platform and architecture
    const isDocker = fs.existsSync('/.dockerenv') || process.env.DOCKER_CONTAINER === 'true';
    const osPlatform = platform();
    const osArch = arch();
    
    let gatewayPath: string;
    let downloadUrl: string;
    
    if (isDocker) {
      // In Docker, use the system-wide binary
      gatewayPath = '/usr/local/bin/drizzle-gateway';
      return gatewayPath;
    } else {
      // For local development, download to node_modules/.bin
      const nodeModulesBin = path.join(process.cwd(), 'node_modules', '.bin');
      if (!fs.existsSync(nodeModulesBin)) {
        fs.mkdirSync(nodeModulesBin, { recursive: true });
      }
      
      // Determine the binary name and download URL based on platform
      if (osPlatform === 'darwin') {
        if (osArch === 'arm64') {
          gatewayPath = path.join(nodeModulesBin, 'drizzle-gateway');
          downloadUrl = 'https://pub-e240a4fd7085425baf4a7951e7611520.r2.dev/drizzle-gateway-1.0.2-macos-arm64';
        } else {
          gatewayPath = path.join(nodeModulesBin, 'drizzle-gateway');
          downloadUrl = 'https://pub-e240a4fd7085425baf4a7951e7611520.r2.dev/drizzle-gateway-1.0.2-macos-x64';
        }
      } else if (osPlatform === 'linux') {
        gatewayPath = path.join(nodeModulesBin, 'drizzle-gateway');
        downloadUrl = 'https://pub-e240a4fd7085425baf4a7951e7611520.r2.dev/drizzle-gateway-1.0.2-linux-x64';
      } else {
        throw new Error(`Unsupported platform: ${osPlatform}`);
      }
      
      // Download if not exists
      if (!fs.existsSync(gatewayPath)) {
        console.log(`Downloading Drizzle Gateway for ${osPlatform} ${osArch}...`);
        console.log(`From: ${downloadUrl}`);
        console.log(`To: ${gatewayPath}`);
        
        await this.downloadFile(downloadUrl, gatewayPath);
        
        // Make executable
        fs.chmodSync(gatewayPath, 0o755);
        console.log('Drizzle Gateway downloaded successfully');
      }
      
      return gatewayPath;
    }
  }

  async start() {
    console.log('Starting Drizzle Studio Gateway and Cloudflare Tunnel...');
    
    // Install cloudflared if needed
    if (!fs.existsSync(bin)) {
      console.log('Installing cloudflared binary...');
      await install(bin);
    }
    
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
    return new Promise(async (resolve, reject) => {
      console.log('Starting Drizzle Studio Gateway...');
      
      // Get the correct gateway path based on environment
      const gatewayPath = await this.ensureDrizzleGateway();
      const port = process.env.PORT || '4983';
      const storePath = process.env.STORE_PATH || './data';
      
      const env: Record<string, string> = {
        ...process.env,
        PORT: port,
        STORE_PATH: storePath,
      };

      // Try both DRIZZLE_GATEWAY_MASTERPASS (preferred) and MASTERPASS (fallback)
      const masterpass = process.env.DRIZZLE_GATEWAY_MASTERPASS || process.env.MASTERPASS;
      if (masterpass) {
        env.MASTERPASS = masterpass;
        const envVarName = process.env.DRIZZLE_GATEWAY_MASTERPASS ? 'DRIZZLE_GATEWAY_MASTERPASS' : 'MASTERPASS';
        console.log(`Using ${envVarName} (length: ${masterpass.length} characters)`);
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
    const tunnelToken = process.env.CLOUDFLARE_TUNNEL_TOKEN;
    const port = process.env.PORT || '4983';

    let options: Record<string, string | number | null>;

    if (tunnelToken) {
      console.log('Starting Cloudflare tunnel with token...');
      // For token-based tunnels, use the token directly
      options = {
        'tunnel': 'run',
        '--token': tunnelToken,
        '--no-autoupdate': null,
      };
    } else {
      console.log('Starting temporary Cloudflare tunnel (no token provided)...');
      console.log('Note: This will generate a random *.trycloudflare.com URL');
      // For temporary tunnels - don't use double dashes in keys
      options = {
        'url': `http://localhost:${port}`,
      };
    }

    // Create the tunnel
    this.tunnel = createTunnel(options);

    // Listen for tunnel process events
    this.tunnel.child.stdout?.on('data', (data: Buffer) => {
      const output = data.toString();
      process.stdout.write(`[Tunnel] ${output}`);
      
      // Look for the temporary tunnel URL in the output
      if (!tunnelToken && output.includes('trycloudflare.com')) {
        const urlMatch = output.match(/https:\/\/[^\s]+\.trycloudflare\.com/);
        if (urlMatch) {
          console.log(`\n🌐 Temporary tunnel URL: ${urlMatch[0]}`);
        }
      }
    });

    this.tunnel.child.stderr?.on('data', (data: Buffer) => {
      const output = data.toString();
      process.stderr.write(`[Tunnel] ${output}`);
      
      // Also check stderr for the URL
      if (!tunnelToken && output.includes('trycloudflare.com')) {
        const urlMatch = output.match(/https:\/\/[^\s]+\.trycloudflare\.com/);
        if (urlMatch) {
          console.log(`\n🌐 Temporary tunnel URL: ${urlMatch[0]}`);
        }
      }
    });

    this.tunnel.child.on('error', (error: Error) => {
      console.error('Tunnel error:', error);
      if (!this.isShuttingDown) {
        this.shutdown();
      }
    });

    this.tunnel.child.on('exit', (code: number | null) => {
      console.log(`Cloudflare tunnel process exited with code ${code}`);
      if (!this.isShuttingDown) {
        this.shutdown();
      }
    });

    // Wait for the tunnel URL if not using a token
    if (!tunnelToken) {
      try {
        const url = await this.tunnel.url;
        console.log(`\n🌐 Tunnel URL: ${url}`);
      } catch (error) {
        console.error('Failed to get tunnel URL:', error);
      }
    }

    // Wait for connection
    try {
      const connection = await this.tunnel.connections[0];
      console.log(`Tunnel connected: ${JSON.stringify(connection)}`);
    } catch (error) {
      console.error('Failed to establish tunnel connection:', error);
      throw error;
    }
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

    if (this.tunnel) {
      promises.push(new Promise<void>((resolve) => {
        console.log('Stopping Cloudflare tunnel...');
        this.tunnel!.stop();
        // Give it a moment to stop gracefully
        this.tunnel!.child.on('exit', () => {
          console.log('Tunnel stopped');
          resolve();
        });
        // Timeout fallback
        setTimeout(() => {
          resolve();
        }, 5000);
      }));
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