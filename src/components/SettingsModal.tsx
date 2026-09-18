import React, { useRef, useState } from 'react';
import { 
  X, 
  Download, 
  Upload, 
  RotateCcw, 
  ShieldCheck, 
  HardDrive,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Eraser,
  Sparkles
} from 'lucide-react';
import { AppState } from '../types';
import { saveAppState, resetToDefaults, resetToZero } from '../utils/storage';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  appState: AppState;
  onStateUpdated: (newState: AppState) => void;
  isInstalled?: boolean;
  onOpenInstall?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  appState,
  onStateUpdated,
  isInstalled,
  onOpenInstall
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showConfirmZero, setShowConfirmZero] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState<string | null>(null);

  if (!isOpen) return null;

  // Export JSON backup
  const handleExportData = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(appState, null, 2));
    const downloadAnchor = document.createElement('a');
    const filename = `ansama_finanzas_backup_${new Date().toISOString().split('T')[0]}.json`;
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", filename);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Import JSON backup
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.accounts && parsed.transactions && parsed.categories) {
          saveAppState(parsed);
          onStateUpdated(parsed);
          setShowSuccessToast('Copia de seguridad restaurada correctamente con éxito.');
          setTimeout(() => {
            setShowSuccessToast(null);
            onClose();
          }, 1400);
        } else {
          alert('El archivo no contiene una copia válida de ANSAMA Finanzas.');
        }
      } catch (err) {
        alert('Error al leer el archivo JSON.');
      }
    };
    reader.readAsText(file);
  };

  // Reset to initial demo data
  const handleResetDefaults = () => {
    if (confirm('¿Estás seguro de que deseas restablecer todos los datos a la configuración inicial de fábrica (BBVA y Santander con datos de prueba)?')) {
      const defaultState = resetToDefaults();
      onStateUpdated(defaultState);
      setShowSuccessToast('Datos de prueba de BBVA y Santander restaurados.');
      setTimeout(() => {
        setShowSuccessToast(null);
        onClose();
      }, 1400);
    }
  };

  // Reset to 0 (all transactions removed, balances 0€)
  const handleExecuteResetToZero = () => {
    const zeroState = resetToZero(appState);
    onStateUpdated(zeroState);
    setShowConfirmZero(false);
    setShowSuccessToast('¡Aplicación puesta a 0! Ya puedes introducir tus propios saldos y movimientos.');
    setTimeout(() => {
      setShowSuccessToast(null);
      onClose();
    }, 1600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div 
        className="bg-white rounded-2xl border border-zinc-200 shadow-2xl max-w-lg w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 bg-zinc-50/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#0E6A3B] flex items-center justify-center border border-emerald-200/60">
              <HardDrive className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-950">Ajustes y Guardado Local</h3>
              <p className="text-[11px] text-zinc-500">Gestión de base de datos y copias de seguridad</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          
          {/* Notification Toast */}
          {showSuccessToast && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-900 flex items-center gap-2.5 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-[#0E6A3B] shrink-0" />
              <span>{showSuccessToast}</span>
            </div>
          )}

          {/* Privacy & Storage info */}
          <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200/90 text-xs text-zinc-600 leading-relaxed">
            <div className="flex items-center gap-1.5 font-bold text-zinc-900 mb-1">
              <ShieldCheck className="w-4 h-4 text-[#0E6A3B]" />
              Privacidad y Guardado Local Activo
            </div>
            Todos los datos patrimoniales, saldos bancarios y movimientos se almacenan exclusivamente de manera local en tu navegador (LocalStorage). Ningún dato financiero viaja a servidores externos no autorizados.
          </div>

          {/* Backup Actions */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
              Copia de Seguridad y Migración
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={handleExportData}
                className="flex items-center justify-center gap-2 p-3 text-xs font-bold text-zinc-800 bg-white border border-zinc-200 hover:bg-zinc-50 rounded-xl transition-all shadow-2xs cursor-pointer active:scale-98"
              >
                <Download className="w-4 h-4 text-zinc-900" />
                Exportar Copia (JSON)
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-2 p-3 text-xs font-bold text-zinc-800 bg-white border border-zinc-200 hover:bg-zinc-50 rounded-xl transition-all shadow-2xs cursor-pointer active:scale-98"
              >
                <Upload className="w-4 h-4 text-[#0E6A3B]" />
                Importar Copia
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImportFile}
                accept=".json"
                className="hidden"
              />
            </div>
          </div>

          {/* Start from Zero / Reset Section */}
          <div className="pt-4 border-t border-zinc-100 space-y-3">
            <h4 className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
              Inicialización y Restauración
            </h4>

            {/* Confirmation Box for Resetting to 0 */}
            {showConfirmZero ? (
              <div className="p-4 rounded-xl bg-amber-50/90 border border-amber-300 text-xs space-y-3 animate-in fade-in">
                <div className="flex items-start gap-2.5">
                  <div className="p-1.5 rounded-lg bg-amber-100 text-amber-900 shrink-0 mt-0.5">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="font-extrabold text-amber-950 text-sm">¿Confirmas que deseas dejar la aplicación a 0?</h5>
                    <p className="text-amber-800 mt-1 leading-relaxed">
                      Esta acción eliminará todos los movimientos registrados ({appState.transactions.length} registros) y pondrá el saldo de todas tus cuentas bancarias a <strong>0,00 €</strong>.
                    </p>
                    <p className="text-amber-900 font-semibold mt-1">
                      Podrás empezar inmediatamente a registrar tus datos y saldos reales desde cero.
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-amber-200/80">
                  <button
                    type="button"
                    onClick={() => setShowConfirmZero(false)}
                    className="px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-white/80 rounded-lg border border-zinc-300 transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleExecuteResetToZero}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Sí, poner todo a 0
                  </button>
                </div>
              </div>
            ) : (
              /* Button: Dejar aplicación a 0 */
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200/90">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <Eraser className="w-4 h-4 text-[#0E6A3B]" />
                    <span className="text-xs font-bold text-zinc-950">Dejar la aplicación a 0 (Mis Datos Reales)</span>
                  </div>
                  <p className="text-[11px] text-zinc-600 leading-relaxed">
                    Borra todos los movimientos y restablece los saldos a 0,00 € para empezar a meter tus datos.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowConfirmZero(true)}
                  className="px-3 py-2 text-xs font-bold text-white bg-[#0E6A3B] hover:bg-[#0a522d] rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0 active:scale-95"
                >
                  <Eraser className="w-3.5 h-3.5" />
                  Dejar a 0
                </button>
              </div>
            )}

            {/* Restablecer datos iniciales de prueba */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/80">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-zinc-800 block">Restablecer datos de prueba</span>
                <span className="text-[11px] text-zinc-500">Recarga los saldos y movimientos iniciales de demostración de BBVA y Santander.</span>
              </div>
              <button
                type="button"
                onClick={handleResetDefaults}
                className="px-3 py-1.5 text-xs font-bold text-zinc-700 bg-white border border-zinc-200 hover:bg-zinc-100 rounded-lg shadow-2xs cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5 text-zinc-500" />
                Restablecer
              </button>
            </div>

            {/* Actualizaciones Automáticas */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200/80">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#0E6A3B]"></span>
                  </span>
                  <span className="text-xs font-bold text-emerald-950">Actualización Automática Activa</span>
                </div>
                <span className="text-[11px] text-emerald-800/90 block">
                  La app busca nuevas versiones continuamente en segundo plano y te notifica en pantalla para actualizarse sola automáticamente sin perder ningún dato.
                </span>
              </div>
              <span className="text-[10px] font-extrabold uppercase px-2 py-1 rounded bg-[#0E6A3B] text-white self-start sm:self-center tracking-wider shrink-0">
                Automático
              </span>
            </div>

            {/* Instalación de la aplicación en PC / Escritorio (discreta) */}
            {!isInstalled && onOpenInstall && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-zinc-50/90 border border-zinc-200/80">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-zinc-800 block">Instalar en este ordenador (PC)</span>
                  <span className="text-[11px] text-zinc-500">Crea un acceso directo en el Escritorio y barra de tareas para abrir ANSAMA directamente.</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenInstall();
                  }}
                  className="px-3 py-1.5 text-xs font-bold text-[#0E6A3B] bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg shadow-2xs cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
                >
                  <Download className="w-3.5 h-3.5 text-[#0E6A3B]" />
                  Instalar en PC
                </button>
              </div>
            )}
          </div>

          <div className="flex justify-end pt-3 border-t border-zinc-100">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 rounded-xl cursor-pointer"
            >
              Cerrar
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
