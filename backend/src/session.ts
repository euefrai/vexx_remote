import { JoinRequest, Session } from './types';
import { getComputer, createComputer, touchComputer } from './db';

const sessionMap = new Map<string, Session>();
const SESSION_TIMEOUT = 1000 * 60 * 20; // 20 minutos

function createSessionId() {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase();
}

export function createSession() {
  const sessionId = createSessionId();
  const session: Session = {
    sessionId,
    createdAt: Date.now(),
    lastHeartbeat: Date.now(),
    pendingRequests: [],
    approvedClients: new Set(),
    connectedClients: new Set(),
  };
  sessionMap.set(sessionId, session);
  return session;
}

export function getSession(sessionId: string) {
  const session = sessionMap.get(sessionId);
  if (!session) return null;
  if (Date.now() - session.lastHeartbeat > SESSION_TIMEOUT) {
    sessionMap.delete(sessionId);
    return null;
  }
  return session;
}

export function joinHost(sessionId: string, socketId: string) {
  const session = getSession(sessionId);
  if (!session) return null;
  session.hostSocket = socketId;
  session.lastHeartbeat = Date.now();
  return session;
}

export function addRequest(session: Session, request: JoinRequest) {
  session.pendingRequests = session.pendingRequests.filter((item) => item.clientId !== request.clientId);
  session.pendingRequests.push(request);
  session.lastHeartbeat = Date.now();
}

export function approveClient(session: Session, clientId: string) {
  session.approvedClients.add(clientId);
  session.pendingRequests = session.pendingRequests.filter((request) => request.clientId !== clientId);
  session.lastHeartbeat = Date.now();
}

export function rejectClient(session: Session, clientId: string) {
  session.pendingRequests = session.pendingRequests.filter((request) => request.clientId !== clientId);
}

export function clientConnected(session: Session, clientId: string) {
  session.connectedClients.add(clientId);
  session.lastHeartbeat = Date.now();
}

export function removeClient(session: Session, clientId: string) {
  session.approvedClients.delete(clientId);
  session.connectedClients.delete(clientId);
}

export function removeSession(sessionId: string) {
  sessionMap.delete(sessionId);
}

export function pruneSessions() {
  const now = Date.now();
  for (const [id, session] of sessionMap.entries()) {
    if (now - session.lastHeartbeat > SESSION_TIMEOUT) {
      sessionMap.delete(id);
    }
  }
}

export function configureSessionCredentials(sessionId: string, customName?: string, customPassword?: string): { success: boolean; error?: string } {
  const session = getSession(sessionId);
  if (!session) return { success: false, error: 'Sessão não encontrada.' };

  if (customName) {
    // Verificar se já existe outra sessão ativa com este mesmo nome (case-insensitive)
    for (const s of sessionMap.values()) {
      if (s.sessionId !== sessionId && s.customName?.toLowerCase() === customName.toLowerCase()) {
        return { success: false, error: 'Este nome de sessão já está em uso por outra sessão ativa.' };
      }
    }

    // Verificar no banco de dados
    const existing = getComputer(customName);
    if (existing) {
      // O computador já existe no DB — verificar a senha para permitir reconexão
      if (!customPassword || existing.password !== customPassword) {
        return { success: false, error: 'Este nome de computador já está registrado. Forneça a senha correta para reconectar.' };
      }
      // Senha correta — atualizar last_seen e vincular à sessão
      touchComputer(customName);
    } else {
      // Novo computador — registrar no banco de dados
      if (!customPassword) {
        return { success: false, error: 'É necessário definir uma senha para registrar o computador.' };
      }
      createComputer(customName, customPassword);
    }
  }

  session.customName = customName || undefined;
  session.customPassword = customPassword || undefined;
  return { success: true };
}

export function findSessionByName(customName: string, customPassword?: string): { success: boolean; sessionId?: string; error?: string } {
  // Primeiro verificar as credenciais no banco de dados
  const computer = getComputer(customName);
  if (!computer) {
    return { success: false, error: 'Nome de computador não encontrado.' };
  }

  if (computer.password !== customPassword) {
    return { success: false, error: 'Senha incorreta.' };
  }

  // Credenciais válidas — encontrar a sessão ativa vinculada a este nome
  for (const session of sessionMap.values()) {
    if (session.customName?.toLowerCase() === customName.toLowerCase()) {
      touchComputer(customName);
      return { success: true, sessionId: session.sessionId };
    }
  }

  return { success: false, error: 'Computador encontrado, mas não está online no momento.' };
}
