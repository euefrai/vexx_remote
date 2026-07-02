import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-background-tertiary font-sans">
      <div className="w-full max-w-3xl space-y-8">
        
        {/* Header section */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-background-secondary border-[0.5px] border-border-tertiary mb-2">
            <i className="ti ti-devices text-[24px] text-text-primary" aria-hidden="true"></i>
          </div>
          <h1 className="text-[22px] font-medium text-text-primary">VEXX Remote</h1>
          <p className="text-[16px] leading-[1.7] text-text-secondary max-w-xl mx-auto">
            Acesso remoto de baixa latência, veloz e seguro. Controle seu computador de qualquer lugar com uma interface premium e limpa.
          </p>
        </div>

        {/* Action Cards */}
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Host Card */}
          <div 
            onClick={() => navigate('/host')}
            className="flex flex-col gap-4 bg-background-primary border-[0.5px] border-border-tertiary rounded-lg p-[1rem_1.25rem] cursor-pointer hover:border-border-secondary transition-colors"
          >
            <div className="flex items-center gap-3">
              <i className="ti ti-server text-[20px] text-text-info" aria-hidden="true"></i>
              <h2 className="text-[16px] font-medium text-text-primary">Criar Sessão (Host)</h2>
            </div>
            <p className="text-[13px] text-text-secondary flex-1">
              Configure este dispositivo para ser controlado remotamente. Defina um nome e senha para acesso.
            </p>
            <div className="pt-2">
              <button className="bg-transparent border-[0.5px] border-border-secondary rounded-md text-[13px] px-[12px] py-[6px] text-text-primary hover:border-border-primary transition-colors">
                Configurar Host
              </button>
            </div>
          </div>

          {/* Client Card */}
          <div 
            onClick={() => navigate('/client')}
            className="flex flex-col gap-4 bg-background-primary border-[0.5px] border-border-tertiary rounded-lg p-[1rem_1.25rem] cursor-pointer hover:border-border-secondary transition-colors"
          >
            <div className="flex items-center gap-3">
              <i className="ti ti-device-laptop text-[20px] text-text-success" aria-hidden="true"></i>
              <h2 className="text-[16px] font-medium text-text-primary">Conectar (Client)</h2>
            </div>
            <p className="text-[13px] text-text-secondary flex-1">
              Acesse um computador remotamente. Você precisará do nome e senha definidos pelo host.
            </p>
            <div className="pt-2">
              <button className="bg-transparent border-[0.5px] border-border-secondary rounded-md text-[13px] px-[12px] py-[6px] text-text-primary hover:border-border-primary transition-colors">
                Fazer Login
              </button>
            </div>
          </div>
        </div>

        {/* Features list */}
        <div className="grid gap-3 sm:grid-cols-3 pt-4">
          <div className="flex items-center gap-2 bg-background-secondary rounded-md p-[0.625rem_0.75rem] border-[0.5px] border-border-tertiary">
            <i className="ti ti-bolt text-[16px] text-text-secondary" aria-hidden="true"></i>
            <span className="text-[13px] text-text-secondary">Baixa Latência WebRTC</span>
          </div>
          <div className="flex items-center gap-2 bg-background-secondary rounded-md p-[0.625rem_0.75rem] border-[0.5px] border-border-tertiary">
            <i className="ti ti-lock text-[16px] text-text-secondary" aria-hidden="true"></i>
            <span className="text-[13px] text-text-secondary">Conexão Segura</span>
          </div>
          <div className="flex items-center gap-2 bg-background-secondary rounded-md p-[0.625rem_0.75rem] border-[0.5px] border-border-tertiary">
            <i className="ti ti-devices-pc text-[16px] text-text-secondary" aria-hidden="true"></i>
            <span className="text-[13px] text-text-secondary">Multiplataforma</span>
          </div>
        </div>

      </div>
    </main>
  );
}
