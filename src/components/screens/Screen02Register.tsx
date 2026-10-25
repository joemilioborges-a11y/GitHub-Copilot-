import React, { useState } from 'react';
import {
  ShieldAlert,
  Lock,
  Mail,
  User,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

import { authService } from '../../utils/authService';

interface Screen02RegisterProps {
  onSuccess: (userData: { email: string; username: string }) => void;
  onGoToLogin: () => void;
  onOpenTerms: () => void;
}

export const Screen02Register: React.FC<Screen02RegisterProps> = ({
  onSuccess,
  onGoToLogin,
  onOpenTerms,
}) => {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isAge18, setIsAge18] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Password strength calculation
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: 'Muito fraca', color: 'bg-slate-700' };
    let score = 0;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;

    if (score <= 1) return { score: 25, label: 'Fraca', color: 'bg-red-500' };
    if (score === 2) return { score: 50, label: 'Razoável', color: 'bg-amber-500' };
    if (score === 3) return { score: 75, label: 'Boa', color: 'bg-blue-500' };
    return { score: 100, label: 'Excelente & Segura', color: 'bg-emerald-500' };
  };

  const strength = getPasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !username || !password || !confirmPassword) {
      setError('Por favor, preencha todos os campos obrigatórios.');
      return;
    }
    if (!email.includes('@') || !email.includes('.')) {
      setError('Insira um endereço de e-mail válido.');
      return;
    }
    if (username.length < 3) {
      setError('O nome de usuário deve ter pelo menos 3 caracteres.');
      return;
    }
    if (password.length < 8) {
      setError('A senha deve possuir no mínimo 8 caracteres para sua segurança.');
      return;
    }
    if (password !== confirmPassword) {
      setError('As senhas não coincidem. Verifique a digitação.');
      return;
    }
    if (!isAge18) {
      setError('Você deve confirmar expressamente que tem 18 anos ou mais.');
      return;
    }
    if (!acceptTerms) {
      setError('É obrigatório aceitar os Termos de Uso e a Política de Privacidade LGPD.');
      return;
    }

    setLoading(true);
    try {
      const res = await authService.register(email, username, password);
      setLoading(false);
      if (!res.success) {
        setError(res.error || 'Erro ao criar conta. Tente novamente.');
        return;
      }
      onSuccess({ email: res.account!.email, username: res.account!.username });
    } catch (err) {
      setLoading(false);
      setError('Erro de conexão ao processar credenciais seguras.');
    }
  };

  return (
    <div className="min-h-screen bg-[#07070a] text-slate-100 flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-[#0f0f17] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10">
        {/* Brand Icon */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-600 to-amber-400 p-[2px]">
              <div className="w-full h-full bg-[#0d0d14] rounded-[9px] flex items-center justify-center font-display font-black text-white text-base">
                J
              </div>
            </div>
            <div>
              <span className="font-display font-bold text-xl text-white">JOBS</span>
              <span className="block text-[10px] text-slate-400 uppercase tracking-wider">Novo Cadastro</span>
            </div>
          </div>
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
            Passo 1 de 4
          </span>
        </div>

        <h2 className="text-2xl font-display font-bold text-white mb-1">Crie sua conta exclusiva</h2>
        <p className="text-xs text-slate-400 mb-6">
          Ambiente seguro com criptografia e validação estrita +18 anos.
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/60 border border-rose-700/50 flex items-start gap-2.5 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* E-mail */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">E-mail pessoal</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu.email@exemplo.com"
                className="w-full bg-[#151522] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 transition-colors"
                required
              />
            </div>
          </div>

          {/* Nome de usuário exclusivo */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Nome de usuário exclusivo</label>
            <div className="relative">
              <span className="text-slate-500 font-bold absolute left-3.5 top-1/2 -translate-y-1/2 text-sm">@</span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9._]/g, ''))}
                placeholder="seu_usuario_jobs"
                className="w-full bg-[#151522] border border-white/10 rounded-xl pl-8 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 transition-colors"
                required
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Identificador único no app JOBS (letras, números e sublinhado).</p>
          </div>

          {/* Senha */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Senha de acesso</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 8 dígitos, maiúsculas e símbolos"
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

            {/* Strength Meter */}
            {password && (
              <div className="mt-2 space-y-1">
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>Força da senha:</span>
                  <span className="font-semibold text-white">{strength.label}</span>
                </div>
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${strength.color} transition-all duration-300`}
                    style={{ width: `${strength.score}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Confirmação de Senha */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Confirme a senha</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita sua senha"
                className="w-full bg-[#151522] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 transition-colors"
                required
              />
            </div>
          </div>

          {/* Checkbox 18+ */}
          <div className="pt-2 border-t border-white/5 space-y-3">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={isAge18}
                onChange={(e) => setIsAge18(e.target.checked)}
                className="mt-0.5 rounded border-slate-700 bg-slate-900 text-rose-600 focus:ring-rose-500 w-4 h-4"
              />
              <span className="text-xs text-slate-300 leading-tight">
                Declaro sob as penas da lei que tenho <strong>18 anos ou mais</strong> e compreendo que a verificação de idade será auditada.
              </span>
            </label>

            {/* Checkbox Termos & LGPD */}
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                className="mt-0.5 rounded border-slate-700 bg-slate-900 text-rose-600 focus:ring-rose-500 w-4 h-4"
              />
              <span className="text-xs text-slate-300 leading-tight">
                Li e concordo com os{' '}
                <button
                  type="button"
                  onClick={onOpenTerms}
                  className="text-rose-400 underline font-semibold hover:text-rose-300"
                >
                  Termos de Uso
                </button>{' '}
                e a{' '}
                <button
                  type="button"
                  onClick={onOpenTerms}
                  className="text-rose-400 underline font-semibold hover:text-rose-300"
                >
                  Política de Privacidade (LGPD)
                </button>
                .
              </span>
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-display font-bold text-sm shadow-lg shadow-rose-950 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <span>Validando credenciais seguras...</span>
            ) : (
              <>
                <span>Avançar para Verificação</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-400">
          Já possui uma conta no JOBS?{' '}
          <button
            onClick={onGoToLogin}
            className="text-rose-400 font-semibold hover:underline cursor-pointer"
          >
            Fazer Login
          </button>
        </div>
      </div>
    </div>
  );
};
