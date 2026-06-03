import { spawn, ChildProcess, execSync } from 'child_process';

let tunnelProcess: ChildProcess | null = null;
let currentTunnelUrl: string | null = null;

export function startTunnel(port: number = 5173): Promise<string> {
  return new Promise((resolve, reject) => {
    if (currentTunnelUrl) {
      return resolve(currentTunnelUrl);
    }

    const provider = process.env.TUNNEL_PROVIDER || 'cloudflare';
    const domain = process.env.NGROK_DOMAIN || '';

    // Parar qualquer instância anterior do cloudflared/ngrok para evitar conflitos no live-reload
    try {
      if (process.platform === 'win32') {
        execSync('taskkill /F /IM cloudflared.exe 2>nul || ver > nul');
        execSync('taskkill /F /IM ngrok.exe 2>nul || ver > nul');
      } else {
        execSync('killall cloudflared 2>/dev/null || true');
        execSync('killall ngrok 2>/dev/null || true');
      }
    } catch (e) {}

    // Fluxo do Ngrok com Domínio Estático
    if (provider === 'ngrok' && domain) {
      console.log(`[Tunnel] Starting ngrok tunnel for 127.0.0.1:${port} on domain ${domain} via default.internal...`);
      
      // Comando para rodar o ngrok apontado para a porta local usando o domínio interno do Cloud Endpoint
      tunnelProcess = spawn('ngrok', ['http', `${port}`, '--url', 'https://default.internal'], {
        shell: true
      });

      tunnelProcess.stdout?.on('data', (data) => {
        console.log(`[Ngrok Log] ${data.toString().trim()}`);
      });

      tunnelProcess.stderr?.on('data', (data) => {
        console.error(`[Ngrok Error] ${data.toString().trim()}`);
      });

      tunnelProcess.on('error', (err) => {
        console.error(`[Tunnel] Failed to start ngrok:`, err);
        reject(err);
      });

      tunnelProcess.on('exit', (code) => {
        console.log(`[Tunnel] ngrok exited with code ${code}`);
        tunnelProcess = null;
        currentTunnelUrl = null;
      });

      // Para domínios estáticos do Ngrok, o link já é conhecido a priori
      currentTunnelUrl = `https://${domain}`;
      console.log(`[Tunnel] Tunnel established: ${currentTunnelUrl}`);
      return resolve(currentTunnelUrl);
    }

    // Fluxo padrão (Cloudflare Tunnel Ephemeral)
    console.log(`[Tunnel] Starting cloudflared tunnel for 127.0.0.1:${port}...`);

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
    console.log('[Tunnel] Stopping tunnel...');
    tunnelProcess.kill();
    tunnelProcess = null;
    currentTunnelUrl = null;
  }
}
