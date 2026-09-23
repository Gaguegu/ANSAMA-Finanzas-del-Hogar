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
  PieChart,
  Edit3,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Layers,
  ListFilter
} from 'lucide-react';
import { AppState, BankAccount, Transaction, MonthClosure } from '../types';
import { formatCurrency, formatDate, parseCurrencyInput } from '../utils/storage';

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
  
  // Estado para alternar vista de tabla: 'detailed' (todas las cuentas desglosadas) o 'grouped' (por entidad)
  const [closureTableView, setClosureTableView] = useState<'detailed' | 'grouped'>('detailed');
  const [expandedEntities, setExpandedEntities] = useState<Set<string>>(new Set());

  // Estado para ajustar saldos de cierre (especialmente cuenta de valores)
  const [isEditingBalances, setIsEditingBalances] = useState<boolean>(false);
  const [tempBalances, setTempBalances] = useState<Record<string, string>>({});

  // Extract year and month numbers
  const [yearStr, monthStr] = selectedMonth.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);

  // Month name in Spanish
  const monthName = new Date(year, month - 1, 1).toLocaleString('es-ES', { month: 'long' });
  const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);

  // Último día del mes en formato YYYY-MM-DD
  const lastDayOfMonthStr = useMemo(() => {
    const lastDay = new Date(year, month, 0);
    return `${year}-${String(month).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`;
  }, [year, month]);

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

  // Reconstrucción del saldo histórico de cada cuenta al final de ese mes
  const getAccountBalanceForMonth = (acc: BankAccount): number => {
    // 1. Si ya existe un saldo auditado/congelado para este mes específico, usarlo
    if (currentClosure.auditedBalances?.[acc.id] !== undefined) {
      return Math.round(currentClosure.auditedBalances[acc.id] * 100) / 100;
    }

    // 2. Si este mes NO está auditado todavía, buscar el cierre auditado PREVIO más reciente
    const priorClosures = (appState.monthlyClosures || [])
      .filter((c) => c.month < selectedMonth && c.auditedBalances && c.auditedBalances[acc.id] !== undefined)
      .sort((a, b) => b.month.localeCompare(a.month)); // Meses descendentes (el más reciente primero)

    const latestPrior = priorClosures[0];

    // Si encontramos una auditoría previa para esta cuenta (ej. en enero se puso el depósito a 0 o valores a X)
    if (latestPrior && latestPrior.auditedBalances) {
      const priorBalance = latestPrior.auditedBalances[acc.id];

      // Para depósitos a plazo fijo: si en un mes anterior se liquidó (saldo 0) o se fijó saldo,
      // se arrastra ese saldo automáticamente a los meses siguientes (NO resucita a su saldo original)
      if (acc.type === 'deposit') {
        return Math.round(priorBalance * 100) / 100;
      }

      // Para cuentas de inversión / valores: hereda el último saldo auditado como base sugerida
      if (acc.type === 'investment') {
        return Math.round(priorBalance * 100) / 100;
      }

      // Para cuentas bancarias: saldo del mes anterior + ingresos desde entonces - gastos desde entonces
      const [pYear, pMonth] = latestPrior.month.split('-');
      const pLastDay = new Date(parseInt(pYear, 10), parseInt(pMonth, 10), 0).getDate();
      const pEndStr = `${latestPrior.month}-${String(pLastDay).padStart(2, '0')}`;

      const intervalTxs = appState.transactions.filter(
        (tx) => tx.accountId === acc.id && tx.date > pEndStr && tx.date <= lastDayOfMonthStr
      );
      const inc = intervalTxs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
      const exp = intervalTxs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
      return Math.round((priorBalance + inc - exp) * 100) / 100;
    }

    // 3. Si no hay cierres previos para esta cuenta:
    if (acc.type === 'investment' || acc.type === 'deposit') {
      return Math.round(acc.balance * 100) / 100;
    }

    // Para cuentas bancarias sin historial previo:
    // Saldo al fin de ese mes = Saldo Actual - (Ingresos posteriores) + (Gastos posteriores)
    const futureTxs = appState.transactions.filter(tx => tx.accountId === acc.id && tx.date > lastDayOfMonthStr);
    const futureIncome = futureTxs.filter(tx => tx.type === 'income').reduce((s, tx) => s + tx.amount, 0);
    const futureExpense = futureTxs.filter(tx => tx.type === 'expense').reduce((s, tx) => s + tx.amount, 0);
    const calculated = acc.balance - futureIncome + futureExpense;
    return Math.round(calculated * 100) / 100;
  };

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

  // Breakdown dinámico por entidad bancaria real para este mes
  const bankBreakdowns = useMemo(() => {
    // 1. Cuentas bancarias ordinarias (corrientes, ahorro, crédito) agrupadas por su banco real
    const bankingAccounts = appState.accounts.filter(a => a.type !== 'investment' && a.type !== 'deposit');
    const bankGroupsMap = new Map<string, {
      id: string;
      name: string;
      color: string;
      accounts: BankAccount[];
    }>();

    bankingAccounts.forEach(acc => {
      const key = acc.bankId === 'other' ? (acc.bankName || 'other') : acc.bankId;
      if (!bankGroupsMap.has(key)) {
        bankGroupsMap.set(key, {
          id: key,
          name: acc.bankName || acc.bankId.toUpperCase(),
          color: acc.color || '#0E6A3B',
          accounts: []
        });
      }
      bankGroupsMap.get(key)!.accounts.push(acc);
    });

    const groups: Array<{
      id: string;
      name: string;
      color: string;
      accounts: BankAccount[];
    }> = Array.from(bankGroupsMap.values());

    // 2. Cuentas de Valores / Inversión
    const investmentAccs = appState.accounts.filter(a => a.type === 'investment');
    if (investmentAccs.length > 0) {
      groups.push({
        id: 'investment',
        name: 'Cuentas de Valores / Inversión',
        color: '#0E6A3B',
        accounts: investmentAccs
      });
    }

    // 3. Depósitos a Plazo Fijo
    const depositAccs = appState.accounts.filter(a => a.type === 'deposit');
    if (depositAccs.length > 0) {
      groups.push({
        id: 'deposit',
        name: 'Depósitos a Plazo Fijo',
        color: '#0284c7',
        accounts: depositAccs
      });
    }

    return groups.map((g) => {
      const accIds = g.accounts.map((a) => a.id);
      const txs = monthTransactions.filter((tx) => accIds.includes(tx.accountId));
      const income = txs.filter((tx) => tx.type === 'income').reduce((sum, tx) => sum + tx.amount, 0);
      const expense = txs.filter((tx) => tx.type === 'expense').reduce((sum, tx) => sum + tx.amount, 0);
      const net = income - expense;
      const currentBalance = g.accounts.reduce((sum, a) => sum + getAccountBalanceForMonth(a), 0);

      // Desglose individual de cada cuenta de este grupo
      const accountsDetailed = g.accounts.map((a) => {
        const aTxs = monthTransactions.filter((tx) => tx.accountId === a.id);
        const aIncome = aTxs.filter((tx) => tx.type === 'income').reduce((sum, tx) => sum + tx.amount, 0);
        const aExpense = aTxs.filter((tx) => tx.type === 'expense').reduce((sum, tx) => sum + tx.amount, 0);
        const aNet = aIncome - aExpense;
        const aBalance = getAccountBalanceForMonth(a);
        return {
          account: a,
          income: aIncome,
          expense: aExpense,
          net: aNet,
          balance: aBalance
        };
      });

      return {
        id: g.id,
        name: g.name,
        color: g.color,
        accountsCount: g.accounts.length,
        income,
        expense,
        net,
        currentBalance,
        accounts: g.accounts,
        accountsDetailed
      };
    }).filter((b) => b.accountsCount > 0);
  }, [appState.accounts, monthTransactions, currentClosure, lastDayOfMonthStr, appState.transactions]);

  // Lista plana de todas las cuentas con su desglose mensual para cotejar con extractos
  const allAccountsDetailed = useMemo(() => {
    return appState.accounts.map((a) => {
      const aTxs = monthTransactions.filter((tx) => tx.accountId === a.id);
      const aIncome = aTxs.filter((tx) => tx.type === 'income').reduce((sum, tx) => sum + tx.amount, 0);
      const aExpense = aTxs.filter((tx) => tx.type === 'expense').reduce((sum, tx) => sum + tx.amount, 0);
      const aNet = aIncome - aExpense;
      const aBalance = getAccountBalanceForMonth(a);
      return {
        account: a,
        income: aIncome,
        expense: aExpense,
        net: aNet,
        balance: aBalance
      };
    }).sort((a, b) => {
      const typePriority: Record<string, number> = {
        checking: 1,
        savings: 2,
        credit: 3,
        investment: 4,
        deposit: 5
      };
      const pA = typePriority[a.account.type] || 6;
      const pB = typePriority[b.account.type] || 6;
      if (pA !== pB) return pA - pB;
      return (a.account.bankName || '').localeCompare(b.account.bankName || '');
    });
  }, [appState.accounts, monthTransactions, currentClosure, lastDayOfMonthStr, appState.transactions]);

  const toggleEntityExpand = (id: string) => {
    setExpandedEntities((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAllEntities = () => {
    setExpandedEntities(new Set(bankBreakdowns.map((b) => b.id)));
  };

  const collapseAllEntities = () => {
    setExpandedEntities(new Set());
  };

  // Total patrimonio a fin de ese mes
  const totalBalanceMonth = useMemo(() => {
    return appState.accounts.reduce((sum, a) => sum + getAccountBalanceForMonth(a), 0);
  }, [appState.accounts, currentClosure, lastDayOfMonthStr, appState.transactions]);

  // Toggle close / open status (guarda foto fija de los saldos de cuentas de valores y bancos de ese mes)
  const handleToggleClose = () => {
    const isClosing = !currentClosure.isClosed;
    const audited: Record<string, number> = isClosing
      ? appState.accounts.reduce((acc, a) => ({ ...acc, [a.id]: getAccountBalanceForMonth(a) }), {})
      : (currentClosure.auditedBalances || {});

    const updated: MonthClosure = {
      month: selectedMonth,
      isClosed: isClosing,
      closedAt: isClosing ? new Date().toISOString() : undefined,
      notes: notesText,
      auditedBalances: audited
    };
    onUpdateClosure(updated);
  };

  // Abrir modal de edición de saldos de cierre (para valores o bancos)
  const handleOpenEditBalances = () => {
    const initialValues: Record<string, string> = {};
    appState.accounts.forEach((a) => {
      const bal = getAccountBalanceForMonth(a);
      initialValues[a.id] = (Math.round(bal * 100) / 100).toFixed(2);
    });
    setTempBalances(initialValues);
    setIsEditingBalances(true);
  };

  // Guardar saldos de cierre personalizados
  const handleSaveCustomBalances = () => {
    const parsedAudited: Record<string, number> = {};
    appState.accounts.forEach((a) => {
      const valStr = tempBalances[a.id];
      const parsed = parseCurrencyInput(valStr || '0');
      parsedAudited[a.id] = isNaN(parsed) ? getAccountBalanceForMonth(a) : parsed;
    });

    const updated: MonthClosure = {
      month: selectedMonth,
      isClosed: true,
      closedAt: currentClosure.closedAt || new Date().toISOString(),
      notes: notesText,
      auditedBalances: parsedAudited
    };
    onUpdateClosure(updated);
    setIsEditingBalances(false);
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

            {/* Botón Ajustar Saldos al Cierre (ideal para poner los saldos de carteras de valores o meses pasados) */}
            <button
              onClick={handleOpenEditBalances}
              title="Ajustar o revisar los saldos exactos de tus cuentas de valores o bancos al cierre de este mes"
              className="px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs bg-white text-zinc-800 border border-zinc-300 hover:bg-zinc-50 cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5 text-[#0E6A3B]" />
              <span className="hidden sm:inline">Ajustar Saldos Cierre</span>
              <span className="sm:hidden">Saldos</span>
            </button>

            {/* Close/Open Month Button */}
            <button
              onClick={handleToggleClose}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer ${
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

      {/* Saldos y Conciliación por Banco y Cuenta en este Mes */}
      <div className="bg-white border-2 border-emerald-600/40 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-emerald-100 bg-emerald-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#0E6A3B]" />
            <div>
              <h3 className="text-base font-black text-zinc-950">
                Conciliación y Saldos de Cuentas en {capitalizedMonth}
              </h3>
              <p className="text-xs text-zinc-500">
                {closureTableView === 'detailed' 
                  ? `Desglose individual de cada una de tus ${allAccountsDetailed.length} cuentas y depósitos para cotejar con tus extractos`
                  : 'Resumen contable agrupado por entidad con opción de desplegar cada subcuenta'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 self-end sm:self-center">
            {closureTableView === 'grouped' && (
              <button
                type="button"
                onClick={() => {
                  if (expandedEntities.size === bankBreakdowns.length) {
                    collapseAllEntities();
                  } else {
                    expandAllEntities();
                  }
                }}
                className="px-2.5 py-1 text-[11px] font-bold text-zinc-700 bg-white hover:bg-zinc-100 border border-zinc-300 rounded-lg cursor-pointer transition-colors"
              >
                {expandedEntities.size === bankBreakdowns.length ? 'Plegar todas' : 'Desplegar todas'}
              </button>
            )}

            <div className="inline-flex bg-zinc-200/80 p-0.5 rounded-lg border border-zinc-300 text-xs">
              <button
                type="button"
                onClick={() => setClosureTableView('detailed')}
                className={`px-3 py-1 rounded-md font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  closureTableView === 'detailed'
                    ? 'bg-white text-[#0E6A3B] shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                <ListFilter className="w-3.5 h-3.5" />
                <span>Detalle por Cuenta</span>
              </button>
              <button
                type="button"
                onClick={() => setClosureTableView('grouped')}
                className={`px-3 py-1 rounded-md font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  closureTableView === 'grouped'
                    ? 'bg-white text-[#0E6A3B] shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Por Entidad</span>
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          {closureTableView === 'detailed' ? (
            /* TABLA 1: VISTA DETALLADA CUENTA POR CUENTA (TODAS LAS CUENTAS) */
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 uppercase font-bold text-[10px]">
                <tr>
                  <th className="px-4 py-3">Entidad Bancaria</th>
                  <th className="px-4 py-3">Nombre Cuenta / IBAN</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3 text-right">Ingresos Mes</th>
                  <th className="px-4 py-3 text-right">Gastos Mes</th>
                  <th className="px-4 py-3 text-right">Balance Neto Mes</th>
                  <th className="px-4 py-3 text-right">
                    {currentClosure.isClosed ? 'Saldo al Cierre' : 'Saldo Actual'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {allAccountsDetailed.map(({ account: a, income, expense, net, balance }) => (
                  <tr key={a.id} className="hover:bg-zinc-50/90 transition-colors">
                    <td className="px-4 py-3 font-bold text-zinc-900 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span 
                          className="w-2.5 h-2.5 rounded-full shrink-0" 
                          style={{ backgroundColor: a.color || (a.bankId === 'bbva' ? '#004481' : a.bankId === 'santander' ? '#EC0000' : '#0E6A3B') }} 
                        />
                        <span>{a.bankName || a.bankId.toUpperCase()}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-semibold text-zinc-900">
                      <div className="truncate max-w-[200px]" title={a.accountName}>
                        {a.accountName}
                      </div>
                      <div className="text-[11px] text-zinc-400 font-mono">
                        {a.accountNumberMasked || '••••'}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {a.type === 'investment' && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900 border border-emerald-300">
                          Valores / Inversión
                        </span>
                      )}
                      {a.type === 'deposit' && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                          balance === 0
                            ? 'bg-zinc-100 text-zinc-600 border-zinc-300'
                            : 'bg-sky-100 text-sky-900 border-sky-300'
                        }`}>
                          {balance === 0 ? 'Depósito Vencido (0 €)' : 'Depósito Plazo Fijo'}
                        </span>
                      )}
                      {a.type === 'checking' && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-700 border border-zinc-200">
                          Corriente
                        </span>
                      )}
                      {a.type === 'savings' && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                          Ahorro
                        </span>
                      )}
                      {a.type === 'credit' && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-purple-50 text-purple-800 border border-purple-200">
                          Crédito
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-800 font-feature-settings-tnum whitespace-nowrap">
                      {income > 0 ? `+${formatCurrency(income)}` : '0,00 €'}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-rose-600 font-feature-settings-tnum whitespace-nowrap">
                      {expense > 0 ? `-${formatCurrency(expense)}` : '0,00 €'}
                    </td>
                    <td className={`px-4 py-3 text-right font-bold font-feature-settings-tnum whitespace-nowrap ${
                      net > 0 ? 'text-[#0E6A3B]' : net < 0 ? 'text-rose-600' : 'text-zinc-400'
                    }`}>
                      {net > 0 ? `+${formatCurrency(net)}` : formatCurrency(net)}
                    </td>
                    <td className="px-4 py-3 text-right font-black text-zinc-950 font-feature-settings-tnum whitespace-nowrap text-sm bg-zinc-50/50">
                      {formatCurrency(balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-emerald-50/70 font-black border-t-2 border-emerald-300">
                <tr>
                  <td colSpan={3} className="px-4 py-3.5 text-zinc-900 uppercase text-[11px] font-black">
                    Total Consolidado Mes ({allAccountsDetailed.length} cuentas)
                  </td>
                  <td className="px-4 py-3.5 text-right text-emerald-900 font-feature-settings-tnum">
                    +{formatCurrency(monthIncome)}
                  </td>
                  <td className="px-4 py-3.5 text-right text-rose-700 font-feature-settings-tnum">
                    -{formatCurrency(monthExpense)}
                  </td>
                  <td className={`px-4 py-3.5 text-right font-feature-settings-tnum ${
                    monthNet >= 0 ? 'text-[#0E6A3B]' : 'text-rose-700'
                  }`}>
                    {monthNet >= 0 ? `+${formatCurrency(monthNet)}` : formatCurrency(monthNet)}
                  </td>
                  <td className="px-4 py-3.5 text-right text-[#092B19] text-base font-feature-settings-tnum bg-emerald-100/60">
                    {formatCurrency(totalBalanceMonth)}
                  </td>
                </tr>
              </tfoot>
            </table>
          ) : (
            /* TABLA 2: VISTA AGRUPADA POR ENTIDAD (CON DESPLEGABLES) */
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 uppercase font-bold text-[10px]">
                <tr>
                  <th className="px-5 py-3">Entidad Bancaria</th>
                  <th className="px-5 py-3">Cuentas</th>
                  <th className="px-5 py-3 text-right">Ingresos Mes</th>
                  <th className="px-5 py-3 text-right">Gastos Mes</th>
                  <th className="px-5 py-3 text-right">Balance Neto Mes</th>
                  <th className="px-5 py-3 text-right">
                    {currentClosure.isClosed ? 'Saldo al Cierre' : 'Saldo Actual'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {bankBreakdowns.map((b) => {
                  const isExpanded = expandedEntities.has(b.id);
                  return (
                    <React.Fragment key={b.id}>
                      <tr 
                        onClick={() => toggleEntityExpand(b.id)}
                        className="hover:bg-zinc-50/80 transition-colors cursor-pointer select-none"
                      >
                        <td className="px-5 py-3.5 font-black text-zinc-900 flex items-center gap-2">
                          <button
                            type="button"
                            className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
                            aria-label={isExpanded ? 'Plegar subcuentas' : 'Desplegar subcuentas'}
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-[#0E6A3B]" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>
                          <span 
                            className="w-2.5 h-2.5 rounded-full shrink-0" 
                            style={{ backgroundColor: b.color || (b.id === 'bbva' ? '#004481' : b.id === 'santander' ? '#EC0000' : '#0E6A3B') }} 
                          />
                          <span>{b.name}</span>
                        </td>
                        <td className="px-5 py-3.5 text-zinc-600 font-medium">
                          <span className="inline-flex items-center gap-1 text-zinc-700 hover:underline">
                            {b.accountsCount} {b.accountsCount === 1 ? 'cuenta' : 'cuentas'}
                            <span className="text-[10px] text-zinc-400 font-normal">
                              ({isExpanded ? 'ocultar' : 'ver cuentas'})
                            </span>
                          </span>
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

                      {/* Subfilas cuando la entidad está desplegada */}
                      {isExpanded && b.accountsDetailed.map(({ account: a, income, expense, net, balance }) => (
                        <tr key={a.id} className="bg-emerald-50/20 hover:bg-emerald-50/40 border-b border-zinc-100 transition-colors">
                          <td className="pl-12 pr-5 py-2.5 font-medium text-zinc-800">
                            <div className="flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 shrink-0" />
                              <span className="font-semibold text-zinc-900 truncate max-w-[220px]" title={a.accountName}>
                                {a.accountName}
                              </span>
                              {a.type === 'investment' && (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                                  Valores
                                </span>
                              )}
                              {a.type === 'deposit' && (
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                                  balance === 0
                                    ? 'bg-zinc-100 text-zinc-600 border-zinc-300'
                                    : 'bg-sky-100 text-sky-800 border-sky-300'
                                }`}>
                                  {balance === 0 ? 'Vencido (0 €)' : 'Plazo Fijo'}
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-zinc-400 font-mono ml-3.5">
                              {a.accountNumberMasked || '••••'}
                            </span>
                          </td>
                          <td className="px-5 py-2.5 text-[11px] text-zinc-500">
                            Subcuenta
                          </td>
                          <td className="px-5 py-2.5 text-right text-emerald-800 font-semibold font-feature-settings-tnum">
                            {income > 0 ? `+${formatCurrency(income)}` : '0,00 €'}
                          </td>
                          <td className="px-5 py-2.5 text-right text-rose-600 font-semibold font-feature-settings-tnum">
                            {expense > 0 ? `-${formatCurrency(expense)}` : '0,00 €'}
                          </td>
                          <td className={`px-5 py-2.5 text-right font-bold font-feature-settings-tnum ${
                            net > 0 ? 'text-[#0E6A3B]' : net < 0 ? 'text-rose-600' : 'text-zinc-400'
                          }`}>
                            {net > 0 ? `+${formatCurrency(net)}` : formatCurrency(net)}
                          </td>
                          <td className="px-5 py-2.5 text-right font-black text-zinc-900 font-feature-settings-tnum bg-emerald-50/40">
                            {formatCurrency(balance)}
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  );
                })}
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
                    {formatCurrency(totalBalanceMonth)}
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
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

      {/* Modal de Ajuste de Saldos al Cierre (especialmente para Cuentas de Valores o meses históricos) */}
      {isEditingBalances && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div 
            className="bg-white rounded-2xl border-2 border-emerald-600/40 shadow-xl max-w-lg w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabecera del modal */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-emerald-100 bg-emerald-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#0E6A3B] flex items-center justify-center text-white shadow-xs">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-950">
                    Ajustar Saldos al Cierre de {capitalizedMonth} {year}
                  </h3>
                  <p className="text-[11px] text-zinc-600">
                    Introduce o ajusta los saldos que tenía cada cuenta a fecha de fin de mes
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsEditingBalances(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Cuerpo del modal */}
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-950">
                <p className="font-bold mb-0.5 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#0E6A3B]" />
                  Ideal para Cuentas de Valores, Depósitos o Cierres Pasados (2025):
                </p>
                Los saldos de las cuentas corrientes se han calculado automáticamente a partir de los movimientos. Para tus <strong>cuentas de valores / inversiones</strong> y <strong>depósitos a plazo fijo</strong>, introduce o verifica el capital que tenías a <strong>último día de {capitalizedMonth} {year}</strong>.
              </div>

              <div className="space-y-3">
                {appState.accounts.map((acc) => (
                  <div 
                    key={acc.id} 
                    className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                      acc.type === 'investment' 
                        ? 'bg-emerald-50/50 border-emerald-300 ring-1 ring-emerald-500/20' 
                        : acc.type === 'deposit'
                          ? 'bg-sky-50/60 border-sky-300 ring-1 ring-sky-500/20'
                          : 'bg-zinc-50/80 border-zinc-200'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-zinc-900 truncate">
                          {acc.accountName}
                        </span>
                        {acc.type === 'investment' && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900 border border-emerald-300">
                            Valores / Inversión
                          </span>
                        )}
                        {acc.type === 'deposit' && (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                            (tempBalances[acc.id] === '0' || tempBalances[acc.id] === '0.00' || tempBalances[acc.id] === '0,00' || parseFloat(tempBalances[acc.id] || '0') === 0)
                              ? 'bg-zinc-100 text-zinc-600 border-zinc-300'
                              : 'bg-sky-100 text-sky-900 border-sky-300'
                          }`}>
                            {(tempBalances[acc.id] === '0' || tempBalances[acc.id] === '0.00' || tempBalances[acc.id] === '0,00' || parseFloat(tempBalances[acc.id] || '0') === 0)
                              ? 'Vencido / Saldo 0 €'
                              : 'Depósito Plazo Fijo'}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-500 truncate">
                        {acc.bankName} • {acc.accountNumberMasked}
                        {acc.balanceDate && (
                          <span className="ml-1 text-emerald-800 font-semibold">
                            (Saldo a {formatDate(acc.balanceDate)})
                          </span>
                        )}
                      </p>
                    </div>

                    <div className="w-36 shrink-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <label className="block text-[10px] font-semibold text-zinc-500">
                          Saldo a 31/{String(month).padStart(2, '0')} (€)
                        </label>
                        {acc.type === 'deposit' && (tempBalances[acc.id] !== '0.00' && tempBalances[acc.id] !== '0') && (
                          <button
                            type="button"
                            onClick={() => {
                              setTempBalances((prev) => ({
                                ...prev,
                                [acc.id]: '0.00'
                              }));
                            }}
                            className="text-[10px] text-rose-600 hover:underline font-bold cursor-pointer"
                            title="Fijar en 0 € por vencimiento en este mes"
                          >
                            Poner a 0 €
                          </button>
                        )}
                      </div>
                      <div className="relative">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={tempBalances[acc.id] ?? ''}
                          onChange={(e) => {
                            setTempBalances((prev) => ({
                              ...prev,
                              [acc.id]: e.target.value
                            }));
                          }}
                          className={`w-full px-2.5 py-1.5 text-xs font-bold text-right rounded-lg bg-white border focus:border-[#0E6A3B] focus:ring-1 focus:ring-[#0E6A3B] font-feature-settings-tnum ${
                            acc.type === 'deposit' && (tempBalances[acc.id] === '0.00' || tempBalances[acc.id] === '0')
                              ? 'border-zinc-300 text-zinc-400 bg-zinc-50'
                              : 'border-zinc-300 text-zinc-900'
                          }`}
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pie del modal */}
            <div className="px-6 py-3.5 bg-zinc-50 border-t border-zinc-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsEditingBalances(false)}
                className="px-3.5 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-200 rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveCustomBalances}
                className="px-4 py-2 text-xs font-bold text-white bg-[#0E6A3B] hover:bg-[#0a522d] rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Guardar Saldos y Auditar Cierre</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
