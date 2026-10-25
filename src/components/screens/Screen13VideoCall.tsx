import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  ShieldAlert,
  Sparkles,
  Camera,
  RotateCcw,
  Volume2,
} from 'lucide-react';
import { Profile } from '../../types';

interface Screen13VideoCallProps {
  partner: Profile;
  onEndCall: () => void;
  onReport: (partner: Profile) => void;
}

export const Screen13VideoCall: React.FC<Screen13VideoCallProps> = ({
  partner,
  onEndCall,
  onReport,
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [hasCameraPermission, setHasCameraPermission] = useState(false);
  const localVideoRef = useRef<HTMLVideoElement>(null);

  // Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Attempt real local webcam stream
  useEffect(() => {
    let localStream: MediaStream | null = null;
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia && !isVideoOff) {
      navigator.mediaDevices
        .getUserMedia({ video: true, audio: true })
        .then((stream) => {
          localStream = stream;
          setHasCameraPermission(true);
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }
        })
        .catch(() => {
          setHasCameraPermission(false);
        });
    }

    return () => {
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isVideoOff]);

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col justify-between overflow-hidden select-none">
      {/* Partner Main Video / Stream Container */}
      <div className="absolute inset-0 z-0">
        <img
          src={partner.avatar || partner.photos[0]}
          alt={partner.name}
          className="w-full h-full object-cover filter brightness-90"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/60 pointer-events-none" />
      </div>

      {/* Top Floating Header */}
      <div className="relative z-20 p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full p-0.5 bg-rose-500 border border-white/20 overflow-hidden shadow-lg">
            <img
              src={partner.avatar}
              alt={partner.name}
              className="w-full h-full rounded-full object-cover"
            />
          </div>
          <div>
            <div className="font-display font-bold text-base text-white flex items-center gap-2">
              <span>{partner.name}</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <div className="text-xs text-rose-300 font-mono font-semibold">
              Chamada Privativa • {formatDuration(callDuration)}
            </div>
          </div>
        </div>

        <button
          onClick={() => onReport(partner)}
          className="px-3 py-1.5 rounded-xl bg-black/60 hover:bg-rose-950/80 text-rose-300 text-xs font-semibold flex items-center gap-1.5 border border-white/10 backdrop-blur-md transition-colors cursor-pointer"
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>Denunciar</span>
        </button>
      </div>

      {/* Local User PiP Video Preview (Bottom Right) */}
      <div className="absolute top-20 right-4 z-20 w-32 h-44 sm:w-40 sm:h-56 rounded-2xl overflow-hidden border-2 border-white/20 bg-slate-900 shadow-2xl">
        {!isVideoOff && hasCameraPermission ? (
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover transform -scale-x-100"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center bg-slate-950">
            <VideoOff className="w-6 h-6 text-slate-500 mb-1" />
            <span className="text-[10px] text-slate-400">
              {isVideoOff ? 'Câmera Desligada' : 'Simulação de Vídeo'}
            </span>
          </div>
        )}
        <div className="absolute bottom-1 left-2 text-[9px] font-bold text-white bg-black/60 px-1.5 py-0.5 rounded">
          Você
        </div>
      </div>

      {/* Bottom Floating Controls Bar */}
      <div className="relative z-20 p-6 flex flex-col items-center gap-4">
        {/* Connection Safety Tag */}
        <div className="px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-[11px] text-slate-300 border border-white/10 flex items-center gap-1.5">
          <Sparkles className="w-3 h-3 text-amber-400" />
          <span>Transmissão P2P com criptografia segura</span>
        </div>

        <div className="flex items-center gap-4">
          {/* Mute Mic */}
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`w-14 h-14 rounded-full flex items-center justify-center backdrop-blur-md shadow-xl transition-all cursor-pointer ${
              isMuted
                ? 'bg-rose-600 text-white'
                : 'bg-white/20 text-white hover:bg-white/30 border border-white/20'
            }`}
            title={isMuted ? 'Ativar microfone' : 'Silenciar'}
          >
            {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </button>

          {/* End Call Button */}
          <button
            onClick={onEndCall}
            className="w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-2xl shadow-rose-900 transition-transform active:scale-90 cursor-pointer"
            title="Encerrar chamada de vídeo"
          >
            <PhoneOff className="w-7 h-7" />
          </button>

          {/* Toggle Video */}
          <button
            onClick={() => setIsVideoOff(!isVideoOff)}
            className={`w-14 h-14 rounded-full flex items-center justify-center backdrop-blur-md shadow-xl transition-all cursor-pointer ${
              isVideoOff
                ? 'bg-rose-600 text-white'
                : 'bg-white/20 text-white hover:bg-white/30 border border-white/20'
            }`}
            title={isVideoOff ? 'Ligar câmera' : 'Desligar câmera'}
          >
            {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
          </button>
        </div>
      </div>
    </div>
  );
};
