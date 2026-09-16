import React from 'react';
import { Download, Monitor, Smartphone, Apple, X, CheckCircle2 } from 'lucide-react';

interface InstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInstallDirectly: () => Promise<boolean>;
  canPromptDirectly: boolean;
}

export const InstallModal: React.FC<InstallModalProps> = ({
  isOpen,
  onClose,
  onInstallDirectly,
  canPromptDirectly,
}) => {
  if (!isOpen) return null;

  const handleInstallClick = async () => {
    const success = await onInstallDirectly();
    if (success) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 bg-zinc-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white border border-emerald-100 p-1 flex items-center justify-center shadow-xs overflow-hidden">
              <img 
                src="./logo.jpg" 
                alt="Logo ANSAMA" 
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-950">Instalar ANSAMA</h3>
              <p className="text-xs text-zinc-500">Úsala como aplicación nativa en tu PC o móvil</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="p-3.5 rounded-xl bg-emerald-50/80 border border-emerald-200 text-xs text-emerald-950 leading-relaxed">
            <p className="font-bold flex items-center gap-1.5 text-emerald-900 mb-1">
              <CheckCircle2 className="w-4 h-4 text-[#0E6A3B] shrink-0" />
              Ventajas de instalar la aplicación
            </p>
            Acceso directo desde tu escritorio o barra de tareas, pantalla completa sin barras de navegador, inicio instantáneo y funcionamiento sin conexión para tus datos guardados.
          </div>

          {canPromptDirectly && (
            <button
              onClick={handleInstallClick}
              className="w-full py-2.5 px-4 bg-[#0E6A3B] hover:bg-[#0a522d] text-white text-sm font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              <Download className="w-4 h-4" />
              Instalar Ahora en este Equipo
            </button>
          )}

          <div className="space-y-3 pt-1">
            <h4 className="text-xs font-bold text-zinc-800 uppercase tracking-wider">
              Instrucciones por dispositivo:
            </h4>

            {/* PC */}
            <div className="flex gap-3 items-start p-2.5 rounded-xl border border-zinc-100 bg-zinc-50/50">
              <div className="w-8 h-8 rounded-lg bg-zinc-900 text-white flex items-center justify-center shrink-0 mt-0.5">
                <Monitor className="w-4 h-4" />
              </div>
              <div className="text-xs text-zinc-700">
                <strong className="block text-zinc-900 font-semibold mb-0.5">En Ordenador (Windows / Mac)</strong>
                En Google Chrome o Microsoft Edge, pulsa el icono de instalar (una pantalla con flecha hacia abajo) que aparece en el extremo derecho de la barra de direcciones, o haz clic en los 3 puntos del navegador &gt; <em>Instalar ANSAMA</em>.
              </div>
            </div>

            {/* Android */}
            <div className="flex gap-3 items-start p-2.5 rounded-xl border border-zinc-100 bg-zinc-50/50">
              <div className="w-8 h-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center shrink-0 mt-0.5">
                <Smartphone className="w-4 h-4" />
              </div>
              <div className="text-xs text-zinc-700">
                <strong className="block text-zinc-900 font-semibold mb-0.5">En Teléfono Android</strong>
                Abre el menú de tres puntos verticales arriba a la derecha en Chrome y selecciona <strong>«Instalar aplicación»</strong> o <strong>«Añadir a pantalla de inicio»</strong>.
              </div>
            </div>

            {/* iPhone / iPad */}
            <div className="flex gap-3 items-start p-2.5 rounded-xl border border-zinc-100 bg-zinc-50/50">
              <div className="w-8 h-8 rounded-lg bg-zinc-700 text-white flex items-center justify-center shrink-0 mt-0.5">
                <Apple className="w-4 h-4" />
              </div>
              <div className="text-xs text-zinc-700">
                <strong className="block text-zinc-900 font-semibold mb-0.5">En iPhone / iPad (Safari)</strong>
                Toca el botón <strong>Compartir</strong> (icono de cuadrado con flecha hacia arriba en la barra de Safari) y pulsa en <strong>«Añadir a pantalla de inicio»</strong>.
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-zinc-50 border-t border-zinc-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-200/70 rounded-xl transition-colors cursor-pointer"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
