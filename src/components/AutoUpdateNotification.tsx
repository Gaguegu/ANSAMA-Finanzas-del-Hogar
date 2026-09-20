import React from 'react';
import { RefreshCw, Sparkles, Pause, Play, ArrowRight, ShieldCheck, DownloadCloud } from 'lucide-react';

interface AutoUpdateNotificationProps {
  hasNewUpdate: boolean;
  countdown: number | null;
  isPaused: boolean;
  onApplyNow: () => void;
  onPause: () => void;
  onResume: () => void;
}

export const AutoUpdateNotification: React.FC<AutoUpdateNotificationProps> = ({
  hasNewUpdate,
  countdown,
  isPaused,
  onApplyNow,
  onPause,
  onResume,
}) => {
  if (!hasNewUpdate) return null;

  // Maximum countdown is 5 seconds for percentage calculation
  const totalSeconds = 5;
  const currentSec = countdown ?? 0;
  const progressPercent = isPaused
    ? 50
    : Math.max(0, Math.min(100, ((totalSeconds - currentSec) / totalSeconds) * 100));

  return (
    <div
      id="auto-update-floating-alert"
      className="fixed bottom-16 sm:bottom-6 right-3 sm:right-6 z-50 max-w-md w-[calc(100vw-1.5rem)] sm:w-auto animate-in slide-in-from-bottom-5 duration-300 pointer-events-auto"
      role="alert"
      aria-live="assertive"
    >
      <div className="bg-[#092B19] text-white rounded-2xl p-4 sm:p-5 shadow-2xl border-2 border-emerald-400/90 ring-4 ring-emerald-950/20 backdrop-blur-md">
        
        {/* Cabecera con indicación de actualización automática */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center text-emerald-300 shrink-0">
              <DownloadCloud className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-400 text-[#092B19] px-2 py-0.5 rounded-md font-sans">
                  Descarga Automática
                </span>
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                </span>
              </div>
              <h4 className="text-sm sm:text-base font-black text-white mt-1">
                ¡Nueva actualización disponible!
              </h4>
            </div>
          </div>
        </div>

        {/* Mensaje descriptivo con indicación clara */}
        <div className="mt-3 text-xs text-emerald-100/90 leading-relaxed space-y-1.5">
          <p>
            Se ha detectado una nueva versión del sistema con mejoras. 
            {isPaused ? (
              <strong className="text-amber-300 block mt-0.5">
                La descarga automática está en pausa. Puedes continuar cuando lo desees.
              </strong>
            ) : (
              <span className="block mt-0.5 font-medium">
                Se descargará e instalará automáticamente en{' '}
                <strong className="text-emerald-300 text-sm font-black font-feature-settings-tnum bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-500/40">
                  {currentSec}s
                </strong>
                ...
              </span>
            )}
          </p>
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-300/80">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Tus datos, cuentas y movimientos guardados se mantendrán intactos.</span>
          </div>
        </div>

        {/* Barra de progreso de descarga automática */}
        <div className="mt-3.5">
          <div className="w-full bg-emerald-950/80 rounded-full h-2 overflow-hidden border border-emerald-800">
            <div
              className={`h-full transition-all duration-1000 ease-linear rounded-full ${
                isPaused ? 'bg-amber-400' : 'bg-gradient-to-r from-emerald-400 to-emerald-300'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Botones de acción manual independiente */}
        <div className="mt-4 pt-3 border-t border-emerald-800/80 flex items-center justify-between gap-2">
          {isPaused ? (
            <button
              type="button"
              onClick={onResume}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-200 hover:text-white bg-white/10 hover:bg-white/20 rounded-xl transition-colors cursor-pointer"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Reanudar descarga</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onPause}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-200 hover:text-white bg-white/10 hover:bg-white/20 rounded-xl transition-colors cursor-pointer"
              title="Pausar unos momentos si estás escribiendo"
            >
              <Pause className="w-3.5 h-3.5" />
              <span>Pausar</span>
            </button>
          )}

          <button
            type="button"
            onClick={onApplyNow}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-black text-[#092B19] bg-emerald-400 hover:bg-emerald-300 active:scale-95 rounded-xl shadow-md transition-all cursor-pointer"
          >
            <span>Actualizar ahora</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>
    </div>
  );
};
