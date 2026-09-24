import React from 'react';
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  Lock, 
  Unlock, 
  Sparkles,
  Info
} from 'lucide-react';
import { MonthClosure } from '../types';
import { formatMonthName } from '../utils/storage';

interface PatrimonioPeriodSelectorProps {
  selectedMonth: string; // YYYY-MM
  onSelectMonth: (month: string) => void;
  availableMonths: string[];
  closures?: MonthClosure[];
  isCurrentMonth: boolean;
  onResetToCurrentMonth: () => void;
}

export const PatrimonioPeriodSelector: React.FC<PatrimonioPeriodSelectorProps> = ({
  selectedMonth,
  onSelectMonth,
  availableMonths,
  closures = [],
  isCurrentMonth,
  onResetToCurrentMonth
}) => {
  const [yearStr, monthStr] = selectedMonth.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);

  // Month name
  const formattedMonth = formatMonthName(selectedMonth);

  // Check closure status for this month
  const closure = closures.find((c) => c.month === selectedMonth);
  const isClosed = Boolean(closure?.isClosed);
  const hasAuditedBalances = Boolean(closure?.auditedBalances && Object.keys(closure.auditedBalances).length > 0);

  // Previous and next month handlers
  const handlePrevMonth = () => {
    let prevM = month - 1;
    let prevY = year;
    if (prevM < 1) {
      prevM = 12;
      prevY -= 1;
    }
    const nextStr = `${prevY}-${String(prevM).padStart(2, '0')}`;
    onSelectMonth(nextStr);
  };

  const handleNextMonth = () => {
    let nextM = month + 1;
    let nextY = year;
    if (nextM > 12) {
      nextM = 1;
      nextY += 1;
    }
    const nextStr = `${nextY}-${String(nextM).padStart(2, '0')}`;
    onSelectMonth(nextStr);
  };

  return (
    <div 
      id="patrimonio-period-selector"
      className="bg-white rounded-2xl border-2 border-emerald-600/40 p-4 sm:p-5 shadow-sm ring-1 ring-emerald-950/5"
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        
        {/* Left: Title and context */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-[#092B19] border border-emerald-700/60 flex items-center justify-center text-emerald-400 shadow-sm shrink-0">
            <Calendar className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base sm:text-lg font-black text-zinc-950 tracking-tight whitespace-nowrap">
                Patrimonio por Mes y Año
              </h3>
              {isCurrentMonth ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-100 text-emerald-950 border border-emerald-300 shrink-0">
                  <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
                  Tiempo Real
                </span>
              ) : isClosed || hasAuditedBalances ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-50 text-[#0E6A3B] border border-emerald-300 shrink-0">
                  <Lock className="w-3 h-3 text-[#0E6A3B]" />
                  Cierre Auditado
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-zinc-100 text-zinc-700 border border-zinc-300 shrink-0">
                  <Clock className="w-3 h-3 text-zinc-500" />
                  Foto Histórica
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-600 mt-0.5 truncate">
              {isCurrentMonth ? (
                <>Saldos en tiempo real y fecha de última actualización de cada entidad.</>
              ) : (
                <>Saldo consolidado y fecha efectiva de cada banco al cierre de <strong>{formattedMonth}</strong>.</>
              )}
            </p>
          </div>
        </div>

        {/* Right: Interactive controls with strictly FIXED dimensions and layout */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 self-start lg:self-auto select-none">
          {/* Botón Mes Anterior (posición y tamaño fijos) */}
          <button
            type="button"
            onClick={handlePrevMonth}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-zinc-50 hover:bg-zinc-100 active:bg-zinc-200 border border-zinc-200 text-zinc-700 flex items-center justify-center transition-colors cursor-pointer shadow-2xs shrink-0"
            title="Mes anterior (Mes -1)"
            aria-label="Mes anterior"
          >
            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 text-zinc-700" />
          </button>

          {/* Selector Desplegable de Meses (ANCHO ESTRICTAMENTE FIJO) */}
          <div className="relative w-44 sm:w-60 shrink-0">
            <select
              value={selectedMonth}
              onChange={(e) => onSelectMonth(e.target.value)}
              className="w-full h-9 sm:h-10 appearance-none pl-3 pr-8 rounded-xl bg-emerald-50/90 hover:bg-emerald-100/90 border-2 border-emerald-600/50 text-emerald-950 font-black text-xs sm:text-sm tracking-tight cursor-pointer shadow-2xs focus:outline-none focus:ring-2 focus:ring-emerald-500 font-feature-settings-tnum truncate"
              title="Selecciona el mes y año para consultar el patrimonio"
            >
              {/* Ensure current selectedMonth is in the list even if custom */}
              {!availableMonths.includes(selectedMonth) && (
                <option value={selectedMonth}>
                  {formattedMonth}
                </option>
              )}
              {availableMonths.map((m) => {
                const mClosure = closures.find((c) => c.month === m);
                const isCur = m === new Date().toISOString().substring(0, 7);
                let label = formatMonthName(m);
                if (isCur) {
                  label += ' • Actual';
                } else if (mClosure?.isClosed) {
                  label += ' • 🔒 Cerrado';
                }
                return (
                  <option key={m} value={m}>
                    {label}
                  </option>
                );
              })}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-emerald-900">
              <Calendar className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Botón Mes Siguiente (posición y tamaño fijos) */}
          <button
            type="button"
            onClick={handleNextMonth}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-zinc-50 hover:bg-zinc-100 active:bg-zinc-200 border border-zinc-200 text-zinc-700 flex items-center justify-center transition-colors cursor-pointer shadow-2xs shrink-0"
            title="Mes siguiente (Mes +1)"
            aria-label="Mes siguiente"
          >
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-zinc-700" />
          </button>

          {/* Selector directo de fecha (input type month) */}
          <div className="relative w-9 h-9 sm:w-10 sm:h-10 shrink-0">
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => {
                if (e.target.value) {
                  onSelectMonth(e.target.value);
                }
              }}
              title="Elegir cualquier mes y año del calendario"
              className="w-full h-full opacity-0 absolute inset-0 cursor-pointer z-10"
            />
            <button
              type="button"
              tabIndex={-1}
              className="w-full h-full rounded-xl bg-white hover:bg-zinc-50 active:bg-zinc-100 border border-zinc-300 text-zinc-700 flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
              title="Abrir calendario para seleccionar año/mes"
            >
              <Calendar className="w-4 h-4 text-[#0E6A3B]" />
            </button>
          </div>

          {/* Botón Mes Actual / Estado (SIEMPRE PRESENTE CON ANCHO Y POSICIÓN FIJOS) */}
          <div className="w-24 sm:w-36 h-9 sm:h-10 shrink-0">
            {isCurrentMonth ? (
              <div 
                className="w-full h-full rounded-xl bg-emerald-100/70 border border-emerald-300/80 text-emerald-950 font-bold text-xs flex items-center justify-center gap-1.5 cursor-default select-none shadow-2xs"
                title="Estás visualizando los saldos en tiempo real de hoy"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse shrink-0"></span>
                <span className="hidden sm:inline font-black">Mes Actual</span>
                <span className="sm:hidden font-black">Hoy</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={onResetToCurrentMonth}
                className="w-full h-full rounded-xl bg-[#0E6A3B] hover:bg-[#0a522d] active:bg-[#084224] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer select-none active:scale-[0.98]"
                title="Volver inmediatamente al mes actual y saldos de hoy"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                <span className="hidden sm:inline font-bold">Ir a Actual</span>
                <span className="sm:hidden font-bold">Actual</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
