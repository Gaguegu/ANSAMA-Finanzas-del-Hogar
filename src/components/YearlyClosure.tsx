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
import { formatCurrency, isCapitalTransfer } from '../utils/storage';
import { getBenchmarkForYear, matchAccountToBenchmarkKey } from '../data/excel2025Benchmark';

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
  const [tableMetric, setTableMetric] = useState<'balance' | 'income' | 'expense' | 'net'>('balance');
  const [cashflowAccountFilter, setCashflowAccountFilter] = useState<string>('all');
  const [cashflowViewMode, setCashflowViewMode] = useState<'selected' | 'all-accounts'>('selected');
  const [savingsViewMode, setSavingsViewMode] = useState<'real' | 'gross'>('real');

  const toggleExpand = (id: string) => {
    setExpandedEntities(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handlePrevYear = () => setSelectedYear((y) => Math.max(2025, y - 1));
  const handleNextYear = () => setSelectedYear((y) => Math.min(2030, y + 1));

  // Filter transactions for the selected year
  const yearTransactions = useMemo(() => {
    const yearPrefix = `${selectedYear}-`;
    return appState.transactions.filter((tx) => tx.date.startsWith(yearPrefix));
  }, [appState.transactions, selectedYear]);

  const currentBenchmark = useMemo(() => {
    return getBenchmarkForYear(selectedYear);
  }, [selectedYear]);

  // Total real income and expenses for the year according to savingsViewMode
  const totalYearTransfers = useMemo(() => {
    return yearTransactions
      .filter((t) => isCapitalTransfer(t))
      .reduce((sum, t) => sum + t.amount, 0);
  }, [yearTransactions]);

  // Helper function to compute monthly balances and flows for any list of accounts
  const computeMonthlyStats = (accounts: BankAccount[]) => {
    const accIds = accounts.map((a) => a.id);
    const currentBalance = accounts.reduce((sum, a) => sum + a.balance, 0);
    const monthlyBalances: number[] = [];
    const monthlyIncomes: number[] = [];
    const monthlyExpenses: number[] = [];
    const monthlyNets: number[] = [];
    const grossNets: number[] = [];

    for (let m = 0; m < 12; m++) {
      const monthNum = String(m + 1).padStart(2, '0');
      const monthKey = `${selectedYear}-${monthNum}`;
      const closure = appState.monthlyClosures?.find((c) => c.month === monthKey);

      // Flujos de movimientos de estas cuentas en este mes
      const txsInMonth = yearTransactions.filter(
        (tx) => accIds.includes(tx.accountId) && tx.date.startsWith(`${selectedYear}-${monthNum}`)
      );

      const grossInc = txsInMonth.filter((t) => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
      const grossExp = txsInMonth.filter((t) => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
      grossNets.push(grossInc - grossExp);

      // 1. PRIORIDAD ABSOLUTA: Si el mes está cerrado o tiene saldos auditados por el usuario en appState.monthlyClosures
      const hasAuditedInClosure = closure?.auditedBalances && accounts.some((a) => closure.auditedBalances?.[a.id] !== undefined);
      if (closure && (closure.isClosed || hasAuditedInClosure)) {
        const auditedSum = accounts.reduce((sum, a) => {
          return sum + (closure.auditedBalances?.[a.id] ?? a.balance);
        }, 0);
        monthlyBalances.push(Math.round(auditedSum * 100) / 100);

        let inc = txsInMonth
          .filter((t) => t.type === 'income' && (savingsViewMode === 'gross' || !isCapitalTransfer(t)))
          .reduce((sum, t) => sum + t.amount, 0);
        let exp = txsInMonth
          .filter((t) => t.type === 'expense' && (savingsViewMode === 'gross' || !isCapitalTransfer(t)))
          .reduce((sum, t) => sum + t.amount, 0);

        if (closure.auditedByBank) {
          let bInc = 0;
          let bExp = 0;
          let hasBankData = false;
          for (const a of accounts) {
            const key = matchAccountToBenchmarkKey(a);
            if (key && closure.auditedByBank[key]) {
              bInc += closure.auditedByBank[key].income;
              bExp += closure.auditedByBank[key].expense;
              hasBankData = true;
            }
          }
          if (hasBankData) {
            inc = bInc;
            exp = bExp;
          }
        }

        monthlyIncomes.push(Math.round(inc * 100) / 100);
        monthlyExpenses.push(Math.round(exp * 100) / 100);
        monthlyNets.push(Math.round((inc - exp) * 100) / 100);
        continue;
      }

      // 2. PRIORIDAD SECUNDARIA: Si no hay cierre de usuario pero el ejercicio tiene benchmark histórico con saldo real
      if (savingsViewMode === 'real' && currentBenchmark) {
        const benchMonth = currentBenchmark.months.find((bm) => bm.monthIndex === m);
        if (benchMonth) {
          let bInc = 0;
          let bExp = 0;
          let bNet = 0;
          let bBal = 0;
          let hasMatched = false;
          let hasRealBenchmarkBalance = false;

          for (const a of accounts) {
            const key = matchAccountToBenchmarkKey(a);
            if (key && benchMonth.byBank[key]) {
              bInc += benchMonth.byBank[key].income;
              bExp += benchMonth.byBank[key].expense;
              bNet += benchMonth.byBank[key].net;
              if (benchMonth.byBank[key].balance !== undefined && benchMonth.byBank[key].balance !== null) {
                bBal += benchMonth.byBank[key].balance!;
                hasRealBenchmarkBalance = true;
              }
              hasMatched = true;
            }
          }

          if (hasMatched && hasRealBenchmarkBalance) {
            monthlyIncomes.push(Math.round(bInc * 100) / 100);
            monthlyExpenses.push(Math.round(bExp * 100) / 100);
            monthlyNets.push(Math.round(bNet * 100) / 100);
            monthlyBalances.push(Math.round(bBal * 100) / 100);
            continue;
          }
        }
      }

      // 3. CÁLCULO DINÁMICO: Basado en los movimientos reales y saldo actual
      const inc = txsInMonth
        .filter((t) => t.type === 'income' && (savingsViewMode === 'gross' || !isCapitalTransfer(t)))
        .reduce((sum, t) => sum + t.amount, 0);
      const exp = txsInMonth
        .filter((t) => t.type === 'expense' && (savingsViewMode === 'gross' || !isCapitalTransfer(t)))
        .reduce((sum, t) => sum + t.amount, 0);

      monthlyIncomes.push(Math.round(inc * 100) / 100);
      monthlyExpenses.push(Math.round(exp * 100) / 100);
      monthlyNets.push(Math.round((inc - exp) * 100) / 100);

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

    // Saldo inicial real a 1 de Enero (usando siempre el flujo bancario bruto de Enero para no distorsionar el saldo):
    const startBalance = Math.round(((monthlyBalances[0] || 0) - (grossNets[0] || 0)) * 100) / 100;
    const endBalance = monthlyBalances[11] || 0;
    const yearlyDiff = Math.round((endBalance - startBalance) * 100) / 100;
    const yearlyDiffPercent = startBalance !== 0 
      ? Math.round((yearlyDiff / Math.abs(startBalance)) * 100) 
      : 0;
    const averageBalance = Math.round(
      (monthlyBalances.reduce((sum, v) => sum + v, 0) / 12) * 100
    ) / 100;

    const totalYearAccIncome = Math.round(monthlyIncomes.reduce((a, b) => a + b, 0) * 100) / 100;
    const totalYearAccExpense = Math.round(monthlyExpenses.reduce((a, b) => a + b, 0) * 100) / 100;
    const totalYearAccNet = Math.round((totalYearAccIncome - totalYearAccExpense) * 100) / 100;

    return {
      monthlyBalances,
      monthlyIncomes,
      monthlyExpenses,
      monthlyNets,
      totalYearAccIncome,
      totalYearAccExpense,
      totalYearAccNet,
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

  // Total Consolidated row across all banks per month based on active tableMetric
  const consolidatedMonthlyBalances = useMemo(() => {
    const totals: number[] = Array(12).fill(0);
    bankEntities.forEach((entity) => {
      entity.monthlyBalances.forEach((val, idx) => {
        totals[idx] += val;
      });
    });
    return totals.map(v => Math.round(v * 100) / 100);
  }, [bankEntities]);

  const consolidatedMonthlyValues = useMemo(() => {
    const totals: number[] = Array(12).fill(0);
    bankEntities.forEach((entity) => {
      const arr = tableMetric === 'balance'
        ? entity.monthlyBalances
        : tableMetric === 'income'
          ? entity.monthlyIncomes
          : tableMetric === 'expense'
            ? entity.monthlyExpenses
            : entity.monthlyNets;
      arr.forEach((val, idx) => {
        totals[idx] += val;
      });
    });
    return totals.map(v => Math.round(v * 100) / 100);
  }, [bankEntities, tableMetric]);

  const consolidatedTotalYear = useMemo(() => {
    return Math.round(consolidatedMonthlyValues.reduce((sum, v) => sum + v, 0) * 100) / 100;
  }, [consolidatedMonthlyValues]);

  // Saldo inicial consolidado a 1 de Enero (antes de los movimientos de Enero)
  const totalStartYear = Math.round(
    bankEntities.reduce((sum, e) => sum + e.startBalance, 0) * 100
  ) / 100;
  const totalEndYear = consolidatedMonthlyBalances[11] || 0;
  const totalYearGrowth = Math.round((totalEndYear - totalStartYear) * 100) / 100;
  const totalGrowthPercent = totalStartYear !== 0 
    ? Math.round((totalYearGrowth / Math.abs(totalStartYear)) * 100) 
    : 0;
  const totalAverageBalance = Math.round(
    (consolidatedMonthlyBalances.reduce((sum, v) => sum + v, 0) / 12) * 100
  ) / 100;

  // Formateador dinámico según métrica seleccionada
  const renderMetricValue = (val: number, isLastMonth: boolean = false, isBold: boolean = false) => {
    if (tableMetric === 'balance') {
      return (
        <span className={isBold ? 'font-bold text-zinc-900' : 'text-zinc-700'}>
          {formatCurrency(val)}
        </span>
      );
    }
    if (tableMetric === 'income') {
      if (val === 0) return <span className="text-zinc-300 font-normal">0,00 €</span>;
      return (
        <span className={`font-semibold text-emerald-700 ${isBold ? 'font-black text-emerald-800' : ''}`}>
          +{formatCurrency(val)}
        </span>
      );
    }
    if (tableMetric === 'expense') {
      if (val === 0) return <span className="text-zinc-300 font-normal">0,00 €</span>;
      return (
        <span className={`font-semibold text-rose-600 ${isBold ? 'font-black text-rose-700' : ''}`}>
          -{formatCurrency(val)}
        </span>
      );
    }
    // 'net'
    if (val === 0) return <span className="text-zinc-400 font-normal">0,00 €</span>;
    return (
      <span className={`font-semibold ${val > 0 ? 'text-[#0E6A3B]' : 'text-rose-600'} ${isBold ? 'font-black' : ''}`}>
        {val > 0 ? `+${formatCurrency(val)}` : formatCurrency(val)}
      </span>
    );
  };

  // Monthly cashflow: Real Income vs Real Expense per month for the year
  const monthlyCashflow = useMemo(() => {
    return MONTH_NAMES_SHORT.map((name, idx) => {
      const monthNum = String(idx + 1).padStart(2, '0');
      const prefix = `${selectedYear}-${monthNum}`;

      // 1. Si el mes está oficialmente cerrado por el usuario en la aplicación:
      const closure = appState.monthlyClosures?.find((c) => c.month === prefix);
      if (closure?.isClosed && closure.auditedIncome !== undefined && closure.auditedExpense !== undefined) {
        return {
          month: name,
          fullMonth: MONTH_NAMES_FULL[idx],
          income: closure.auditedIncome,
          expense: closure.auditedExpense,
          net: closure.auditedNet ?? (closure.auditedIncome - closure.auditedExpense),
          hasActivity: true
        };
      }

      // 2. Si el mes está en el benchmark auditado y estamos en modo 'real'
      if (currentBenchmark && savingsViewMode === 'real') {
        const bMonth = currentBenchmark.months.find((m) => m.monthIndex === idx);
        if (bMonth) {
          return {
            month: bMonth.monthName,
            fullMonth: bMonth.fullMonthName,
            income: bMonth.income,
            expense: bMonth.expense,
            net: bMonth.net,
            hasActivity: true
          };
        }
      }

      // Si no está en el benchmark (ej: Septiembre 2026 cerrado/en curso) o estamos en modo 'gross',
      // se calcula a partir de las transacciones reales registradas en la app
      const txs = yearTransactions.filter((t) => t.date.startsWith(prefix));
      const income = txs
        .filter((t) => t.type === 'income' && (savingsViewMode === 'gross' || !isCapitalTransfer(t)))
        .reduce((sum, t) => sum + t.amount, 0);
      const expense = txs
        .filter((t) => t.type === 'expense' && (savingsViewMode === 'gross' || !isCapitalTransfer(t)))
        .reduce((sum, t) => sum + t.amount, 0);
      const net = income - expense;
      const hasActivity = txs.length > 0 || income > 0 || expense > 0 || !!closure?.isClosed;

      return {
        month: name,
        fullMonth: MONTH_NAMES_FULL[idx],
        income: Math.round(income * 100) / 100,
        expense: Math.round(expense * 100) / 100,
        net: Math.round(net * 100) / 100,
        hasActivity
      };
    });
  }, [yearTransactions, selectedYear, savingsViewMode, currentBenchmark, appState.monthlyClosures]);

  // Totales acumulados anuales exactos (suma de todos los meses mostrados en pantalla)
  const totalYearIncome = useMemo(() => {
    return Math.round(monthlyCashflow.reduce((sum, m) => sum + m.income, 0) * 100) / 100;
  }, [monthlyCashflow]);

  const totalYearExpense = useMemo(() => {
    return Math.round(monthlyCashflow.reduce((sum, m) => sum + m.expense, 0) * 100) / 100;
  }, [monthlyCashflow]);

  const totalYearNet = useMemo(() => {
    return Math.round((totalYearIncome - totalYearExpense) * 100) / 100;
  }, [totalYearIncome, totalYearExpense]);

  const yearSavingsRate = totalYearIncome > 0 ? Math.round((totalYearNet / totalYearIncome) * 100) : 0;

  // Cashflow desglosado para cada una de las cuentas individuales
  const allAccountsMonthlyCashflow = useMemo(() => {
    return appState.accounts.map((acc) => {
      const benchKey = matchAccountToBenchmarkKey(acc);

      const months = MONTH_NAMES_SHORT.map((name, idx) => {
        if (currentBenchmark && savingsViewMode === 'real' && benchKey) {
          const bMonth = currentBenchmark.months.find((m) => m.monthIndex === idx);
          const bData = bMonth?.byBank[benchKey];
          if (bData) {
            return {
              month: name,
              fullMonth: MONTH_NAMES_FULL[idx],
              income: bData.income,
              expense: bData.expense,
              net: bData.net,
              hasActivity: true
            };
          }
        }

        const monthNum = String(idx + 1).padStart(2, '0');
        const prefix = `${selectedYear}-${monthNum}`;
        const txs = yearTransactions.filter((t) => t.accountId === acc.id && t.date.startsWith(prefix));
        const income = txs
          .filter((t) => t.type === 'income' && (savingsViewMode === 'gross' || !isCapitalTransfer(t)))
          .reduce((sum, t) => sum + t.amount, 0);
        const expense = txs
          .filter((t) => t.type === 'expense' && (savingsViewMode === 'gross' || !isCapitalTransfer(t)))
          .reduce((sum, t) => sum + t.amount, 0);
        const net = income - expense;
        return {
          month: name,
          fullMonth: MONTH_NAMES_FULL[idx],
          income: Math.round(income * 100) / 100,
          expense: Math.round(expense * 100) / 100,
          net: Math.round(net * 100) / 100,
          hasActivity: txs.length > 0
        };
      });

      const yearIncome = Math.round(months.reduce((s, m) => s + m.income, 0) * 100) / 100;
      const yearExpense = Math.round(months.reduce((s, m) => s + m.expense, 0) * 100) / 100;
      const yearNet = Math.round((yearIncome - yearExpense) * 100) / 100;

      return {
        account: acc,
        months,
        yearIncome,
        yearExpense,
        yearNet,
        hasYearActivity: months.some((m) => m.hasActivity)
      };
    });
  }, [appState.accounts, yearTransactions, selectedYear, savingsViewMode, currentBenchmark]);

  // Datos activos del flujo según el filtro seleccionado
  const activeCashflowData = useMemo(() => {
    if (cashflowAccountFilter === 'all') {
      return {
        title: 'Hogar Consolidado (Todas las Cuentas)',
        subtitle: savingsViewMode === 'real'
          ? 'Flujo de ahorro familiar real neto (excluye traspasos internos de capital)'
          : 'Flujo bruto de tesorería de todas las cuentas',
        bankColor: '#0E6A3B',
        months: monthlyCashflow,
        yearIncome: totalYearIncome,
        yearExpense: totalYearExpense,
        yearNet: totalYearNet
      };
    }

    if (cashflowAccountFilter.startsWith('bank-')) {
      const bankKey = cashflowAccountFilter.replace('bank-', '');
      const bankAccs = appState.accounts.filter(
        (a) => (a.bankId === 'other' ? a.bankName : a.bankId) === bankKey
      );
      const bankName = bankAccs[0]?.bankName || bankKey.toUpperCase();
      const bankColor = bankAccs[0]?.color || '#004481';

      if (currentBenchmark && savingsViewMode === 'real') {
        const months = MONTH_NAMES_SHORT.map((name, idx) => {
          const bMonth = currentBenchmark.months.find((m) => m.monthIndex === idx);
          if (!bMonth) {
            const monthNum = String(idx + 1).padStart(2, '0');
            const prefix = `${selectedYear}-${monthNum}`;
            const txs = yearTransactions.filter(
              (t) => bankAccs.some((a) => a.id === t.accountId) && t.date.startsWith(prefix)
            );
            const inc = txs
              .filter((t) => t.type === 'income' && !isCapitalTransfer(t))
              .reduce((s, t) => s + t.amount, 0);
            const exp = txs
              .filter((t) => t.type === 'expense' && !isCapitalTransfer(t))
              .reduce((s, t) => s + t.amount, 0);
            return {
              month: name,
              fullMonth: MONTH_NAMES_FULL[idx],
              income: Math.round(inc * 100) / 100,
              expense: Math.round(exp * 100) / 100,
              net: Math.round((inc - exp) * 100) / 100,
              hasActivity: txs.length > 0
            };
          }
          let bInc = 0;
          let bExp = 0;
          let bNet = 0;
          for (const acc of bankAccs) {
            const key = matchAccountToBenchmarkKey(acc);
            if (key && bMonth.byBank[key]) {
              bInc += bMonth.byBank[key].income;
              bExp += bMonth.byBank[key].expense;
              bNet += bMonth.byBank[key].net;
            }
          }
          return {
            month: bMonth.monthName,
            fullMonth: bMonth.fullMonthName,
            income: Math.round(bInc * 100) / 100,
            expense: Math.round(bExp * 100) / 100,
            net: Math.round(bNet * 100) / 100,
            hasActivity: true
          };
        });
        const yearIncome = Math.round(months.reduce((s, m) => s + m.income, 0) * 100) / 100;
        const yearExpense = Math.round(months.reduce((s, m) => s + m.expense, 0) * 100) / 100;
        return {
          title: `Banco: ${bankName}`,
          subtitle: `Cierre anual de ${bankName}`,
          bankColor,
          months,
          yearIncome,
          yearExpense,
          yearNet: Math.round((yearIncome - yearExpense) * 100) / 100
        };
      }

      const months = MONTH_NAMES_SHORT.map((name, idx) => {
        const monthNum = String(idx + 1).padStart(2, '0');
        const prefix = `${selectedYear}-${monthNum}`;
        const txs = yearTransactions.filter(
          (t) => bankAccs.some((a) => a.id === t.accountId) && t.date.startsWith(prefix)
        );
        const income = txs
          .filter((t) => t.type === 'income' && (savingsViewMode === 'gross' || !isCapitalTransfer(t)))
          .reduce((s, t) => s + t.amount, 0);
        const expense = txs
          .filter((t) => t.type === 'expense' && (savingsViewMode === 'gross' || !isCapitalTransfer(t)))
          .reduce((s, t) => s + t.amount, 0);
        return {
          month: name,
          fullMonth: MONTH_NAMES_FULL[idx],
          income,
          expense,
          net: income - expense,
          hasActivity: txs.length > 0
        };
      });
      const yearIncome = Math.round(months.reduce((s, m) => s + m.income, 0) * 100) / 100;
      const yearExpense = Math.round(months.reduce((s, m) => s + m.expense, 0) * 100) / 100;
      return {
        title: `Banco: ${bankName}`,
        subtitle: savingsViewMode === 'real' 
          ? `Flujo operativo y ahorro en ${bankName}` 
          : `Todas las entradas y salidas brutas en ${bankName}`,
        bankColor,
        months,
        yearIncome,
        yearExpense,
        yearNet: Math.round((yearIncome - yearExpense) * 100) / 100
      };
    }

    // Cuenta individual
    const accId = cashflowAccountFilter.replace('acc-', '');
    const accItem = allAccountsMonthlyCashflow.find((item) => item.account.id === accId);
    if (accItem) {
      return {
        title: `${accItem.account.bankName} — ${accItem.account.accountName}`,
        subtitle: `Cuenta: ${accItem.account.accountNumberMasked || accItem.account.type}`,
        bankColor: accItem.account.color || '#004481',
        months: accItem.months,
        yearIncome: accItem.yearIncome,
        yearExpense: accItem.yearExpense,
        yearNet: accItem.yearNet
      };
    }

    return {
      title: 'Cuenta seleccionada',
      subtitle: '',
      bankColor: '#0E6A3B',
      months: monthlyCashflow,
      yearIncome: totalYearIncome,
      yearExpense: totalYearExpense,
      yearNet: totalYearNet
    };
  }, [
    cashflowAccountFilter,
    monthlyCashflow,
    totalYearIncome,
    totalYearExpense,
    totalYearNet,
    appState.accounts,
    yearTransactions,
    selectedYear,
    allAccountsMonthlyCashflow
  ]);

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
              type="button"
              onClick={handlePrevYear}
              disabled={selectedYear <= 2025}
              className={`w-10 h-10 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-700 flex items-center justify-center transition-colors shrink-0 shadow-2xs ${
                selectedYear <= 2025 ? 'opacity-40 cursor-not-allowed' : 'hover:bg-zinc-100 active:bg-zinc-200 cursor-pointer'
              }`}
              title={selectedYear <= 2025 ? 'Límite inferior: tus datos son del 2025 en adelante' : 'Año anterior'}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="relative px-3 py-1 rounded-xl bg-emerald-50 border border-emerald-300 text-center min-w-[130px] shrink-0">
              <span className="text-[10px] font-bold text-emerald-800 uppercase block tracking-wider">
                Ejercicio Fiscal
              </span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                className="w-full text-base font-black text-emerald-950 bg-transparent text-center focus:outline-hidden cursor-pointer"
                title="Selecciona el año fiscal"
              >
                {[2025, 2026, 2027, 2028, 2029, 2030].map((yr) => (
                  <option key={`closure-yr-${yr}`} value={yr}>
                    Año {yr}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleNextYear}
              disabled={selectedYear >= 2030}
              className={`w-10 h-10 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-700 flex items-center justify-center transition-colors shrink-0 shadow-2xs ${
                selectedYear >= 2030 ? 'opacity-40 cursor-not-allowed' : 'hover:bg-zinc-100 active:bg-zinc-200 cursor-pointer'
              }`}
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

      {/* Selector de Perspectiva Contable: Ahorro Familiar Real vs Tesorería Bruta */}
      <div className="bg-white rounded-2xl border-2 border-emerald-600/40 p-3.5 sm:p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#092B19] border border-emerald-700/60 text-emerald-400 flex items-center justify-center shrink-0 shadow-xs">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-zinc-950 uppercase tracking-wide">
                Perspectiva de Cierre Contable
              </span>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-[#0E6A3B] border border-emerald-300">
                {savingsViewMode === 'real' ? 'Ahorro Familiar Real' : 'Flujo Bruto'}
              </span>
            </div>
            <span className="text-xs text-zinc-600 block mt-0.5">
              {savingsViewMode === 'real'
                ? 'Beneficio y ahorro familiar real (nóminas y rendimientos menos gastos del hogar, excluyendo traspasos entre cuentas)'
                : 'Flujo bruto de cuentas (suma todas las entradas y salidas registradas en los extractos bancarios)'}
            </span>
          </div>
        </div>

        <div className="inline-flex bg-zinc-100 p-1 rounded-xl border border-zinc-200 text-xs shadow-2xs shrink-0 self-start md:self-auto flex-wrap gap-1">
          <button
            type="button"
            onClick={() => setSavingsViewMode('real')}
            className={`px-3.5 py-2 rounded-lg font-black transition-all cursor-pointer flex items-center gap-1.5 ${
              savingsViewMode === 'real'
                ? 'bg-[#0E6A3B] text-white shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900 bg-white border border-zinc-200'
            }`}
            title="Ahorro familiar real limpio (excluye traspasos internos de capital y depósitos devueltos)"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>💎 Ahorro Familiar Real</span>
          </button>

          <button
            type="button"
            onClick={() => setSavingsViewMode('gross')}
            className={`px-3.5 py-2 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              savingsViewMode === 'gross'
                ? 'bg-zinc-800 text-white shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
            title="Ver la suma bruta de entradas y salidas de todos los extractos bancarios"
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>🏦 Flujo Bruto de Bancos</span>
          </button>
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
              {totalYearGrowth >= 0 ? `+${formatCurrency(totalYearGrowth)}` : formatCurrency(totalYearGrowth)} (Saldo 31 Dic vs 1 Ene)
            </span>
          </div>
        </div>
      </div>

      {/* MATRIZ MAESTRA: TABLA DE SALDOS, INGRESOS, GASTOS Y BALANCE DE CADA CUENTA POR MESES */}
      <div className="bg-white border-2 border-emerald-600/45 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-emerald-100 bg-gradient-to-r from-emerald-50/80 via-white to-emerald-50/40 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#092B19] text-emerald-400 flex items-center justify-center shadow-xs shrink-0">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-black text-zinc-950 flex items-center gap-2">
                <span>
                  {tableMetric === 'balance' && `Saldos por Entidad y Cuentas — ${selectedYear}`}
                  {tableMetric === 'income' && `Ingresos Mensuales por Entidad y Cuentas — ${selectedYear}`}
                  {tableMetric === 'expense' && `Gastos Mensuales por Entidad y Cuentas — ${selectedYear}`}
                  {tableMetric === 'net' && `Balance Neto (Ingresos − Gastos) por Entidad y Cuentas — ${selectedYear}`}
                </span>
              </h3>
              <p className="text-xs text-zinc-500">
                {tableMetric === 'balance' && 'Evolución mensual auditada de los saldos a fin de cada mes'}
                {tableMetric === 'income' && 'Desglose mes por mes de todos los ingresos y cobros en cada cuenta'}
                {tableMetric === 'expense' && 'Desglose mes por mes de todos los gastos y pagos en cada cuenta'}
                {tableMetric === 'net' && 'Ahorro neto generado mes a mes en cada cuenta bancaria'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Selector de Métrica */}
            <div className="inline-flex bg-zinc-200/80 p-0.5 rounded-xl border border-zinc-300 text-xs">
              <button
                type="button"
                onClick={() => setTableMetric('balance')}
                className={`px-2.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  tableMetric === 'balance'
                    ? 'bg-white text-[#0E6A3B] shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
                title="Ver saldos acumulados al cierre de cada mes"
              >
                <span>💰 Saldos</span>
              </button>
              <button
                type="button"
                onClick={() => setTableMetric('income')}
                className={`px-2.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  tableMetric === 'income'
                    ? 'bg-white text-emerald-800 shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
                title="Ver ingresos mensuales por cada cuenta"
              >
                <span>📈 Ingresos</span>
              </button>
              <button
                type="button"
                onClick={() => setTableMetric('expense')}
                className={`px-2.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  tableMetric === 'expense'
                    ? 'bg-white text-rose-700 shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
                title="Ver gastos mensuales por cada cuenta"
              >
                <span>📉 Gastos</span>
              </button>
              <button
                type="button"
                onClick={() => setTableMetric('net')}
                className={`px-2.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  tableMetric === 'net'
                    ? 'bg-white text-emerald-950 shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
                title="Ver balance neto mensual (Ingresos menos Gastos)"
              >
                <span>⚖️ Balance Neto</span>
              </button>
            </div>

            {/* Selector de modo de agrupación */}
            <div className="inline-flex bg-zinc-200/80 p-0.5 rounded-xl border border-zinc-300 text-xs">
              <button
                type="button"
                onClick={() => setViewGrouping('by-bank')}
                className={`px-2.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewGrouping === 'by-bank'
                    ? 'bg-white text-[#0E6A3B] shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
                title="Mostrar cada banco o entidad financiera por separado"
              >
                <Building2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Por Banco</span>
              </button>
              <button
                type="button"
                onClick={() => setViewGrouping('by-category')}
                className={`px-2.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewGrouping === 'by-category'
                    ? 'bg-white text-[#0E6A3B] shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
                title="Mostrar agrupados por tipo: Bancos ordinarios, Cuentas de Valores y Depósitos"
              >
                <Layers className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Por Categoría</span>
              </button>
            </div>

            <button
              onClick={toggleAllExpanded}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 text-xs font-bold transition-all shadow-2xs cursor-pointer"
              title="Expandir o contraer el desglose de cuentas individuales"
            >
              <Layers className="w-3.5 h-3.5 text-[#0E6A3B]" />
              <span>{areAllExpanded ? 'Contraer cuentas' : 'Desglosar cuentas'}</span>
            </button>
          </div>
        </div>

        {/* Banner explicativo del modo de vista */}
        <div className={`px-4 py-2 text-xs flex items-center justify-between border-b ${
          tableMetric === 'balance'
            ? 'bg-emerald-50/80 text-emerald-950 border-emerald-100'
            : tableMetric === 'income'
              ? 'bg-emerald-100/60 text-emerald-950 border-emerald-200'
              : tableMetric === 'expense'
                ? 'bg-rose-50 text-rose-950 border-rose-100'
                : 'bg-emerald-50 text-emerald-950 border-emerald-100'
        }`}>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#0E6A3B] shrink-0" />
            <span>
              <strong>Modo activo:</strong>{' '}
              {tableMetric === 'balance' && 'Saldos al final de cada mes. El bloque de resumen muestra el Saldo a Cierre de Ejercicio (31-Dic), el Saldo Medio (oficial IRPF) y la Variación Anual.'}
              {tableMetric === 'income' && 'Entradas y cobros netos registrados mes por mes en cada una de tus cuentas.'}
              {tableMetric === 'expense' && 'Pagos y consumos registrados mes por mes en cada una de tus cuentas.'}
              {tableMetric === 'net' && 'Diferencia mensual (Ingresos − Gastos) generada en cada cuenta.'}
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
                  Entidad / Cuenta
                </th>
                {MONTH_NAMES_SHORT.map((m) => (
                  <th 
                    key={m} 
                    className="px-3 py-3 text-right text-zinc-600 font-bold"
                  >
                    {m}
                  </th>
                ))}
                
                {/* Bloque Resumen Anual: CIERRE (31-DIC) / TOTAL ANUAL, SALDO MEDIO, VAR. ANUAL */}
                <th 
                  className="px-3.5 py-3 text-right bg-emerald-100/95 text-emerald-950 font-black border-l-2 border-emerald-500/40 shadow-xs"
                  title={
                    tableMetric === 'balance' 
                      ? `Saldo patrimonial al cierre del ejercicio (a 31 de Diciembre de ${selectedYear}). Los saldos no se suman entre meses porque son una foto patrimonial a fin de año.` 
                      : `Total acumulado en los 12 meses del año ${selectedYear}`
                  }
                >
                  {tableMetric === 'balance' ? 'CIERRE (31-DIC)' : 'TOTAL ANUAL'}
                </th>
                <th 
                  className="px-3.5 py-3 text-right bg-emerald-100/90 text-emerald-950 font-black border-l border-emerald-200 shadow-xs"
                  title={tableMetric === 'balance' ? "Promedio aritmético de los saldos de los 12 meses (utilizado para Declaración de Renta e Impuesto sobre el Patrimonio)" : "Media mensual generada en el año"}
                >
                  {tableMetric === 'balance' ? 'Saldo Medio' : 'Media Mensual'}
                </th>
                <th 
                  className="px-4 py-3 text-right bg-emerald-100 text-emerald-950 font-black border-l border-emerald-200 shadow-xs"
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

                const metricValues = tableMetric === 'balance'
                  ? entity.monthlyBalances
                  : tableMetric === 'income'
                    ? entity.monthlyIncomes
                    : tableMetric === 'expense'
                      ? entity.monthlyExpenses
                      : entity.monthlyNets;

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

                      {/* 12 Monthly Values */}
                      {metricValues.map((val, idx) => (
                        <td 
                          key={idx} 
                          className="px-3 py-3.5 text-right font-feature-settings-tnum font-medium"
                        >
                          {renderMetricValue(val, false, true)}
                        </td>
                      ))}

                      {/* Summary Columns: TOTAL, Saldo Medio y Var. Anual */}
                      {tableMetric === 'balance' ? (
                        <>
                          <td 
                            className="px-3.5 py-3.5 text-right font-black text-emerald-950 bg-emerald-100/50 border-l-2 border-emerald-500/30 font-feature-settings-tnum text-[13px]"
                            title={`Saldo al cierre de ejercicio (31 de Diciembre): ${formatCurrency(entity.endBalance)}`}
                          >
                            {formatCurrency(entity.endBalance)}
                          </td>
                          <td className="px-3.5 py-3.5 text-right font-black text-zinc-800 bg-emerald-50/70 border-l border-emerald-100 font-feature-settings-tnum">
                            {formatCurrency(entity.averageBalance)}
                          </td>
                          <td className={`px-4 py-3.5 text-right font-black bg-emerald-50/90 border-l border-emerald-100 font-feature-settings-tnum ${
                            entity.yearlyDiff >= 0 ? 'text-[#0E6A3B]' : 'text-rose-600'
                          }`}>
                            <div className="flex flex-col items-end">
                              <span>{entity.yearlyDiff >= 0 ? `+${formatCurrency(entity.yearlyDiff)}` : formatCurrency(entity.yearlyDiff)}</span>
                              <span className={`text-[10px] font-bold ${entity.yearlyDiff >= 0 ? 'text-emerald-700' : 'text-rose-500'}`}>
                                {entity.yearlyDiff >= 0 ? `+${entity.yearlyDiffPercent}%` : `${entity.yearlyDiffPercent}%`}
                              </span>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-3.5 py-3.5 text-right font-black border-l-2 border-emerald-500/30 bg-emerald-100/50 font-feature-settings-tnum text-[13px]">
                            {tableMetric === 'income' && (
                              <span className="text-emerald-800">+{formatCurrency(entity.totalYearAccIncome)}</span>
                            )}
                            {tableMetric === 'expense' && (
                              <span className="text-rose-600">-{formatCurrency(entity.totalYearAccExpense)}</span>
                            )}
                            {tableMetric === 'net' && (
                              <span className={entity.totalYearAccNet >= 0 ? 'text-[#0E6A3B]' : 'text-rose-600'}>
                                {entity.totalYearAccNet >= 0 ? `+${formatCurrency(entity.totalYearAccNet)}` : formatCurrency(entity.totalYearAccNet)}
                              </span>
                            )}
                          </td>
                          <td className="px-3.5 py-3.5 text-right font-bold text-zinc-700 bg-emerald-50/60 border-l border-emerald-100 font-feature-settings-tnum">
                            {tableMetric === 'income' && `+${formatCurrency(Math.round((entity.totalYearAccIncome / 12) * 100) / 100)}`}
                            {tableMetric === 'expense' && `-${formatCurrency(Math.round((entity.totalYearAccExpense / 12) * 100) / 100)}`}
                            {tableMetric === 'net' && (
                              <span className={entity.totalYearAccNet >= 0 ? 'text-[#0E6A3B]' : 'text-rose-600'}>
                                {entity.totalYearAccNet >= 0 ? '+' : ''}{formatCurrency(Math.round((entity.totalYearAccNet / 12) * 100) / 100)}
                              </span>
                            )}
                          </td>
                          <td className={`px-4 py-3.5 text-right font-black bg-emerald-50/90 border-l border-emerald-100 font-feature-settings-tnum ${
                            entity.yearlyDiff >= 0 ? 'text-[#0E6A3B]' : 'text-rose-600'
                          }`}>
                            <div className="flex flex-col items-end">
                              <span>{entity.yearlyDiff >= 0 ? `+${formatCurrency(entity.yearlyDiff)}` : formatCurrency(entity.yearlyDiff)}</span>
                              <span className={`text-[10px] font-bold ${entity.yearlyDiff >= 0 ? 'text-emerald-700' : 'text-rose-500'}`}>
                                {entity.yearlyDiff >= 0 ? `+${entity.yearlyDiffPercent}%` : `${entity.yearlyDiffPercent}%`}
                              </span>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>

                    {/* Sub-rows: Individual Accounts if Expanded */}
                    {isExpanded && entity.accounts.map((acc) => {
                      const accMetricValues = tableMetric === 'balance'
                        ? acc.monthlyBalances
                        : tableMetric === 'income'
                          ? acc.monthlyIncomes
                          : tableMetric === 'expense'
                            ? acc.monthlyExpenses
                            : acc.monthlyNets;

                      return (
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

                          {accMetricValues.map((val, idx) => (
                            <td 
                              key={idx} 
                              className="px-3 py-2.5 text-right font-feature-settings-tnum text-zinc-700"
                            >
                              {renderMetricValue(val, false, false)}
                            </td>
                          ))}

                          {tableMetric === 'balance' ? (
                            <>
                              <td 
                                className="px-3.5 py-2.5 text-right font-black text-emerald-950 bg-emerald-50/60 border-l-2 border-emerald-500/20 font-feature-settings-tnum"
                                title={`Saldo de la cuenta al cierre de ejercicio (31-Dic): ${formatCurrency(acc.endBalance)}`}
                              >
                                {formatCurrency(acc.endBalance)}
                              </td>
                              <td className="px-3.5 py-2.5 text-right font-bold text-zinc-600 bg-zinc-50/50 border-l border-zinc-200 font-feature-settings-tnum">
                                {formatCurrency(acc.averageBalance)}
                              </td>
                              <td className={`px-4 py-2.5 text-right font-bold bg-emerald-50/60 border-l border-emerald-100 font-feature-settings-tnum ${
                                acc.yearlyDiff >= 0 ? 'text-[#0E6A3B]' : 'text-rose-600'
                              }`}>
                                {acc.yearlyDiff >= 0 ? `+${formatCurrency(acc.yearlyDiff)}` : formatCurrency(acc.yearlyDiff)}
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="px-3.5 py-2.5 text-right font-extrabold border-l-2 border-emerald-500/20 bg-emerald-50/60 font-feature-settings-tnum">
                                {tableMetric === 'income' && (
                                  <span className="text-emerald-700">+{formatCurrency(acc.totalYearAccIncome)}</span>
                                )}
                                {tableMetric === 'expense' && (
                                  <span className="text-rose-600">-{formatCurrency(acc.totalYearAccExpense)}</span>
                                )}
                                {tableMetric === 'net' && (
                                  <span className={acc.totalYearAccNet >= 0 ? 'text-[#0E6A3B]' : 'text-rose-600'}>
                                    {acc.totalYearAccNet >= 0 ? `+${formatCurrency(acc.totalYearAccNet)}` : formatCurrency(acc.totalYearAccNet)}
                                  </span>
                                )}
                              </td>
                              <td className="px-3.5 py-2.5 text-right font-semibold text-zinc-500 border-l border-zinc-200 font-feature-settings-tnum">
                                {tableMetric === 'income' && `+${formatCurrency(Math.round((acc.totalYearAccIncome / 12) * 100) / 100)}`}
                                {tableMetric === 'expense' && `-${formatCurrency(Math.round((acc.totalYearAccExpense / 12) * 100) / 100)}`}
                                {tableMetric === 'net' && (
                                  <span className={acc.totalYearAccNet >= 0 ? 'text-[#0E6A3B]' : 'text-rose-600'}>
                                    {acc.totalYearAccNet >= 0 ? '+' : ''}{formatCurrency(Math.round((acc.totalYearAccNet / 12) * 100) / 100)}
                                  </span>
                                )}
                              </td>
                              <td className={`px-4 py-2.5 text-right font-bold border-l border-emerald-100 font-feature-settings-tnum ${
                                acc.yearlyDiff >= 0 ? 'text-[#0E6A3B]' : 'text-rose-600'
                              }`}>
                                {acc.yearlyDiff >= 0 ? `+${formatCurrency(acc.yearlyDiff)}` : formatCurrency(acc.yearlyDiff)}
                              </td>
                            </>
                          )}
                        </tr>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </tbody>

            {/* Total Row (Consolidado Mensual) */}
            <tfoot className="bg-[#092B19] text-white font-black border-t-2 border-[#0E6A3B]">
              <tr>
                <td className="px-4 py-3.5 text-emerald-300 uppercase text-[11px] sticky left-0 bg-[#092B19] z-10 shadow-xs">
                  TOTAL CONSOLIDADO (€)
                </td>
                {consolidatedMonthlyValues.map((val, idx) => (
                  <td 
                    key={idx} 
                    className="px-3 py-3.5 text-right font-feature-settings-tnum text-white font-black"
                  >
                    {tableMetric === 'balance' && formatCurrency(val)}
                    {tableMetric === 'income' && `+${formatCurrency(val)}`}
                    {tableMetric === 'expense' && `-${formatCurrency(val)}`}
                    {tableMetric === 'net' && (val >= 0 ? `+${formatCurrency(val)}` : formatCurrency(val))}
                  </td>
                ))}

                {tableMetric === 'balance' ? (
                  <>
                    <td 
                      className="px-3.5 py-3.5 text-right text-emerald-100 text-xs font-black border-l-2 border-emerald-400 bg-emerald-950 font-feature-settings-tnum shadow-inner"
                      title={`Patrimonio total consolidado al cierre de ejercicio (31 de Diciembre): ${formatCurrency(totalEndYear)}`}
                    >
                      {formatCurrency(totalEndYear)}
                    </td>
                    <td className="px-3.5 py-3.5 text-right text-emerald-200 text-xs font-black border-l border-emerald-800 bg-emerald-950/80 font-feature-settings-tnum shadow-inner">
                      {formatCurrency(totalAverageBalance)}
                    </td>
                    <td className={`px-4 py-3.5 text-right font-black text-sm font-feature-settings-tnum border-l border-emerald-800 bg-emerald-950/90 shadow-inner ${
                      totalYearGrowth >= 0 ? 'text-emerald-300' : 'text-rose-400'
                    }`}>
                      <div className="flex flex-col items-end">
                        <span>{totalYearGrowth >= 0 ? `+${formatCurrency(totalYearGrowth)}` : formatCurrency(totalYearGrowth)}</span>
                        <span className="text-[10px] font-semibold text-emerald-300/80">
                          {totalYearGrowth >= 0 ? `+${totalGrowthPercent}%` : `${totalGrowthPercent}%`}
                        </span>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-3.5 py-3.5 text-right font-black text-sm font-feature-settings-tnum border-l-2 border-emerald-400 bg-emerald-950">
                      {tableMetric === 'income' && (
                        <span className="text-emerald-300 font-black text-base">+{formatCurrency(consolidatedTotalYear)}</span>
                      )}
                      {tableMetric === 'expense' && (
                        <span className="text-rose-400 font-black text-base">-{formatCurrency(consolidatedTotalYear)}</span>
                      )}
                      {tableMetric === 'net' && (
                        <span className={consolidatedTotalYear >= 0 ? 'text-emerald-300 font-black text-base' : 'text-rose-400 font-black text-base'}>
                          {consolidatedTotalYear >= 0 ? `+${formatCurrency(consolidatedTotalYear)}` : formatCurrency(consolidatedTotalYear)}
                        </span>
                      )}
                    </td>
                    <td className="px-3.5 py-3.5 text-right font-bold text-xs text-emerald-200 border-l border-emerald-800 bg-emerald-950/80 font-feature-settings-tnum">
                      {formatCurrency(Math.round((consolidatedTotalYear / 12) * 100) / 100)}
                    </td>
                    <td className={`px-4 py-3.5 text-right font-black text-sm font-feature-settings-tnum border-l border-emerald-800 bg-emerald-950/90 shadow-inner ${
                      totalYearGrowth >= 0 ? 'text-emerald-300' : 'text-rose-400'
                    }`}>
                      <div className="flex flex-col items-end">
                        <span>{totalYearGrowth >= 0 ? `+${formatCurrency(totalYearGrowth)}` : formatCurrency(totalYearGrowth)}</span>
                        <span className="text-[10px] font-semibold text-emerald-300/80">
                          {totalYearGrowth >= 0 ? `+${totalGrowthPercent}%` : `${totalGrowthPercent}%`}
                        </span>
                      </div>
                    </td>
                  </>
                )}
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

      {/* Flujo Mensual en el Año: Desglose por Cuenta de Bancos Mes a Mes y Año */}
      <div className="bg-white border-2 border-emerald-600/40 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-[#0E6A3B] flex items-center justify-center shrink-0">
              <CalendarRange className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-black text-zinc-950 flex items-center gap-2">
                <span>Desglose Mensual de Ingresos, Gastos y Ahorro ({selectedYear})</span>
              </h3>
              <p className="text-xs text-zinc-500">
                Auditoría mes a mes y balance anual por cuenta de banco o consolidado familiar
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Selector de Cuenta / Banco */}
            <div className="flex items-center gap-1.5">
              <label htmlFor="select-cashflow-account" className="text-xs font-bold text-zinc-600 shrink-0">
                Cuenta:
              </label>
              <select
                id="select-cashflow-account"
                value={cashflowAccountFilter}
                onChange={(e) => setCashflowAccountFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-emerald-300 bg-emerald-50/80 text-zinc-900 text-xs font-bold focus:outline-hidden focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-2xs max-w-[260px] truncate"
              >
                <option value="all">🏛️ Hogar Consolidado (Todas las Cuentas)</option>
                {bankEntities.length > 1 && (
                  <optgroup label="── Por Banco / Entidad ──">
                    {bankEntities.map((b) => (
                      <option key={`bank-${b.id}`} value={`bank-${b.id}`}>
                        🏦 {b.name} (Todas sus cuentas)
                      </option>
                    ))}
                  </optgroup>
                )}
                <optgroup label="── Cuentas Individuales ──">
                  {appState.accounts.map((acc) => (
                    <option key={`acc-${acc.id}`} value={`acc-${acc.id}`}>
                      💳 {acc.bankName} — {acc.accountName} ({acc.accountNumberMasked || acc.type})
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            {/* Selector de modo de vista */}
            <div className="inline-flex bg-zinc-200/80 p-0.5 rounded-xl border border-zinc-300 text-xs">
              <button
                type="button"
                onClick={() => setCashflowViewMode('selected')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  cashflowViewMode === 'selected'
                    ? 'bg-white text-[#0E6A3B] shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                <span>🎴 Vista 12 Meses + Año</span>
              </button>
              <button
                type="button"
                onClick={() => setCashflowViewMode('all-accounts')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  cashflowViewMode === 'all-accounts'
                    ? 'bg-white text-[#0E6A3B] shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
                title="Ver todas las cuentas bancarias desglosadas a la vez con sus 12 meses"
              >
                <span>🏢 Ver Todas las Cuentas</span>
              </button>
            </div>
          </div>
        </div>

        {cashflowViewMode === 'selected' ? (
          <div className="space-y-4">
            {/* Tarjeta Resumen del Año para la cuenta/entidad seleccionada */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950 via-[#0E6A3B] to-emerald-900 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span 
                    className="w-3 h-3 rounded-full shrink-0 border border-white/40" 
                    style={{ backgroundColor: activeCashflowData.bankColor }}
                  />
                  <h4 className="text-base font-black text-white">
                    {activeCashflowData.title}
                  </h4>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-800 text-emerald-200 font-extrabold uppercase">
                    Ejercicio {selectedYear}
                  </span>
                </div>
                <p className="text-xs text-emerald-200/80 font-medium">
                  {activeCashflowData.subtitle}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 font-feature-settings-tnum">
                <div className="bg-white/10 backdrop-blur-xs px-3.5 py-2 rounded-xl border border-white/15">
                  <span className="text-[10px] text-emerald-200 block uppercase font-bold">Ingresos Anuales</span>
                  <span className="text-base font-black text-emerald-300">+{formatCurrency(activeCashflowData.yearIncome)}</span>
                </div>
                <div className="bg-white/10 backdrop-blur-xs px-3.5 py-2 rounded-xl border border-white/15">
                  <span className="text-[10px] text-rose-200 block uppercase font-bold">Gastos Anuales</span>
                  <span className="text-base font-black text-rose-300">-{formatCurrency(activeCashflowData.yearExpense)}</span>
                </div>
                <div className={`px-4 py-2 rounded-xl border font-black ${
                  activeCashflowData.yearNet >= 0 
                    ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-200' 
                    : 'bg-rose-500/20 border-rose-400/40 text-rose-200'
                }`}>
                  <span className="text-[10px] block uppercase font-bold text-white/80">Balance Neto del Año</span>
                  <span className="text-lg font-black text-white">
                    {activeCashflowData.yearNet >= 0 ? `+${formatCurrency(activeCashflowData.yearNet)}` : formatCurrency(activeCashflowData.yearNet)}
                  </span>
                </div>
              </div>
            </div>

            {/* Cuadrícula de 12 Meses + 13ª Tarjeta de Total Anual */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {activeCashflowData.months.map((m, idx) => (
                <div 
                  key={idx}
                  className={`p-3.5 rounded-xl border transition-all ${
                    m.hasActivity 
                      ? 'bg-zinc-50 border-zinc-200 shadow-2xs hover:border-emerald-300 hover:bg-white' 
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

                  <div className="space-y-1.5 text-xs font-feature-settings-tnum">
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

              {/* 13ª Tarjeta: TOTAL DEL AÑO */}
              <div className="p-3.5 rounded-xl border-2 border-emerald-600/50 bg-gradient-to-br from-emerald-50 via-white to-emerald-100/50 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-black text-xs text-emerald-950 uppercase tracking-wide flex items-center gap-1">
                      <span>✨ TOTAL AÑO {selectedYear}</span>
                    </span>
                    <span className={`text-[11px] font-black px-2 py-0.5 rounded-full ${
                      activeCashflowData.yearNet >= 0 ? 'bg-[#0E6A3B] text-white' : 'bg-rose-600 text-white'
                    }`}>
                      {activeCashflowData.yearNet >= 0 ? 'Superávit' : 'Déficit'}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs font-feature-settings-tnum mt-2">
                    <div className="flex justify-between text-emerald-900">
                      <span className="text-[11px] font-semibold text-zinc-600">Ingresos Totales:</span>
                      <span className="font-extrabold text-sm">+{formatCurrency(activeCashflowData.yearIncome)}</span>
                    </div>
                    <div className="flex justify-between text-rose-700">
                      <span className="text-[11px] font-semibold text-zinc-600">Gastos Totales:</span>
                      <span className="font-extrabold text-sm">-{formatCurrency(activeCashflowData.yearExpense)}</span>
                    </div>
                    <div className="flex justify-between pt-1.5 border-t border-emerald-300 font-black text-sm">
                      <span className="text-zinc-800">Neto Anual:</span>
                      <span className={activeCashflowData.yearNet >= 0 ? 'text-[#0E6A3B]' : 'text-rose-600'}>
                        {activeCashflowData.yearNet >= 0 ? `+${formatCurrency(activeCashflowData.yearNet)}` : formatCurrency(activeCashflowData.yearNet)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-2.5 pt-1.5 border-t border-emerald-200 text-[10px] text-zinc-600 font-semibold flex justify-between">
                  <span>Promedio mensual</span>
                  <span className="font-bold text-[#0E6A3B]">
                    {(() => {
                      const activeMonths = activeCashflowData.months.filter(m => m.hasActivity);
                      const count = activeMonths.length || 1;
                      const avg = Math.round((activeCashflowData.yearNet / count) * 100) / 100;
                      return `${avg >= 0 ? '+' : ''}${formatCurrency(avg)}/mes (${count} meses)`;
                    })()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Modo: Ver Todas las Cuentas Desglosadas con sus 12 meses */
          <div className="space-y-6">
            {allAccountsMonthlyCashflow.map((item) => (
              <div 
                key={item.account.id}
                className="p-4 rounded-2xl border-2 border-zinc-200 bg-white shadow-xs space-y-3"
              >
                {/* Cabecera de la cuenta con resumen anual */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-zinc-200">
                  <div className="flex items-center gap-2">
                    <span 
                      className="w-3.5 h-3.5 rounded-full shrink-0" 
                      style={{ backgroundColor: item.account.color || '#004481' }}
                    />
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-sm text-zinc-950">
                          {item.account.bankName} — {item.account.accountName}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-zinc-100 text-zinc-600 border border-zinc-200">
                          {item.account.accountNumberMasked || item.account.type}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Resumen Anual de esta cuenta */}
                  <div className="flex items-center gap-3 text-xs font-feature-settings-tnum">
                    <span className="text-emerald-700 font-bold">
                      Ingresos: +{formatCurrency(item.yearIncome)}
                    </span>
                    <span className="text-zinc-300">|</span>
                    <span className="text-rose-600 font-bold">
                      Gastos: -{formatCurrency(item.yearExpense)}
                    </span>
                    <span className="text-zinc-300">|</span>
                    <span className={`font-black px-2 py-0.5 rounded ${
                      item.yearNet >= 0 ? 'bg-emerald-100 text-[#0E6A3B]' : 'bg-rose-100 text-rose-700'
                    }`}>
                      Neto Año: {item.yearNet >= 0 ? `+${formatCurrency(item.yearNet)}` : formatCurrency(item.yearNet)}
                    </span>
                  </div>
                </div>

                {/* Los 12 meses de esta cuenta */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                  {item.months.map((m, idx) => (
                    <div 
                      key={idx}
                      className={`p-2.5 rounded-xl border text-[11px] ${
                        m.hasActivity 
                          ? 'bg-zinc-50 border-zinc-200' 
                          : 'bg-zinc-50/40 border-zinc-100 opacity-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-extrabold text-zinc-900">{m.month}</span>
                        {m.hasActivity && (
                          <span className={`text-[9px] font-bold px-1 rounded ${
                            m.net >= 0 ? 'text-[#0E6A3B] bg-emerald-100' : 'text-rose-700 bg-rose-100'
                          }`}>
                            {m.net >= 0 ? '+' : '−'}
                          </span>
                        )}
                      </div>
                      <div className="space-y-0.5 font-feature-settings-tnum">
                        <div className="flex justify-between text-emerald-800">
                          <span className="text-[10px] text-zinc-500">Ing:</span>
                          <span className="font-semibold">+{formatCurrency(m.income)}</span>
                        </div>
                        <div className="flex justify-between text-rose-600">
                          <span className="text-[10px] text-zinc-500">Gas:</span>
                          <span className="font-semibold">-{formatCurrency(m.expense)}</span>
                        </div>
                        <div className="flex justify-between pt-0.5 border-t border-zinc-200 font-bold">
                          <span className="text-[10px] text-zinc-700">Net:</span>
                          <span className={m.net >= 0 ? 'text-[#0E6A3B]' : 'text-rose-600'}>
                            {m.net >= 0 ? `+${formatCurrency(m.net)}` : formatCurrency(m.net)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
