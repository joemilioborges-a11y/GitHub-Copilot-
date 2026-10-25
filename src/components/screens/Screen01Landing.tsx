import React from 'react';
import {
  Sparkles,
  ShieldCheck,
  Heart,
  Users,
  Lock,
  ArrowRight,
  Globe2,
  Video,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react';

interface Screen01LandingProps {
  onExplore: () => void;
  onRegister: () => void;
  onLogin: () => void;
  onOpenPrivacyTerms?: () => void;
  onOpenGlobalVision?: () => void;
}

export const Screen01Landing: React.FC<Screen01LandingProps> = ({
  onExplore,
  onRegister,
  onLogin,
  onOpenPrivacyTerms,
  onOpenGlobalVision,
}) => {
  return (
    <div className="min-h-screen bg-[#07070a] text-slate-100 flex flex-col justify-between selection:bg-rose-500 selection:text-white relative overflow-hidden">
      {/* Background Ambience Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-gradient-to-b from-rose-600/15 via-amber-500/10 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-rose-900/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Brand Header */}
      <header className="relative z-10 max-w-6xl mx-auto w-full px-6 py-5 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 via-rose-500 to-amber-400 p-[2px] shadow-lg shadow-rose-950/40">
            <div className="w-full h-full bg-[#0d0d14] rounded-[10px] flex items-center justify-center font-display font-black text-transparent bg-clip-text bg-gradient-to-tr from-rose-400 to-amber-300 text-xl tracking-tighter">
              J
            </div>
          </div>
          <div>
            <span className="font-display font-extrabold text-2xl tracking-tight text-white">
              JOBS
            </span>
            <span className="hidden sm:inline-block ml-2 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
              Global Dating 1.0
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {onOpenGlobalVision ? (
            <button
              onClick={onOpenGlobalVision}
              className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-xl border border-white/10 hover:border-amber-400/40 transition-all cursor-pointer shadow-sm"
              title="JOBS: Nascemos no Brasil. Nossa Visão é Global! 🌎"
            >
              <Globe2 className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-semibold">Global 🌎</span>
            </button>
          ) : (
            <div className="hidden sm:flex items-center gap-1 text-xs text-slate-400 bg-white/5 px-2.5 py-1.5 rounded-lg border border-white/5">
              <Globe2 className="w-3.5 h-3.5 text-rose-400" />
              <span>BR (Português)</span>
            </div>
          )}
          <button
            onClick={onLogin}
            className="px-4 py-2 text-sm font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            Entrar
          </button>
          <button
            onClick={onRegister}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white text-sm font-bold shadow-lg shadow-rose-600/25 transition-all cursor-pointer"
          >
            Cadastrar
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 max-w-4xl mx-auto px-6 py-12 sm:py-16 text-center flex-1 flex flex-col justify-center">
        {/* Badge */}
        <div
          onClick={onOpenGlobalVision}
          className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold mx-auto mb-6 transition-all ${
            onOpenGlobalVision ? 'cursor-pointer hover:bg-rose-500/20 hover:border-amber-400/50 hover:text-amber-300' : ''
          }`}
          title="Ver nosso manifesto global"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Nascemos no Brasil. Nossa Visão é Global! 🌎</span>
        </div>

        {/* Main Title */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-display font-extrabold tracking-tight text-white mb-6 leading-[1.1]">
          Conexões autênticas com{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-500 via-rose-400 to-amber-300">
            liberdade e confiança.
          </span>
        </h1>

        {/* Subtitle / Impact Statement */}
        <p className="text-base sm:text-xl text-slate-300 max-w-2xl mx-auto mb-10 leading-relaxed font-normal">
          O <strong className="text-white font-semibold">JOBS</strong> conecta adultos que buscam química, cumplicidade e exclusividade.
          Tecnologia inteligente de afinidade, verificação estrita +18 anos e máxima privacidade.
        </p>

        {/* The 3 Core Action Buttons requested by user */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 max-w-xl mx-auto w-full mb-12">
          {/* 1. Encontrar pessoas */}
          <button
            onClick={onExplore}
            className="w-full sm:w-auto flex-1 px-6 py-4 rounded-2xl bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white font-display font-bold text-base shadow-xl shadow-rose-900/40 hover:shadow-rose-600/30 flex items-center justify-center gap-2 transition-all transform hover:-translate-y-0.5 cursor-pointer"
          >
            <Heart className="w-5 h-5 fill-current" />
            <span>Encontrar pessoas</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          {/* 2. Criar minha conta */}
          <button
            onClick={onRegister}
            className="w-full sm:w-auto flex-1 px-6 py-4 rounded-2xl bg-slate-900/90 hover:bg-slate-800 text-white font-display font-bold text-base border border-slate-700/80 hover:border-rose-500/50 flex items-center justify-center gap-2 transition-all transform hover:-translate-y-0.5 cursor-pointer"
          >
            <Users className="w-5 h-5 text-rose-400" />
            <span>Criar minha conta</span>
          </button>

          {/* 3. Já tenho uma conta */}
          <button
            onClick={onLogin}
            className="w-full sm:w-auto px-6 py-4 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white font-display font-semibold text-base border border-white/10 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <span>Já tenho uma conta</span>
          </button>
        </div>

        {/* Trust & Exclusivity Pillars */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-left max-w-3xl mx-auto w-full pt-4 border-t border-white/10">
          <div className="p-3 rounded-xl bg-slate-900/40 border border-white/5">
            <div className="w-7 h-7 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-400 mb-2">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="text-xs font-bold text-white">Exclusivo +18</div>
            <div className="text-[11px] text-slate-400">Verificação rigorosa de idade</div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/40 border border-white/5">
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400 mb-2">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="text-xs font-bold text-white">Afinidade por IA</div>
            <div className="text-[11px] text-slate-400">Recomendações explicáveis</div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/40 border border-white/5">
            <div className="w-7 h-7 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-2">
              <Video className="w-4 h-4" />
            </div>
            <div className="text-xs font-bold text-white">Vídeo Privativo</div>
            <div className="text-[11px] text-slate-400">Chamadas ao vivo seguras</div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/40 border border-white/5">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-2">
              <Lock className="w-4 h-4" />
            </div>
            <div className="text-xs font-bold text-white">Privacidade LGPD</div>
            <div className="text-[11px] text-slate-400">Controle total dos seus dados</div>
          </div>
        </div>
      </main>

      {/* Footer Legal & Info */}
      <footer className="relative z-10 max-w-6xl mx-auto w-full px-6 py-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-3">
        <div>
          © {new Date().getFullYear()} JOBS Platform Inc. Todos os direitos reservados.
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={onOpenPrivacyTerms}
            className="hover:text-slate-300 transition-colors cursor-pointer"
          >
            Termos de Uso
          </button>
          <span>•</span>
          <button
            onClick={onOpenPrivacyTerms}
            className="hover:text-slate-300 transition-colors cursor-pointer"
          >
            Privacidade & LGPD
          </button>
          <span>•</span>
          {onOpenGlobalVision && (
            <>
              <button
                onClick={onOpenGlobalVision}
                className="hover:text-amber-300 transition-colors cursor-pointer text-amber-400/90 font-bold flex items-center gap-1"
              >
                <Globe2 className="w-3 h-3 text-amber-400" />
                <span>Do Brasil para o Mundo 🌎</span>
              </button>
              <span>•</span>
            </>
          )}
          <span className="text-rose-400 font-semibold">+18 Apenas</span>
        </div>
      </footer>
    </div>
  );
};
