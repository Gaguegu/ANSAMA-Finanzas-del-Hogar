import React from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  PiggyBank, 
  ArrowUpRight, 
  ArrowDownRight, 
  Percent,
  ShieldAlert,
  CreditCard
} from 'lucide-react';
import { BankAccount, Transaction } from '../types';
import { formatCurrency } from '../utils/storage';

interface NetWorthCardProps {
  accounts: BankAccount[];
  transactions: Transaction[];
}

export const NetWorthCard: React.FC<NetWorthCardProps> = ({ accounts, transactions }) => {
  // Current month calculation
  const currentMonthPrefix = new Date().toISOString().substring(0, 7); // '2026-09'

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

  // Monthly income and expense calculation
  const monthlyTransactions = transactions.filter((t) => t.date.startsWith(currentMonthPrefix));
  
  const monthlyIncome = monthlyTransactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const monthlyExpense = monthlyTransactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const monthlySavings = monthlyIncome - monthlyExpense;
  const savingsRate = monthlyIncome > 0 ? (monthlySavings / monthlyIncome) * 100 : 0;

  return (
    <div id="section-net-worth" className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 lg:p-7">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-5 mb-6">
        <div>
          <span className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
            Resumen Consolidado • Hogar ANSAMA
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-0.5">
            Patrimonio Neto: {formatCurrency(netWorth)}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full ${
            savingsRate >= 20 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
          }`}>
            <TrendingUp className="w-3.5 h-3.5" />
            Tasa de Ahorro: {savingsRate.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Grid of Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Activos Totales */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Activos Totales</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
              <PiggyBank className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-bold text-slate-900">
              {formatCurrency(totalAssets)}
            </div>
            <p className="text-xs text-slate-500 mt-1">Cuentas bancarias y ahorro</p>
          </div>
        </div>

        {/* Pasivos / Tarjetas */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Deuda / Tarjetas</span>
            <div className="w-7 h-7 rounded-lg bg-rose-100 flex items-center justify-center text-rose-700">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-bold text-rose-600">
              {formatCurrency(totalLiabilities)}
            </div>
            <p className="text-xs text-slate-500 mt-1">Dispuesto en tarjetas de crédito</p>
          </div>
        </div>

        {/* Ingresos del Mes */}
        <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-100 flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-800 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Ingresos (Mes)</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-200/70 flex items-center justify-center text-emerald-800">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-bold text-emerald-700">
              {formatCurrency(monthlyIncome)}
            </div>
            <p className="text-xs text-emerald-700/80 mt-1">Nóminas y transferencias</p>
          </div>
        </div>

        {/* Gastos del Mes */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-600 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Gastos (Mes)</span>
            <div className="w-7 h-7 rounded-lg bg-slate-200 flex items-center justify-center text-slate-700">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-bold text-slate-800">
              {formatCurrency(monthlyExpense)}
            </div>
            <div className="flex items-center justify-between mt-1 text-xs">
              <span className="text-slate-500">Ahorro neto:</span>
              <span className={`font-semibold ${monthlySavings >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {monthlySavings >= 0 ? '+' : ''}{formatCurrency(monthlySavings)}
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* Monthly Budget Progress Bar */}
      <div className="mt-5 pt-4 border-t border-slate-100">
        <div className="flex items-center justify-between text-xs text-slate-600 mb-1.5 font-medium">
          <span>Uso de Ingresos del Mes</span>
          <span>
            {monthlyIncome > 0 ? ((monthlyExpense / monthlyIncome) * 100).toFixed(1) : 0}% consumido
          </span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden flex">
          <div 
            className="bg-blue-600 h-full rounded-l-full transition-all duration-500"
            style={{ width: `${Math.min(100, monthlyIncome > 0 ? (monthlyExpense / monthlyIncome) * 100 : 0)}%` }}
            title={`Gastos: ${formatCurrency(monthlyExpense)}`}
          />
          <div 
            className="bg-emerald-500 h-full rounded-r-full transition-all duration-500"
            style={{ width: `${Math.max(0, 100 - (monthlyIncome > 0 ? (monthlyExpense / monthlyIncome) * 100 : 0))}%` }}
            title={`Ahorro: ${formatCurrency(Math.max(0, monthlySavings))}`}
          />
        </div>
        <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-600 inline-block"></span>
            Gastos: {formatCurrency(monthlyExpense)}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
            Ahorro libre: {formatCurrency(Math.max(0, monthlySavings))}
          </span>
        </div>
      </div>

    </div>
  );
};
