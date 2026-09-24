import React, { useState, useMemo } from 'react';
import { 
  BarChart3, 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown,
  TrendingUp, 
  TrendingDown, 
  Building2, 
  LineChart, 
  Printer, 
  CalendarRange,
  ArrowUpRight,
  ArrowDownRight,
  Percent,
  Info,
  Layers,
  Sparkles
} from 'lucide-react';
import { AppState, BankAccount, Transaction } from '../types';
import { formatCurrency, isInternalTransfer } from '../utils/storage';

interface YearlyClosureProps {
  appState: AppState;
}

const MONTH_NAMES_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const MONTH_NAMES_FULL = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export const YearlyClosure: React.FC<YearlyClosureProps> = ({ appState }) => {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [expandedEntities, setExpandedEntities] = useState<Record<string, boolean>>({});
  const [viewGrouping, setViewGrouping] = useState<'by-bank' | 'by-category'>('by-bank');

  const toggleExpand = (id: string) => {
    setExpandedEntities(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handlePrevYear = () => setSelectedYear((y) => y - 1);
  const handleNextYear = () => setSelectedYear((y) => y + 1);

  // Filter transactions for the selected year
  const yearTransactions = useMemo(() => {
    const yearPrefix = `${selectedYear}-`;
    return appState.transactions.filter((tx) => tx.date.startsWith(yearPrefix));
  }, [appState.transactions, selectedYear]);

  // Total real income and expenses for the year (excluding internal transfers between own accounts)
  const totalYearIncome = useMemo(() => {
    return yearTransactions
      .filter((t) => t.type === 'income' && !isInternalTransfer(t))
      .reduce((sum, t) => sum + t.amount, 0);
  }, [yearTransactions]);

  const totalYearExpense = useMemo(() => {
    return yearTransactions
      .filter((t) => t.type === 'expense' && !isInternalTransfer(t))
      .reduce((sum, t) => sum + t.amount, 0);
  }, [yearTransactions]);

  const totalYearTransfers = useMemo(() => {
    return yearTransactions
      .filter((t) => isInternalTransfer(t))
      .reduce((sum, t) => sum + t.amount, 0);
  }, [yearTransactions]);

  const totalYearNet = totalYearIncome - totalYearExpense;
  const yearSavingsRate = totalYearIncome > 0 ? Math.round((totalYearNet / totalYearIncome) * 100) : 0;

  // Helper function to compute monthly balances for any list of accounts
  const computeMonthlyStats = (accounts: BankAccount[]) => {
    const accIds = accounts.map((a) => a.id);
    const currentBalance = accounts.reduce((sum, a) => sum + a.balance, 0);
    const monthlyBalances: number[] = [];

    for (let m = 0; m < 12; m++) {
      const monthNum = String(m + 1).padStart(2, '0');
      const monthKey = `${selectedYear}-${monthNum}`;
      const closure = appState.monthlyClosures?.find((c) => c.month === monthKey);

      // Si el mes está cerrado y tiene saldos auditados para estas cuentas, usamos esos saldos exactos
      if (closure?.isClosed && closure.auditedBalances) {
        const auditedSum = accounts.reduce((sum, a) => {
          return sum + (closure.auditedBalances?.[a.id] ?? a.balance);
        }, 0);
        monthlyBalances.push(Math.round(auditedSum * 100) / 100);
        continue;
      }

      // Si no está auditado, calculamos retrocediendo los movimientos posteriores al fin de mes
      const lastDayOfMonth = new Date(selectedYear, m + 1, 0).getDate();
      const endOfMonthDateStr = `${selectedYear}-${monthNum}-${String(lastDayOfMonth).padStart(2, '0')}`;
      
      const subsequentTxs = appState.transactions.filter((tx) => {
        return accIds.includes(tx.accountId) && tx.date > endOfMonthDateStr;
      });

      let rolledBalance = currentBalance;
      for (const tx of subsequentTxs) {
        if (tx.type === 'income') {
          rolledBalance -= tx.amount;
        } else {
          rolledBalance += tx.amount;
        }
      }

      monthlyBalances.push(Math.round(rolledBalance * 100) / 100);
    }

    const startBalance = monthlyBalances[0] || 0;
    const endBalance = monthlyBalances[11] || 0;
    const yearlyDiff = endBalance - startBalance;
    const yearlyDiffPercent = startBalance !== 0 
      ? Math.round((yearlyDiff / Math.abs(startBalance)) * 100) 
      : 0;
    const averageBalance = Math.round(
      (monthlyBalances.reduce((sum, v) => sum + v, 0) / 12) * 100
    ) / 100;

    return {
      monthlyBalances,
      startBalance,
      endBalance,
      averageBalance,
      yearlyDiff,
      yearlyDiffPercent
    };
  };

  // Compute monthly balances for each bank entity dynamically
  // Supports grouping by Entity/Bank (shows all banks with all their products)
  // or grouping by Financial Category (Commercial Banks, Investment, Deposits)
  const bankEntities = useMemo(() => {
    const BANK_BRAND_NAMES: Record<string, string> = {
      bbva: 'BBVA',
      santander: 'Banco Santander',
      caixabank: 'CaixaBank',
      ing: 'ING',
      sabadell: 'Banco Sabadell',
      bankinter: 'Bankinter',
      unicaja: 'Unicaja Banco',
      abanca: 'Abanca',
      openbank: 'Openbank'
    };

    const BANK_BRAND_COLORS: Record<string, string> = {
      bbva: '#004481',
      santander: '#EC0000',
      caixabank: '#007eae',
      ing: '#FF6200',
      sabadell: '#002D62',
      bankinter: '#FF6600',
      unicaja: '#008559',
      abanca: '#005596',
      openbank: '#DE0029'
    };

    let groups: Array<{
      id: string;
      name: string;
      color: string;
      badgeText?: string;
      accounts: BankAccount[];
    }> = [];

    if (viewGrouping === 'by-bank') {
      // 1. Agrupar TODAS las cuentas de la aplicación por su banco o entidad real
      // (sin excluir ningún producto: corrientes, ahorro, tarjetas, depósitos y valores)
      const bankGroupsMap = new Map<string, {
        id: string;
        name: string;
        color: string;
        badgeText?: string;
        accounts: BankAccount[];
      }>();

      appState.accounts.forEach((acc) => {
        const key = acc.bankId === 'other' ? (acc.bankName || 'other') : acc.bankId;
        if (!bankGroupsMap.has(key)) {
          const displayName = BANK_BRAND_NAMES[acc.bankId] || acc.bankName || acc.bankId.toUpperCase();
          const brandColor = BANK_BRAND_COLORS[acc.bankId] || acc.color || '#004481';
          bankGroupsMap.set(key, {
            id: key,
            name: displayName,
            color: brandColor,
            accounts: []
          });
        }
        bankGroupsMap.get(key)!.accounts.push(acc);
      });

      groups = Array.from(bankGroupsMap.values());
    } else {
      // 2. Agrupar por categoría de producto:
      // A) Cuentas bancarias ordinarias (corrientes, ahorro, crédito) agrupadas por banco
      const bankingAccounts = appState.accounts.filter(
        (a) => a.type !== 'investment' && a.type !== 'deposit'
      );
      const bankGroupsMap = new Map<string, {
        id: string;
        name: string;
        color: string;
        badgeText?: string;
        accounts: BankAccount[];
      }>();

      bankingAccounts.forEach((acc) => {
        const key = acc.bankId === 'other' ? (acc.bankName || 'other') : acc.bankId;
        if (!bankGroupsMap.has(key)) {
          const displayName = BANK_BRAND_NAMES[acc.bankId] || acc.bankName || acc.bankId.toUpperCase();
          const brandColor = BANK_BRAND_COLORS[acc.bankId] || acc.color || '#004481';
          bankGroupsMap.set(key, {
            id: key,
            name: displayName,
            color: brandColor,
            accounts: []
          });
        }
        bankGroupsMap.get(key)!.accounts.push(acc);
      });

      groups = Array.from(bankGroupsMap.values());

      // B) Cuentas de Valores / Inversión (Fondos, acciones, brokers)
      const investmentAccounts = appState.accounts.filter((a) => a.type === 'investment');
      if (investmentAccounts.length > 0) {
        groups.push({
          id: 'investment',
          name: 'Cuentas de Valores / Inversión',
          color: '#0E6A3B',
          badgeText: 'Valores',
          accounts: investmentAccounts
        });
      }

      // C) Depósitos a Plazo Fijo
      const depositAccounts = appState.accounts.filter((a) => a.type === 'deposit');
      if (depositAccounts.length > 0) {
        groups.push({
          id: 'deposit',
          name: 'Depósitos a Plazo Fijo',
          color: '#0284c7',
          badgeText: 'Plazo Fijo',
          accounts: depositAccounts
        });
      }
    }

    return groups.map((g) => {
      const entityStats = computeMonthlyStats(g.accounts);
      const detailedAccounts = g.accounts.map((acc) => {
        const accStats = computeMonthlyStats([acc]);
        const bankName = BANK_BRAND_NAMES[acc.bankId] || acc.bankName || acc.bankId.toUpperCase();
        const bankColor = BANK_BRAND_COLORS[acc.bankId] || acc.color || '#004481';
        return {
          id: acc.id,
          name: acc.accountName,
          bankName,
          bankColor,
          mask: acc.accountNumberMasked,
          type: acc.type,
          currentBalance: acc.balance,
          ...accStats
        };
      });

      return {
        id: g.id,
        name: g.name,
        color: g.color,
        badgeText: g.badgeText,
        accountCount: g.accounts.length,
        currentBalance: g.accounts.reduce((sum, a) => sum + a.balance, 0),
        accounts: detailedAccounts,
        ...entityStats
      };
    });
  }, [appState.accounts, appState.transactions, appState.monthlyClosures, selectedYear, viewGrouping]);

  // Toggle all entities expanded
  const areAllExpanded = useMemo(() => {
    return bankEntities.length > 0 && bankEntities.every(e => expandedEntities[e.id]);
  }, [bankEntities, expandedEntities]);

  const toggleAllExpanded = () => {
    const nextState: Record<string, boolean> = {};
    const target = !areAllExpanded;
    bankEntities.forEach(e => {
      nextState[e.id] = target;
    });
    setExpandedEntities(nextState);
  };

  // Total Consolidated balance row across all banks per month
  const consolidatedMonthlyBalances = useMemo(() => {
    const totals: number[] = Array(12).fill(0);
    bankEntities.forEach((entity) => {
      entity.monthlyBalances.forEach((val, idx) => {
        totals[idx] += val;
      });
    });
    return totals.map(v => Math.round(v * 100) / 100);
  }, [bankEntities]);

  const totalStartYear = consolidatedMonthlyBalances[0] || 0;
  const totalEndYear = consolidatedMonthlyBalances[11] || 0;
  const totalYearGrowth = totalEndYear - totalStartYear;
  const totalGrowthPercent = totalStartYear !== 0 
    ? Math.round((totalYearGrowth / Math.abs(totalStartYear)) * 100) 
    : 0;
  const totalAverageBalance = Math.round(
    (consolidatedMonthlyBalances.reduce((sum, v) => sum + v, 0) / 12) * 100
  ) / 100;

  // Monthly cashflow: Real Income vs Real Expense per month for the year
  const monthlyCashflow = useMemo(() => {
    return MONTH_NAMES_SHORT.map((name, idx) => {
      const monthNum = String(idx + 1).padStart(2, '0');
      const prefix = `${selectedYear}-${monthNum}`;
      const txs = yearTransactions.filter((t) => t.date.startsWith(prefix));
      const income = txs.filter((t) => t.type === 'income' && !isInternalTransfer(t)).reduce((sum, t) => sum + t.amount, 0);
      const expense = txs.filter((t) => t.type === 'expense' && !isInternalTransfer(t)).reduce((sum, t) => sum + t.amount, 0);
      const net = income - expense;
      return {
        month: name,
        fullMonth: MONTH_NAMES_FULL[idx],
        income,
        expense,
        net,
        hasActivity: txs.length > 0
      };
    });
  }, [yearTransactions, selectedYear]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div id="section-yearly-closure" className="space-y-6 animate-in fade-in">
      
      {/* Header Banner - Resaltado verde corporativo ANSAMA */}
      <div className="bg-white border-2 border-emerald-600/40 rounded-2xl p-5 shadow-sm ring-1 ring-emerald-950/5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#092B19] border border-emerald-700/60 flex items-center justify-center text-emerald-400 shadow-sm shrink-0">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-zinc-950">
                  Cierre Anual: Matriz de Saldos por Banco
                </h2>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-[#0E6A3B] border border-emerald-300">
                  Ejercicio {selectedYear}
                </span>
              </div>
              <p className="text-xs text-zinc-600 mt-0.5">
                Visión general de los saldos totales de cada banco desglosados mes a mes a lo largo del año.
              </p>
            </div>
          </div>

          {/* Year selector controls */}
          <div className="flex items-center gap-2 self-start lg:self-auto shrink-0 select-none">
            <button
              onClick={handlePrevYear}
              className="w-10 h-10 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-700 hover:bg-zinc-100 active:bg-zinc-200 flex items-center justify-center cursor-pointer shrink-0 shadow-2xs"
              title="Año anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="px-4 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-center w-36 shrink-0">
              <span className="text-[11px] font-semibold text-emerald-800 uppercase block tracking-wider truncate">
                Año Fiscal
              </span>
              <span className="text-base font-black text-emerald-950 block truncate">
                {selectedYear}
              </span>
            </div>

            <button
              onClick={handleNextYear}
              className="w-10 h-10 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-700 hover:bg-zinc-100 active:bg-zinc-200 flex items-center justify-center cursor-pointer shrink-0 shadow-2xs"
              title="Año siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              onClick={handlePrint}
              className="ml-2 px-3.5 py-2 h-10 rounded-xl text-xs font-bold text-zinc-700 bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs shrink-0"
              title="Imprimir o guardar como PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              Imprimir
            </button>
          </div>
        </div>
      </div>

      {/* KPI Summary Cards for the entire Year */}
      <div className="space-y-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Year Income */}
          <div className="bg-white rounded-2xl border-2 border-emerald-600/30 p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-wide">Ingresos Anuales</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-[#0E6A3B] flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-black text-emerald-800 font-feature-settings-tnum">
              +{formatCurrency(totalYearIncome)}
            </div>
            <span className="text-[11px] text-zinc-400 block mt-1">
              Ingresos reales acumulados en {selectedYear}
            </span>
          </div>

          {/* Total Year Expense */}
          <div className="bg-white rounded-2xl border-2 border-emerald-600/30 p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-wide">Gastos Anuales</span>
              <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
                <TrendingDown className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-black text-rose-600 font-feature-settings-tnum">
              -{formatCurrency(totalYearExpense)}
            </div>
            <span className="text-[11px] text-zinc-400 block mt-1">
              Gastos de consumo desembolsados en {selectedYear}
            </span>
          </div>

          {/* Total Year Net Savings */}
          <div className="bg-white rounded-2xl border-2 border-emerald-600/30 p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-wide">Ahorro Anual Neto</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#0E6A3B] border border-emerald-200 flex items-center justify-center">
                <ArrowUpRight className="w-4 h-4" />
              </div>
            </div>
            <div className={`mt-2 text-2xl font-black font-feature-settings-tnum ${
              totalYearNet >= 0 ? 'text-[#0E6A3B]' : 'text-rose-600'
            }`}>
              {totalYearNet >= 0 ? `+${formatCurrency(totalYearNet)}` : formatCurrency(totalYearNet)}
            </div>
            <span className="text-[11px] text-zinc-500 block mt-1 font-semibold">
              {totalYearNet >= 0 ? `Tasa de ahorro: ${yearSavingsRate}% de los ingresos` : 'Déficit acumulado'}
            </span>
          </div>

          {/* Year Growth */}
          <div className="bg-white rounded-2xl border-2 border-emerald-600/30 p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-wide">Variación Patrimonial</span>
              <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                <Percent className="w-4 h-4" />
              </div>
            </div>
            <div className={`mt-2 text-2xl font-black font-feature-settings-tnum ${
              totalYearGrowth >= 0 ? 'text-[#0E6A3B]' : 'text-rose-600'
            }`}>
              {totalYearGrowth >= 0 ? `+${totalGrowthPercent}%` : `${totalGrowthPercent}%`}
            </div>
            <span className="text-[11px] text-zinc-500 block mt-1 font-semibold">
              {totalYearGrowth >= 0 ? `+${formatCurrency(totalYearGrowth)}` : formatCurrency(totalYearGrowth)} (Cierre Dic vs Inicio Ene)
            </span>
          </div>
        </div>

        {/* Nota aclaratoria sobre exclusión de traspasos internos */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-900 font-medium">
          <Info className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>
            Los ingresos y gastos anuales excluyen automáticamente los traspasos internos y depósitos a plazo fijo movilizados entre tus cuentas ({formatCurrency(totalYearTransfers)}) para reflejar el flujo de ahorro familiar real sin distorsiones ni duplicidades.
          </span>
        </div>
      </div>

      {/* MATRIZ MAESTRA: TABLA DE SALDOS TOTALES DE CADA BANCO POR MESES */}
      <div className="bg-white border-2 border-emerald-600/45 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-emerald-100 bg-gradient-to-r from-emerald-50/80 via-white to-emerald-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#092B19] text-emerald-400 flex items-center justify-center shadow-xs">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-black text-zinc-950 flex items-center gap-2">
                <span>Saldos por Entidad y Cuentas — {selectedYear}</span>
              </h3>
              <p className="text-xs text-zinc-500">
                Evolución mensual auditada de cada banco, depósito y cuenta de valores
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Selector de modo de agrupación */}
            <div className="inline-flex bg-zinc-200/80 p-0.5 rounded-xl border border-zinc-300 text-xs">
              <button
                type="button"
                onClick={() => setViewGrouping('by-bank')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewGrouping === 'by-bank'
                    ? 'bg-white text-[#0E6A3B] shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
                title="Mostrar cada banco o entidad financiera por separado (BBVA, Santander, etc.) sumando todas sus cuentas"
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Por Banco / Entidad</span>
              </button>
              <button
                type="button"
                onClick={() => setViewGrouping('by-category')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewGrouping === 'by-category'
                    ? 'bg-white text-[#0E6A3B] shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
                title="Mostrar agrupados por tipo: Bancos ordinarios, Cuentas de Valores y Depósitos"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Por Categoría</span>
              </button>
            </div>

            <button
              onClick={toggleAllExpanded}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 text-xs font-bold transition-all shadow-2xs cursor-pointer"
              title="Expandir o contraer el desglose de cuentas individuales"
            >
              <Layers className="w-3.5 h-3.5 text-[#0E6A3B]" />
              <span>{areAllExpanded ? 'Contraer cuentas' : 'Desglosar todas las cuentas'}</span>
            </button>
            <span className="text-xs font-extrabold text-[#0E6A3B] bg-emerald-100/80 px-3 py-1 rounded-full border border-emerald-300">
              Saldos en Euros (€)
            </span>
          </div>
        </div>

        {/* Banner explicativo del modo de vista */}
        <div className={`px-4 py-2 text-xs flex items-center justify-between border-b ${
          viewGrouping === 'by-bank' 
            ? 'bg-emerald-50/80 text-emerald-950 border-emerald-100' 
            : 'bg-blue-50/80 text-blue-950 border-blue-100'
        }`}>
          <div className="flex items-center gap-2">
            {viewGrouping === 'by-bank' ? (
              <Sparkles className="w-4 h-4 text-[#0E6A3B] shrink-0" />
            ) : (
              <Info className="w-4 h-4 text-blue-600 shrink-0" />
            )}
            <span>
              {viewGrouping === 'by-bank' ? (
                <>
                  <strong>Vista por Banco / Entidad:</strong> Cada fila representa uno de tus bancos o gestoras (con todas sus cuentas corrientes, de ahorro, depósitos y valores unificadas).
                </>
              ) : (
                <>
                  <strong>Vista por Categoría:</strong> Las cuentas bancarias ordinarias, las carteras de valores y los depósitos a plazo fijo se muestran en bloques separados.
                </>
              )}
            </span>
          </div>
          <span className="text-[11px] font-semibold text-zinc-500 hidden sm:inline">
            {bankEntities.length} {bankEntities.length === 1 ? 'entidad' : 'entidades'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 uppercase font-bold text-[10px]">
              <tr>
                <th className="px-4 py-3 sticky left-0 bg-zinc-50 z-10 shadow-xs">
                  Entidad / Producto
                </th>
                {MONTH_NAMES_SHORT.map((m, idx) => (
                  <th 
                    key={m} 
                    className={`px-3 py-3 text-right ${
                      idx === 11 
                        ? 'bg-emerald-100/70 text-emerald-950 font-black border-l-2 border-emerald-600/50' 
                        : ''
                    }`}
                    title={idx === 11 ? `Saldo a 31 de Diciembre (Cierre de Ejercicio ${selectedYear})` : undefined}
                  >
                    {idx === 11 ? (
                      <span className="inline-flex items-center gap-1 font-black">
                        Dic <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-800 text-white font-extrabold uppercase">Cierre</span>
                      </span>
                    ) : (
                      m
                    )}
                  </th>
                ))}
                <th 
                  className="px-3.5 py-3 text-right bg-emerald-50 text-emerald-950 font-black border-l border-emerald-200"
                  title="Promedio aritmético de los saldos de los 12 meses (utilizado para Declaración de Renta e Impuesto sobre el Patrimonio)"
                >
                  Saldo Medio
                </th>
                <th 
                  className="px-4 py-3 text-right bg-emerald-50/90 text-emerald-950 font-black"
                  title={`Variación patrimonial entre el Cierre del año (${selectedYear}) y el Inicio (${selectedYear})`}
                >
                  Var. Anual
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {bankEntities.map((entity) => {
                const isExpanded = !!expandedEntities[entity.id];
                const hasMultipleAccounts = entity.accounts.length > 0;

                return (
                  <React.Fragment key={entity.id}>
                    {/* Entity Row */}
                    <tr 
                      onClick={() => hasMultipleAccounts && toggleExpand(entity.id)}
                      className={`hover:bg-zinc-50/90 transition-colors ${hasMultipleAccounts ? 'cursor-pointer' : ''}`}
                    >
                      {/* Sticky Bank Name Column */}
                      <td className="px-4 py-3.5 font-bold text-zinc-900 sticky left-0 bg-white z-10 shadow-xs flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span 
                            className="w-2.5 h-2.5 rounded-full shrink-0" 
                            style={{ backgroundColor: entity.color }}
                          />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-extrabold text-zinc-900">{entity.name}</span>
                              {entity.badgeText && (
                                <span className={`text-[9px] px-1.5 py-0.2 rounded font-extrabold uppercase ${
                                  entity.id === 'investment' 
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                                    : 'bg-sky-100 text-sky-800 border border-sky-300'
                                }`}>
                                  {entity.badgeText}
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-zinc-400 font-normal">
                              {entity.accountCount} {entity.accountCount === 1 ? 'cuenta' : 'cuentas'}
                            </span>
                          </div>
                        </div>

                        {hasMultipleAccounts && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleExpand(entity.id);
                            }}
                            className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100"
                            title={isExpanded ? 'Ocultar cuentas' : 'Ver cuentas'}
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-zinc-600" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-zinc-400" />
                            )}
                          </button>
                        )}
                      </td>

                      {/* 12 Monthly Balances */}
                      {entity.monthlyBalances.map((val, idx) => (
                        <td 
                          key={idx} 
                          className={`px-3 py-3.5 text-right font-feature-settings-tnum ${
                            idx === 11
                              ? 'font-black text-emerald-950 bg-emerald-50/40 border-l-2 border-emerald-600/30'
                              : 'font-medium text-zinc-700'
                          }`}
                        >
                          {formatCurrency(val)}
                        </td>
                      ))}

                      {/* Saldo Medio Anual */}
                      <td className="px-3.5 py-3.5 text-right font-bold text-zinc-800 bg-zinc-50/70 border-l border-emerald-100 font-feature-settings-tnum">
                        {formatCurrency(entity.averageBalance)}
                      </td>

                      {/* Yearly Difference */}
                      <td className={`px-4 py-3.5 text-right font-extrabold bg-emerald-50/30 font-feature-settings-tnum ${
                        entity.yearlyDiff >= 0 ? 'text-[#0E6A3B]' : 'text-rose-600'
                      }`}>
                        <div className="flex flex-col items-end">
                          <span>{entity.yearlyDiff >= 0 ? `+${formatCurrency(entity.yearlyDiff)}` : formatCurrency(entity.yearlyDiff)}</span>
                          <span className="text-[10px] font-semibold text-zinc-400">
                            {entity.yearlyDiff >= 0 ? `+${entity.yearlyDiffPercent}%` : `${entity.yearlyDiffPercent}%`}
                          </span>
                        </div>
                      </td>
                    </tr>

                    {/* Sub-rows: Individual Accounts if Expanded */}
                    {isExpanded && entity.accounts.map((acc) => (
                      <tr key={acc.id} className="bg-zinc-50/60 hover:bg-zinc-100/60 transition-colors text-[11px]">
                        <td className="px-4 py-2.5 pl-8 sticky left-0 bg-zinc-50/90 z-10 shadow-xs border-l-2 border-emerald-500/40">
                          <div className="flex items-center gap-2 text-zinc-700">
                            <span className="text-zinc-400 font-mono">↳</span>
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-zinc-900">{acc.name}</span>
                                <span 
                                  className="text-[9px] px-1.5 py-0.2 rounded font-extrabold uppercase"
                                  style={{ 
                                    backgroundColor: `${acc.bankColor}15`, 
                                    color: acc.bankColor,
                                    border: `1px solid ${acc.bankColor}40`
                                  }}
                                >
                                  {acc.bankName}
                                </span>
                                <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                                  acc.type === 'investment'
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                    : acc.type === 'deposit'
                                      ? 'bg-sky-100 text-sky-800 border border-sky-300'
                                      : acc.type === 'credit'
                                        ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                        : 'bg-zinc-100 text-zinc-700 border border-zinc-200'
                                }`}>
                                  {acc.type === 'investment' 
                                    ? 'Valores' 
                                    : acc.type === 'deposit' 
                                      ? 'Plazo Fijo' 
                                      : acc.type === 'credit' 
                                        ? 'Tarjeta' 
                                        : acc.type === 'savings' 
                                          ? 'Ahorro' 
                                          : 'Corriente'}
                                </span>
                              </div>
                              <span className="text-[10px] text-zinc-400 font-mono block">{acc.mask}</span>
                            </div>
                          </div>
                        </td>

                        {acc.monthlyBalances.map((val, idx) => (
                          <td 
                            key={idx} 
                            className={`px-3 py-2.5 text-right font-feature-settings-tnum text-zinc-600 ${
                              idx === 11 ? 'font-bold text-emerald-900 bg-emerald-50/20 border-l-2 border-emerald-600/20' : ''
                            }`}
                          >
                            {formatCurrency(val)}
                          </td>
                        ))}

                        <td className="px-3.5 py-2.5 text-right font-semibold text-zinc-600 bg-zinc-50/50 border-l border-zinc-200 font-feature-settings-tnum">
                          {formatCurrency(acc.averageBalance)}
                        </td>

                        <td className={`px-4 py-2.5 text-right font-bold font-feature-settings-tnum ${
                          acc.yearlyDiff >= 0 ? 'text-emerald-700' : 'text-rose-600'
                        }`}>
                          {acc.yearlyDiff >= 0 ? `+${formatCurrency(acc.yearlyDiff)}` : formatCurrency(acc.yearlyDiff)}
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                );
              })}
            </tbody>

            {/* Total Row (Patrimonio Consolidado Mensual) */}
            <tfoot className="bg-[#092B19] text-white font-black border-t-2 border-[#0E6A3B]">
              <tr>
                <td className="px-4 py-3.5 text-emerald-300 uppercase text-[11px] sticky left-0 bg-[#092B19] z-10 shadow-xs">
                  TOTAL CONSOLIDADO (€)
                </td>
                {consolidatedMonthlyBalances.map((val, idx) => (
                  <td 
                    key={idx} 
                    className={`px-3 py-3.5 text-right font-feature-settings-tnum ${
                      idx === 11
                        ? 'text-emerald-300 font-black border-l-2 border-emerald-500 bg-emerald-950/70'
                        : 'text-white font-black'
                    }`}
                  >
                    {formatCurrency(val)}
                  </td>
                ))}
                <td className="px-3.5 py-3.5 text-right text-emerald-200 text-xs font-black border-l border-emerald-700 font-feature-settings-tnum">
                  {formatCurrency(totalAverageBalance)}
                </td>
                <td className={`px-4 py-3.5 text-right font-black text-sm font-feature-settings-tnum ${
                  totalYearGrowth >= 0 ? 'text-emerald-300' : 'text-rose-400'
                }`}>
                  <div className="flex flex-col items-end">
                    <span>{totalYearGrowth >= 0 ? `+${formatCurrency(totalYearGrowth)}` : formatCurrency(totalYearGrowth)}</span>
                    <span className="text-[10px] font-semibold text-emerald-300/80">
                      {totalYearGrowth >= 0 ? `+${totalGrowthPercent}%` : `${totalGrowthPercent}%`}
                    </span>
                  </div>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Nota informativa de Cuentas de Valores y Depósitos */}
        <div className="px-5 py-3.5 bg-zinc-50 border-t border-zinc-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-zinc-600">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#0E6A3B] shrink-0" />
            <span>
              <strong>¿Cuentas de Valores o Brókers?</strong> En ANSAMA, las carteras de inversión (fondos, acciones, Trade Republic, MyInvestor, DeGiro) se distinguen de las cuentas corrientes bancarias. Si alguna de tus cuentas debe computar como inversión, puedes cambiar su tipo a <em>Cuenta de Valores</em> en la pestaña <strong>Cuentas & Bancos</strong>.
            </span>
          </div>
        </div>
      </div>

      {/* Flujo Mensual en el Año: Ingresos vs Gastos vs Ahorro */}
      <div className="bg-white border-2 border-emerald-600/40 rounded-2xl p-5 shadow-sm">
        <h3 className="text-base font-black text-zinc-950 mb-4 flex items-center gap-2">
          <CalendarRange className="w-5 h-5 text-[#0E6A3B]" />
          Desglose Mensual de Ingresos, Gastos y Ahorro ({selectedYear})
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {monthlyCashflow.map((m, idx) => (
            <div 
              key={idx}
              className={`p-3 rounded-xl border transition-all ${
                m.hasActivity 
                  ? 'bg-zinc-50 border-zinc-200' 
                  : 'bg-zinc-50/50 border-zinc-100 opacity-60'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-extrabold text-xs text-zinc-900">{m.fullMonth}</span>
                <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${
                  m.net >= 0 ? 'bg-emerald-100 text-[#0E6A3B]' : 'bg-rose-100 text-rose-700'
                }`}>
                  {m.net >= 0 ? 'Superávit' : 'Déficit'}
                </span>
              </div>

              <div className="space-y-1 text-xs font-feature-settings-tnum">
                <div className="flex justify-between text-emerald-800">
                  <span className="text-[11px] text-zinc-500">Ingresos:</span>
                  <span className="font-bold">+{formatCurrency(m.income)}</span>
                </div>
                <div className="flex justify-between text-rose-600">
                  <span className="text-[11px] text-zinc-500">Gastos:</span>
                  <span className="font-bold">-{formatCurrency(m.expense)}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-zinc-200 font-extrabold">
                  <span className="text-[11px] text-zinc-700">Neto:</span>
                  <span className={m.net >= 0 ? 'text-[#0E6A3B]' : 'text-rose-600'}>
                    {m.net >= 0 ? `+${formatCurrency(m.net)}` : formatCurrency(m.net)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
