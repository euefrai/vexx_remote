const { spawn, execSync } = require('child_process');
const path = require('path');

// Limpar processos zumbis antes de iniciar
console.log('Limpando portas e processos antigos...');
try {
  if (process.platform === 'win32') {
    // Para processos nas portas 5173, 5174 e 4000
    execSync('powershell -Command "$pids = Get-NetTCPConnection -LocalPort 5173, 5174, 4000 -ErrorAction SilentlyContinue | Where-Object OwningProcess -ne 0 | Select-Object -ExpandProperty OwningProcess | Unique; if ($pids) { Stop-Process -Id $pids -Force -ErrorAction SilentlyContinue }"');
    // Para instâncias órfãs do cloudflared
    execSync('powershell -Command "Stop-Process -Name cloudflared -Force -ErrorAction SilentlyContinue"');
  } else {
    execSync('npx kill-port 5173 5174 4000 >/dev/null 2>&1 || true');
    execSync('killall cloudflared >/dev/null 2>&1 || true');
  }
  console.log('Portas e processos antigos limpos.');
} catch (e) {
  // Ignorar erros se as portas já estiverem livres ou comandos falharem
}


function start(name, command, args, opts = {}) {
  const proc = spawn(command, args, { stdio: ['inherit', 'pipe', 'pipe'], ...opts });
  
  proc.stdout.on('data', (d) => {
    process.stdout.write(`[${name}] ${d}`);
  });
  
  proc.stderr.on('data', (d) => {
    process.stderr.write(`[${name}] ${d}`);
  });
  
  proc.on('exit', (code) => {
    console.log(`[${name}] exited with code ${code}`);
  });
  
  return proc;
}

const rootDir = path.resolve(__dirname, '..');
const viteBin = path.join(rootDir, 'node_modules', 'vite', 'bin', 'vite.js');
const tsNodeDevBin = path.join(rootDir, 'node_modules', 'ts-node-dev', 'lib', 'bin.js');

console.log('Iniciando VEXX Remote em modo de desenvolvimento...');

const frontend = start('frontend', 'node', [viteBin], { cwd: path.join(rootDir, 'frontend') });
const backend = start('backend', 'node', [
  tsNodeDevBin,
  '--respawn',
  '--transpile-only',
  'src/index.ts'
], { cwd: path.join(rootDir, 'backend') });

function shutdown() {
  console.log('\nDesligando servidores...');
  frontend.kill();
  backend.kill();
  process.exit();
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
