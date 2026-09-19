import React, { useState, useMemo } from 'react';
import { 
  Coins, 
  Building2, 
  TrendingUp, 
  Filter, 
  Calendar, 
  Plus, 
  Printer, 
  Search, 
  ArrowUpDown, 
  Edit3, 
  Trash2, 
  FileText, 
  Layers,
  ChevronLeft,
  ChevronRight,
  PieChart,
  Percent,
  CheckCircle2,
  Clock,
  AlertTriangle,
  CheckSquare,
  Square,
  HelpCircle
} from 'lucide-react';
import { AppState, BankAccount, YieldRecord, YieldType } from '../types';
import { formatCurrency, formatDate } from '../utils/storage';

interface YieldsViewProps {
  appState: AppState;
  onOpenNewYieldModal: () => void;
  onEditYield: (record: YieldRecord) => void;
  onDeleteYield: (id: string) => void;
  onToggleYieldStatus: (id: string) => void;
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export const YieldsView: React.FC<YieldsViewProps> = ({
  appState,
  onOpenNewYieldModal,
  onEditYield,
  onDeleteYield,
  onToggleYieldStatus
}) => {
  // Filters state
  const [selectedType, setSelectedType] = useState<'all' | 'interest' | 'dividend'>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'needs_review' | 'verified'>('all');
  const [selectedBankId, setSelectedBankId] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<number>(() => {
    // Current year or latest yield year
    const currentYear = new Date().getFullYear();
    return currentYear;
  });
  const [selectedMonth, setSelectedMonth] = useState<string>('all'); // 'all' or '01'..'12'
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeSubTab, setActiveSubTab] = useState<'matrix' | 'list'>('matrix');

  const allYields = appState.yieldRecords || [];

  // Available years from yields or fallback to [currentYear, currentYear - 1]
  const availableYears = useMemo(() => {
    const yearsSet = new Set<number>();
    const currentYear = new Date().getFullYear();
    yearsSet.add(currentYear);
    yearsSet.add(currentYear - 1);
    allYields.forEach((y) => {
      const year = parseInt(y.date.split('-')[0], 10);
      if (!isNaN(year)) yearsSet.add(year);
    });
    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [allYields]);

  // Filtered yields based on all active filters
  const filteredYields = useMemo(() => {
    return allYields.filter((y) => {
      // Filter by Type
      if (selectedType !== 'all' && y.type !== selectedType) {
        return false;
      }

      // Filter by Bank / Account
      if (selectedBankId !== 'all') {
        const acc = appState.accounts.find((a) => a.id === y.accountId);
        if (!acc || (acc.bankId !== selectedBankId && acc.id !== selectedBankId)) {
          return false;
        }
      }

      // Filter by Year
      const year = parseInt(y.date.split('-')[0], 10);
      if (year !== selectedYear) {
        return false;
      }

      // Filter by Verification Status (check de comprobación)
      if (selectedStatus === 'needs_review' && y.status !== 'needs_review') {
        return false;
      }
      if (selectedStatus === 'verified' && y.status === 'needs_review') {
        return false;
      }

      // Filter by Month
      if (selectedMonth !== 'all') {
        const month = y.date.split('-')[1];
        if (month !== selectedMonth) {
          return false;
        }
      }

      // Filter by Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const acc = appState.accounts.find((a) => a.id === y.accountId);
        const matchTitle = y.title.toLowerCase().includes(term);
        const matchTicker = y.isinOrTicker?.toLowerCase().includes(term);
        const matchBank = acc?.bankName.toLowerCase().includes(term);
        const matchNotes = y.notes?.toLowerCase().includes(term);
        if (!matchTitle && !matchTicker && !matchBank && !matchNotes) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [allYields, selectedType, selectedStatus, selectedBankId, selectedYear, selectedMonth, searchTerm, appState.accounts]);

  // Overall pending review stats
  const reviewStats = useMemo(() => {
    const pending = allYields.filter((y) => y.status === 'needs_review');
    const verified = allYields.filter((y) => y.status !== 'needs_review');
    return {
      pendingCount: pending.length,
      verifiedCount: verified.length,
      totalCount: allYields.length
    };
  }, [allYields]);

  // Overall totals for the active filter set
  const totals = useMemo(() => {
    return filteredYields.reduce(
      (acc, item) => {
        acc.gross += item.grossAmount;
        acc.withholding += item.withholdingTax;
        acc.net += item.netAmount;
        if (item.type === 'interest') acc.interestCount += 1;
        if (item.type === 'dividend') acc.dividendCount += 1;
        return acc;
      },
      { gross: 0, withholding: 0, net: 0, interestCount: 0, dividendCount: 0 }
    );
  }, [filteredYields]);

  // Monthly Matrix data for the selected year and bank (independent of selected month)
  const monthlyMatrix = useMemo(() => {
    return MONTH_NAMES.map((monthName, idx) => {
      const monthNumStr = String(idx + 1).padStart(2, '0');
      
      const monthYields = allYields.filter((y) => {
        const [yYear, yMonth] = y.date.split('-');
        if (parseInt(yYear, 10) !== selectedYear || yMonth !== monthNumStr) return false;
        
        if (selectedBankId !== 'all') {
          const acc = appState.accounts.find((a) => a.id === y.accountId);
          if (!acc || (acc.bankId !== selectedBankId && acc.id !== selectedBankId)) return false;
        }
        
        return true;
      });

      const interests = monthYields.filter((y) => y.type === 'interest');
      const dividends = monthYields.filter((y) => y.type === 'dividend');

      const interestGross = interests.reduce((sum, y) => sum + y.grossAmount, 0);
      const interestWithholding = interests.reduce((sum, y) => sum + y.withholdingTax, 0);
      const interestNet = interests.reduce((sum, y) => sum + y.netAmount, 0);

      const dividendGross = dividends.reduce((sum, y) => sum + y.grossAmount, 0);
      const dividendWithholding = dividends.reduce((sum, y) => sum + y.withholdingTax, 0);
      const dividendNet = dividends.reduce((sum, y) => sum + y.netAmount, 0);

      const totalGross = interestGross + dividendGross;
      const totalWithholding = interestWithholding + dividendWithholding;
      const totalNet = interestNet + dividendNet;

      return {
        monthIndex: idx,
        monthName,
        monthNumStr,
        interestGross,
        interestWithholding,
        interestNet,
        dividendGross,
        dividendWithholding,
        dividendNet,
        totalGross,
        totalWithholding,
        totalNet,
        count: monthYields.length
      };
    });
  }, [allYields, selectedYear, selectedBankId, appState.accounts]);

  // Bank summary breakdown for the year
  const bankBreakdown = useMemo(() => {
    const map = new Map<string, {
      account: BankAccount;
      gross: number;
      withholding: number;
      net: number;
      count: number;
    }>();

    allYields.forEach((y) => {
      const year = parseInt(y.date.split('-')[0], 10);
      if (year !== selectedYear) return;
      if (selectedMonth !== 'all' && y.date.split('-')[1] !== selectedMonth) return;
      if (selectedType !== 'all' && y.type !== selectedType) return;

      const acc = appState.accounts.find((a) => a.id === y.accountId);
      if (!acc) return;

      const existing = map.get(acc.id) || {
        account: acc,
        gross: 0,
        withholding: 0,
        net: 0,
        count: 0
      };

      existing.gross += y.grossAmount;
      existing.withholding += y.withholdingTax;
      existing.net += y.netAmount;
      existing.count += 1;

      map.set(acc.id, existing);
    });

    return Array.from(map.values()).sort((a, b) => b.gross - a.gross);
  }, [allYields, selectedYear, selectedMonth, selectedType, appState.accounts]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div id="section-yields" className="space-y-6 animate-in fade-in duration-200">
      
      {/* Top Banner / Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-zinc-200/90 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-emerald-100/40 via-transparent to-transparent pointer-events-none rounded-full blur-2xl -mr-20 -mt-20"></div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-50 text-[#0E6A3B] border border-emerald-200">
                <Coins className="w-3.5 h-3.5" />
                Capital Mobiliario & Fiscalidad
              </span>
              <span className="text-xs font-semibold text-zinc-500 hidden sm:inline">
                • Ejercicio {selectedYear}
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-zinc-950 tracking-tight">
              Intereses Bancarios y Dividendos de Acciones
            </h2>

            <p className="text-xs sm:text-sm text-zinc-600 max-w-3xl leading-relaxed">
              Registro contable y fiscal con desglose de <strong>Importe Bruto</strong>, <strong>Retenciones practicadas (IRPF)</strong> y <strong>Líquido neto</strong> percibido por meses, año y entidades bancarias.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={handlePrint}
              className="px-3.5 py-2.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 text-xs font-bold shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer"
              title="Imprimir informe fiscal anual/mensual o guardar en PDF"
            >
              <Printer className="w-4 h-4 text-zinc-600" />
              <span>Imprimir</span>
            </button>

            <button
              onClick={onOpenNewYieldModal}
              className="px-4 py-2.5 rounded-xl bg-[#0E6A3B] hover:bg-[#0a522d] text-white text-xs font-black shadow-xs hover:shadow transition-all flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Registrar Rendimiento</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter Toolbar Card */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-zinc-200 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* 1. Selector de Tipo: Todos / Intereses / Dividendos */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center p-1 bg-zinc-100 rounded-xl max-w-fit">
              <button
                onClick={() => setSelectedType('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedType === 'all'
                    ? 'bg-white text-[#092B19] shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                Todos ({allYields.length})
              </button>

              <button
                onClick={() => setSelectedType('interest')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedType === 'interest'
                    ? 'bg-white text-[#0E6A3B] shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                <Building2 className="w-3.5 h-3.5 text-[#0E6A3B]" />
                <span>Intereses</span>
              </button>

              <button
                onClick={() => setSelectedType('dividend')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedType === 'dividend'
                    ? 'bg-white text-emerald-800 shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                <span>Dividendos</span>
              </button>
            </div>

            {/* Selector de Estado de Comprobación (Pendiente vs Comprobado) */}
            <div className="flex items-center p-1 bg-zinc-100 rounded-xl max-w-fit">
              <button
                onClick={() => setSelectedStatus('all')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedStatus === 'all'
                    ? 'bg-white text-zinc-900 shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                Cualquier estado
              </button>

              <button
                onClick={() => setSelectedStatus('needs_review')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedStatus === 'needs_review'
                    ? 'bg-amber-100 text-amber-900 shadow-xs'
                    : 'text-amber-800 hover:bg-amber-50'
                }`}
                title="Mostrar solo cobros auto-detectados pendientes de comprobar con el banco"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span>Por Comprobar ({reviewStats.pendingCount})</span>
              </button>

              <button
                onClick={() => setSelectedStatus('verified')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedStatus === 'verified'
                    ? 'bg-emerald-100 text-emerald-900 shadow-xs'
                    : 'text-emerald-800 hover:bg-emerald-50'
                }`}
                title="Mostrar solo cobros verificados"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Comprobados ({reviewStats.verifiedCount})</span>
              </button>
            </div>
          </div>

          {/* 2. Switcher de Sub-pestañas: Matriz Anual vs Listado Detallado */}
          <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-xl self-start md:self-auto">
            <button
              onClick={() => setActiveSubTab('matrix')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === 'matrix'
                  ? 'bg-white text-[#092B19] shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-[#0E6A3B]" />
              <span>Matriz por Meses</span>
            </button>

            <button
              onClick={() => setActiveSubTab('list')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === 'list'
                  ? 'bg-white text-[#092B19] shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-[#0E6A3B]" />
              <span>Listado de Cobros ({filteredYields.length})</span>
            </button>
          </div>
        </div>

        {/* Second Row: Filters for Bank, Year, Month, and Search */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-zinc-100">
          
          {/* Selector de Banco */}
          <div>
            <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
              Banco / Entidad
            </label>
            <select
              value={selectedBankId}
              onChange={(e) => setSelectedBankId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-zinc-300 bg-white text-xs font-semibold text-zinc-800 focus:outline-hidden focus:ring-2 focus:ring-[#0E6A3B]"
            >
              <option value="all">Todas las entidades bancarias</option>
              {appState.accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.bankName} - {acc.accountName}
                </option>
              ))}
            </select>
          </div>

          {/* Selector de Año */}
          <div>
            <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
              Ejercicio Fiscal (Año)
            </label>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setSelectedYear((y) => y - 1)}
                className="p-2 rounded-xl border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-700 cursor-pointer"
                title="Año anterior"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                className="flex-1 px-3 py-2 rounded-xl border border-zinc-300 bg-white text-xs font-bold text-zinc-900 text-center focus:outline-hidden focus:ring-2 focus:ring-[#0E6A3B]"
              >
                {availableYears.map((yr) => (
                  <option key={yr} value={yr}>
                    Año {yr}
                  </option>
                ))}
              </select>
              <button
                onClick={() => setSelectedYear((y) => y + 1)}
                className="p-2 rounded-xl border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-700 cursor-pointer"
                title="Año siguiente"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Selector de Mes */}
          <div>
            <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
              Periodo / Mes
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-zinc-300 bg-white text-xs font-semibold text-zinc-800 focus:outline-hidden focus:ring-2 focus:ring-[#0E6A3B]"
            >
              <option value="all">Todo el año (Enero - Diciembre)</option>
              {MONTH_NAMES.map((name, i) => {
                const numStr = String(i + 1).padStart(2, '0');
                return (
                  <option key={numStr} value={numStr}>
                    {name} ({numStr})
                  </option>
                );
              })}
            </select>
          </div>

          {/* Buscador de texto */}
          <div>
            <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
              Buscar por Concepto o Ticker
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Ej. Iberdrola, Santander, IPF..."
                className="w-full pl-8 pr-3 py-2 rounded-xl border border-zinc-300 text-xs font-medium text-zinc-900 focus:outline-hidden focus:ring-2 focus:ring-[#0E6A3B]"
              />
            </div>
          </div>

        </div>
      </div>

      {/* 4 KPI Summary Cards: Bruto, Retención, Líquido, Conteo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI 1: Total Bruto */}
        <div className="bg-white rounded-2xl p-5 border border-zinc-200/90 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-zinc-500 font-bold mb-1">
            <span className="uppercase tracking-wider">Total Importe Bruto</span>
            <span className="p-1.5 rounded-lg bg-zinc-100 text-zinc-700">
              <Coins className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-zinc-950 tracking-tight">
            {formatCurrency(totals.gross)}
          </div>
          <p className="text-[11px] text-zinc-500 mt-1">
            Rendimiento bruto devengado
          </p>
        </div>

        {/* KPI 2: Total Retenciones Practicadas (IRPF) */}
        <div className="bg-white rounded-2xl p-5 border border-amber-200/90 shadow-2xs relative overflow-hidden bg-gradient-to-br from-white to-amber-50/30">
          <div className="flex items-center justify-between text-xs text-amber-800 font-bold mb-1">
            <span className="uppercase tracking-wider">Retenciones IRPF (Hacienda)</span>
            <span className="p-1.5 rounded-lg bg-amber-100 text-amber-800">
              <Percent className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-amber-900 tracking-tight">
            {formatCurrency(totals.withholding)}
          </div>
          <div className="flex items-center gap-1.5 mt-1 text-[11px] text-amber-800">
            <span>
              {totals.gross > 0 
                ? `Tipo medio efectivo: ${((totals.withholding / totals.gross) * 100).toFixed(1)}%`
                : '19% estándar IRPF'}
            </span>
          </div>
        </div>

        {/* KPI 3: Total Líquido Neto Cobrado */}
        <div className="bg-white rounded-2xl p-5 border border-emerald-300 shadow-2xs relative overflow-hidden bg-gradient-to-br from-white to-emerald-50/50">
          <div className="flex items-center justify-between text-xs text-emerald-900 font-black mb-1">
            <span className="uppercase tracking-wider">Total Líquido Neto</span>
            <span className="p-1.5 rounded-lg bg-[#0E6A3B] text-white">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-[#0E6A3B] tracking-tight">
            {formatCurrency(totals.net)}
          </div>
          <p className="text-[11px] text-emerald-800 font-medium mt-1">
            Abonado efectivamente en tus cuentas
          </p>
        </div>

        {/* KPI 4: Conteo y Desglose */}
        <div className="bg-white rounded-2xl p-5 border border-zinc-200/90 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-zinc-500 font-bold mb-1">
            <span className="uppercase tracking-wider">Liquidaciones</span>
            <span className="p-1.5 rounded-lg bg-zinc-100 text-zinc-700">
              <Layers className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-zinc-950 tracking-tight">
            {filteredYields.length} <span className="text-xs font-bold text-zinc-500">cobros</span>
          </div>
          <div className="flex items-center gap-3 mt-1 text-[11px] text-zinc-600 font-medium">
            <span className="flex items-center gap-1">
              <Building2 className="w-3 h-3 text-[#0E6A3B]" />
              {totals.interestCount} intereses
            </span>
            <span className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-emerald-600" />
              {totals.dividendCount} dividendos
            </span>
          </div>
        </div>

      </div>

      {/* Alerta de cobros pendientes de comprobación */}
      {reviewStats.pendingCount > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50/90 border border-amber-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-100 text-amber-800 shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-amber-950">
                Tienes {reviewStats.pendingCount} {reviewStats.pendingCount === 1 ? 'rendimiento detectado pendiente' : 'rendimientos detectados pendientes'} de comprobación
              </h4>
              <p className="text-[11px] sm:text-xs text-amber-800/90">
                Anotados automáticamente desde los movimientos bancarios. Puedes editar los importes si no coinciden con el justificante oficial y desmarcar el check de comprobación una vez corregido.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setSelectedStatus('needs_review');
              setActiveSubTab('list');
            }}
            className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shrink-0 transition-colors shadow-2xs cursor-pointer flex items-center justify-center gap-1.5"
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>Revisar pendientes ({reviewStats.pendingCount})</span>
          </button>
        </div>
      )}

      {/* VIEW 1: Matriz Mensual & Desglose por Bancos */}
      {activeSubTab === 'matrix' && (
        <div className="space-y-6">
          
          {/* Main Matrix: Enero a Diciembre */}
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xs overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-zinc-50/70">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#0E6A3B]" />
                  Matriz Anual de Rendimientos por Meses — Ejercicio {selectedYear}
                </h3>
                <p className="text-xs text-zinc-500">
                  Desglose mensual de Intereses Bancarios y Dividendos de Acciones con Bruto, Retención y Líquido
                </p>
              </div>
              <span className="text-xs font-bold text-zinc-600 bg-white px-3 py-1 rounded-xl border border-zinc-200 shadow-2xs self-start sm:self-auto">
                12 Meses Fiscales
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-zinc-100/90 text-zinc-700 font-extrabold uppercase tracking-wider text-[11px] border-b border-zinc-200">
                    <th className="py-3 px-4">Mes</th>
                    <th className="py-3 px-3 text-right">Intereses Bruto</th>
                    <th className="py-3 px-3 text-right">Intereses Líq.</th>
                    <th className="py-3 px-3 text-right">Dividendos Bruto</th>
                    <th className="py-3 px-3 text-right">Dividendos Líq.</th>
                    <th className="py-3 px-3 text-right bg-zinc-200/50">Total Bruto</th>
                    <th className="py-3 px-3 text-right text-amber-900 bg-amber-50/50">Retención IRPF</th>
                    <th className="py-3 px-4 text-right text-[#0E6A3B] bg-emerald-50/60 font-black">Total Líquido</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 text-zinc-800">
                  {monthlyMatrix.map((m) => {
                    const hasActivity = m.count > 0;
                    return (
                      <tr 
                        key={m.monthNumStr}
                        className={`hover:bg-zinc-50/80 transition-colors ${
                          hasActivity ? 'font-medium' : 'text-zinc-400'
                        }`}
                      >
                        <td className="py-3 px-4 font-bold text-zinc-900 flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${hasActivity ? 'bg-[#0E6A3B]' : 'bg-zinc-300'}`}></span>
                          <span>{m.monthName}</span>
                          {hasActivity && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-600 font-normal">
                              {m.count}
                            </span>
                          )}
                        </td>

                        {/* Intereses */}
                        <td className="py-3 px-3 text-right">
                          {m.interestGross > 0 ? formatCurrency(m.interestGross) : '—'}
                        </td>
                        <td className="py-3 px-3 text-right font-semibold text-zinc-700">
                          {m.interestNet > 0 ? formatCurrency(m.interestNet) : '—'}
                        </td>

                        {/* Dividendos */}
                        <td className="py-3 px-3 text-right">
                          {m.dividendGross > 0 ? formatCurrency(m.dividendGross) : '—'}
                        </td>
                        <td className="py-3 px-3 text-right font-semibold text-zinc-700">
                          {m.dividendNet > 0 ? formatCurrency(m.dividendNet) : '—'}
                        </td>

                        {/* Totales del mes */}
                        <td className="py-3 px-3 text-right font-bold text-zinc-950 bg-zinc-50/50">
                          {m.totalGross > 0 ? formatCurrency(m.totalGross) : '—'}
                        </td>

                        <td className="py-3 px-3 text-right font-bold text-amber-900 bg-amber-50/30">
                          {m.totalWithholding > 0 ? formatCurrency(m.totalWithholding) : '—'}
                        </td>

                        <td className="py-3 px-4 text-right font-black text-[#0E6A3B] bg-emerald-50/40">
                          {m.totalNet > 0 ? formatCurrency(m.totalNet) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>

                {/* Footer Total Consolidado */}
                <tfoot>
                  <tr className="bg-[#092B19] text-white font-extrabold text-xs border-t-2 border-[#0E6A3B]">
                    <td className="py-3.5 px-4 text-emerald-200 uppercase tracking-wider font-black">
                      TOTAL EJERCICIO {selectedYear}
                    </td>
                    <td className="py-3.5 px-3 text-right text-emerald-100">
                      {formatCurrency(monthlyMatrix.reduce((s, m) => s + m.interestGross, 0))}
                    </td>
                    <td className="py-3.5 px-3 text-right text-emerald-100 font-bold">
                      {formatCurrency(monthlyMatrix.reduce((s, m) => s + m.interestNet, 0))}
                    </td>
                    <td className="py-3.5 px-3 text-right text-emerald-100">
                      {formatCurrency(monthlyMatrix.reduce((s, m) => s + m.dividendGross, 0))}
                    </td>
                    <td className="py-3.5 px-3 text-right text-emerald-100 font-bold">
                      {formatCurrency(monthlyMatrix.reduce((s, m) => s + m.dividendNet, 0))}
                    </td>
                    <td className="py-3.5 px-3 text-right text-white font-black bg-emerald-950/40">
                      {formatCurrency(totals.gross)}
                    </td>
                    <td className="py-3.5 px-3 text-right text-amber-300 font-black bg-emerald-950/40">
                      {formatCurrency(totals.withholding)}
                    </td>
                    <td className="py-3.5 px-4 text-right text-emerald-300 font-black text-sm bg-emerald-950/60">
                      {formatCurrency(totals.net)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Breakdown por Banco / Entidad */}
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xs overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-[#0E6A3B]" />
                  Resumen por Entidad Bancaria / Broker — Ejercicio {selectedYear}
                </h3>
                <p className="text-xs text-zinc-500">
                  Total de rendimientos percibidos en cada cuenta bancaria o de valores
                </p>
              </div>
            </div>

            {bankBreakdown.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 text-xs">
                No hay rendimientos registrados en los bancos para este ejercicio fiscal.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-zinc-50 text-zinc-600 font-bold uppercase tracking-wider text-[11px] border-b border-zinc-200">
                      <th className="py-3 px-4">Banco & Cuenta</th>
                      <th className="py-3 px-3 text-center">Tipo Cuenta</th>
                      <th className="py-3 px-3 text-center">Cobros</th>
                      <th className="py-3 px-3 text-right">Importe Bruto</th>
                      <th className="py-3 px-3 text-right text-amber-900">Retención (IRPF)</th>
                      <th className="py-3 px-4 text-right text-[#0E6A3B] font-bold">Líquido Neto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {bankBreakdown.map((item) => (
                      <tr key={item.account.id} className="hover:bg-zinc-50/80 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <span 
                              className="w-3 h-3 rounded-full shrink-0" 
                              style={{ backgroundColor: item.account.color }}
                            />
                            <div>
                              <div className="font-bold text-zinc-900">{item.account.bankName}</div>
                              <div className="text-[11px] text-zinc-500">{item.account.accountName} ({item.account.accountNumberMasked})</div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-3 text-center">
                          <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-zinc-100 text-zinc-700">
                            {item.account.type === 'checking' && 'Corriente'}
                            {item.account.type === 'savings' && 'Ahorro / Metas'}
                            {item.account.type === 'investment' && 'Valores'}
                            {item.account.type === 'credit' && 'Crédito'}
                          </span>
                        </td>

                        <td className="py-3.5 px-3 text-center font-semibold text-zinc-700">
                          {item.count}
                        </td>

                        <td className="py-3.5 px-3 text-right font-semibold text-zinc-900">
                          {formatCurrency(item.gross)}
                        </td>

                        <td className="py-3.5 px-3 text-right font-semibold text-amber-900">
                          {formatCurrency(item.withholding)}
                        </td>

                        <td className="py-3.5 px-4 text-right font-black text-[#0E6A3B]">
                          {formatCurrency(item.net)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      )}

      {/* VIEW 2: Listado Detallado de Cobros */}
      {activeSubTab === 'list' && (
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xs overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-zinc-50/70">
            <div>
              <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#0E6A3B]" />
                Liquidaciones Detalladas — Ejercicio {selectedYear}
              </h3>
              <p className="text-xs text-zinc-500">
                Mostrando {filteredYields.length} registros según los filtros seleccionados
              </p>
            </div>

            <button
              onClick={onOpenNewYieldModal}
              className="px-3.5 py-1.5 rounded-xl bg-[#0E6A3B] hover:bg-[#0a522d] text-white text-xs font-bold shadow-2xs flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Añadir Cobro</span>
            </button>
          </div>

          {filteredYields.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-zinc-100 text-zinc-400 flex items-center justify-center mx-auto">
                <Coins className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-zinc-900">No hay cobros registrados con estos filtros</h4>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                No se encontraron intereses o dividendos para el año {selectedYear} y los filtros activos.
              </p>
              <button
                onClick={onOpenNewYieldModal}
                className="mt-2 px-4 py-2 bg-[#0E6A3B] text-white text-xs font-bold rounded-xl cursor-pointer hover:bg-[#0a522d]"
              >
                Registrar primer cobro
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-zinc-50 text-zinc-600 font-bold uppercase tracking-wider text-[11px] border-b border-zinc-200">
                    <th className="py-3 px-3 text-center w-24">Comprobación</th>
                    <th className="py-3 px-3">Fecha</th>
                    <th className="py-3 px-3">Tipo</th>
                    <th className="py-3 px-4">Concepto / Emisor</th>
                    <th className="py-3 px-3">Banco Receptora</th>
                    <th className="py-3 px-3 text-right">Bruto (€)</th>
                    <th className="py-3 px-3 text-right text-amber-900">Retención</th>
                    <th className="py-3 px-3 text-right text-[#0E6A3B] font-bold">Líquido Neto (€)</th>
                    <th className="py-3 px-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filteredYields.map((record) => {
                    const acc = appState.accounts.find((a) => a.id === record.accountId);
                    const isNeedsReview = record.status === 'needs_review';
                    return (
                      <tr 
                        key={record.id} 
                        className={`transition-colors ${
                          isNeedsReview 
                            ? 'bg-amber-50/40 hover:bg-amber-50/70' 
                            : 'hover:bg-zinc-50/80'
                        }`}
                      >
                        {/* Check de comprobación interactivo */}
                        <td className="py-3.5 px-3 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => onToggleYieldStatus(record.id)}
                            className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer shadow-2xs ${
                              isNeedsReview
                                ? 'bg-amber-100/90 text-amber-900 hover:bg-amber-200 border border-amber-300 ring-1 ring-amber-400/30'
                                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                            }`}
                            title={
                              isNeedsReview
                                ? 'Check activado: Pendiente de comprobar con el banco. Haz clic cuando lo hayas verificado para desactivarlo.'
                                : 'Check desactivado: Comprobado y verificado. Haz clic si deseas volver a marcarlo como pendiente.'
                            }
                          >
                            {isNeedsReview ? (
                              <>
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                                <span>Por revisar</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Comprobado</span>
                              </>
                            )}
                          </button>
                        </td>

                        <td className="py-3.5 px-3 font-semibold text-zinc-900 whitespace-nowrap">
                          {formatDate(record.date)}
                        </td>

                        <td className="py-3.5 px-3 whitespace-nowrap">
                          {record.type === 'interest' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                              <Building2 className="w-3 h-3" />
                              Interés
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              <TrendingUp className="w-3 h-3" />
                              Dividendo
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-zinc-900 leading-snug">
                              {record.title}
                            </span>
                            {record.autoDetected && (
                              <span 
                                className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-sky-50 text-sky-700 border border-sky-200" 
                                title="Detectado y anotado automáticamente a partir de un movimiento del banco"
                              >
                                Auto-detectado
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-zinc-500">
                            {record.isinOrTicker && (
                              <span className="font-bold text-zinc-700 bg-zinc-100 px-1.5 py-0.2 rounded text-[10px]">
                                {record.isinOrTicker}
                              </span>
                            )}
                            {record.sharesCount && (
                              <span>
                                {record.sharesCount} accs.
                                {record.grossPerShare ? ` a ${record.grossPerShare} €` : ''}
                              </span>
                            )}
                            {record.notes && (
                              <span className="truncate max-w-xs italic text-zinc-400">
                                • {record.notes}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-3">
                          {acc ? (
                            <div className="flex items-center gap-1.5">
                              <span 
                                className="w-2.5 h-2.5 rounded-full shrink-0" 
                                style={{ backgroundColor: acc.color }}
                              />
                              <span className="font-semibold text-zinc-800 text-xs">
                                {acc.bankName}
                              </span>
                            </div>
                          ) : (
                            <span className="text-zinc-400">Cuenta eliminada</span>
                          )}
                        </td>

                        <td className="py-3.5 px-3 text-right font-semibold text-zinc-950">
                          {formatCurrency(record.grossAmount)}
                        </td>

                        <td className="py-3.5 px-3 text-right font-semibold text-amber-900">
                          <div>{formatCurrency(record.withholdingTax)}</div>
                          <div className="text-[10px] text-amber-700 font-medium">({record.taxRatePercent}%)</div>
                        </td>

                        <td className="py-3.5 px-3 text-right font-black text-[#0E6A3B] text-sm">
                          {formatCurrency(record.netAmount)}
                        </td>

                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => onEditYield(record)}
                              className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors cursor-pointer"
                              title="Editar y cotejar importes de este cobro con el justificante del banco"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                if (window.confirm(`¿Eliminar el registro "${record.title}"?`)) {
                                  onDeleteYield(record.id);
                                }
                              }}
                              className="p-1.5 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors cursor-pointer"
                              title="Eliminar este cobro"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

    </div>
  );
};
