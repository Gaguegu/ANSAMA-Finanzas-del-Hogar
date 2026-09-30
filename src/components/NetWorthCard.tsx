import React from 'react';
import { 
  TrendingUp, 
  PiggyBank, 
  ArrowUpRight, 
  ArrowDownRight, 
  CreditCard,
  ShieldCheck,
  Calendar
} from 'lucide-react';
import { BankAccount, Transaction } from '../types';
import { formatCurrency } from '../utils/storage';

interface NetWorthCardProps {
  accounts: BankAccount[];
  transactions: Transaction[];
  selectedMonth?: string;
  onResetToCurrentMonth?: () => void;
}

export const NetWorthCard: React.FC<NetWorthCardProps> = ({ 
  accounts, 
  transactions,
  selectedMonth,
  onResetToCurrentMonth
}) => {
  // Current month calculation
  const currentMonthPrefix = new Date().toISOString().substring(0, 7); // '2026-09'
  const activeMonth = selectedMonth || currentMonthPrefix;
  const isHistorical = activeMonth !== currentMonthPrefix;

  // Total Assets & Liabilities
  let totalAssets = 0;
  let totalLiabilities = 0;

  accounts.forEach((acc) => {
    if (acc.balance >= 0) {
      totalAssets += acc.balance;
    } else {
      totalLiabilities += Math.abs(acc.balance);
    }
  });

  const netWorth = totalAssets - totalLiabilities;

  // Monthly income and expense calculation for active month
  const monthlyTransactions = transactions.filter((t) => t.date.startsWith(activeMonth));
  
  const monthlyIncome = monthlyTransactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const monthlyExpense = monthlyTransactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const monthlySavings = monthlyIncome - monthlyExpense;
  const savingsRate = monthlyIncome > 0 ? (monthlySavings / monthlyIncome) * 100 : 0;
  const expensePercentage = monthlyIncome > 0 ? Math.min(100, (monthlyExpense / monthlyIncome) * 100) : 0;

  const [yearStr, monthStr] = activeMonth.split('-');
  const displayDate = new Date(parseInt(yearStr, 10), parseInt(monthStr, 10) - 1, 1);
  const activeMonthName = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(displayDate);

  return (
    <div id="section-net-worth" className="bg-white rounded-2xl border-2 border-[#0E6A3B]/50 shadow-sm ring-1 ring-emerald-950/10 overflow-hidden">
      
      {/* Barra superior de acento verde corporativo */}
      <div className="h-1.5 bg-gradient-to-r from-[#092B19] via-[#0E6A3B] to-emerald-400" />
      
      {/* Executive Header Banner */}
      <div className="p-5 sm:p-6 lg:p-7 border-b border-emerald-100/90 bg-gradient-to-r from-emerald-50/85 via-white to-emerald-50/40">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-black tracking-wider text-[#0E6A3B] uppercase">
                {isHistorical ? `Patrimonio Consolidado • ${activeMonthName}` : 'Patrimonio Consolidado • Hogar ANSAMA'}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100/90 text-emerald-900 border border-emerald-300">
                <ShieldCheck className="w-3.5 h-3.5 text-[#0E6A3B]" />
                PSD2 Verificado
              </span>
            </div>

            <div className="flex items-baseline gap-3">
              <h2 className="text-3xl sm:text-4xl font-black text-zinc-950 tracking-tight font-feature-settings-tnum">
                {formatCurrency(netWorth)}
              </h2>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-emerald-200/80 text-xs font-semibold text-zinc-800 shadow-2xs">
              <Calendar className="w-3.5 h-3.5 text-[#0E6A3B]" />
              <span className="capitalize">{activeMonthName}</span>
            </div>

            <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-1.5 rounded-xl border-2 shadow-2xs ${
              savingsRate >= 20 
                ? 'bg-emerald-50/90 text-[#0E6A3B] border-emerald-300' 
                : 'bg-amber-50 text-amber-800 border-amber-300'
            }`}>
              <TrendingUp className="w-3.5 h-3.5" />
              Tasa de Ahorro: {savingsRate.toFixed(1)}%
            </span>
          </div>
        </div>

        {isHistorical && (
          <div className="mt-4 p-3 bg-amber-50/90 border border-amber-300/80 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs text-amber-950 shadow-2xs">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-700 shrink-0" />
              <span>
                Estás visualizando la posición global consolidada y los saldos bancarios a cierre de <strong className="capitalize">{activeMonthName}</strong>.
              </span>
            </div>
            {onResetToCurrentMonth && (
              <button
                type="button"
                onClick={onResetToCurrentMonth}
                className="font-bold text-[#0E6A3B] hover:text-[#094d2a] hover:underline cursor-pointer"
              >
                Volver a saldos actuales &rarr;
              </button>
            )}
          </div>
        )}
      </div>

      {/* Grid of 4 Key Metrics */}
      <div className="p-5 sm:p-6 lg:p-7">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Activos Totales */}
          <div className="p-4 rounded-xl bg-emerald-50/30 border-2 border-emerald-600/35 shadow-2xs hover:border-emerald-600/70 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between text-zinc-500 mb-3">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-900">Activos Totales</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-100/90 border border-emerald-300 flex items-center justify-center text-[#0E6A3B]">
                <PiggyBank className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-black text-zinc-950 tracking-tight font-feature-settings-tnum">
                {formatCurrency(totalAssets)}
              </div>
              <p className="text-xs text-emerald-800/80 mt-1 font-semibold">Cuentas bancarias y ahorro</p>
            </div>
          </div>

          {/* Pasivos / Tarjetas */}
          <div className="p-4 rounded-xl bg-white border-2 border-zinc-200/90 shadow-2xs hover:border-zinc-300 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between text-zinc-500 mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-600">Deuda / Tarjetas</span>
              <div className="w-8 h-8 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
                <CreditCard className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-rose-600 tracking-tight font-feature-settings-tnum">
                {formatCurrency(totalLiabilities)}
              </div>
              <p className="text-xs text-zinc-500 mt-1 font-medium">Dispuesto en tarjetas de crédito</p>
            </div>
          </div>

          {/* Ingresos del Mes */}
          <div className="p-4 rounded-xl bg-emerald-50/50 border-2 border-emerald-500/40 shadow-2xs hover:border-emerald-500/70 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between text-emerald-900 mb-3">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-900">Ingresos (Mes)</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-100/90 border border-emerald-300 flex items-center justify-center text-[#0E6A3B]">
                <ArrowDownRight className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-black text-emerald-900 tracking-tight font-feature-settings-tnum">
                {formatCurrency(monthlyIncome)}
              </div>
              <p className="text-xs text-emerald-800/80 mt-1 font-semibold">Nóminas y transferencias</p>
            </div>
          </div>

          {/* Gastos del Mes */}
          <div className="p-4 rounded-xl bg-white border-2 border-zinc-200/90 shadow-2xs hover:border-zinc-300 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between text-zinc-600 mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-600">Gastos (Mes)</span>
              <div className="w-8 h-8 rounded-xl bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-700">
                <ArrowUpRight className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-zinc-900 tracking-tight font-feature-settings-tnum">
                {formatCurrency(monthlyExpense)}
              </div>
              <div className="flex items-center justify-between mt-1 text-xs">
                <span className="text-zinc-500 font-medium">Margen libre:</span>
                <span className={`font-bold ${monthlySavings >= 0 ? 'text-[#0E6A3B]' : 'text-rose-600'}`}>
                  {monthlySavings >= 0 ? '+' : ''}{formatCurrency(monthlySavings)}
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* Monthly Budget Progress Bar & Liquidity Health */}
        <div className="mt-6 pt-5 border-t border-zinc-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs text-zinc-600 mb-2">
            <span className="font-semibold text-zinc-800">
              Uso del Presupuesto de Ingresos del Mes
            </span>
            <span className="font-bold text-zinc-900 font-feature-settings-tnum">
              {expensePercentage.toFixed(1)}% consumido ({formatCurrency(monthlyExpense)} de {formatCurrency(monthlyIncome)})
            </span>
          </div>

          <div className="w-full bg-zinc-100 rounded-full h-3 overflow-hidden flex p-0.5 border border-zinc-200/60 shadow-inner">
            <div 
              className="bg-zinc-800 h-full rounded-l-full transition-all duration-500"
              style={{ width: `${expensePercentage}%` }}
              title={`Gastos: ${formatCurrency(monthlyExpense)}`}
            />
            <div 
              className="bg-[#0E6A3B] h-full rounded-r-full transition-all duration-500"
              style={{ width: `${Math.max(0, 100 - expensePercentage)}%` }}
              title={`Ahorro disponible: ${formatCurrency(Math.max(0, monthlySavings))}`}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-500 mt-2.5">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 font-medium text-zinc-700">
                <span className="w-2.5 h-2.5 rounded-full bg-zinc-800 inline-block"></span>
                Gastos devengados: <strong className="text-zinc-900">{formatCurrency(monthlyExpense)}</strong>
              </span>
              <span className="flex items-center gap-1.5 font-medium text-zinc-700">
                <span className="w-2.5 h-2.5 rounded-full bg-[#0E6A3B] inline-block"></span>
                Ahorro neto protegido: <strong className="text-[#0E6A3B]">{formatCurrency(Math.max(0, monthlySavings))}</strong>
              </span>
            </div>
            <span className="text-[11px] text-zinc-400">
              Límite prudencial: máx. 70% de ingresos en gastos fijos
            </span>
          </div>
        </div>

      </div>

    </div>
  );
};
