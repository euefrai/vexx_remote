import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(108,114,255,0.25),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(255,92,184,0.18),transparent_25%)]" />
      <div className="relative z-10 flex w-full max-w-6xl flex-col gap-12 rounded-[32px] border border-white/10 bg-slate-950/90 p-10 shadow-glow backdrop-blur-xl">
        <section className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div className="space-y-6">
            <span className="inline-flex rounded-full bg-violet-500/15 px-4 py-2 text-sm text-violet-200 ring-1 ring-violet-400/15">
              VEXX Remote — controle em tempo real com UX premium
            </span>
            <h1 className="text-5xl font-semibold tracking-tight text-slate-50 sm:text-6xl">
              Acesso remoto veloz, simples e seguro.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-slate-300">
              Crie uma sessão em segundos. Compartilhe tela, aprove e controle com gestos ou mouse. Perfeito para desktop, mobile e tablets.
            </p>
            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => navigate('/host')}
                className="rounded-full bg-violet-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-violet-400"
              >
                Criar Sessão
              </button>
              <button
                onClick={() => navigate('/client')}
                className="rounded-full border border-slate-700 bg-slate-900/80 px-6 py-3 text-sm font-semibold text-slate-100 transition hover:border-slate-500"
              >
                Entrar em Sessão
              </button>
            </div>
          </div>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-[28px] border border-white/10 bg-slate-900/80 p-6 shadow-xl"
          >
            <div className="absolute inset-x-0 top-0 h-1/2 bg-slate-800/80" />
            <div className="relative space-y-5">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-800 text-slate-200">V</span>
                <div>
                  <p className="text-sm text-slate-400">Conexão habilitada</p>
                  <p className="text-base font-semibold text-slate-100">100ms latency</p>
                </div>
              </div>
              <div className="grid gap-4 rounded-3xl bg-slate-950/95 p-5">
                <div className="space-y-2">
                  <div className="h-48 rounded-3xl bg-gradient-to-br from-violet-500/20 via-slate-900 to-slate-800 p-5" />
                  <div className="flex items-center justify-between text-sm text-slate-400">
                    <span>Stream de tela</span>
                    <span>4K adaptive</span>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  {['PC → PC', 'Mobile → PC', 'Tablet → PC'].map((item) => (
                    <div key={item} className="rounded-3xl border border-white/5 bg-slate-900/90 p-4 text-center text-sm text-slate-300">
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        <section className="grid gap-6 rounded-[28px] border border-white/10 bg-slate-900/90 p-8 text-slate-300 sm:grid-cols-3">
          {[
            { title: 'Baixa latência', description: 'WebRTC nativo, sinais otimizados e reconexão inteligente.' },
            { title: 'Aprovação segura', description: 'Host controla cada novo dispositivo e mantém sessões temporárias.' },
            { title: 'UI premium', description: 'Design clean, micro animações e experiência instantânea.' },
          ].map((item) => (
            <div key={item.title} className="space-y-3 rounded-3xl bg-slate-950/80 p-6 shadow-sm shadow-slate-950/20">
              <h3 className="text-lg font-semibold text-slate-100">{item.title}</h3>
              <p className="text-sm leading-6 text-slate-400">{item.description}</p>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
