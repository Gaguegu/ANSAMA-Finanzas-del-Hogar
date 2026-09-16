import React, { useRef } from 'react';
import { 
  X, 
  Download, 
  Upload, 
  RotateCcw, 
  ShieldCheck, 
  HardDrive,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { AppState } from '../types';
import { saveAppState, resetToDefaults } from '../utils/storage';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  appState: AppState;
  onStateUpdated: (newState: AppState) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  appState,
  onStateUpdated
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

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
          alert('Copia de seguridad restaurada correctamente con éxito.');
          onClose();
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
  const handleReset = () => {
    if (confirm('¿Estás seguro de que deseas restablecer todos los datos a la configuración inicial de fábrica (BBVA y Santander)?')) {
      const defaultState = resetToDefaults();
      onStateUpdated(defaultState);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div 
        className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-blue-600" />
            <h3 className="text-base font-bold text-slate-900">Ajustes y Guardado Local</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          
          {/* Privacy & Storage info */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 leading-relaxed">
            <div className="flex items-center gap-1.5 font-bold text-slate-900 mb-1">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Privacidad y Guardado Local Activo
            </div>
            Todos los datos patrimoniales, saldos bancarios y movimientos se almacenan exclusivamente de manera local en tu navegador (LocalStorage). Ningún dato financiero viaja a servidores externos no autorizados.
          </div>

          {/* Backup Actions */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Copia de Seguridad y Migración
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={handleExportData}
                className="flex items-center justify-center gap-2 p-3 text-xs font-bold text-slate-800 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-all shadow-xs cursor-pointer"
              >
                <Download className="w-4 h-4 text-blue-600" />
                Exportar Copia (JSON)
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-2 p-3 text-xs font-bold text-slate-800 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-all shadow-xs cursor-pointer"
              >
                <Upload className="w-4 h-4 text-emerald-600" />
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

          {/* Danger Zone: Reset */}
          <div className="pt-4 border-t border-slate-100">
            <h4 className="text-xs font-bold text-rose-800 uppercase tracking-wider mb-2">
              Zona de Restauración
            </h4>
            <div className="flex items-center justify-between p-3 rounded-xl bg-rose-50/60 border border-rose-100">
              <div>
                <span className="text-xs font-bold text-rose-950 block">Restablecer datos iniciales</span>
                <span className="text-[11px] text-rose-700">Recarga los saldos de prueba de BBVA y Santander</span>
              </div>
              <button
                onClick={handleReset}
                className="px-3 py-1.5 text-xs font-bold text-rose-700 bg-white border border-rose-200 hover:bg-rose-50 rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Restablecer
              </button>
            </div>
          </div>

          <div className="flex justify-end pt-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
            >
              Cerrar
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
