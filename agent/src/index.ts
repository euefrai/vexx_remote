import express from 'express';
import cors from 'cors';
import { io as socketClient, Socket } from 'socket.io-client';
import { Monitor } from 'node-screenshots';
import jpeg from 'jpeg-js';
import { mouse } from '@nut-tree-fork/nut-js';
import { moveMouse, moveMouseAbsolute, mouseToggle, click, scroll, typeKeyboard, typeString } from './robotControl';

const app = express();
const PORT = 5050;

app.use(cors({ origin: '*' }));
app.use(express.json());

let socket: Socket | null = null;
let isStreaming = false;
let captureTimeout: NodeJS.Timeout | null = null;

app.get('/status', (req, res) => {
  res.json({ status: 'active', isStreaming, platform: process.platform });
});

app.post('/start', (req, res) => {
  const { sessionId, signalingUrl } = req.body;
  if (!sessionId || !signalingUrl) {
    return res.status(400).json({ error: 'Missing sessionId or signalingUrl' });
  }

  stopAgentSession();

  try {
    startSocketConnection(signalingUrl, sessionId);
    res.json({ success: true });
  } catch (error: any) {
    console.error('[Agent] Failed to start:', error);
    res.status(500).json({ error: error.message || 'Failed to connect' });
  }
});

app.post('/stop', (req, res) => {
  stopAgentSession();
  res.json({ success: true });
});

function startSocketConnection(primaryUrl: string, sessionId: string) {
  let attemptedFallback = false;

  function attempt(url: string) {
    console.log(`[Agent] Attempting to connect to signaling server at: ${url}...`);

    const client = socketClient(url, {
      transports: ['polling', 'websocket'],
      extraHeaders: {
        'ngrok-skip-browser-warning': 'true',
        'User-Agent': 'VexxAgent'
      },
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      timeout: 8000
    });

    client.on('connect', () => {
      console.log(`[Agent] Socket connected successfully to ${url}! Joining session ${sessionId}...`);
      socket = client;
      socket.emit('agent:join', { sessionId });
      startCaptureLoop(sessionId);
    });

    client.on('connect_error', (err) => {
      console.error(`[Agent] Connection error for ${url}:`, err.message);

      if (!attemptedFallback && url !== 'http://127.0.0.1:4000') {
        attemptedFallback = true;
        console.log(`[Agent] Primary URL connection failed. Falling back to local signaling server (http://127.0.0.1:4000)...`);
        client.disconnect();
        attempt('http://127.0.0.1:4000');
      }
    });

    client.on('disconnect', (reason) => {
      console.log(`[Agent] Socket disconnected from ${url}. Reason: ${reason}`);
      if (socket === client) {
        stopAgentSession();
      }
    });

    client.on('client:control', async ({ action, payload }: { action: string; payload: any }) => {
      try {
        switch (action) {
          case 'mouse':
            await moveMouse(payload.deltaX, payload.deltaY);
            break;
          case 'move_absolute':
            await moveMouseAbsolute(payload.x, payload.y);
            break;
          case 'mouse_down':
            await mouseToggle('down', payload.button || 'left');
            break;
          case 'mouse_up':
            await mouseToggle('up', payload.button || 'left');
            break;
          case 'click':
            await click(payload.button || 'left');
            break;
          case 'scroll':
            await scroll(payload.deltaX || payload.dx || payload.dy, payload.deltaY || payload.dy);
            break;
          case 'keyboard':
            await typeKeyboard(payload);
            break;
          case 'type_string':
            await typeString(payload.text);
            break;
        }
      } catch (err) {
        console.error('[Agent] Control action failed:', err);
      }
    });

    socket = client;
  }

  attempt(primaryUrl);
}

function drawCursor(buffer: Buffer, width: number, height: number, x: number, y: number) {
  const mask = [
    "X           ",
    "XX          ",
    "X.X         ",
    "X..X        ",
    "X...X       ",
    "X....X      ",
    "X.....X     ",
    "X......X    ",
    "X.......X   ",
    "X........X  ",
    "X...XXXXX   ",
    "X..X.X      ",
    "X.X  X.X    ",
    "XX    X.X   ",
    "X      X.X  ",
    "        X.X ",
    "         X  "
  ];

  for (let row = 0; row < mask.length; row++) {
    const py = y + row;
    if (py < 0 || py >= height) continue;

    const rowStr = mask[row];
    const rowOffset = py * width * 4;

    for (let col = 0; col < rowStr.length; col++) {
      const px = x + col;
      if (px < 0 || px >= width) continue;

      const char = rowStr[col];
      if (char === ' ') continue;

      const idx = rowOffset + px * 4;
      if (char === 'X') {
        buffer[idx] = 0;     // R
        buffer[idx + 1] = 0; // G
        buffer[idx + 2] = 0; // B
        buffer[idx + 3] = 255;
      } else if (char === '.') {
        buffer[idx] = 255;   // R
        buffer[idx + 1] = 255; // G
        buffer[idx + 2] = 255; // B
        buffer[idx + 3] = 255;
      }
    }
  }
}

function resizeRGBA(src: Buffer, srcW: number, srcH: number, destW: number, destH: number): Buffer {
  const dest = Buffer.alloc(destW * destH * 4);
  const xRatio = srcW / destW;
  const yRatio = srcH / destH;
  for (let y = 0; y < destH; y++) {
    const srcY = Math.floor(y * yRatio);
    const srcRowOffset = srcY * srcW * 4;
    const destRowOffset = y * destW * 4;
    for (let x = 0; x < destW; x++) {
      const srcX = Math.floor(x * xRatio);
      const srcIdx = srcRowOffset + srcX * 4;
      const destIdx = destRowOffset + x * 4;
      dest[destIdx] = src[srcIdx];         // R
      dest[destIdx + 1] = src[srcIdx + 1]; // G
      dest[destIdx + 2] = src[srcIdx + 2]; // B
      dest[destIdx + 3] = src[srcIdx + 3]; // A
    }
  }
  return dest;
}

function startCaptureLoop(sessionId: string) {
  if (isStreaming) return;
  isStreaming = true;
  console.log('[Agent] Starting capture loop using node-screenshots and jpeg-js...');

  let monitor: any = null;
  try {
    monitor = Monitor.all()[0];
  } catch (err) {
    console.error('[Agent] Failed to access monitor:', err);
    stopAgentSession();
    return;
  }

  async function captureFrame() {
    if (!isStreaming || !socket || !socket.connected) {
      return;
    }

    const startTime = Date.now();
    try {
      let mousePos = null;
      try {
        mousePos = await mouse.getPosition();
      } catch (e) {
        // Safe to ignore
      }

      const img = monitor.captureImageSync();
      const rawBuffer = img.toRawSync();
      const w = img.width;
      const h = img.height;

      if (mousePos) {
        const scaleX = w / monitor.width();
        const scaleY = h / monitor.height();
        const cx = Math.round((mousePos.x - monitor.x()) * scaleX);
        const cy = Math.round((mousePos.y - monitor.y()) * scaleY);
        drawCursor(rawBuffer, w, h, cx, cy);
      }

      let resizedBuffer = rawBuffer;
      let targetW = w;
      let targetH = h;

      if (w > 1440) {
        targetW = 1440;
        targetH = Math.round((targetW / w) * h);
        resizedBuffer = resizeRGBA(rawBuffer, w, h, targetW, targetH);
      }

      const jpegImageData = {
        data: resizedBuffer,
        width: targetW,
        height: targetH
      };

      const jpegRaw = jpeg.encode(jpegImageData, 75); // Quality 75
      const base64Frame = jpegRaw.data.toString('base64');
      socket.emit('agent:frame', { sessionId, frame: base64Frame });
    } catch (err) {
      console.error('[Agent] Screen capture/processing failed:', err);
    }

    if (isStreaming) {
      const elapsed = Date.now() - startTime;
      const delay = Math.max(10, 66 - elapsed);
      captureTimeout = setTimeout(captureFrame, delay);
    }
  }

  captureFrame();
}

function stopAgentSession() {
  isStreaming = false;
  if (captureTimeout) {
    clearTimeout(captureTimeout);
    captureTimeout = null;
  }
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  console.log('[Agent] Session stopped and cleanup complete');
}

app.listen(PORT, '127.0.0.1', () => {
  console.log(`VEXX Local Agent running silently at http://127.0.0.1:${PORT}`);
});
