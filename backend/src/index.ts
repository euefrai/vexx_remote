import 'dotenv/config';
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import { createSession, getSession, joinHost, addRequest, approveClient, rejectClient, clientConnected, pruneSessions, configureSessionCredentials, findSessionByName } from './session';
import { startTunnel, getTunnelUrl } from './tunnelManager';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: true,
    methods: ['GET', 'POST'],
  },
});

app.use(cors({ origin: true }));
app.use(helmet());
app.use(express.json());

app.get('/health', (req, res) => res.json({ ok: true }));

app.get('/tunnel', (req, res) => {
  res.json({ url: getTunnelUrl() });
});

app.post('/session/create', (req, res) => {
  const session = createSession();
  res.json({ sessionId: session.sessionId });
});

app.post('/session/configure', (req, res) => {
  const { sessionId, customName, customPassword } = req.body;
  const result = configureSessionCredentials(sessionId, customName, customPassword);
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }
  res.json({ ok: true });
});

app.post('/session/login', (req, res) => {
  const { customName, customPassword, clientId } = req.body;
  const result = findSessionByName(customName, customPassword);
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }

  const session = getSession(result.sessionId!);
  if (session && clientId) {
    // Aprovar cliente automaticamente bypassando a fila do host
    approveClient(session, clientId);
    clientConnected(session, clientId);

    // Notificar o client da aprovação imediata
    io.to(clientId).emit('client:approved');

    // Notificar o host sobre a nova conexão ativa
    if (session.hostSocket) {
      io.to(session.hostSocket).emit('client:connected', { clientId });
    }
  }

  res.json({ sessionId: result.sessionId, approved: true });
});

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  socket.on('host:join', ({ sessionId }: { sessionId: string }) => {
    console.log(`Host ${socket.id} joining session ${sessionId}`);
    const session = joinHost(sessionId, socket.id);
    if (!session) {
      socket.emit('session:error', 'Código de sessão inválido ou expirado.');
      return;
    }
    socket.emit('session:joined', { sessionId });
  });

  socket.on('client:request', ({ sessionId, device }: { sessionId: string; device: string }) => {
    console.log(`Client ${socket.id} requesting session ${sessionId}`);
    const session = getSession(sessionId);
    if (!session || !session.hostSocket) {
      console.log(`Session not found or host offline: ${sessionId}`);
      socket.emit('session:error', 'Sessão não encontrada ou host offline.');
      return;
    }
    addRequest(session, { clientId: socket.id, device });
    io.to(session.hostSocket).emit('client:request', { clientId: socket.id, device });
  });

  socket.on('host:approve', ({ sessionId, clientId }: { sessionId: string; clientId: string }) => {
    const session = getSession(sessionId);
    if (!session || session.hostSocket !== socket.id) {
      return;
    }
    approveClient(session, clientId);
    clientConnected(session, clientId);
    io.to(clientId).emit('client:approved');
    io.to(session.hostSocket).emit('client:connected', { clientId });
  });

  socket.on('host:reject', ({ sessionId, clientId }: { sessionId: string; clientId: string }) => {
    const session = getSession(sessionId);
    if (!session || session.hostSocket !== socket.id) {
      return;
    }
    rejectClient(session, clientId);
    io.to(clientId).emit('session:error', 'A solicitação foi rejeitada pelo host.');
  });

  socket.on('agent:join', ({ sessionId }: { sessionId: string }) => {
    console.log(`Agent ${socket.id} joining session ${sessionId}`);
    const session = getSession(sessionId);
    if (!session) {
      socket.emit('session:error', 'Código de sessão inválido ou expirado.');
      return;
    }
    session.agentSocket = socket.id;
  });

  socket.on('agent:frame', ({ sessionId, frame }: { sessionId: string; frame: string }) => {
    const session = getSession(sessionId);
    if (!session || session.agentSocket !== socket.id) {
      return;
    }
    // Retransmitir o frame para todos os clientes conectados
    for (const clientId of session.connectedClients) {
      io.to(clientId).emit('screen_frame', frame);
    }
  });

  socket.on('disconnect', () => {
    // A limpeza de sessões expiradas é feita pelo setInterval.
    // Nenhuma ação adicional é necessária aqui.
  });

  socket.on('client:control', ({ sessionId, action, payload }: { sessionId: string; action: string; payload: any }) => {
    const session = getSession(sessionId);
    if (!session || !session.approvedClients.has(socket.id)) {
      return;
    }
    // Repassar o evento de controle para o Agente correspondente
    if (session.agentSocket) {
      io.to(session.agentSocket).emit('client:control', { action, payload });
    }
  });
});

setInterval(pruneSessions, 1000 * 30);

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
server.listen(PORT, async () => {
  console.log(`VEXX Remote signaling server running at http://localhost:${PORT}`);
  try {
    const url = await startTunnel(5173);
    console.log(`[Init] Tunnel is ready at: ${url}`);
  } catch (err) {
    console.error(`[Init] Could not start tunnel:`, err);
  }
});
