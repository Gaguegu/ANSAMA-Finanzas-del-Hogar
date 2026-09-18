import React, { useState, useMemo } from 'react';
import { 
  BarChart3, 
  ChevronLeft, 
  ChevronRight, 
  TrendingUp, 
  TrendingDown, 
  Building2, 
  LineChart, 
  Printer, 
  CalendarRange,
  ArrowUpRight,
  ArrowDownRight,
  Percent
} from 'lucide-react';
import { AppState, BankAccount, Transaction } from '../types';
import { formatCurrency } from '../utils/storage';

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

  const handlePrevYear = () => setSelectedYear((y) => y - 1);
  const handleNextYear = () => setSelectedYear((y) => y + 1);

  // Filter transactions for the selected year
  const yearTransactions = useMemo(() => {
    const yearPrefix = `${selectedYear}-`;
    return appState.transactions.filter((tx) => tx.date.startsWith(yearPrefix));
  }, [appState.transactions, selectedYear]);

  // Total income and expenses for the year
  const totalYearIncome = useMemo(() => {
    return yearTransactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [yearTransactions]);

  const totalYearExpense = useMemo(() => {
    return yearTransactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [yearTransactions]);

  const totalYearNet = totalYearIncome - totalYearExpense;
  const yearSavingsRate = totalYearIncome > 0 ? Math.round((totalYearNet / totalYearIncome) * 100) : 0;

  // Compute monthly balances for each bank entity
  // Entities: BBVA, Santander, Cuentas de Valores, Otras Entidades
  const bankEntities = useMemo(() => {
    const list = [
      { id: 'bbva', name: 'BBVA', color: '#004481' },
      { id: 'santander', name: 'Banco Santander', color: '#EC0000' },
      { id: 'investment', name: 'Cuentas de Valores', color: '#0E6A3B' },
      { id: 'other', name: 'Otras Entidades', color: '#64748b' }
    ];

    return list.map((entity) => {
      let matchingAccounts: BankAccount[] = [];
      if (entity.id === 'investment') {
        matchingAccounts = appState.accounts.filter((a) => a.type === 'investment');
      } else if (entity.id === 'bbva') {
        matchingAccounts = appState.accounts.filter((a) => a.bankId === 'bbva' && a.type !== 'investment');
      } else if (entity.id === 'santander') {
        matchingAccounts = appState.accounts.filter((a) => a.bankId === 'santander' && a.type !== 'investment');
      } else {
        matchingAccounts = appState.accounts.filter((a) => a.bankId !== 'bbva' && a.bankId !== 'santander' && a.type !== 'investment');
      }

      const accIds = matchingAccounts.map((a) => a.id);
      const currentBalance = matchingAccounts.reduce((sum, a) => sum + a.balance, 0);

      // Calculate balance at end of each month (0 to 11)
      // We calculate month-end balance by rolling backwards from current balance for transactions after that month
      const monthlyBalances: number[] = [];

      for (let m = 0; m < 12; m++) {
        const monthNum = String(m + 1).padStart(2, '0');
        // Last day of this month
        const lastDayOfMonth = new Date(selectedYear, m + 1, 0).getDate();
        const endOfMonthDateStr = `${selectedYear}-${monthNum}-${String(lastDayOfMonth).padStart(2, '0')}`;
        
        // Check all transactions for these accounts strictly AFTER this month-end
        const subsequentTxs = appState.transactions.filter((tx) => {
          return accIds.includes(tx.accountId) && tx.date > endOfMonthDateStr;
        });

        // If a transaction occurred AFTER endOfMonthDateStr:
        // An income added to current balance, so to roll back we subtract it.
        // An expense subtracted from current balance, so to roll back we add it.
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

      return {
        id: entity.id,
        name: entity.name,
        color: entity.color,
        accountCount: matchingAccounts.length,
        currentBalance,
        monthlyBalances,
        startBalance,
        endBalance,
        yearlyDiff
      };
    }).filter((e) => e.accountCount > 0);
  }, [appState.accounts, appState.transactions, selectedYear]);

  // Total Consolidated balance row across all banks per month
  const consolidatedMonthlyBalances = useMemo(() => {
    const totals: number[] = Array(12).fill(0);
    bankEntities.forEach((entity) => {
      entity.monthlyBalances.forEach((val, idx) => {
        totals[idx] += val;
      });
    });
    return totals;
  }, [bankEntities]);

  const totalStartYear = consolidatedMonthlyBalances[0] || 0;
  const totalEndYear = consolidatedMonthlyBalances[11] || 0;
  const totalYearGrowth = totalEndYear - totalStartYear;
  const totalGrowthPercent = totalStartYear !== 0 
    ? Math.round((totalYearGrowth / Math.abs(totalStartYear)) * 100) 
    : 0;

  // Monthly cashflow: Income vs Expense per month for the year
  const monthlyCashflow = useMemo(() => {
    return MONTH_NAMES_SHORT.map((name, idx) => {
      const monthNum = String(idx + 1).padStart(2, '0');
      const prefix = `${selectedYear}-${monthNum}`;
      const txs = yearTransactions.filter((t) => t.date.startsWith(prefix));
      const income = txs.filter((t) => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
      const expense = txs.filter((t) => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
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
          <div className="flex items-center gap-2 self-start lg:self-auto">
            <button
              onClick={handlePrevYear}
              className="p-2 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-700 hover:bg-zinc-100 cursor-pointer"
              title="Año anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="px-5 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-center min-w-[130px]">
              <span className="text-xs font-semibold text-emerald-800 uppercase block tracking-wider">
                Año Fiscal
              </span>
              <span className="text-base font-black text-emerald-950">
                {selectedYear}
              </span>
            </div>

            <button
              onClick={handleNextYear}
              className="p-2 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-700 hover:bg-zinc-100 cursor-pointer"
              title="Año siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              onClick={handlePrint}
              className="ml-2 px-3.5 py-2 rounded-xl text-xs font-bold text-zinc-700 bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="Imprimir o guardar como PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              Imprimir
            </button>
          </div>
        </div>
      </div>

      {/* KPI Summary Cards for the entire Year */}
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
            Total acumulado en {selectedYear}
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
            Total desembolsado en {selectedYear}
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
            {totalYearNet >= 0 ? 'Capacidad de ahorro anual' : 'Déficit acumulado'}
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
          <span className="text-[11px] text-zinc-500 block mt-1">
            {totalYearGrowth >= 0 ? `+${formatCurrency(totalYearGrowth)}` : formatCurrency(totalYearGrowth)}
          </span>
        </div>
      </div>

      {/* MATRIZ MAESTRA: TABLA DE SALDOS TOTALES DE CADA BANCO POR MESES */}
      <div className="bg-white border-2 border-emerald-600/45 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-emerald-100 bg-gradient-to-r from-emerald-50/80 via-white to-emerald-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#092B19] text-emerald-400 flex items-center justify-center shadow-xs">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-black text-zinc-950">
                Saldos Totales de cada Banco por Meses ({selectedYear})
              </h3>
              <p className="text-xs text-zinc-500">
                Evolución del saldo disponible y carteras al cierre de cada uno de los 12 meses
              </p>
            </div>
          </div>
          <span className="text-xs font-extrabold text-[#0E6A3B] bg-emerald-100/80 px-3 py-1 rounded-full border border-emerald-300">
            Saldos en Euros (€)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 uppercase font-bold text-[10px]">
              <tr>
                <th className="px-4 py-3 sticky left-0 bg-zinc-50 z-10 shadow-xs">
                  Entidad Bancaria
                </th>
                {MONTH_NAMES_SHORT.map((m) => (
                  <th key={m} className="px-3 py-3 text-right">
                    {m}
                  </th>
                ))}
                <th className="px-4 py-3 text-right bg-emerald-50/60 text-emerald-950 font-black border-l border-emerald-200">
                  Cierre {selectedYear}
                </th>
                <th className="px-4 py-3 text-right bg-emerald-50/60 text-emerald-950 font-black">
                  Var. Anual
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {bankEntities.map((entity) => (
                <tr key={entity.id} className="hover:bg-zinc-50/80 transition-colors">
                  {/* Sticky Bank Name Column */}
                  <td className="px-4 py-3.5 font-bold text-zinc-900 sticky left-0 bg-white z-10 shadow-xs flex items-center gap-2">
                    <span 
                      className="w-2.5 h-2.5 rounded-full shrink-0" 
                      style={{ backgroundColor: entity.color }}
                    />
                    <div>
                      <span className="font-extrabold block text-zinc-900">{entity.name}</span>
                      <span className="text-[10px] text-zinc-400 font-normal">
                        {entity.accountCount} {entity.accountCount === 1 ? 'cuenta' : 'cuentas'}
                      </span>
                    </div>
                  </td>

                  {/* 12 Monthly Balances */}
                  {entity.monthlyBalances.map((val, idx) => (
                    <td 
                      key={idx} 
                      className="px-3 py-3.5 text-right font-medium text-zinc-700 font-feature-settings-tnum"
                    >
                      {formatCurrency(val)}
                    </td>
                  ))}

                  {/* Year-End Balance */}
                  <td className="px-4 py-3.5 text-right font-black text-zinc-950 bg-emerald-50/30 border-l border-emerald-100 font-feature-settings-tnum">
                    {formatCurrency(entity.endBalance)}
                  </td>

                  {/* Yearly Difference */}
                  <td className={`px-4 py-3.5 text-right font-extrabold bg-emerald-50/30 font-feature-settings-tnum ${
                    entity.yearlyDiff >= 0 ? 'text-[#0E6A3B]' : 'text-rose-600'
                  }`}>
                    {entity.yearlyDiff >= 0 ? `+${formatCurrency(entity.yearlyDiff)}` : formatCurrency(entity.yearlyDiff)}
                  </td>
                </tr>
              ))}
            </tbody>

            {/* Total Row (Patrimonio Consolidado Mensual) */}
            <tfoot className="bg-[#092B19] text-white font-black border-t-2 border-[#0E6A3B]">
              <tr>
                <td className="px-4 py-3.5 text-emerald-300 uppercase text-[11px] sticky left-0 bg-[#092B19] z-10 shadow-xs">
                  TOTAL CONSOLIDADO (€)
                </td>
                {consolidatedMonthlyBalances.map((val, idx) => (
                  <td key={idx} className="px-3 py-3.5 text-right text-white font-black font-feature-settings-tnum">
                    {formatCurrency(val)}
                  </td>
                ))}
                <td className="px-4 py-3.5 text-right text-emerald-300 text-sm font-black border-l border-emerald-700 font-feature-settings-tnum">
                  {formatCurrency(totalEndYear)}
                </td>
                <td className={`px-4 py-3.5 text-right font-black text-sm font-feature-settings-tnum ${
                  totalYearGrowth >= 0 ? 'text-emerald-300' : 'text-rose-400'
                }`}>
                  {totalYearGrowth >= 0 ? `+${formatCurrency(totalYearGrowth)}` : formatCurrency(totalYearGrowth)}
                </td>
              </tr>
            </tfoot>
          </table>
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
