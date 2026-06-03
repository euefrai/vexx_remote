import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getSocket, disconnectSocket } from '../services/socketService';
import { useSessionStore } from '../store/sessionStore';

import { ScreenView } from '../components/remote/ScreenView';
import { TouchController, RemoteInputEvent } from '../components/remote/TouchController';
import { KeyboardPanel } from '../components/remote/KeyboardPanel';

export default function ClientPage() {
  const [searchParams] = useSearchParams();
  const defaultCode = searchParams.get('code') ?? '';
  const { setSessionId, setRole } = useSessionStore();
  const socket = useMemo(() => getSocket(), []);
  const mediaRef = useRef<HTMLElement>(null);

  const [sessionCode, setSessionCode] = useState(defaultCode);
  const [status, setStatus] = useState('Pronto para conectar');
  const [approved, setApproved] = useState(false);
  const [connected, setConnected] = useState(socket.connected);
  const [isTransmitting, setIsTransmitting] = useState(false);

  const [accessMethod, setAccessMethod] = useState<'code' | 'credentials'>('code');
  const [clientCustomName, setClientCustomName] = useState('');
  const [clientCustomPassword, setClientCustomPassword] = useState('');
  
  const [kbdOpen, setKbdOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [screen, setScreen] = useState({ w: 1920, h: 1080 });
  
  const approvedRef = useRef(approved);
  const sessionCodeRef = useRef(sessionCode);

  useEffect(() => { approvedRef.current = approved; }, [approved]);
  useEffect(() => { sessionCodeRef.current = sessionCode; }, [sessionCode]);

  useEffect(() => {
    setRole('client');

    socket.on('connect', () => {
      setConnected(true);
    });
    socket.on('disconnect', () => {
      setConnected(false);
      setIsTransmitting(false);
      setStatus('Desconectado do servidor');
    });

    socket.on('client:approved', () => {
      setApproved(true);
      setStatus('Aprovado pelo host, aguardando stream');
    });

    socket.on('session:error', (msg: string) => {
      setStatus(`Erro: ${msg}`);
    });

    socket.on('screen_frame', (base64Frame: string) => {
      const img = mediaRef.current as HTMLImageElement | null;
      if (img) {
        img.src = `data:image/jpeg;base64,${base64Frame}`;
        setIsTransmitting(true);
      }
    });

    socket.connect();

    if (defaultCode) {
      connectToSession(defaultCode);
    }

    return () => {
      disconnectSocket();
    };
  }, []);

  const API_BASE = import.meta.env.VITE_API_URL ?? '';

  async function handleConnect() {
    if (accessMethod === 'code') {
      connectToSession(sessionCode);
    } else {
      if (!clientCustomName.trim()) {
        setStatus('Insira o nome do host');
        return;
      }
      if (!socket.id) {
        setStatus('Aguardando conexão com o servidor...');
        return;
      }
      try {
        setStatus('Autenticando...');
        const response = await fetch(`${API_BASE}/session/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customName: clientCustomName,
            customPassword: clientCustomPassword,
            clientId: socket.id
          })
        });
        const result = await response.json();
        if (!response.ok || result.error) {
          throw new Error(result.error || 'Erro ao autenticar');
        }
        
        setSessionCode(result.sessionId);
        if (result.approved) {
          setApproved(true);
          setStatus('Aprovado pelo host, aguardando stream');
        } else {
          connectToSession(result.sessionId);
        }
      } catch (error: any) {
        setStatus(`Erro: ${error.message}`);
      }
    }
  }

  function connectToSession(codeToUse: string = sessionCode) {
    if (!codeToUse.trim()) {
      setStatus('Insira um código válido');
      return;
    }
    setStatus('Solicitando acesso ao host...');
    setSessionId(codeToUse);
    socket.emit('client:request', { sessionId: codeToUse, device: navigator.userAgent });
  }

  const sendInput = useCallback((evt: RemoteInputEvent | Record<string, unknown>) => {
    if (!approvedRef.current) return;
    const e = evt as any;
    let action = '';
    let payload = { ...e };

    if (e.type === 'move') {
      action = 'mouse';
      payload = { deltaX: e.deltaX, deltaY: e.deltaY };
    } else if (e.type === 'down') {
      action = 'mouse_down';
    } else if (e.type === 'up') {
      action = 'mouse_up';
    } else if (e.type === 'click') {
      action = 'click';
    } else if (e.type === 'scroll') {
      action = 'scroll';
      payload = { deltaX: e.deltaX, deltaY: e.deltaY };
    }

    if (e.type === 'type') {
      socket.emit('client:control', { sessionId: sessionCodeRef.current, action: 'type_string', payload: { text: e.text } });
    } else if (e.type === 'key') {
      socket.emit('client:control', { sessionId: sessionCodeRef.current, action: 'keyboard', payload: { key: e.key } });
    } else if (action) {
      socket.emit('client:control', { sessionId: sessionCodeRef.current, action, payload });
    }
  }, []);

  useEffect(() => {
    const sync = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
        const so: any = (window.screen as any).orientation;
        if (so?.lock) try { await so.lock("landscape"); } catch {}
      }
    } catch (e) { console.warn("fullscreen failed:", e); }
  }, []);

  if (!approved) {
    return (
      <div className="min-h-screen px-4 py-8 flex flex-col items-center justify-center">
        <div className="w-full max-w-sm bg-background-primary border-[0.5px] border-border-tertiary rounded-lg p-6">
          <div className="text-center mb-4">
            <h1 className="text-[22px] font-medium text-text-primary font-sans">Vexx Remote</h1>
            <p className="mt-1 text-[13px] text-text-secondary">Conectar a um Host</p>
          </div>

          {/* Abas de Métodos de Acesso */}
          <div className="flex border-b-[0.5px] border-border-tertiary mb-4">
            <button 
              onClick={() => { setAccessMethod('code'); setStatus('Pronto para conectar'); }}
              className={`flex-1 pb-2 text-[12px] font-medium transition-colors border-b-2 -mb-[0.5px] ${
                accessMethod === 'code' 
                  ? 'border-border-info text-text-info' 
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              Código de Acesso
            </button>
            <button 
              onClick={() => { setAccessMethod('credentials'); setStatus('Pronto para conectar'); }}
              className={`flex-1 pb-2 text-[12px] font-medium transition-colors border-b-2 -mb-[0.5px] ${
                accessMethod === 'credentials' 
                  ? 'border-border-info text-text-info' 
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              Nome / Senha
            </button>
          </div>

          <div className="space-y-4">
            {accessMethod === 'code' ? (
              <div>
                <label className="block text-[11px] font-medium text-text-secondary uppercase tracking-[0.06em] mb-2">
                  Código da sessão
                </label>
                <input
                  value={sessionCode}
                  onChange={(e) => setSessionCode(e.target.value.toUpperCase())}
                  placeholder="AB12CD34"
                  className="w-full h-[36px] bg-background-secondary border-[0.5px] border-border-secondary rounded-md px-3 text-[13px] text-text-primary outline-none focus:shadow-ring transition-shadow"
                />
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-medium text-text-secondary uppercase tracking-[0.06em] mb-2">
                    Nome do Host
                  </label>
                  <input
                    value={clientCustomName}
                    onChange={(e) => setClientCustomName(e.target.value.replace(/[^a-zA-Z0-9-]/g, '').toLowerCase())}
                    placeholder="ex: pc-escritorio"
                    className="w-full h-[36px] bg-background-secondary border-[0.5px] border-border-secondary rounded-md px-3 text-[13px] text-text-primary outline-none focus:shadow-ring transition-shadow"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-text-secondary uppercase tracking-[0.06em] mb-2">
                    Senha
                  </label>
                  <input
                    type="password"
                    value={clientCustomPassword}
                    onChange={(e) => setClientCustomPassword(e.target.value)}
                    placeholder="Sua senha de acesso"
                    className="w-full h-[36px] bg-background-secondary border-[0.5px] border-border-secondary rounded-md px-3 text-[13px] text-text-primary outline-none focus:shadow-ring transition-shadow"
                  />
                </div>
              </div>
            )}
            
            <div className="bg-background-secondary rounded-md p-3">
              <span className="block text-[11px] text-text-secondary uppercase tracking-[0.06em]">Status</span>
              <span className="block mt-1 text-[13px] text-text-primary">{status}</span>
            </div>
            
            <button 
              onClick={handleConnect} 
              className="w-full bg-background-info border-[0.5px] border-border-info rounded-md text-[13px] py-2 text-text-primary hover:bg-background-secondary active:scale-[0.98] transition-transform"
            >
              Entrar na Sessão
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-0 overflow-hidden bg-black text-text-primary">
      <div className="absolute inset-0 flex items-center justify-center">
        <ScreenView
          ref={mediaRef}
          connected={connected}
          isTransmitting={isTransmitting}
        />
        <TouchController
          imgRef={mediaRef as React.RefObject<HTMLImageElement | null>}
          screenW={screen.w}
          screenH={screen.h}
          onInput={sendInput}
        />
      </div>

      {/* Floating Menu Toggle Button */}
      <div className="absolute top-1/2 left-0 -translate-y-1/2 z-30 pointer-events-auto">
        <button 
          onClick={() => setMenuOpen(!menuOpen)}
          className="bg-background-primary border-[0.5px] border-l-0 border-border-secondary rounded-r-lg p-2 text-text-secondary hover:text-text-primary hover:bg-background-secondary active:scale-[0.98] transition-transform flex items-center justify-center"
          aria-label="Abrir configurações"
        >
          <i className="ti ti-menu-2 text-[20px]" aria-hidden="true"></i>
        </button>
      </div>

      {/* Sidebar Menu */}
      <div className={`absolute top-0 left-0 bottom-0 w-64 bg-background-primary z-20 border-r-[0.5px] border-border-tertiary transition-transform duration-300 flex flex-col p-4 ${
        menuOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex items-center gap-3 border-b-[0.5px] border-border-tertiary pb-4">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${connected ? 'bg-background-success text-text-success' : 'bg-background-danger text-text-danger'}`}>
            <i className={connected ? "ti ti-check" : "ti ti-x"} aria-hidden="true"></i>
          </div>
          <div className="flex flex-col">
            <span className="text-[13px] text-text-primary">{connected ? "Conectado" : "Desconectado"}</span>
            <span className="text-[11px] text-text-tertiary">{isTransmitting ? "Transmitindo" : "Aguardando"}</span>
          </div>
        </div>

        <div className="flex flex-col gap-2 flex-1 overflow-y-auto mt-4">
          <p className="text-[11px] font-medium text-text-secondary uppercase tracking-[0.06em] mb-1">Visualização</p>
          <button 
            onClick={toggleFullscreen}
            className="flex items-center gap-2 w-full bg-transparent border-[0.5px] border-border-secondary rounded-md px-3 py-2 text-[13px] text-text-primary hover:bg-background-secondary active:scale-[0.98] transition-transform"
          >
            <i className={fullscreen ? "ti ti-arrows-minimize" : "ti ti-arrows-maximize"} aria-hidden="true"></i>
            {fullscreen ? "Sair da tela cheia" : "Tela cheia"}
          </button>

          <p className="text-[11px] font-medium text-text-secondary uppercase tracking-[0.06em] mt-4 mb-1">Entrada</p>
          <button 
            onClick={() => { setKbdOpen(true); setMenuOpen(false); }}
            className="flex items-center gap-2 w-full bg-background-info border-[0.5px] border-border-info rounded-md px-3 py-2 text-[13px] text-text-primary hover:bg-background-secondary active:scale-[0.98] transition-transform"
          >
            <i className="ti ti-keyboard" aria-hidden="true"></i>
            Abrir Teclado
          </button>

          <button 
            onClick={() => sendInput({ type: "click", button: "right" })}
            className="flex items-center gap-2 w-full bg-transparent border-[0.5px] border-border-secondary rounded-md px-3 py-2 text-[13px] text-text-primary hover:bg-background-secondary active:scale-[0.98] transition-transform mt-1"
          >
            <i className="ti ti-mouse" aria-hidden="true"></i>
            Clique Direito
          </button>
          
          <button 
            onClick={() => sendInput({ type: "key", key: "win" })}
            className="flex items-center gap-2 w-full bg-transparent border-[0.5px] border-border-secondary rounded-md px-3 py-2 text-[13px] text-text-primary hover:bg-background-secondary active:scale-[0.98] transition-transform mt-1"
          >
            <i className="ti ti-brand-windows" aria-hidden="true"></i>
            Windows
          </button>

          <p className="text-[11px] font-medium text-text-secondary uppercase tracking-[0.06em] mt-4 mb-1">Atalhos</p>
          <div className="grid grid-cols-2 gap-2">
            <button 
              onClick={() => sendInput({ type: "key", key: "backspace" })}
              className="bg-transparent border-[0.5px] border-border-secondary rounded-md px-3 py-2 text-[13px] text-text-primary hover:bg-background-secondary active:scale-[0.98] transition-transform"
            >
              Apagar
            </button>
            <button 
              onClick={() => sendInput({ type: "key", key: "enter" })}
              className="bg-transparent border-[0.5px] border-border-secondary rounded-md px-3 py-2 text-[13px] text-text-primary hover:bg-background-secondary active:scale-[0.98] transition-transform"
            >
              Enter
            </button>
          </div>
        </div>

        <a 
          href="/" 
          className="mt-4 flex items-center justify-center gap-2 w-full bg-background-danger border-[0.5px] border-border-danger rounded-md px-3 py-2 text-[13px] text-text-primary hover:bg-background-secondary active:scale-[0.98] transition-transform"
        >
          <i className="ti ti-door-exit" aria-hidden="true"></i>
          Encerrar sessão
        </a>
      </div>

      {kbdOpen && (
        <KeyboardPanel
          onType={(text) => sendInput({ type: "type", text })}
          onKey={(key)   => sendInput({ type: "key",  key })}
          onClose={() => setKbdOpen(false)}
        />
      )}
    </div>
  );
}
