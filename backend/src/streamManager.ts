import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import { Server } from 'socket.io';
import readline from 'readline';

let streamerProcess: ChildProcess | null = null;
let activeClients = 0;

export function startStreamer(io: Server) {
  activeClients++;
  if (streamerProcess) return;

  console.log('Starting Python streamer...');
  const scriptPath = path.join(__dirname, 'streamer.py');
  streamerProcess = spawn('python', [scriptPath]);

  const rl = readline.createInterface({
    input: streamerProcess.stdout!,
    terminal: false
  });

  rl.on('line', (line) => {
    // line is the base64 encoded jpeg
    io.emit('screen_frame', line);
  });

  streamerProcess.stderr?.on('data', (data) => {
    console.error(`Streamer stderr: ${data.toString()}`);
  });

  streamerProcess.on('close', (code) => {
    console.log(`Python streamer exited with code ${code}`);
    streamerProcess = null;
  });
}

export function stopStreamer() {
  activeClients--;
  if (activeClients <= 0 && streamerProcess) {
    console.log('Stopping Python streamer...');
    streamerProcess.kill();
    streamerProcess = null;
    activeClients = 0;
  }
}
