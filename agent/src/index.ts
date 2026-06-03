import express from 'express';
import cors from 'cors';
import { io as socketClient, Socket } from 'socket.io-client';
import { Monitor } from 'node-screenshots';
import { moveMouse, moveMouseAbsolute, mouseToggle, click, scroll, typeKeyboard, typeString } from './robotControl';

const app = express();
const PORT = 5050;

app.use(cors({ origin: '*' }));
app.use(express.json());

let socket: Socket | null = null;
let isStreaming = false;
let captureInterval: NodeJS.Timeout | null = null;

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
    console.log(`[Agent] Connecting to signaling server: ${signalingUrl}...`);
    socket = socketClient(signalingUrl, {
      transports: ['websocket'],
      autoConnect: true
    });

    socket.on('connect', () => {
      console.log(`[Agent] Socket connected, joining session ${sessionId}...`);
      socket?.emit('agent:join', { sessionId });
      startCaptureLoop(sessionId);
    });

    socket.on('client:control', async ({ action, payload }: { action: string; payload: any }) => {
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

    socket.on('disconnect', () => {
      console.log('[Agent] Socket disconnected');
      stopAgentSession();
    });

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

function startCaptureLoop(sessionId: string) {
  if (isStreaming) return;
  isStreaming = true;
  console.log('[Agent] Starting capture loop using node-screenshots...');

  let monitor: any = null;
  try {
    monitor = Monitor.all()[0];
  } catch (err) {
    console.error('[Agent] Failed to access monitor:', err);
    stopAgentSession();
    return;
  }

  captureInterval = setInterval(() => {
    if (!socket || !socket.connected || !isStreaming) return;

    try {
      const img = monitor.captureImageSync();
      const buffer = img.toJpegSync();
      const base64Frame = buffer.toString('base64');
      socket.emit('agent:frame', { sessionId, frame: base64Frame });
    } catch (err) {
      console.error('[Agent] Screen capture failed:', err);
    }
  }, 66); // ~15 FPS
}

function stopAgentSession() {
  isStreaming = false;
  if (captureInterval) {
    clearInterval(captureInterval);
    captureInterval = null;
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
