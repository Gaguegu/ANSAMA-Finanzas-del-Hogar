import React, { useState } from 'react';
import { 
  X, 
  RefreshCw, 
  CheckCircle2, 
  ShieldCheck, 
  Building2, 
  Sparkles,
  ArrowRight,
  Clock,
  FileSpreadsheet
} from 'lucide-react';
import { BankSyncResult } from '../types';
import { formatCurrency, formatRelativeTime } from '../utils/storage';

interface SyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExecuteSync: (bankId?: 'bbva' | 'santander', fromDate?: string) => Promise<{ results: BankSyncResult[]; addedCount: number }>;
  lastGlobalSync: string;
  onOpenImportModal?: () => void;
}

export const SyncModal: React.FC<SyncModalProps> = ({
  isOpen,
  onClose,
  onExecuteSync,
  lastGlobalSync,
  onOpenImportModal
}) => {
  const [syncState, setSyncState] = useState<'idle' | 'syncing' | 'completed'>('idle');
  const [selectedTarget, setSelectedTarget] = useState<'all' | 'bbva' | 'santander'>('all');
  const [dateRangePreset, setDateRangePreset] = useState<'30days' | 'current_month' | 'current_year' | 'custom'>('30days');
  
  // Compute initial default custom date (30 days ago)
  const thirtyDaysAgoStr = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
  const [customFromDate, setCustomFromDate] = useState<string>(thirtyDaysAgoStr);
  
  const [currentStepText, setCurrentStepText] = useState('');
  const [syncSummary, setSyncSummary] = useState<{ results: BankSyncResult[]; addedCount: number } | null>(null);

  if (!isOpen) return null;

  const getEffectiveFromDate = (): string => {
    const today = new Date();
    if (dateRangePreset === '30days') {
      return new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
    }
    if (dateRangePreset === 'current_month') {
      return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
    }
    if (dateRangePreset === 'current_year') {
      return `${today.getFullYear()}-01-01`;
    }
    return customFromDate || thirtyDaysAgoStr;
  };

  const handleStartSync = async () => {
    setSyncState('syncing');
    setCurrentStepText('Iniciando pasarela bancaria segura Open Banking (PSD2)...');

    const stepTimer1 = setTimeout(() => {
      setCurrentStepText('Autenticando credenciales de solo lectura con BBVA y Santander...');
    }, 450);

    const stepTimer2 = setTimeout(() => {
      setCurrentStepText(`Descargando movimientos desde ${getEffectiveFromDate()} y conciliando saldos...`);
    }, 850);

    try {
      const targetParam = selectedTarget === 'all' ? undefined : selectedTarget;
      const effectiveDate = getEffectiveFromDate();
      const res = await onExecuteSync(targetParam, effectiveDate);
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
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 bg-zinc-50/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0E6A3B] flex items-center justify-center text-white shadow-xs">
              <RefreshCw className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-900">Sincronización Bancaria Simulada</h3>
              <p className="text-[11px] text-zinc-500">Tecnología Open Banking PSD2 con guardado local</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6">
          {syncState === 'idle' && (
            <div className="space-y-4">
              
              {/* Opción destacada: Cargar movimientos reales con Excel/CSV */}
              {onOpenImportModal && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border-2 border-[#0E6A3B]/40 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-[#0E6A3B] text-white flex items-center justify-center shrink-0 shadow-2xs">
                      <FileSpreadsheet className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-black text-emerald-950">
                        ¿Quieres cargar tus movimientos reales?
                      </h4>
                      <p className="text-[11px] text-emerald-800 font-medium leading-normal">
                        Importa directamente el archivo Excel (.xlsx) o CSV descargado de BBVA, Santander, CaixaBank, Openbank u otro banco.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenImportModal();
                    }}
                    className="w-full sm:w-auto px-3.5 py-2 text-xs font-bold text-white bg-[#0E6A3B] hover:bg-[#0a522d] rounded-xl transition-all shadow-xs shrink-0 cursor-pointer text-center"
                  >
                    Importar Extracto Real
                  </button>
                </div>
              )}

              <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200 text-xs text-zinc-700 leading-relaxed">
                <p className="font-bold flex items-center gap-1.5 mb-1 text-zinc-900">
                  <ShieldCheck className="w-4 h-4 text-zinc-600 shrink-0" />
                  Sincronización de Demostración (Simulada)
                </p>
                Esta opción genera movimientos ficticios de prueba para comprobar el funcionamiento visual de la interfaz. Si deseas tus datos reales, utiliza el botón superior de <strong>Importar Extracto Real</strong>.
              </div>

              {/* Target Bank Selection */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-2">
                  Selecciona entidad a sincronizar:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedTarget('all')}
                    className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                      selectedTarget === 'all'
                        ? 'bg-emerald-50 border-emerald-400 text-emerald-950 font-bold ring-2 ring-emerald-600/20'
                        : 'bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100'
                    }`}
                  >
                    <Building2 className="w-4 h-4 mx-auto mb-1 text-zinc-600" />
                    <span className="text-xs block">Todos</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedTarget('bbva')}
                    className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                      selectedTarget === 'bbva'
                        ? 'bg-blue-50 border-blue-300 text-blue-900 font-bold ring-2 ring-blue-500/20'
                        : 'bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100'
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
                        : 'bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100'
                    }`}
                  >
                    <div className="w-5 h-5 mx-auto mb-1 rounded bg-[#EC0000] text-white text-[9px] font-black flex items-center justify-center">
                      SAN
                    </div>
                    <span className="text-xs block">Santander</span>
                  </button>
                </div>
              </div>

              {/* Date Filter Configuration */}
              <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-zinc-800 flex items-center gap-1.5">
                    <span>📅 ¿Desde qué fecha descargar movimientos?</span>
                  </label>
                  <span className="text-[11px] font-semibold text-[#0E6A3B] bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    Desde: {getEffectiveFromDate()}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setDateRangePreset('30days')}
                    className={`py-1.5 px-2 text-[11px] rounded-lg font-semibold border transition-all cursor-pointer ${
                      dateRangePreset === '30days'
                        ? 'bg-[#0E6A3B] text-white border-[#0E6A3B]'
                        : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-100'
                    }`}
                  >
                    Últimos 30 días
                  </button>

                  <button
                    type="button"
                    onClick={() => setDateRangePreset('current_month')}
                    className={`py-1.5 px-2 text-[11px] rounded-lg font-semibold border transition-all cursor-pointer ${
                      dateRangePreset === 'current_month'
                        ? 'bg-[#0E6A3B] text-white border-[#0E6A3B]'
                        : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-100'
                    }`}
                  >
                    Mes en curso
                  </button>

                  <button
                    type="button"
                    onClick={() => setDateRangePreset('current_year')}
                    className={`py-1.5 px-2 text-[11px] rounded-lg font-semibold border transition-all cursor-pointer ${
                      dateRangePreset === 'current_year'
                        ? 'bg-[#0E6A3B] text-white border-[#0E6A3B]'
                        : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-100'
                    }`}
                  >
                    Año en curso
                  </button>

                  <button
                    type="button"
                    onClick={() => setDateRangePreset('custom')}
                    className={`py-1.5 px-2 text-[11px] rounded-lg font-semibold border transition-all cursor-pointer ${
                      dateRangePreset === 'custom'
                        ? 'bg-[#0E6A3B] text-white border-[#0E6A3B]'
                        : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-100'
                    }`}
                  >
                    Elegir fecha...
                  </button>
                </div>

                {dateRangePreset === 'custom' && (
                  <div className="pt-1">
                    <label className="block text-[11px] font-medium text-zinc-600 mb-1">
                      Indica la fecha inicial exacta:
                    </label>
                    <input
                      type="date"
                      value={customFromDate}
                      onChange={(e) => setCustomFromDate(e.target.value)}
                      max={new Date().toISOString().split('T')[0]}
                      className="w-full px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-zinc-300 text-zinc-900 focus:border-[#0E6A3B] focus:ring-1 focus:ring-[#0E6A3B]"
                    />
                  </div>
                )}

                <p className="text-[10.5px] text-zinc-500 leading-tight">
                  ℹ️ <strong>Normativa PSD2:</strong> Los bancos permiten descargar por defecto los últimos 90 días de histórico, pero en ANSAMA puedes seleccionar la fecha que necesites para traer movimientos anteriores o acotar solo al mes actual.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs text-zinc-500 pt-1">
                <Clock className="w-3.5 h-3.5" />
                <span>Última sincronización guardada: {formatRelativeTime(lastGlobalSync)}</span>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 rounded-xl"
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  onClick={handleStartSync}
                  className="px-4 py-2 text-xs font-bold text-white bg-black hover:bg-zinc-800 rounded-xl flex items-center gap-2 shadow-xs cursor-pointer"
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
                <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                  <RefreshCw className="w-8 h-8 text-[#0E6A3B] animate-spin" />
                </div>
              </div>

              <div>
                <h4 className="text-sm font-bold text-zinc-900">Sincronizando cuentas...</h4>
                <p className="text-xs text-zinc-500 mt-1 max-w-xs">{currentStepText}</p>
              </div>

              <div className="w-48 bg-zinc-100 rounded-full h-1.5 overflow-hidden">
                <div className="bg-[#0E6A3B] h-full w-2/3 animate-pulse rounded-full" />
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
                <span className="text-xs font-bold text-zinc-700 block">Resumen por entidad:</span>
                {syncSummary.results.map((r, idx) => (
                  <div key={idx} className="p-2.5 rounded-lg bg-zinc-50 border border-zinc-200 flex items-center justify-between text-xs">
                    <span className="font-semibold text-zinc-800">
                      {r.bankName}
                    </span>
                    <span className="text-emerald-700 font-bold">
                      +{r.newTransactionsCount} movimiento añadido
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex justify-end pt-4 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-5 py-2 text-xs font-bold text-white bg-[#0E6A3B] hover:bg-[#0a522d] rounded-xl cursor-pointer"
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
