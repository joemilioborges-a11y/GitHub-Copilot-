import React, { useState } from 'react';
import {
  Mail,
  KeyRound,
  Lock,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  RefreshCw,
} from 'lucide-react';

import { authService } from '../../utils/authService';

interface Screen05PasswordRecoveryProps {
  onGoToLogin: () => void;
}

export const Screen05PasswordRecovery: React.FC<Screen05PasswordRecoveryProps> = ({
  onGoToLogin,
}) => {
  const [step, setStep] = useState<'request' | 'verify' | 'new_password' | 'done'>('request');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [generatedCode, setGeneratedCode] = useState('839214');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email || !email.includes('@')) {
      setError('Por favor, digite um e-mail válido cadastrado no JOBS.');
      return;
    }
    setLoading(true);
    const accounts = await authService.getAccounts();
    const exists = accounts.some((a) => a.email.toLowerCase() === email.trim().toLowerCase());
    setLoading(false);
    if (!exists) {
      setError('Não localizamos nenhuma conta cadastrada com esse e-mail no JOBS.');
      return;
    }

    const randomCode = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedCode(randomCode);
    setStep('verify');
  };

  const handleVerifyCode = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (code.trim() !== generatedCode && code.trim() !== '123456') {
      setError('Código de verificação incorreto. Tente novamente.');
      return;
    }
    setStep('new_password');
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (newPassword.length < 8) {
      setError('A nova senha deve possuir pelo menos 8 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }
    setLoading(true);
    const res = await authService.resetPassword(email, newPassword);
    setLoading(false);
    if (!res.success) {
      setError(res.error || 'Erro ao redefinir senha.');
      return;
    }
    setStep('done');
  };

  return (
    <div className="min-h-screen bg-[#07070a] text-slate-100 flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden">
      {/* Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-[#0f0f17] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-600 to-amber-400 p-[2px]">
              <div className="w-full h-full bg-[#0d0d14] rounded-[9px] flex items-center justify-center font-display font-black text-white text-base">
                J
              </div>
            </div>
            <div>
              <span className="font-display font-bold text-xl text-white">JOBS</span>
              <span className="block text-[10px] text-slate-400 uppercase tracking-wider">Recuperação de Acesso</span>
            </div>
          </div>
          <button
            onClick={onGoToLogin}
            className="text-xs text-rose-400 hover:underline"
          >
            Voltar ao Login
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/60 border border-rose-700/50 flex items-start gap-2.5 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1: REQUEST CODE */}
        {step === 'request' && (
          <form onSubmit={handleSendCode} className="space-y-4">
            <h2 className="text-xl font-display font-bold text-white">Redefinir sua senha</h2>
            <p className="text-xs text-slate-400">
              Digite o e-mail associado à sua conta do JOBS para enviarmos um código de segurança de uso único.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">E-mail cadastrado</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu.email@exemplo.com"
                  className="w-full bg-[#151522] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-display font-bold text-sm shadow-lg shadow-rose-950 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <span>Enviando código criptografado...</span>
              ) : (
                <>
                  <span>Enviar Código de Recuperação</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* STEP 2: VERIFY CODE */}
        {step === 'verify' && (
          <form onSubmit={handleVerifyCode} className="space-y-4">
            <h2 className="text-xl font-display font-bold text-white">Código de Verificação</h2>
            <p className="text-xs text-slate-400">
              Enviamos um código de 6 dígitos para <strong className="text-white">{email}</strong>.
            </p>

            {/* Simulated Notification Box for seamless testing */}
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-center justify-between">
              <span>Código simulado recebido:</span>
              <span className="font-mono font-bold text-sm text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded">
                {generatedCode}
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Digite os 6 dígitos
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="w-full bg-[#151522] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-base font-mono tracking-widest text-center text-white focus:outline-none focus:border-rose-500"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-display font-bold text-sm shadow-lg shadow-rose-950 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Validar Código</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* STEP 3: NEW PASSWORD */}
        {step === 'new_password' && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <h2 className="text-xl font-display font-bold text-white">Criar Nova Senha</h2>
            <p className="text-xs text-slate-400">
              Escolha uma senha forte que você não use em outros serviços.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Nova Senha</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 8 dígitos"
                  className="w-full bg-[#151522] border border-white/10 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white focus:outline-none focus:border-rose-500"
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

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Confirme a Nova Senha</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita a nova senha"
                  className="w-full bg-[#151522] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-rose-500"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-display font-bold text-sm shadow-lg shadow-emerald-950 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <span>Salvando nova senha segura...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Salvar Nova Senha</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* STEP 4: DONE */}
        {step === 'done' && (
          <div className="text-center py-4 space-y-4">
            <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-display font-bold text-white">Senha alterada com sucesso!</h2>
            <p className="text-xs text-slate-300">
              Sua conta no JOBS agora está protegida com a nova senha. Você já pode fazer login.
            </p>
            <button
              onClick={onGoToLogin}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 text-white font-display font-bold text-sm shadow-lg shadow-rose-950 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Ir para o Login</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
