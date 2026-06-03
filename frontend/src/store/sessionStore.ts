import { create } from 'zustand';

interface SessionState {
  sessionId: string;
  role: 'host' | 'client' | null;
  connected: boolean;
  setSessionId: (sessionId: string) => void;
  setRole: (role: 'host' | 'client' | null) => void;
  setConnected: (connected: boolean) => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  sessionId: '',
  role: null,
  connected: false,
  setSessionId: (sessionId) => set({ sessionId }),
  setRole: (role) => set({ role }),
  setConnected: (connected) => set({ connected }),
}));
