import React, { useState } from 'react';
import { ShieldAlert, Check, AlertTriangle, Calendar, Camera, CheckCircle2, Lock, ArrowRight } from 'lucide-react';
import { trackEvent } from '../utils/analytics';

interface AgeGateModalProps {
  onConfirm: (verifiedData: { birthDate: string; age: number }) => void;
}

export const AgeGateModal: React.FC<AgeGateModalProps> = ({ onConfirm }) => {
  const [step, setStep] = useState<'info' | 'birthdate' | 'biometric'>('info');
  const [birthDate, setBirthDate] = useState('2000-01-01');
  const [calculatedAge, setCalculatedAge] = useState<number | null>(null);
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);

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

  const handleDateChange = (val: string) => {
    setBirthDate(val);
    const age = calculateAge(val);
    setCalculatedAge(age);
    if (age < 18) {
      setErrorMessage(`Acesso Bloqueado: você tem ${age} anos. Apenas maiores de 18 anos completos são autorizados.`);
    } else {
      setErrorMessage(null);
    }
  };

  const handleProceedToBiometric = () => {
    const age = calculateAge(birthDate);
    if (age < 18) {
      setErrorMessage(`Acesso Proibido: Você tem apenas ${age} anos. É crime para menores de 18 anos acessar conteúdo adulto.`);
      return;
    }
    if (!agreedTerms) {
      setErrorMessage('Você deve marcar a caixa concordando com os Termos de Uso e maioridade legal.');
      return;
    }
    setStep('biometric');
  };

  const handleSimulateScan = () => {
    setIsScanning(true);
    setErrorMessage(null);

    setTimeout(() => {
      setIsScanning(false);
      setScanComplete(true);
      trackEvent('user_registration_18_verified', { age: calculatedAge || 24 });
      
      setTimeout(() => {
        const finalAge = calculateAge(birthDate);
        localStorage.setItem('jhobs_age_verified', 'true');
        localStorage.setItem('jhobs_user_birthdate', birthDate);
        onConfirm({ birthDate, age: finalAge });
      }, 1200);
    }, 2000);
  };

  const handleExit = () => {
    window.location.href = 'https://www.google.com';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/95 backdrop-blur-2xl">
      <div className="relative w-full max-w-lg p-6 sm:p-8 bg-[#12121a] border border-rose-900/60 rounded-3xl shadow-2xl text-center overflow-hidden">
        {/* Glow Accent */}
        <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-48 h-48 bg-rose-600/20 rounded-full blur-3xl pointer-events-none" />

        {/* STEP 1: WELCOME & REGISTRATION EXPLANATION */}
        {step === 'info' && (
          <div className="space-y-4">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-rose-500/20 to-amber-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <ShieldAlert className="w-8 h-8" />
            </div>

            <div className="inline-block px-3 py-1 text-xs font-semibold tracking-wider text-rose-400 uppercase bg-rose-950/60 border border-rose-800/40 rounded-full">
              Registro Obrigatório +18 Anos
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Acesso Restrito ao <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-amber-400">Jhobs</span>
            </h1>

            <div className="text-left bg-slate-900/80 p-4 rounded-2xl border border-rose-900/50 space-y-2">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-xs uppercase tracking-wider">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Aviso Legal Rigoroso & Lei Vigente</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Esta plataforma segue a lei vigente dos países onde o aplicativo é baixado. É expressamente proibido menores de 18 anos fazer uso da plataforma.
              </p>
              <div className="p-2.5 rounded-xl bg-rose-950/70 border border-rose-800/60 text-[11px] text-rose-200 font-medium leading-relaxed">
                ⚖️ <strong>Tolerância Zero:</strong> Em qualquer ocasião que estiver a presença de menores de idade, o usuário será bloqueado e banido da plataforma e todo o seu saldo será transferido para a carteira do Jobs.
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={handleExit}
                className="w-full sm:w-1/3 py-3 px-4 text-xs font-semibold text-slate-400 bg-slate-900/60 hover:bg-slate-800 border border-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                Sair do Site
              </button>
              <button
                onClick={() => setStep('birthdate')}
                className="w-full sm:w-2/3 py-3 px-4 text-sm font-bold text-white bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 rounded-xl shadow-lg shadow-rose-950/50 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Verificar Minha Idade</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: MANDATORY BIRTHDATE CHECK */}
        {step === 'birthdate' && (
          <div className="space-y-4 text-left">
            <div className="text-center mb-3">
              <div className="w-12 h-12 mx-auto rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-2">
                <Calendar className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-white">Etapa 1: Data de Nascimento</h2>
              <p className="text-xs text-slate-400">Informe sua data real de nascimento para cálculo de maioridade</p>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Data de Nascimento (DD/MM/AAAA)
              </label>
              <input
                type="date"
                required
                max={new Date().toISOString().split('T')[0]}
                value={birthDate}
                onChange={(e) => handleDateChange(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white font-mono outline-none focus:border-rose-500"
              />
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreedTerms}
                  onChange={(e) => {
                    setAgreedTerms(e.target.checked);
                    if (e.target.checked) setErrorMessage(null);
                  }}
                  className="mt-1 w-4 h-4 rounded border-slate-700 bg-slate-800 text-rose-600 focus:ring-rose-500 cursor-pointer"
                />
                <span className="text-xs text-slate-300 leading-snug">
                  Declaro sob as penas da lei que <strong>tenho 18 anos ou mais</strong>, que as informações fornecidas são verídicas e concordo com os Termos de Uso do Jhobs.
                </span>
              </label>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-xs text-rose-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setStep('info')}
                className="w-1/3 py-3 px-4 text-xs font-semibold text-slate-400 bg-slate-900/60 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                Voltar
              </button>
              <button
                onClick={handleProceedToBiometric}
                className="w-2/3 py-3 px-4 text-xs font-bold text-white bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-rose-950"
              >
                <span>Avançar para Biometria</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: BIOMETRIC / SELFIE VALIDATION SIMULATOR */}
        {step === 'biometric' && (
          <div className="space-y-4">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Camera className="w-8 h-8" />
            </div>

            <h2 className="text-xl font-bold text-white">Etapa 2: Validação Facial 18+</h2>
            <p className="text-xs text-slate-300 max-w-sm mx-auto">
              Simulação de biometria facial para atestar a idade e conceder o selo <strong>Verificado +18</strong>.
            </p>

            <div className="relative aspect-video w-full max-w-xs mx-auto rounded-2xl bg-slate-900 border-2 border-dashed border-slate-700 flex flex-col items-center justify-center p-4 overflow-hidden">
              {isScanning ? (
                <div className="space-y-2 text-center">
                  <div className="w-10 h-10 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  <span className="text-xs text-amber-300 font-mono animate-pulse block">
                    Escaneando biometria facial...
                  </span>
                </div>
              ) : scanComplete ? (
                <div className="space-y-1 text-center">
                  <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto animate-bounce" />
                  <span className="text-xs text-emerald-300 font-bold block">
                    Idade Confirmada: +18 Anos!
                  </span>
                </div>
              ) : (
                <div className="space-y-2 text-center">
                  <Lock className="w-8 h-8 text-slate-500 mx-auto" />
                  <span className="text-xs text-slate-400 block">
                    Pronto para validação instantânea
                  </span>
                </div>
              )}

              {/* Laser scan animation bar */}
              {isScanning && (
                <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-rose-500 to-transparent animate-pulse top-1/2" />
              )}
            </div>

            {!scanComplete && (
              <button
                onClick={handleSimulateScan}
                disabled={isScanning}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 text-slate-950 font-extrabold text-xs transition-all shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                <span>{isScanning ? 'Validando...' : 'Iniciar Escaneamento Facial 18+'}</span>
              </button>
            )}

            {scanComplete && (
              <div className="text-xs text-emerald-400 font-semibold flex items-center justify-center gap-1.5 animate-fade-in">
                <Check className="w-4 h-4" />
                <span>Cadastro autorizado! Acessando o Jhobs...</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
