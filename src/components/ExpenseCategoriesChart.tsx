import React, { useState, useMemo, useEffect } from 'react';
import { 
  Home, 
  ShoppingCart, 
  Zap, 
  Car, 
  Utensils, 
  HeartPulse, 
  Smartphone, 
  Tag, 
  Briefcase, 
  ArrowDownLeft, 
  TrendingUp, 
  PlusCircle,
  AlertCircle,
  PieChart as PieIcon,
  ShieldCheck,
  Building,
  Banknote,
  Wrench,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Sparkles,
  Printer,
  FileDown
} from 'lucide-react';
import { TransactionCategory, Transaction } from '../types';
import { formatCurrency } from '../utils/storage';

interface ExpenseCategoriesChartProps {
  categories: TransactionCategory[];
  transactions: Transaction[];
  selectedMonth?: string;
  onSelectMonth?: (month: string) => void;
  availableMonths?: string[];
}

export const ExpenseCategoriesChart: React.FC<ExpenseCategoriesChartProps> = ({
  categories,
  transactions,
  selectedMonth,
  onSelectMonth,
  availableMonths = []
}) => {
  const [activeTab, setActiveTab] = useState<'expense' | 'income'>('expense');
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);

  // 1. Detectar todos los meses que tienen transacciones reales registradas
  const monthsWithData = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach((t) => {
      if (t.date && t.date.length >= 7) {
        set.add(t.date.substring(0, 7));
      }
    });
    return Array.from(set).sort().reverse();
  }, [transactions]);

  // Último mes con movimientos reales (ej: 2026-09)
  const latestMonthWithData = monthsWithData[0] || '2026-09';

  // 2. Determinar periodo activo (prioriza el mes con datos si el seleccionado no tiene movimientos)
  const [activePeriod, setActivePeriod] = useState<string>(() => {
    if (selectedMonth && (transactions.some(t => t.date.startsWith(selectedMonth)) || monthsWithData.length === 0)) {
      return selectedMonth;
    }
    return selectedMonth || latestMonthWithData;
  });

  // Sincronizar si cambia desde fuera
  useEffect(() => {
    if (selectedMonth && selectedMonth !== activePeriod) {
      setActivePeriod(selectedMonth);
    }
  }, [selectedMonth]);

  const handlePeriodChange = (newPeriod: string) => {
    setActivePeriod(newPeriod);
    if (onSelectMonth && !newPeriod.startsWith('year-') && newPeriod !== 'all') {
      onSelectMonth(newPeriod);
    }
  };

  // Anos disponibles dinamicamente (2025, 2026, proximos anos o los que existan en datos/cierres)
  const availableYears = useMemo(() => {
    const yearsSet = new Set<string>();
    // Anos base fundamentales
    yearsSet.add('2025');
    yearsSet.add('2026');
    // Anos con movimientos registrados
    transactions.forEach((t) => {
      if (t.date && t.date.length >= 4) {
        yearsSet.add(t.date.substring(0, 4));
      }
    });
    // Anos en meses disponibles
    availableMonths.forEach((m) => {
      if (m && m.length >= 4) {
        yearsSet.add(m.substring(0, 4));
      }
    });
    // Si estamos en un ano posterior, incluirlo tambien
    const curY = new Date().getFullYear().toString();
    yearsSet.add(curY);

    return Array.from(yearsSet).sort().reverse();
  }, [transactions, availableMonths]);

  // Lista combinada de opciones de meses disponibles
  const periodOptions = useMemo(() => {
    const set = new Set<string>();
    // Primero los meses con movimientos
    monthsWithData.forEach((m) => set.add(m));
    // Luego los meses disponibles del historial
    availableMonths.forEach((m) => set.add(m));
    if (set.size === 0) set.add('2026-09');
    return Array.from(set).sort().reverse();
  }, [monthsWithData, availableMonths]);

  // Navegacion rapida mes a mes (anterior / siguiente)
  const handlePrevMonth = () => {
    if (activePeriod === 'all' || activePeriod.startsWith('year-')) {
      handlePeriodChange(latestMonthWithData);
      return;
    }
    const idx = periodOptions.indexOf(activePeriod);
    if (idx < periodOptions.length - 1 && idx >= 0) {
      handlePeriodChange(periodOptions[idx + 1]);
    } else {
      const [y, m] = activePeriod.split('-').map(Number);
      const prevDate = new Date(y, m - 2, 1);
      const prevMStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
      handlePeriodChange(prevMStr);
    }
  };

  const handleNextMonth = () => {
    if (activePeriod === 'all' || activePeriod.startsWith('year-')) {
      handlePeriodChange(latestMonthWithData);
      return;
    }
    const idx = periodOptions.indexOf(activePeriod);
    if (idx > 0) {
      handlePeriodChange(periodOptions[idx - 1]);
    } else {
      const [y, m] = activePeriod.split('-').map(Number);
      const nextDate = new Date(y, m, 1);
      const nextMStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`;
      handlePeriodChange(nextMStr);
    }
  };

  // Filtrar transacciones para el periodo seleccionado
  const periodTransactions = useMemo(() => {
    if (activePeriod === 'all') {
      return transactions;
    }
    if (activePeriod.startsWith('year-')) {
      const yr = activePeriod.replace('year-', '');
      return transactions.filter((t) => t.date.startsWith(`${yr}-`));
    }
    return transactions.filter((t) => t.date.startsWith(activePeriod));
  }, [transactions, activePeriod]);

  // Formato legible del periodo en espanol
  const formatPeriodLabel = (p: string): string => {
    if (p === 'all') return 'Todos los movimientos registrados';
    if (p.startsWith('year-')) return `Ejercicio ${p.replace('year-', '')} Completo`;
    const [yStr, mStr] = p.split('-');
    const y = parseInt(yStr, 10);
    const m = parseInt(mStr, 10);
    if (isNaN(y) || isNaN(m)) return p;
    const date = new Date(y, m - 1, 1);
    const mName = date.toLocaleString('es-ES', { month: 'long' });
    return `${mName.charAt(0).toUpperCase() + mName.slice(1)} ${y}`;
  };

  const currentPeriodLabel = formatPeriodLabel(activePeriod);

  // Accion directa para imprimir o guardar informe en PDF
  const handlePrintReport = () => {
    window.print();
  };

  // Totales de gastos e ingresos en este periodo
  const expenseTotalSum = useMemo(() => {
    return periodTransactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [periodTransactions]);

  const incomeTotalSum = useMemo(() => {
    return periodTransactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [periodTransactions]);

  const targetCategories = categories.filter((c) => c.type === activeTab);
  const isYearView = activePeriod.startsWith('year-') || activePeriod === 'all';

  const categoryStats = targetCategories.map((category) => {
    const totalAmount = periodTransactions
      .filter((t) => t.categoryId === category.id && t.type === activeTab)
      .reduce((sum, t) => sum + t.amount, 0);

    const transactionCount = periodTransactions.filter(
      (t) => t.categoryId === category.id && t.type === activeTab
    ).length;

    const baseBudget = category.monthlyBudget || 0;
    const budget = isYearView ? baseBudget * 12 : baseBudget;

    return {
      category,
      totalAmount,
      transactionCount,
      budget
    };
  });

  const totalSum = activeTab === 'expense' ? expenseTotalSum : incomeTotalSum;

  // Calcular porcentajes y ordenar descendente
  const sortedStats = categoryStats
    .map((item) => ({
      ...item,
      percentage: totalSum > 0 ? (item.totalAmount / totalSum) * 100 : 0
    }))
    .sort((a, b) => b.totalAmount - a.totalAmount);

  // Total de gastos del último mes con datos para el botón de sugerencia
  const latestMonthExpensesTotal = useMemo(() => {
    return transactions
      .filter((t) => t.date.startsWith(latestMonthWithData) && t.type === 'expense')
      .reduce((s, t) => s + t.amount, 0);
  }, [transactions, latestMonthWithData]);

  // SVG Donut Chart calculation
  const size = 220;
  const strokeWidth = 32;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  let accumulatedOffset = 0;

  // Map icon strings to Lucide components
  const renderCategoryIcon = (iconName: string, className: string = 'w-4 h-4') => {
    switch (iconName) {
      case 'Home': return <Home className={className} />;
      case 'ShoppingCart': return <ShoppingCart className={className} />;
      case 'Zap': return <Zap className={className} />;
      case 'Car': return <Car className={className} />;
      case 'Utensils': return <Utensils className={className} />;
      case 'HeartPulse': return <HeartPulse className={className} />;
      case 'Smartphone': return <Smartphone className={className} />;
      case 'Briefcase': return <Briefcase className={className} />;
      case 'ArrowDownLeft': return <ArrowDownLeft className={className} />;
      case 'ArrowUpRight': return <ArrowUpRight className={className} />;
      case 'TrendingUp': return <TrendingUp className={className} />;
      case 'PlusCircle': return <PlusCircle className={className} />;
      case 'ShieldCheck': return <ShieldCheck className={className} />;
      case 'Building': return <Building className={className} />;
      case 'Banknote': return <Banknote className={className} />;
      case 'Wrench': return <Wrench className={className} />;
      default: return <Tag className={className} />;
    }
  };

  return (
    <div id="section-categories-chart" className="bg-white rounded-2xl border-2 border-emerald-600/35 shadow-sm ring-1 ring-emerald-950/5 p-5 sm:p-6 lg:p-7">
      
      {/* Header, Selector de Periodo y Pestañas */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-emerald-100/90 pb-5 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base sm:text-lg font-black text-zinc-950">Distribución de Gastos e Ingresos</h3>
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-[#0E6A3B] border border-emerald-300">
              Presupuesto
            </span>
          </div>
          <p className="text-xs text-zinc-600 mt-0.5">
            Consumo presupuestario y categorización de <strong className="text-emerald-950 font-bold">{currentPeriodLabel}</strong> ({periodTransactions.length} movimientos)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Selector interactivo de Periodo (Mes / Año) */}
          <div className="flex items-center gap-1.5 bg-zinc-50 border border-zinc-200/90 p-1 rounded-xl shadow-2xs">
            <button
              type="button"
              onClick={handlePrevMonth}
              disabled={activePeriod === 'all' || activePeriod.startsWith('year-')}
              className="w-7 h-7 rounded-lg text-zinc-600 hover:bg-zinc-200/70 flex items-center justify-center transition-colors disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
              title="Mes anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1.5 px-1">
              <Calendar className="w-3.5 h-3.5 text-[#0E6A3B] shrink-0" />
              <select
                value={activePeriod}
                onChange={(e) => handlePeriodChange(e.target.value)}
                className="px-2 py-1 bg-white border border-zinc-200 text-xs font-bold text-zinc-800 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-2xs max-w-[190px] sm:max-w-[220px] truncate"
              >
                <optgroup label="── Meses con extractos ──">
                  {periodOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {formatPeriodLabel(opt)} {monthsWithData.includes(opt) ? '•' : ''}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="── Vista Anual Acumulada ──">
                  {availableYears.map((yr) => (
                    <option key={`year-${yr}`} value={`year-${yr}`}>
                      📅 Todo el Ejercicio {yr}
                    </option>
                  ))}
                  <option value="all">🏛️ Todos los movimientos</option>
                </optgroup>
              </select>
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              disabled={activePeriod === 'all' || activePeriod.startsWith('year-')}
              className="w-7 h-7 rounded-lg text-zinc-600 hover:bg-zinc-200/70 flex items-center justify-center transition-colors disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
              title="Mes siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Expense vs Income Toggle */}
          <div className="inline-flex p-1 bg-zinc-100 rounded-xl border border-zinc-200/60 shadow-2xs">
            <button
              type="button"
              onClick={() => setActiveTab('expense')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === 'expense'
                  ? 'bg-white text-zinc-950 shadow-xs border border-zinc-200/80'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Gastos ({formatCurrency(expenseTotalSum)})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('income')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === 'income'
                  ? 'bg-white text-emerald-950 shadow-xs border border-zinc-200/80'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Ingresos ({formatCurrency(incomeTotalSum)})
            </button>
          </div>

          {/* Boton Imprimir / Guardar en PDF el filtro actual */}
          <button
            type="button"
            onClick={handlePrintReport}
            title={`Imprimir en papel o guardar en PDF el informe de ${currentPeriodLabel} (${activeTab === 'expense' ? 'Gastos' : 'Ingresos'})`}
            className="px-3 py-1.5 h-[34px] rounded-xl text-xs font-bold text-zinc-800 bg-white hover:bg-zinc-100 border border-zinc-300 shadow-2xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shrink-0"
          >
            <Printer className="w-3.5 h-3.5 text-[#0E6A3B]" />
            <span className="hidden sm:inline">Imprimir PDF</span>
            <span className="sm:hidden">PDF</span>
          </button>
        </div>
      </div>

      {/* Aviso informativo inteligente si el periodo actual no tiene movimientos */}
      {periodTransactions.length === 0 && (
        <div className="mb-6 p-4 rounded-xl bg-amber-50/90 border border-amber-300 text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs animate-in fade-in shadow-2xs">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <span className="font-bold block">
                No hay movimientos registrados en {currentPeriodLabel}.
              </span>
              <span className="text-zinc-600">
                Los extractos importados actualmente llegan hasta <strong>{formatPeriodLabel(latestMonthWithData)}</strong>.
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => handlePeriodChange(latestMonthWithData)}
            className="px-3.5 py-2 rounded-xl bg-[#0E6A3B] hover:bg-[#0a522d] text-white font-bold text-xs shrink-0 cursor-pointer shadow-xs flex items-center gap-1.5 transition-all active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Ver {formatPeriodLabel(latestMonthWithData)} ({formatCurrency(latestMonthExpensesTotal)})</span>
          </button>
        </div>
      )}

      {/* Main Content: Donut + List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        
        {/* Donut Chart Visualizer */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center">
          <div className="relative w-[220px] h-[220px]">
            <svg width={size} height={size} className="transform -rotate-90">
              {/* Background ring */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke="#f4f4f5"
                strokeWidth={strokeWidth}
                fill="none"
              />

              {/* Data rings */}
              {totalSum > 0 ? (
                sortedStats.map((item) => {
                  if (item.totalAmount <= 0) return null;
                  const strokeDasharray = `${(item.percentage / 100) * circumference} ${circumference}`;
                  const strokeDashoffset = -accumulatedOffset;
                  accumulatedOffset += (item.percentage / 100) * circumference;

                  const isHovered = hoveredCategory === item.category.id;

                  return (
                    <circle
                      key={item.category.id}
                      cx={size / 2}
                      cy={size / 2}
                      r={radius}
                      stroke={item.category.color}
                      strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                      strokeDasharray={strokeDasharray}
                      strokeDashoffset={strokeDashoffset}
                      fill="none"
                      className="transition-all duration-300 cursor-pointer"
                      onMouseEnter={() => setHoveredCategory(item.category.id)}
                      onMouseLeave={() => setHoveredCategory(null)}
                    />
                  );
                })
              ) : (
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  stroke="#e4e4e7"
                  strokeWidth={strokeWidth}
                  fill="none"
                  strokeDasharray="4 4"
                />
              )}
            </svg>

            {/* Central summary inside the donut */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 pointer-events-none">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                {activeTab === 'expense' ? 'Total Gastos' : 'Total Ingresos'}
              </span>
              <span className="text-xl font-extrabold text-zinc-950 leading-tight mt-0.5 font-feature-settings-tnum">
                {formatCurrency(totalSum)}
              </span>
              <span className="text-[10px] text-zinc-500 mt-0.5 font-medium">
                {periodTransactions.filter((t) => t.type === activeTab).length} movimientos
              </span>
            </div>
          </div>

          <p className="text-[11px] text-zinc-400 text-center mt-3 font-medium">
            Toca o pasa el cursor sobre cada segmento para ver detalles
          </p>
        </div>

        {/* Categories List with Progress Bar */}
        <div className="lg:col-span-7 space-y-3">
          {sortedStats.map((item) => {
            const hasBudget = activeTab === 'expense' && item.budget > 0;
            const budgetPercent = hasBudget ? (item.totalAmount / item.budget) * 100 : 0;
            const isOverBudget = hasBudget && item.totalAmount > item.budget;
            const isNearBudget = hasBudget && budgetPercent >= 80 && !isOverBudget;
            const isHovered = hoveredCategory === item.category.id;

            return (
              <div
                key={item.category.id}
                onMouseEnter={() => setHoveredCategory(item.category.id)}
                onMouseLeave={() => setHoveredCategory(null)}
                className={`p-3 sm:p-3.5 rounded-xl border transition-all ${
                  isHovered 
                    ? 'border-emerald-400 bg-emerald-50/30 shadow-xs' 
                    : 'border-zinc-200/80 bg-white hover:border-zinc-300'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2.5">
                    <div 
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-2xs"
                      style={{ backgroundColor: item.category.color }}
                    >
                      {renderCategoryIcon(item.category.iconName, 'w-4 h-4')}
                    </div>
                    <div>
                      <span className="text-sm font-bold text-zinc-900 block">
                        {item.category.name}
                      </span>
                      <span className="text-[11px] text-zinc-400">
                        {item.transactionCount} {item.transactionCount === 1 ? 'operación' : 'operaciones'}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-sm font-bold text-zinc-950 block font-feature-settings-tnum">
                      {formatCurrency(item.totalAmount)}
                    </span>
                    <span className="text-[11px] font-semibold text-zinc-500">
                      {item.percentage.toFixed(1)}% del total
                    </span>
                  </div>
                </div>

                {/* Monthly budget bar for expenses */}
                {hasBudget && (
                  <div className="mt-2.5 pt-2 border-t border-zinc-100">
                    <div className="flex items-center justify-between text-[11px] text-zinc-500 mb-1">
                      <span>Presupuesto{isYearView ? ' anual' : ' mensual'}: <strong className="text-zinc-700">{formatCurrency(item.budget)}</strong></span>
                      <span className={`font-bold ${isOverBudget ? 'text-rose-600' : isNearBudget ? 'text-amber-600' : 'text-[#0E6A3B]'}`}>
                        {budgetPercent.toFixed(0)}%
                      </span>
                    </div>
                    <div className="w-full bg-zinc-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isOverBudget ? 'bg-rose-500' : isNearBudget ? 'bg-amber-500' : 'bg-[#0E6A3B]'
                        }`}
                        style={{ width: `${Math.min(100, budgetPercent)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>

      {/* ========================================================================= */}
      {/* SECCION EXCLUSIVA DE IMPRESION A4 / PDF (data-print="only")               */}
      {/* ========================================================================= */}
      <div className="print-only print-report mt-6 w-full" data-print="only">
        {/* Cabecera oficial del informe */}
        <div className="border-b-2 border-zinc-950 pb-3 mb-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                ANSAMA • Finanzas del Hogar
              </div>
              <h1 className="text-xl font-black text-zinc-950 uppercase tracking-tight mt-0.5">
                Informe de Distribución de {activeTab === 'expense' ? 'Gastos' : 'Ingresos'}
              </h1>
              <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-zinc-700">
                <span className="font-bold">Periodo Consultado: <strong className="text-zinc-950">{currentPeriodLabel}</strong></span>
                <span>•</span>
                <span>Filtro: <strong className="text-zinc-950">{activeTab === 'expense' ? 'Gastos por Categoría' : 'Ingresos por Categoría'}</strong></span>
                <span>•</span>
                <span>Movimientos: <strong>{periodTransactions.length} operaciones</strong></span>
              </div>
            </div>
            <div className="text-right text-[11px] text-zinc-600">
              <div>Fecha de emisión: <strong>{new Date().toLocaleDateString('es-ES')}</strong></div>
              <div className="text-[10px] text-zinc-500 mt-0.5">Generado desde ANSAMA Finanzas</div>
            </div>
          </div>

          {/* Resumen de totales */}
          <div className="grid grid-cols-3 gap-2 mt-3 pt-2.5 border-t border-zinc-200 text-center">
            <div className="p-2 border border-zinc-300 rounded bg-zinc-50">
              <div className="text-[9px] uppercase tracking-wider font-bold text-zinc-600">Total {activeTab === 'expense' ? 'Gastos' : 'Ingresos'}</div>
              <div className="text-base font-black text-zinc-950">{formatCurrency(totalSum)}</div>
            </div>
            <div className="p-2 border border-zinc-300 rounded bg-zinc-50">
              <div className="text-[9px] uppercase tracking-wider font-bold text-zinc-600">Categorías con Importe</div>
              <div className="text-base font-black text-[#0E6A3B]">{sortedStats.filter(s => s.totalAmount > 0).length} de {sortedStats.length}</div>
            </div>
            <div className="p-2 border border-zinc-300 rounded bg-zinc-50">
              <div className="text-[9px] uppercase tracking-wider font-bold text-zinc-600">Total Operaciones</div>
              <div className="text-base font-black text-zinc-950">{periodTransactions.filter(t => t.type === activeTab).length} mov.</div>
            </div>
          </div>
        </div>

        {/* Tabla desglosada por categorías para impresión limpia */}
        <table className="w-full text-left text-xs border border-zinc-300 mb-6">
          <thead className="bg-zinc-100 border-b border-zinc-300 text-zinc-700 uppercase font-black text-[10px]">
            <tr>
              <th className="p-2">#</th>
              <th className="p-2">Categoría</th>
              <th className="p-2 text-center">Operaciones</th>
              {activeTab === 'expense' && <th className="p-2 text-right">Presupuesto</th>}
              <th className="p-2 text-right">Importe Total</th>
              <th className="p-2 text-right">% del Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {sortedStats.map((item, idx) => (
              <tr key={item.category.id} className={item.totalAmount > 0 ? 'bg-white' : 'bg-zinc-50/50 opacity-60'}>
                <td className="p-2 text-zinc-400 font-bold text-[10px]">{idx + 1}</td>
                <td className="p-2 font-bold text-zinc-900">
                  {item.category.name}
                </td>
                <td className="p-2 text-center font-semibold text-zinc-600">
                  {item.transactionCount}
                </td>
                {activeTab === 'expense' && (
                  <td className="p-2 text-right text-zinc-600 font-feature-settings-tnum">
                    {item.budget > 0 ? formatCurrency(item.budget) : '—'}
                  </td>
                )}
                <td className="p-2 text-right font-black text-zinc-950 font-feature-settings-tnum">
                  {formatCurrency(item.totalAmount)}
                </td>
                <td className="p-2 text-right font-bold text-[#0E6A3B] font-feature-settings-tnum">
                  {item.percentage.toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-zinc-100 border-t-2 border-zinc-950 font-black text-xs">
            <tr>
              <td colSpan={2} className="p-2 uppercase text-zinc-950">Total Consolidado</td>
              <td className="p-2 text-center text-zinc-950">
                {sortedStats.reduce((acc, s) => acc + s.transactionCount, 0)}
              </td>
              {activeTab === 'expense' && (
                <td className="p-2 text-right text-zinc-950 font-feature-settings-tnum">
                  {formatCurrency(sortedStats.reduce((acc, s) => acc + s.budget, 0))}
                </td>
              )}
              <td className="p-2 text-right text-zinc-950 font-feature-settings-tnum">
                {formatCurrency(totalSum)}
              </td>
              <td className="p-2 text-right text-[#0E6A3B]">
                100.0%
              </td>
            </tr>
          </tfoot>
        </table>

        {/* Pie de página oficial del PDF */}
        <div className="text-[10px] text-zinc-500 flex justify-between border-t border-zinc-300 pt-2">
          <span>ANSAMA Finanzas del Hogar • Registro y Control Presupuestario</span>
          <span>Página 1 de 1</span>
        </div>
      </div>

    </div>
  );
};
