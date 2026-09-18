import React, { useState, useMemo } from 'react';
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Lock, 
  Unlock, 
  TrendingUp, 
  TrendingDown, 
  PiggyBank, 
  Building2, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  Printer,
  Sparkles,
  PieChart
} from 'lucide-react';
import { AppState, BankAccount, Transaction, MonthClosure } from '../types';
import { formatCurrency, formatDate } from '../utils/storage';

interface MonthlyClosureProps {
  appState: AppState;
  onUpdateClosure: (closure: MonthClosure) => void;
}

export const MonthlyClosure: React.FC<MonthlyClosureProps> = ({
  appState,
  onUpdateClosure
}) => {
  const today = new Date();
  const currentYearMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  
  const [selectedMonth, setSelectedMonth] = useState<string>(currentYearMonth);
  const [notesText, setNotesText] = useState<string>('');

  // Extract year and month numbers
  const [yearStr, monthStr] = selectedMonth.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);

  // Month name in Spanish
  const monthName = new Date(year, month - 1, 1).toLocaleString('es-ES', { month: 'long' });
  const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);

  // Find existing closure record
  const currentClosure = useMemo(() => {
    return appState.monthlyClosures?.find((c) => c.month === selectedMonth) || {
      month: selectedMonth,
      isClosed: false,
      notes: ''
    };
  }, [appState.monthlyClosures, selectedMonth]);

  // Sync notes text with current closure
  React.useEffect(() => {
    setNotesText(currentClosure.notes || '');
  }, [currentClosure]);

  // Navigate months
  const handlePrevMonth = () => {
    const prevDate = new Date(year, month - 2, 1);
    const newY = prevDate.getFullYear();
    const newM = String(prevDate.getMonth() + 1).padStart(2, '0');
    setSelectedMonth(`${newY}-${newM}`);
  };

  const handleNextMonth = () => {
    const nextDate = new Date(year, month, 1);
    const newY = nextDate.getFullYear();
    const newM = String(nextDate.getMonth() + 1).padStart(2, '0');
    setSelectedMonth(`${newY}-${newM}`);
  };

  // Filter transactions for selected month
  const monthTransactions = useMemo(() => {
    return appState.transactions.filter((tx) => tx.date.startsWith(selectedMonth));
  }, [appState.transactions, selectedMonth]);

  // Compute income and expenses for the month
  const monthIncome = useMemo(() => {
    return monthTransactions
      .filter((tx) => tx.type === 'income')
      .reduce((sum, tx) => sum + tx.amount, 0);
  }, [monthTransactions]);

  const monthExpense = useMemo(() => {
    return monthTransactions
      .filter((tx) => tx.type === 'expense')
      .reduce((sum, tx) => sum + tx.amount, 0);
  }, [monthTransactions]);

  const monthNet = monthIncome - monthExpense;
  const savingsRate = monthIncome > 0 ? Math.round((monthNet / monthIncome) * 100) : 0;

  // Breakdown by bank for this month
  const bankBreakdowns = useMemo(() => {
    const banks = [
      { id: 'bbva', name: 'BBVA' },
      { id: 'santander', name: 'Banco Santander' },
      { id: 'investment', name: 'Cuentas de Valores' },
      { id: 'other', name: 'Otras Entidades' }
    ];

    return banks.map((b) => {
      let bankAccs: BankAccount[] = [];
      if (b.id === 'investment') {
        bankAccs = appState.accounts.filter((a) => a.type === 'investment');
      } else if (b.id === 'bbva') {
        bankAccs = appState.accounts.filter((a) => a.bankId === 'bbva' && a.type !== 'investment');
      } else if (b.id === 'santander') {
        bankAccs = appState.accounts.filter((a) => a.bankId === 'santander' && a.type !== 'investment');
      } else {
        bankAccs = appState.accounts.filter((a) => a.bankId !== 'bbva' && a.bankId !== 'santander' && a.type !== 'investment');
      }

      const accIds = bankAccs.map((a) => a.id);
      const txs = monthTransactions.filter((tx) => accIds.includes(tx.accountId));
      const income = txs.filter((tx) => tx.type === 'income').reduce((sum, tx) => sum + tx.amount, 0);
      const expense = txs.filter((tx) => tx.type === 'expense').reduce((sum, tx) => sum + tx.amount, 0);
      const net = income - expense;
      const currentBalance = bankAccs.reduce((sum, a) => sum + a.balance, 0);

      return {
        id: b.id,
        name: b.name,
        accountsCount: bankAccs.length,
        income,
        expense,
        net,
        currentBalance
      };
    }).filter((b) => b.accountsCount > 0);
  }, [appState.accounts, monthTransactions]);

  // Toggle close / open status
  const handleToggleClose = () => {
    const updated: MonthClosure = {
      month: selectedMonth,
      isClosed: !currentClosure.isClosed,
      closedAt: !currentClosure.isClosed ? new Date().toISOString() : undefined,
      notes: notesText
    };
    onUpdateClosure(updated);
  };

  const handleSaveNotes = () => {
    const updated: MonthClosure = {
      ...currentClosure,
      notes: notesText
    };
    onUpdateClosure(updated);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div id="section-monthly-closure" className="space-y-6 animate-in fade-in">
      
      {/* Header Banner - Resaltado verde corporativo */}
      <div className="bg-white border-2 border-emerald-600/40 rounded-2xl p-5 shadow-sm ring-1 ring-emerald-950/5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#092B19] border border-emerald-700/60 flex items-center justify-center text-emerald-400 shadow-sm shrink-0">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-zinc-950">
                  Control y Cierre Mensual
                </h2>
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${
                  currentClosure.isClosed
                    ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                    : 'bg-amber-50 text-amber-900 border-amber-300'
                }`}>
                  {currentClosure.isClosed ? (
                    <>
                      <Lock className="w-3 h-3 text-[#0E6A3B]" />
                      Mes Cerrado & Auditado
                    </>
                  ) : (
                    <>
                      <Unlock className="w-3 h-3 text-amber-600" />
                      Mes Abierto (En curso)
                    </>
                  )}
                </span>
              </div>
              <p className="text-xs text-zinc-600 mt-0.5">
                Supervisa y cierra el balance mensual de ingresos, gastos y evolución de saldos por banco.
              </p>
            </div>
          </div>

          {/* Month selector controls */}
          <div className="flex items-center gap-2 self-start lg:self-auto">
            <button
              onClick={handlePrevMonth}
              className="p-2 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-700 hover:bg-zinc-100 cursor-pointer"
              title="Mes anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-center min-w-[170px]">
              <span className="text-xs font-semibold text-emerald-800 uppercase block tracking-wider">
                Periodo Mensual
              </span>
              <span className="text-sm font-black text-emerald-950">
                {capitalizedMonth} {year}
              </span>
            </div>

            <button
              onClick={handleNextMonth}
              className="p-2 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-700 hover:bg-zinc-100 cursor-pointer"
              title="Mes siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Close/Open Month Button */}
            <button
              onClick={handleToggleClose}
              className={`ml-2 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer ${
                currentClosure.isClosed
                  ? 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 border border-zinc-300'
                  : 'bg-[#0E6A3B] text-white hover:bg-[#0a522d]'
              }`}
            >
              {currentClosure.isClosed ? (
                <>
                  <Unlock className="w-3.5 h-3.5" />
                  Reabrir Mes
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  Cerrar Mes {capitalizedMonth}
                </>
              )}
            </button>

            {/* Print Button */}
            <button
              onClick={handlePrint}
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-zinc-700 bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
              title="Imprimir informe mensual o guardar como PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Summary Cards for the selected month */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Income */}
        <div className="bg-white rounded-2xl border-2 border-emerald-600/30 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wide">Ingresos del Mes</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-[#0E6A3B] flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-800 font-feature-settings-tnum">
            +{formatCurrency(monthIncome)}
          </div>
          <span className="text-[11px] text-zinc-400 block mt-1">
            {monthTransactions.filter(t => t.type === 'income').length} movimientos de ingreso
          </span>
        </div>

        {/* Total Expense */}
        <div className="bg-white rounded-2xl border-2 border-emerald-600/30 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wide">Gastos del Mes</span>
            <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-rose-600 font-feature-settings-tnum">
            -{formatCurrency(monthExpense)}
          </div>
          <span className="text-[11px] text-zinc-400 block mt-1">
            {monthTransactions.filter(t => t.type === 'expense').length} movimientos de gasto
          </span>
        </div>

        {/* Net Savings */}
        <div className="bg-white rounded-2xl border-2 border-emerald-600/30 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wide">Ahorro Neto</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#0E6A3B] border border-emerald-200 flex items-center justify-center">
              <PiggyBank className="w-4 h-4" />
            </div>
          </div>
          <div className={`mt-2 text-2xl font-black font-feature-settings-tnum ${
            monthNet >= 0 ? 'text-[#0E6A3B]' : 'text-rose-600'
          }`}>
            {monthNet >= 0 ? `+${formatCurrency(monthNet)}` : formatCurrency(monthNet)}
          </div>
          <span className="text-[11px] text-zinc-500 block mt-1 font-semibold">
            {monthNet >= 0 ? 'Superávit mensual' : 'Déficit en el periodo'}
          </span>
        </div>

        {/* Savings Rate */}
        <div className="bg-white rounded-2xl border-2 border-emerald-600/30 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wide">Tasa de Ahorro</span>
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <PieChart className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-zinc-950 font-feature-settings-tnum">
            {savingsRate}%
          </div>
          <span className="text-[11px] text-zinc-400 block mt-1">
            Del total de ingresos guardado
          </span>
        </div>
      </div>

      {/* Saldos y Conciliación por Banco en este Mes */}
      <div className="bg-white border-2 border-emerald-600/40 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-emerald-100 bg-emerald-50/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#0E6A3B]" />
            <h3 className="text-base font-black text-zinc-950">
              Conciliación y Saldos por Entidad en {capitalizedMonth}
            </h3>
          </div>
          <span className="text-xs text-zinc-500">
            Resumen contable del mes
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 uppercase font-bold text-[10px]">
              <tr>
                <th className="px-5 py-3">Entidad Bancaria</th>
                <th className="px-5 py-3">Cuentas</th>
                <th className="px-5 py-3 text-right">Ingresos Mes</th>
                <th className="px-5 py-3 text-right">Gastos Mes</th>
                <th className="px-5 py-3 text-right">Balance Neto Mes</th>
                <th className="px-5 py-3 text-right">Saldo Actual</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {bankBreakdowns.map((b) => (
                <tr key={b.id} className="hover:bg-zinc-50/80 transition-colors">
                  <td className="px-5 py-3.5 font-black text-zinc-900 flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${
                      b.id === 'bbva' ? 'bg-[#004481]' : b.id === 'santander' ? 'bg-[#EC0000]' : 'bg-[#0E6A3B]'
                    }`} />
                    {b.name}
                  </td>
                  <td className="px-5 py-3.5 text-zinc-600 font-medium">
                    {b.accountsCount} {b.accountsCount === 1 ? 'cuenta' : 'cuentas'}
                  </td>
                  <td className="px-5 py-3.5 text-right font-bold text-emerald-800 font-feature-settings-tnum">
                    +{formatCurrency(b.income)}
                  </td>
                  <td className="px-5 py-3.5 text-right font-bold text-rose-600 font-feature-settings-tnum">
                    -{formatCurrency(b.expense)}
                  </td>
                  <td className={`px-5 py-3.5 text-right font-extrabold font-feature-settings-tnum ${
                    b.net >= 0 ? 'text-[#0E6A3B]' : 'text-rose-600'
                  }`}>
                    {b.net >= 0 ? `+${formatCurrency(b.net)}` : formatCurrency(b.net)}
                  </td>
                  <td className="px-5 py-3.5 text-right font-black text-zinc-950 font-feature-settings-tnum">
                    {formatCurrency(b.currentBalance)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-emerald-50/60 font-black border-t-2 border-emerald-200">
              <tr>
                <td colSpan={2} className="px-5 py-3 text-zinc-900 uppercase text-[11px]">
                  Total Consolidado Mes
                </td>
                <td className="px-5 py-3 text-right text-emerald-900 font-feature-settings-tnum">
                  +{formatCurrency(monthIncome)}
                </td>
                <td className="px-5 py-3 text-right text-rose-700 font-feature-settings-tnum">
                  -{formatCurrency(monthExpense)}
                </td>
                <td className={`px-5 py-3 text-right font-feature-settings-tnum ${
                  monthNet >= 0 ? 'text-[#0E6A3B]' : 'text-rose-700'
                }`}>
                  {monthNet >= 0 ? `+${formatCurrency(monthNet)}` : formatCurrency(monthNet)}
                </td>
                <td className="px-5 py-3 text-right text-[#092B19] text-sm font-feature-settings-tnum">
                  {formatCurrency(appState.accounts.reduce((s, a) => s + a.balance, 0))}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Notas de Cierre Mensual */}
      <div className="bg-white border-2 border-emerald-600/40 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#0E6A3B]" />
            <h4 className="text-sm font-bold text-zinc-900">
              Notas y Conclusiones del Cierre de {capitalizedMonth} {year}
            </h4>
          </div>
          {currentClosure.closedAt && (
            <span className="text-[11px] text-zinc-500">
              Cerrado el {formatDate(currentClosure.closedAt)}
            </span>
          )}
        </div>

        <textarea
          rows={3}
          value={notesText}
          onChange={(e) => setNotesText(e.target.value)}
          placeholder="Escribe aquí observaciones sobre este mes: gastos imprevistos, objetivos de ahorro alcanzados, compras extraordinarias..."
          className="w-full p-3 text-xs rounded-xl bg-zinc-50 border border-zinc-200 focus:bg-white focus:border-[#0E6A3B] focus:ring-1 focus:ring-[#0E6A3B] text-zinc-900 font-medium"
        />

        <div className="flex justify-end mt-2">
          <button
            onClick={handleSaveNotes}
            className="px-3.5 py-1.5 text-xs font-bold text-white bg-[#0E6A3B] hover:bg-[#0a522d] rounded-xl cursor-pointer"
          >
            Guardar Notas del Mes
          </button>
        </div>
      </div>

      {/* List of transactions for this month */}
      <div className="bg-white border-2 border-emerald-600/40 rounded-2xl p-5 shadow-sm">
        <h4 className="text-sm font-bold text-zinc-900 mb-3">
          Movimientos Registrados en {capitalizedMonth} ({monthTransactions.length})
        </h4>

        {monthTransactions.length === 0 ? (
          <div className="py-8 text-center text-zinc-400 text-xs">
            No hay movimientos registrados para este mes.
          </div>
        ) : (
          <div className="divide-y divide-zinc-100 max-h-80 overflow-y-auto pr-1">
            {monthTransactions.map((tx) => (
              <div key={tx.id} className="py-2.5 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-zinc-900 block">{tx.title}</span>
                  <span className="text-[11px] text-zinc-400">
                    {formatDate(tx.date)} {tx.note ? `• ${tx.note}` : ''}
                  </span>
                </div>
                <span className={`font-black font-feature-settings-tnum ${
                  tx.type === 'income' ? 'text-emerald-700' : 'text-zinc-900'
                }`}>
                  {tx.type === 'income' ? `+${formatCurrency(tx.amount)}` : `-${formatCurrency(tx.amount)}`}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
