import React from 'react';
import { Download, Monitor, Smartphone, Apple, X, CheckCircle2, ExternalLink, AlertCircle } from 'lucide-react';

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

  const isInIframe = typeof window !== 'undefined' && window.self !== window.top;

  const handleInstallClick = async () => {
    const success = await onInstallDirectly();
    if (success) {
      onClose();
    }
  };

  const handleOpenInNewTab = () => {
    window.open(window.location.href, '_blank');
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden"
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
              <h3 className="text-base font-bold text-zinc-950">Instalar ANSAMA en tu PC</h3>
              <p className="text-xs text-zinc-500">Crear acceso directo en el Escritorio y Barra de Tareas</p>
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
        <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Iframe Notice & Action */}
          {isInIframe && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-950 space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-amber-900">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Atención: Estás en la vista previa embebida</span>
              </div>
              <p className="leading-relaxed">
                Los navegadores (Chrome, Edge) <strong>bloquean la creación de accesos directos desde dentro de un marco de vista previa</strong> por seguridad. Para instalarla en tu PC y que aparezca el icono en tu Escritorio, debes abrir la aplicación en su pestaña directa:
              </p>
              <button
                onClick={handleOpenInNewTab}
                className="w-full py-2.5 px-4 bg-[#0E6A3B] hover:bg-[#0a522d] text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <ExternalLink className="w-4 h-4" />
                Abrir en Pestaña Directa para Instalar
              </button>
            </div>
          )}

          {!isInIframe && canPromptDirectly && (
            <button
              onClick={handleInstallClick}
              className="w-full py-2.5 px-4 bg-[#0E6A3B] hover:bg-[#0a522d] text-white text-sm font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              <Download className="w-4 h-4" />
              Instalar Ahora en este Equipo
            </button>
          )}

          <div className="p-3 rounded-xl bg-emerald-50/80 border border-emerald-200 text-xs text-emerald-950 leading-relaxed">
            <p className="font-bold flex items-center gap-1.5 text-emerald-900 mb-1">
              <CheckCircle2 className="w-4 h-4 text-[#0E6A3B] shrink-0" />
              ¿Qué hace la instalación?
            </p>
            Crea un acceso directo en el <strong>Escritorio</strong> de Windows y en el <strong>Menú Inicio</strong>, se ejecuta en una ventana propia sin barras de navegador y guarda los datos en tu disco.
          </div>

          {/* Guía infalible para crear el acceso directo en Chrome / Edge */}
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 space-y-2.5">
            <div className="flex items-center gap-1.5 font-bold text-emerald-900">
              <Monitor className="w-4 h-4 text-[#0E6A3B] shrink-0" />
              <span>Cómo crear el Acceso Directo en el Escritorio desde Chrome:</span>
            </div>
            <p className="leading-relaxed text-zinc-700">
              Si tienes otra aplicación de ANSAMA (como el Comparador) en el mismo dominio o no te salta el aviso automático, puedes crear el icono en tu escritorio directamente desde el menú de Chrome:
            </p>
            <div className="bg-white p-3 rounded-lg border border-emerald-100 space-y-2 text-zinc-800 shadow-xs">
              <p className="flex items-start gap-2">
                <span className="font-bold text-[#0E6A3B]">Paso 1:</span>
                <span>En la pestaña de ANSAMA Finanzas, pulsa en los <strong>3 puntos verticales (⋮)</strong> arriba a la derecha en Chrome.</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="font-bold text-[#0E6A3B]">Paso 2:</span>
                <span>Ve a <strong>«Guardar y compartir»</strong> (o «Más herramientas») y haz clic en <strong>«Crear acceso directo...»</strong> o <strong>«Instalar página como aplicación...»</strong>.</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="font-bold text-[#0E6A3B]">Paso 3:</span>
                <span>En la ventanita que aparece, asegúrate de marcar la casilla <strong>«Abrir como ventana»</strong> y pulsa en <strong>Crear</strong> (o Instalar).</span>
              </p>
            </div>
            <p className="text-[11px] text-emerald-800 font-medium">
              ✓ Windows creará inmediatamente el icono con el logo en tu Escritorio y funcionará como una aplicación nativa de PC.
            </p>
          </div>

          <div className="space-y-3 pt-1">
            <h4 className="text-xs font-bold text-zinc-800 uppercase tracking-wider">
              Pasos para instalar en PC (Google Chrome o Microsoft Edge):
            </h4>

            {/* PC Pasos detallados */}
            <div className="p-3.5 rounded-xl border border-zinc-200 bg-zinc-50/80 space-y-2.5">
              <div className="flex gap-2.5 items-start text-xs text-zinc-700">
                <span className="w-5 h-5 rounded-full bg-zinc-900 text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">1</span>
                <div>
                  Abre la aplicación en una pestaña directa de <strong>Google Chrome</strong> o <strong>Microsoft Edge</strong>.
                </div>
              </div>

              <div className="flex gap-2.5 items-start text-xs text-zinc-700">
                <span className="w-5 h-5 rounded-full bg-zinc-900 text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">2</span>
                <div>
                  En el extremo derecho de la <strong>barra de direcciones web</strong> (arriba, donde se escribe la URL), busca el icono de <strong>un ordenador con una flecha hacia abajo</strong> o el símbolo <strong>+</strong> («Instalar ANSAMA Finanzas del Hogar»).
                </div>
              </div>

              <div className="flex gap-2.5 items-start text-xs text-zinc-700">
                <span className="w-5 h-5 rounded-full bg-zinc-900 text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">3</span>
                <div>
                  <em>Alternativa:</em> Pulsa en los <strong>3 puntos verticales</strong> del menú del navegador arriba a la derecha &gt; <strong>«Guardar y compartir»</strong> (o «Aplicaciones») &gt; <strong>«Instalar ANSAMA...»</strong>.
                </div>
              </div>

              <div className="flex gap-2.5 items-start text-xs text-zinc-700">
                <span className="w-5 h-5 rounded-full bg-[#0E6A3B] text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">✓</span>
                <div>
                  Marca la casilla <strong>«Crear acceso directo en el escritorio»</strong> y pulsa en <strong>Instalar</strong>. El acceso directo aparecerá inmediatamente en tu escritorio de Windows.
                </div>
              </div>
            </div>

            {/* Móvil Android / iOS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <div className="p-2.5 rounded-xl border border-zinc-100 bg-zinc-50/50 text-xs">
                <strong className="block text-zinc-900 font-semibold mb-1 flex items-center gap-1">
                  <Smartphone className="w-3.5 h-3.5 text-emerald-700" />
                  En Teléfono Android
                </strong>
                Menú de 3 puntos en Chrome &gt; «Instalar aplicación» o «Añadir a pantalla de inicio».
              </div>

              <div className="p-2.5 rounded-xl border border-zinc-100 bg-zinc-50/50 text-xs">
                <strong className="block text-zinc-900 font-semibold mb-1 flex items-center gap-1">
                  <Apple className="w-3.5 h-3.5 text-zinc-700" />
                  En iPhone / iPad
                </strong>
                Botón Compartir en Safari &gt; «Añadir a pantalla de inicio».
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-zinc-50 border-t border-zinc-100 flex items-center justify-between">
          <span className="text-[11px] text-zinc-400">PWA Manifest v1.2</span>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-200/70 rounded-xl transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
