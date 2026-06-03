import { spawn, ChildProcess, execSync } from 'child_process';

let tunnelProcess: ChildProcess | null = null;
let currentTunnelUrl: string | null = null;

export function startTunnel(port: number = 5173): Promise<string> {
  return new Promise((resolve, reject) => {
    if (currentTunnelUrl) {
      return resolve(currentTunnelUrl);
    }

    // Parar qualquer instância anterior do cloudflared para evitar conflitos no live-reload
    try {
      if (process.platform === 'win32') {
        execSync('taskkill /F /IM cloudflared.exe 2>nul || ver > nul');
      } else {
        execSync('killall cloudflared 2>/dev/null || true');
      }
    } catch (e) {}

    console.log(`[Tunnel] Starting cloudflared tunnel for 127.0.0.1:${port}...`);

    // In Windows, cloudflared must be in PATH or provided exactly.
    // Ensure we use shell to resolve the command correctly if it's a global module or script
    tunnelProcess = spawn('cloudflared', ['tunnel', '--protocol', 'http2', '--url', `http://127.0.0.1:${port}`], {
      shell: true
    });

    let resolved = false;

    const handleOutput = (data: Buffer) => {
      const output = data.toString();
      
      // Log errors if cloudflared encounters connection issues
      if (output.toLowerCase().includes('error') || output.toLowerCase().includes('failed') || output.toLowerCase().includes('refused')) {
        console.error(`[Cloudflared Log] ${output.trim()}`);
      }

      const match = output.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
      if (match && !resolved) {
        currentTunnelUrl = match[0];
        console.log(`[Tunnel] Tunnel established: ${currentTunnelUrl}`);
        resolved = true;
        resolve(currentTunnelUrl);
      }
    };

    tunnelProcess.stderr?.on('data', handleOutput);
    tunnelProcess.stdout?.on('data', handleOutput);

    tunnelProcess.on('error', (err) => {
      console.error(`[Tunnel] Failed to start cloudflared:`, err);
      if (!resolved) {
        resolved = true;
        reject(err);
      }
    });

    tunnelProcess.on('exit', (code) => {
      console.log(`[Tunnel] cloudflared exited with code ${code}`);
      tunnelProcess = null;
      currentTunnelUrl = null;
      if (!resolved) {
        resolved = true;
        reject(new Error(`cloudflared exited with code ${code}`));
      }
    });
  });
}

export function getTunnelUrl(): string | null {
  return currentTunnelUrl;
}

export function stopTunnel() {
  if (tunnelProcess) {
    console.log('[Tunnel] Stopping cloudflared tunnel...');
    tunnelProcess.kill();
    tunnelProcess = null;
    currentTunnelUrl = null;
  }
}
