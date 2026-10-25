import React, { useState } from 'react';
import {
  ShieldAlert,
  Calendar,
  Camera,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Lock,
  FileCheck2,
  Sparkles,
} from 'lucide-react';

interface Screen04AgeGateProps {
  onSuccess: (data: { birthDate: string; age: number; verifiedId: boolean }) => void;
  onExit: () => void;
}

export const Screen04AgeGate: React.FC<Screen04AgeGateProps> = ({
  onSuccess,
  onExit,
}) => {
  const [birthDate, setBirthDate] = useState('1998-05-14');
  const [step, setStep] = useState<'date' | 'biometric' | 'success'>('date');
  const [legalDeclaration, setLegalDeclaration] = useState(false);
  const [verificationMethod, setVerificationMethod] = useState<'facial' | 'document'>('facial');
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculateAge = (dateStr: string): number => {
    const today = new Date();
    const birth = new Date(dateStr);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const age = calculateAge(birthDate);

  const handleProceedToAudit = () => {
    setError(null);
    if (!birthDate) {
      setError('Por favor, informe sua data de nascimento.');
      return;
    }
    if (age < 18) {
      setError(`Acesso Negado: Você tem ${age} anos. A plataforma JOBS é estritamente restrita a maiores de 18 anos completos.`);
      return;
    }
    if (!legalDeclaration) {
      setError('Você deve confirmar a declaração legal de maioridade civil.');
      return;
    }
    setStep('biometric');
  };

  const handleSimulateScan = () => {
    setIsScanning(true);
    setError(null);

    setTimeout(() => {
      setIsScanning(false);
      setStep('success');

      setTimeout(() => {
        localStorage.setItem('jhobs_age_verified', 'true');
        localStorage.setItem('jhobs_user_birthdate', birthDate);
        onSuccess({ birthDate, age, verifiedId: true });
      }, 1200);
    }, 2200);
  };

  return (
    <div className="min-h-screen bg-[#07070a] text-slate-100 flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden">
      {/* Ambience */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[350px] bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-lg bg-[#0f0f17] border border-rose-900/50 rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10 text-center">
        {/* Step Indicator */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold text-xs">
              18+
            </div>
            <div className="text-left">
              <span className="font-display font-bold text-sm text-white">JOBS Segurança</span>
              <span className="block text-[10px] text-slate-400">Verificação de Idade & Proteção de Menores</span>
            </div>
          </div>
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30">
            Passo 2 de 4
          </span>
        </div>

        {error && (
          <div className="mb-5 p-3 rounded-xl bg-rose-950/70 border border-rose-700/60 flex items-start gap-2.5 text-xs text-rose-300 text-left">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1: BIRTHDATE & LEGAL DECLARATION */}
        {step === 'date' && (
          <div className="space-y-5">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <ShieldAlert className="w-7 h-7" />
            </div>

            <div>
              <h2 className="text-xl sm:text-2xl font-display font-bold text-white mb-1.5">
                Verificação Mandatória de Idade
              </h2>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Em cumprimento à legislação internacional e proteção integral a menores de idade, o JOBS é exclusivo para adultos (+18).
              </p>
            </div>

            <div className="text-left p-4 rounded-2xl bg-[#141420] border border-white/5 space-y-3">
              <label className="block text-xs font-semibold text-slate-300">
                Sua Data de Nascimento
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="w-full bg-[#1b1b2a] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              {birthDate && (
                <div className="flex items-center justify-between text-xs px-1">
                  <span className="text-slate-400">Idade calculada:</span>
                  <span className={`font-bold ${age >= 18 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {age} anos {age >= 18 ? '(Maior de idade)' : '(Menor de idade - Bloqueado)'}
                  </span>
                </div>
              )}
            </div>

            <label className="flex items-start gap-2.5 text-left cursor-pointer p-3 rounded-xl bg-slate-900/60 border border-white/5">
              <input
                type="checkbox"
                checked={legalDeclaration}
                onChange={(e) => setLegalDeclaration(e.target.checked)}
                className="mt-0.5 rounded border-slate-700 bg-slate-900 text-rose-600 focus:ring-rose-500 w-4 h-4"
              />
              <span className="text-xs text-slate-300 leading-tight">
                Declaro formalmente sob as penas da lei que tenho 18 anos ou mais e aceito a conferência biométrica ou documental para emissão do selo verificado.
              </span>
            </label>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={onExit}
                className="px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-xs font-semibold"
              >
                Cancelar & Sair
              </button>
              <button
                type="button"
                onClick={handleProceedToAudit}
                className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-display font-bold text-sm shadow-lg shadow-rose-950 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Avançar para Verificação</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: BIOMETRIC / DOCUMENT AUDIT */}
        {step === 'biometric' && (
          <div className="space-y-5">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Camera className="w-7 h-7" />
            </div>

            <div>
              <h2 className="text-xl sm:text-2xl font-display font-bold text-white mb-1.5">
                Conferência de Identidade e Idade
              </h2>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Para evitar contas falsas e proteger a comunidade, realize a checagem rápida com câmera ou documento oficial.
              </p>
            </div>

            {/* Methods selector */}
            <div className="grid grid-cols-2 gap-3 text-left">
              <button
                type="button"
                onClick={() => setVerificationMethod('facial')}
                className={`p-3.5 rounded-2xl border transition-all text-xs cursor-pointer ${
                  verificationMethod === 'facial'
                    ? 'bg-rose-500/15 border-rose-500 text-white shadow-lg shadow-rose-950'
                    : 'bg-[#141420] border-white/5 text-slate-400 hover:border-white/20'
                }`}
              >
                <div className="font-bold flex items-center gap-1.5 mb-1">
                  <Camera className="w-4 h-4 text-rose-400" />
                  <span>Selfie Biométrica</span>
                </div>
                <p className="text-[11px] text-slate-400">Validação instantânea por inteligência artificial.</p>
              </button>

              <button
                type="button"
                onClick={() => setVerificationMethod('document')}
                className={`p-3.5 rounded-2xl border transition-all text-xs cursor-pointer ${
                  verificationMethod === 'document'
                    ? 'bg-rose-500/15 border-rose-500 text-white shadow-lg shadow-rose-950'
                    : 'bg-[#141420] border-white/5 text-slate-400 hover:border-white/20'
                }`}
              >
                <div className="font-bold flex items-center gap-1.5 mb-1">
                  <FileCheck2 className="w-4 h-4 text-amber-400" />
                  <span>Documento Oficial</span>
                </div>
                <p className="text-[11px] text-slate-400">Envio de CNH, RG ou Passaporte com data legível.</p>
              </button>
            </div>

            {/* Scanner Graphic */}
            <div className="p-6 rounded-2xl bg-[#12121e] border border-white/10 relative overflow-hidden flex flex-col items-center justify-center">
              <div className="w-24 h-24 rounded-full border-2 border-dashed border-rose-500/50 flex items-center justify-center relative mb-3">
                <Camera className="w-10 h-10 text-rose-400" />
                {isScanning && (
                  <div className="absolute inset-0 rounded-full border-2 border-rose-400 animate-ping" />
                )}
              </div>

              <div className="text-xs font-semibold text-white mb-1">
                {isScanning
                  ? 'Auditando geometria facial e conferindo data de nascimento...'
                  : 'Câmera pronta para auditoria'}
              </div>
              <div className="text-[11px] text-slate-400">
                Seus dados biométricos são criptografados de ponta a ponta e nunca expostos publicamente.
              </div>
            </div>

            <button
              type="button"
              disabled={isScanning}
              onClick={handleSimulateScan}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white font-display font-bold text-sm shadow-lg shadow-rose-950 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isScanning ? (
                <span>Validando inteligência artificial...</span>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Realizar Verificação 18+ Agora</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* STEP 3: SUCCESS */}
        {step === 'success' && (
          <div className="py-6 space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <h2 className="text-2xl font-display font-bold text-white">
              Idade e Identidade Aprovadas!
            </h2>
            <p className="text-xs text-slate-300 max-w-sm mx-auto">
              Você recebeu o selo <span className="text-emerald-400 font-bold">Verificado +18</span> no JOBS. Redirecionando para a criação do seu perfil...
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
