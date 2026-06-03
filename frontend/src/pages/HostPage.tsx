import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import QRCode from 'qrcode.react';
import { getSocket, disconnectSocket } from '../services/socketService';
import { useSessionStore } from '../store/sessionStore';

const API_BASE = import.meta.env.VITE_API_URL ?? '';

type JoinRequest = { clientId: string; device: string };

export default function HostPage() {
  const { setSessionId, setRole } = useSessionStore();
  const [status, setStatus] = useState('Aguardando criação');
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [clientsConnected, setClientsConnected] = useState(0);
  const [localSession, setLocalSession] = useState<string>('');
  const socket = useMemo(() => getSocket(), []);

  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const [customName, setCustomName] = useState('');
  const [customPassword, setCustomPassword] = useState('');
  const [credentialsStatus, setCredentialsStatus] = useState<{ type: 'error' | 'success'; message: string } | null>(null);

  const [agentOnline, setAgentOnline] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const captureStreamRef = useRef<MediaStream | null>(null);
  const captureIntervalRef = useRef<number | null>(null);

  const localSessionRef = useRef(localSession);

  useEffect(() => {
    localSessionRef.current = localSession;
  }, [localSession]);

  const [publicUrl, setPublicUrl] = useState('');
  const [tunnelLoading, setTunnelLoading] = useState(true);

  // Monitorar se o VexxAgent local está ativo
  useEffect(() => {
    const checkAgent = async () => {
      try {
        const res = await fetch('http://127.0.0.1:5050/status');
        const data = await res.json();
        setAgentOnline(data.status === 'active');
      } catch (e) {
        setAgentOnline(false);
      }
    };
    checkAgent();
    const interval = window.setInterval(checkAgent, 2500);
    return () => clearInterval(interval);
  }, []);

  // Limpeza de captura ao desmontar a página
  useEffect(() => {
    return () => {
      if (captureIntervalRef.current) clearInterval(captureIntervalRef.current);
      if (captureStreamRef.current) {
        captureStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  useEffect(() => {
    setRole('host');

    socket.on('connect', () => setStatus('Conectado ao servidor'));
    socket.on('disconnect', () => setStatus('Desconectado do servidor'));

    socket.on('client:request', (payload: JoinRequest) => {
      setRequests((prev) => [...prev, payload]);
      setStatus('Nova solicitação de controle');
    });

    socket.on('client:connected', ({ clientId }: { clientId: string }) => {
      setClientsConnected((count) => count + 1);
      setRequests((prev) => prev.filter((item) => item.clientId !== clientId));
      setStatus('Cliente conectado e autorizado');
    });

    // Escutar eventos de controle do cliente e repassar para o agente local
    socket.on('client:control', async ({ action, payload }: { action: string; payload: any }) => {
      try {
        await fetch('http://127.0.0.1:5050/control', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, payload })
        });
      } catch (e) {
        console.warn('Falha ao repassar comando para o agente local:', e);
      }
    });

    socket.connect();

    // Criar sessão automaticamente na inicialização
    createSession();

    return () => {
      disconnectSocket();
    };
  }, []);

  const sessionUrl = useMemo(() => {
    return localSession ? `${publicUrl.replace(/\/$/, '')}/client?code=${localSession}` : '';
  }, [localSession, publicUrl]);

  async function createSession() {
    try {
      setStatus('Criando sessão...');
      const response = await fetch(`${API_BASE}/session/create`, { method: 'POST' });
      const result = await response.json();
      if (!result.sessionId) {
        throw new Error('Erro ao criar sessão');
      }
      setLocalSession(result.sessionId);
      setSessionId(result.sessionId);
      socket.emit('host:join', { sessionId: result.sessionId });
      setStatus('Sessão criada, aguardando cliente');
    } catch (error) {
      console.error(error);
      setStatus('Falha ao criar sessão');
    }
  }

  async function startScreenCapture() {
    if (isCapturing) return;

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 15, width: 1280, height: 720 },
        audio: false
      });

      captureStreamRef.current = stream;
      setIsCapturing(true);

      const video = document.createElement('video');
      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;
      await video.play();

      const canvas = document.createElement('canvas');
      canvas.width = 1280;
      canvas.height = 720;
      const ctx = canvas.getContext('2d');

      const sendFrame = () => {
        if (!ctx || video.paused || video.ended) return;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
        const base64 = dataUrl.split(',')[1];
        if (base64 && localSessionRef.current) {
          socket.emit('host:frame', { sessionId: localSessionRef.current, frame: base64 });
        }
      };

      const intervalId = window.setInterval(sendFrame, 66);
      captureIntervalRef.current = intervalId;

      stream.getVideoTracks()[0].onended = () => {
        stopScreenCapture();
      };
      
      setStatus('Transmitindo tela...');
    } catch (err) {
      console.error('Erro ao iniciar captura de tela:', err);
      setIsCapturing(false);
    }
  }

  function stopScreenCapture() {
    setIsCapturing(false);
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
      captureIntervalRef.current = null;
    }
    if (captureStreamRef.current) {
      captureStreamRef.current.getTracks().forEach((track) => track.stop());
      captureStreamRef.current = null;
    }
    setStatus('Sessão ativa, transmissão parada');
  }

  const copyCode = () => {
    if (!localSession) return;
    navigator.clipboard.writeText(localSession);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const copyUrl = () => {
    if (!sessionUrl) return;
    navigator.clipboard.writeText(sessionUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const saveCredentials = async () => {
    if (!localSession) return;
    try {
      setCredentialsStatus(null);
      const response = await fetch(`${API_BASE}/session/configure`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: localSession,
          customName,
          customPassword
        })
      });
      const result = await response.json();
      if (!response.ok || result.error) {
        throw new Error(result.error || 'Erro ao configurar credenciais');
      }
      setCredentialsStatus({ type: 'success', message: 'Credenciais salvas com sucesso!' });
    } catch (error: any) {
      setCredentialsStatus({ type: 'error', message: error.message || 'Erro ao salvar credenciais' });
    }
  };

  const getStatusDotClass = () => {
    if (status.includes('Falha') || status.includes('Desconectado')) return 'bg-text-danger';
    if (status.includes('conectado') || status.includes('autorizado')) return 'bg-text-success animate-pulse';
    if (status.includes('Criando') || status.includes('Sessão criada')) return 'bg-text-info animate-pulse';
    return 'bg-text-secondary';
  };

  function approveClient(requestIndex: number) {
    const request = requests[requestIndex];
    socket.emit('host:approve', { sessionId: localSession, clientId: request.clientId });
    setRequests((prev) => prev.filter((item) => item.clientId !== request.clientId));
    setStatus('Cliente aprovado');
  }

  function rejectClient(requestIndex: number) {
    const request = requests[requestIndex];
    socket.emit('host:reject', { sessionId: localSession, clientId: request.clientId });
    setRequests((prev) => prev.filter((item) => item.clientId !== request.clientId));
  }

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto flex max-w-[1100px] flex-col gap-6">
        
        {/* Header Card */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-background-primary border-[0.5px] border-border-tertiary rounded-lg p-5">
          <div>
            <h1 className="text-[22px] font-medium text-text-primary">Painel do host</h1>
            <p className="mt-1 text-[13px] text-text-secondary">Crie uma sessão, compartilhe o código ou QR e aprove o dispositivo antes do controle remoto.</p>
          </div>
          <div className="flex gap-3 mt-4 sm:mt-0">
            <Link 
              to="/" 
              className="bg-transparent border-[0.5px] border-border-secondary rounded-md text-[13px] px-3 py-1.5 text-text-primary hover:bg-background-secondary active:scale-[0.98] transition-transform"
            >
              Voltar
            </Link>
            <button 
              onClick={createSession} 
              className="bg-background-info border-[0.5px] border-border-info rounded-md text-[13px] px-3 py-1.5 text-text-primary hover:bg-background-secondary active:scale-[0.98] transition-transform"
            >
              Recriar sessão
            </button>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1fr_300px]">
          {/* Main Status Column */}
          <div className="space-y-6">

            {/* Vexx Agent & Compartilhamento Card */}
            <div className="bg-background-primary border-[0.5px] border-border-tertiary rounded-lg p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-[16px] font-medium text-text-primary">Conexão do Agente e Transmissão</h2>
                  <p className="mt-1 text-[13px] text-text-secondary">
                    Status do assistente local e controle de transmissão de tela.
                  </p>
                </div>
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-[12px] font-medium ${
                  agentOnline ? 'bg-background-success text-text-success border-[0.5px] border-border-success' : 'bg-background-danger text-text-danger border-[0.5px] border-border-danger'
                }`}>
                  <span className={`h-2 w-2 rounded-full ${agentOnline ? 'bg-text-success animate-pulse' : 'bg-text-danger'}`} />
                  {agentOnline ? 'Agente Ativo' : 'Agente Offline'}
                </div>
              </div>

              {!agentOnline ? (
                <div className="bg-background-secondary border-[0.5px] border-border-tertiary rounded-md p-4 space-y-3">
                  <p className="text-[13px] text-text-secondary leading-relaxed">
                    <strong>Importante:</strong> O Vexx Agent local não foi detectado em execução no seu computador. 
                    Para que outras pessoas consigam controlar a sua máquina, baixe e execute o agente. Não é necessário terminal, apenas clique duas vezes para abrir.
                  </p>
                  <a
                    href="/VexxAgent.exe"
                    download="VexxAgent.exe"
                    className="inline-flex items-center gap-2 bg-background-info border-[0.5px] border-border-info rounded-md text-[13px] px-4 py-2 text-text-primary hover:bg-background-secondary active:scale-[0.98] transition-transform"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ti ti-download"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                    Baixar Vexx Agent para Windows
                  </a>
                </div>
              ) : (
                <div className="flex gap-4">
                  {!isCapturing ? (
                    <button
                      onClick={startScreenCapture}
                      className="bg-background-info border-[0.5px] border-border-info rounded-md text-[13px] px-4 py-2 text-text-primary hover:bg-background-secondary active:scale-[0.98] transition-transform flex items-center gap-2"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/></svg>
                      Compartilhar Tela e Permitir Controle
                    </button>
                  ) : (
                    <button
                      onClick={stopScreenCapture}
                      className="bg-background-danger border-[0.5px] border-border-danger rounded-md text-[13px] px-4 py-2 text-text-primary hover:opacity-90 active:scale-[0.98] transition-transform flex items-center gap-2"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/><line x1="2" x2="22" y1="3" y2="17"/></svg>
                      Parar Compartilhamento de Tela
                    </button>
                  )}
                </div>
              )}
            </div>
            
            <div className="bg-background-primary border-[0.5px] border-border-tertiary rounded-lg p-5">
              <h2 className="text-[11px] font-medium text-text-secondary uppercase tracking-[0.06em] mb-2">Visão geral</h2>
              
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Metric Card 1 */}
                <div className="bg-background-secondary rounded-md p-3 flex flex-col justify-between">
                  <span className="block text-[11px] text-text-secondary">Status atual</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`h-2.5 w-2.5 rounded-full ${getStatusDotClass()}`} />
                    <span className="block text-[18px] font-medium text-text-primary">{status}</span>
                  </div>
                </div>
                
                {/* Metric Card 2 */}
                <div className="bg-background-secondary rounded-md p-3">
                  <span className="block text-[11px] text-text-secondary">Clientes conectados</span>
                  <span className="block mt-1 text-[18px] font-medium text-text-primary">{clientsConnected}</span>
                </div>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {/* Metric Card 3 */}
                <div className="bg-background-secondary rounded-md p-3 border-[0.5px] border-border-tertiary flex items-center justify-between">
                  <div>
                    <span className="block text-[11px] text-text-secondary">Código da sessão</span>
                    <span className="block mt-1 text-[22px] font-medium text-text-primary font-mono tracking-wider">{localSession || '------'}</span>
                  </div>
                  {localSession && (
                    <button 
                      onClick={copyCode}
                      className="text-text-secondary hover:text-text-primary p-1.5 rounded hover:bg-background-tertiary active:scale-[0.95] transition-all flex-shrink-0"
                      title="Copiar código"
                    >
                      {copiedCode ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-text-success"><path d="M20 6 9 17l-5-5"/></svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                      )}
                    </button>
                  )}
                </div>

                {/* Metric Card 4 */}
                <div className="bg-background-secondary rounded-md p-3 border-[0.5px] border-border-tertiary flex items-center justify-between">
                  <div className="min-w-0 flex-1 mr-2">
                    <span className="block text-[11px] text-text-secondary">Link de acesso</span>
                    <div className="mt-1">
                      {tunnelLoading ? (
                        <span className="text-[13px] text-text-info font-medium">Iniciando túnel seguro...</span>
                      ) : sessionUrl ? (
                        <a 
                          href={sessionUrl} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-[13px] text-text-success font-medium hover:underline truncate block"
                          title={sessionUrl}
                        >
                          {sessionUrl}
                        </a>
                      ) : (
                        <span className="text-[13px] text-text-tertiary">Aguardando código...</span>
                      )}
                    </div>
                  </div>
                  {sessionUrl && !tunnelLoading && (
                    <button 
                      onClick={copyUrl}
                      className="text-text-secondary hover:text-text-primary p-1.5 rounded hover:bg-background-tertiary active:scale-[0.95] transition-all flex-shrink-0"
                      title="Copiar link"
                    >
                      {copiedUrl ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-text-success"><path d="M20 6 9 17l-5-5"/></svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Credentials Card */}
            <div className="bg-background-primary border-[0.5px] border-border-tertiary rounded-lg p-5">
              <h2 className="text-[11px] font-medium text-text-secondary uppercase tracking-[0.06em] mb-2">Credenciais de Acesso (Opcional)</h2>
              <p className="text-[13px] text-text-secondary mb-4">
                Defina um nome e senha personalizados para que os clientes consigam acessar este Host sem precisar do código aleatório.
              </p>
              
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-[11px] text-text-secondary mb-1">Nome do Host</label>
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value.replace(/[^a-zA-Z0-9-]/g, '').toLowerCase())}
                    placeholder="ex: pc-escritorio"
                    className="w-full h-[36px] bg-background-secondary border-[0.5px] border-border-secondary rounded-md px-3 text-[13px] text-text-primary outline-none focus:shadow-ring transition-shadow"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-text-secondary mb-1">Senha</label>
                  <input
                    type="password"
                    value={customPassword}
                    onChange={(e) => setCustomPassword(e.target.value)}
                    placeholder="ex: 123456"
                    className="w-full h-[36px] bg-background-secondary border-[0.5px] border-border-secondary rounded-md px-3 text-[13px] text-text-primary outline-none focus:shadow-ring transition-shadow"
                  />
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between gap-4">
                <span className="text-[12px] font-medium">
                  {credentialsStatus && (
                    <span className={credentialsStatus.type === 'error' ? 'text-text-danger' : 'text-text-success'}>
                      {credentialsStatus.message}
                    </span>
                  )}
                </span>
                <button
                  onClick={saveCredentials}
                  disabled={!localSession}
                  className="bg-background-info border-[0.5px] border-border-info rounded-md text-[13px] px-4 py-1.5 text-text-primary hover:bg-background-secondary active:scale-[0.98] transition-transform disabled:opacity-50 disabled:pointer-events-none"
                >
                  Salvar Credenciais
                </button>
              </div>
            </div>

            {/* Requests Area */}
            <div className="bg-background-primary border-[0.5px] border-border-tertiary rounded-lg p-5">
              <h2 className="text-[11px] font-medium text-text-secondary uppercase tracking-[0.06em] mb-2">Solicitações de controle</h2>
              <div className="space-y-3">
                {requests.length === 0 ? (
                  <p className="text-[13px] text-text-tertiary">Nenhum pedido pendente.</p>
                ) : (
                  requests.map((request, index) => (
                    <div key={request.clientId} className="bg-background-secondary rounded-md p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <span className="text-[13px] text-text-primary">Dispositivo: <span className="font-mono">{request.device}</span></span>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => rejectClient(index)} 
                          className="bg-transparent border-[0.5px] border-border-secondary rounded-md text-[13px] px-3 py-1 text-text-primary hover:bg-background-tertiary active:scale-[0.98] transition-transform"
                        >
                          Rejeitar
                        </button>
                        <button 
                          onClick={() => approveClient(index)} 
                          className="bg-background-success border-[0.5px] border-border-success rounded-md text-[13px] px-3 py-1 text-text-primary hover:opacity-90 active:scale-[0.98] transition-transform"
                        >
                          Aprovar
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

          {/* Sidebar */}
          <aside className="space-y-6">
            <div className="bg-background-primary border-[0.5px] border-border-tertiary rounded-lg p-5">
              <h2 className="text-[11px] font-medium text-text-secondary uppercase tracking-[0.06em] mb-2">Acesso rápido</h2>
              <p className="text-[13px] text-text-secondary mb-4">Use o QR code para abrir a sessão instantaneamente no seu celular.</p>
              
              <div className="flex items-center justify-center bg-background-secondary rounded-md p-4">
                {localSession ? (
                  <QRCode value={sessionUrl} size={180} bgColor="transparent" fgColor="#ffffff" />
                ) : (
                  <div className="flex h-[180px] w-[180px] items-center justify-center border border-dashed border-border-secondary rounded-md">
                    <span className="text-[11px] text-text-tertiary text-center px-4">Crie a sessão primeiro</span>
                  </div>
                )}
              </div>
            </div>
          </aside>
          
        </section>
      </div>
    </div>
  );
}
