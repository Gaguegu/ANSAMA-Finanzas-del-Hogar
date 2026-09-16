import React, { useState } from 'react';
import { 
  X, 
  RefreshCw, 
  CheckCircle2, 
  ShieldCheck, 
  Building2, 
  Sparkles,
  ArrowRight,
  Clock
} from 'lucide-react';
import { BankSyncResult } from '../types';
import { formatCurrency, formatRelativeTime } from '../utils/storage';

interface SyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExecuteSync: (bankId?: 'bbva' | 'santander') => Promise<{ results: BankSyncResult[]; addedCount: number }>;
  lastGlobalSync: string;
}

export const SyncModal: React.FC<SyncModalProps> = ({
  isOpen,
  onClose,
  onExecuteSync,
  lastGlobalSync
}) => {
  const [syncState, setSyncState] = useState<'idle' | 'syncing' | 'completed'>('idle');
  const [selectedTarget, setSelectedTarget] = useState<'all' | 'bbva' | 'santander'>('all');
  const [currentStepText, setCurrentStepText] = useState('');
  const [syncSummary, setSyncSummary] = useState<{ results: BankSyncResult[]; addedCount: number } | null>(null);

  if (!isOpen) return null;

  const handleStartSync = async () => {
    setSyncState('syncing');
    setCurrentStepText('Iniciando pasarela bancaria segura Open Banking (PSD2)...');

    const stepTimer1 = setTimeout(() => {
      setCurrentStepText('Autenticando credenciales de solo lectura con BBVA y Santander...');
    }, 450);

    const stepTimer2 = setTimeout(() => {
      setCurrentStepText('Descargando últimos movimientos y conciliando saldos disponibles...');
    }, 850);

    try {
      const targetParam = selectedTarget === 'all' ? undefined : selectedTarget;
      const res = await onExecuteSync(targetParam);
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      setSyncSummary(res);
      setSyncState('completed');
    } catch (err) {
      console.error(err);
      setSyncState('idle');
    }
  };

  const handleClose = () => {
    setSyncState('idle');
    setSyncSummary(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div 
        className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
              <RefreshCw className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Sincronización Bancaria Simulada</h3>
              <p className="text-[11px] text-slate-500">Tecnología Open Banking PSD2 con guardado local</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6">
          {syncState === 'idle' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-100 text-xs text-blue-900 leading-relaxed">
                <p className="font-semibold flex items-center gap-1.5 mb-1">
                  <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                  Conexión Simulada Segura
                </p>
                Esta función simula la descarga automática de extractos bancarios de tus cuentas de <strong>BBVA</strong> y <strong>Banco Santander</strong>, incorporando nuevos movimientos simulados y actualizando tus saldos locales sin exponer credenciales reales.
              </div>

              {/* Target Bank Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Selecciona entidad a sincronizar:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedTarget('all')}
                    className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                      selectedTarget === 'all'
                        ? 'bg-blue-50 border-blue-300 text-blue-900 font-bold ring-2 ring-blue-500/20'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Building2 className="w-4 h-4 mx-auto mb-1 text-slate-600" />
                    <span className="text-xs block">Todos</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedTarget('bbva')}
                    className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                      selectedTarget === 'bbva'
                        ? 'bg-blue-50 border-blue-300 text-blue-900 font-bold ring-2 ring-blue-500/20'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="w-5 h-5 mx-auto mb-1 rounded bg-[#004481] text-white text-[9px] font-black flex items-center justify-center">
                      BBVA
                    </div>
                    <span className="text-xs block">BBVA</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedTarget('santander')}
                    className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                      selectedTarget === 'santander'
                        ? 'bg-red-50 border-red-300 text-red-900 font-bold ring-2 ring-red-500/20'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="w-5 h-5 mx-auto mb-1 rounded bg-[#EC0000] text-white text-[9px] font-black flex items-center justify-center">
                      SAN
                    </div>
                    <span className="text-xs block">Santander</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-500 pt-2">
                <Clock className="w-3.5 h-3.5" />
                <span>Última sincronización guardada: {formatRelativeTime(lastGlobalSync)}</span>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  onClick={handleStartSync}
                  className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl flex items-center gap-2 shadow-sm cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Iniciar Sincronización
                </button>
              </div>
            </div>
          )}

          {syncState === 'syncing' && (
            <div className="py-8 flex flex-col items-center justify-center text-center space-y-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center">
                  <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
                </div>
              </div>

              <div>
                <h4 className="text-sm font-bold text-slate-900">Sincronizando cuentas...</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-xs">{currentStepText}</p>
              </div>

              <div className="w-48 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div className="bg-blue-600 h-full w-2/3 animate-pulse rounded-full" />
              </div>
            </div>
          )}

          {syncState === 'completed' && syncSummary && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-emerald-950">
                  ¡Sincronización Bancaria Exitosa!
                </h4>
                <p className="text-xs text-emerald-800 mt-0.5">
                  Se han descargado <strong>{syncSummary.addedCount} nuevos movimientos</strong> y se han actualizado los saldos locales.
                </p>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-700 block">Resumen por entidad:</span>
                {syncSummary.results.map((r, idx) => (
                  <div key={idx} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800">
                      {r.bankName}
                    </span>
                    <span className="text-emerald-600 font-bold">
                      +{r.newTransactionsCount} movimiento añadido
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl cursor-pointer"
                >
                  Entendido y Ver Movimientos
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
