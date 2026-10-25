import React, { useState } from 'react';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';

import { authService } from '../../utils/authService';

interface Screen03LoginProps {
  onSuccess: (userData: { email: string; username: string }) => void;
  onGoToRegister: () => void;
  onGoToPasswordRecovery: () => void;
}

export const Screen03Login: React.FC<Screen03LoginProps> = ({
  onSuccess,
  onGoToRegister,
  onGoToPasswordRecovery,
}) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!identifier || !password) {
      setError('Informe seu e-mail ou nome de usuário e senha.');
      return;
    }

    setLoading(true);
    try {
      const res = await authService.login(identifier, password);
      setLoading(false);
      if (!res.success) {
        setError(res.error || 'Credenciais inválidas.');
        return;
      }
      onSuccess({
        email: res.account!.email,
        username: res.account!.username,
      });
    } catch (err) {
      setLoading(false);
      setError('Erro de conexão ao autenticar credenciais.');
    }
  };

  const handleDemoLogin = async () => {
    setIdentifier('membro.vip@jobs.app');
    setPassword('Jobs@2026Secure!');
    setLoading(true);
    try {
      const res = await authService.login('membro.vip@jobs.app', 'Jobs@2026Secure!');
      setLoading(false);
      if (res.success && res.account) {
        onSuccess({
          email: res.account.email,
          username: res.account.username,
        });
      }
    } catch (err) {
      setLoading(false);
      setError('Erro no login demonstrativo.');
    }
  };

  return (
    <div className="min-h-screen bg-[#07070a] text-slate-100 flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden">
      {/* Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-[#0f0f17] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10">
        {/* Brand */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-600 to-amber-400 p-[2px]">
              <div className="w-full h-full bg-[#0d0d14] rounded-[9px] flex items-center justify-center font-display font-black text-white text-base">
                J
              </div>
            </div>
            <div>
              <span className="font-display font-bold text-xl text-white">JOBS</span>
              <span className="block text-[10px] text-slate-400 uppercase tracking-wider">Acesso Seguro</span>
            </div>
          </div>
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Conexão Criptografada
          </span>
        </div>

        <h2 className="text-2xl font-display font-bold text-white mb-1">Bem-vindo(a) de volta</h2>
        <p className="text-xs text-slate-400 mb-6">
          Entre na sua conta para acessar suas conexões, mensagens e novidades.
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/60 border border-rose-700/50 flex items-start gap-2.5 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              E-mail ou @usuário
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="seu.email@exemplo.com ou @usuario"
                className="w-full bg-[#151522] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 transition-colors"
                required
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-300">Sua senha</label>
              <button
                type="button"
                onClick={onGoToPasswordRecovery}
                className="text-[11px] text-rose-400 hover:text-rose-300 hover:underline"
              >
                Esqueceu a senha?
              </button>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite sua senha cadastrada"
                className="w-full bg-[#151522] border border-white/10 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 transition-colors"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs pt-1">
            <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded border-slate-700 bg-slate-900 text-rose-600 focus:ring-rose-500 w-3.5 h-3.5"
              />
              <span>Manter sessão conectada</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white font-display font-bold text-sm shadow-lg shadow-rose-950 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <span>Autenticando...</span>
            ) : (
              <>
                <span>Entrar no JOBS</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Demo Fast Login */}
        <div className="mt-4 pt-4 border-t border-white/10">
          <button
            type="button"
            onClick={handleDemoLogin}
            className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-300 hover:text-white flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Acesso Rápido de Demonstração (1 Clique)</span>
          </button>
        </div>

        <div className="mt-6 text-center text-xs text-slate-400">
          Ainda não tem conta no JOBS?{' '}
          <button
            onClick={onGoToRegister}
            className="text-rose-400 font-semibold hover:underline cursor-pointer"
          >
            Criar conta gratuita
          </button>
        </div>
      </div>
    </div>
  );
};
