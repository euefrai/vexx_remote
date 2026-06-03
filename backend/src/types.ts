export type JoinRequest = {
  clientId: string;
  device: string;
};

export type Session = {
  sessionId: string;
  hostSocket?: string;
  agentSocket?: string;
  createdAt: number;
  lastHeartbeat: number;
  pendingRequests: JoinRequest[];
  approvedClients: Set<string>;
  connectedClients: Set<string>;
  customName?: string;
  customPassword?: string;
};

export type ControlPayload = {
  action: 'mouse' | 'click' | 'scroll' | 'keyboard';
  payload: any;
  sessionId: string;
  clientId: string;
};
