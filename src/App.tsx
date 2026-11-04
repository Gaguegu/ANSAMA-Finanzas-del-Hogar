import React, { useState, useEffect, useMemo } from 'react';
import { AppState, BankAccount, Transaction, BankSyncResult, MonthClosure, YieldRecord, YieldStatus, AccountType } from './types';
import { 
  loadAppState, 
  saveAppState, 
  simulateBankSync, 
  importStatementTransactions,
  formatCurrency,
  formatDate,
  formatRelativeTime,
  formatMonthName,
  syncAccountsWithClosures,
  getAvailableMonths,
  getAccountBalanceForMonth,
  cleanAndRestoreBackup,
  purgeDemoAccounts,
  normalizeAndDeduplicateYieldsAndTransactions,
  lockHistoricalExercise,
  restoreAuditedClosuresFromBenchmark,
  isMonthLocked,
  getLatestLockedMonth
} from './utils/storage';
import { detectYieldFromTransaction, createAutoYieldRecord } from './utils/yieldDetection';
import { reconcileAndCategorizeAll, normalizeConceptForMatching, areTransactionsSimilar } from './utils/reconciliation';
import { Header } from './components/Header';
import { NetWorthCard } from './components/NetWorthCard';
import { BankAccountsList } from './components/BankAccountsList';
import { ExpenseCategoriesChart } from './components/ExpenseCategoriesChart';
import { TransactionsTable } from './components/TransactionsTable';
import { MonthlyClosure } from './components/MonthlyClosure';
import { YearlyClosure } from './components/YearlyClosure';
import { YieldsView } from './components/YieldsView';
import { YieldModal } from './components/YieldModal';
import { TransactionModal } from './components/TransactionModal';
import { SyncModal } from './components/SyncModal';
import { AccountModal } from './components/AccountModal';
import { SettingsModal } from './components/SettingsModal';
import { InstallModal } from './components/InstallModal';
import { ImportStatementModal } from './components/ImportStatementModal';
import { MobileNav } from './components/MobileNav';
import { LockScreen } from './components/LockScreen';
import { AutoUpdateNotification } from './components/AutoUpdateNotification';
import { PatrimonioPeriodSelector } from './components/PatrimonioPeriodSelector';
import { Sparkles, CheckCircle2, RefreshCw, Info, AlertCircle } from 'lucide-react';
import { usePWA } from './utils/usePWA';

export default function App() {
  const [appState, setAppState] = useState<AppState>(() => loadAppState());
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  
  // Sincronizar pestaña activa en document.body para reglas de aislamiento de impresión (Ctrl+P)
  useEffect(() => {
    document.body.setAttribute('data-active-tab', activeTab);
  }, [activeTab]);

  // Selector de Mes y Año para consultar el Patrimonio, Bancos y Gastos a esa fecha
  // Se sitúa por defecto en el último mes oficialmente blindado y cerrado contablemente
  const [patrimonioMonth, setPatrimonioMonth] = useState<string>(() => {
    const loaded = loadAppState();
    return getLatestLockedMonth(loaded.monthlyClosures);
  });

  // Al entrar o cambiar a cada pantalla (Patrimonio, Bancos, Gastos, Cierre Mensual),
  // situar automáticamente la vista en el último mes blindado contablemente
  useEffect(() => {
    const latestLocked = getLatestLockedMonth(appState.monthlyClosures);
    setPatrimonioMonth(latestLocked);
  }, [activeTab]);

  // Si cambia el estado de blindajes en monthlyClosures (ej. se cierra y blinda un nuevo mes),
  // actualizar inmediatamente al último mes blindado
  useEffect(() => {
    const latestLocked = getLatestLockedMonth(appState.monthlyClosures);
    setPatrimonioMonth(latestLocked);
  }, [appState.monthlyClosures]);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState<boolean>(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [importTargetAccountId, setImportTargetAccountId] = useState<string | undefined>(undefined);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState<boolean>(false);
  const [transactionToEdit, setTransactionToEdit] = useState<Transaction | null>(null);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState<boolean>(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState<boolean>(false);
  const [isYieldModalOpen, setIsYieldModalOpen] = useState<boolean>(false);
  const [editingYield, setEditingYield] = useState<YieldRecord | null>(null);
  const [accountToEdit, setAccountToEdit] = useState<BankAccount | null>(null);
  const [accountModalInitialType, setAccountModalInitialType] = useState<AccountType | undefined>(undefined);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  const handleOpenNewAccountModal = (initialType?: AccountType) => {
    setAccountToEdit(null);
    setAccountModalInitialType(initialType);
    setIsAccountModalOpen(true);
  };

  // Security & App Lock states
  const [isLocked, setIsLocked] = useState<boolean>(() => {
    const loaded = loadAppState();
    return Boolean(loaded.security?.hasPassword && loaded.security?.passwordHash);
  });
  const [sessionPassword, setSessionPassword] = useState<string>('');

  // Hook PWA para instalación y actualizaciones automáticas y manuales
  const pwa = usePWA();

  // Show transient toast notification
  const triggerNotification = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  // Feedback de actualización
  useEffect(() => {
    if (pwa.updateFeedback) {
      triggerNotification(pwa.updateFeedback, 'info');
    }
  }, [pwa.updateFeedback]);

  // Auto-conciliación, deduplicación y verificación de rendimientos hasta fecha de cierre
  useEffect(() => {
    const normalized = normalizeAndDeduplicateYieldsAndTransactions(appState);
    const yieldsChanged = JSON.stringify(normalized.yieldRecords) !== JSON.stringify(appState.yieldRecords);
    const txsChanged = normalized.transactions.length !== appState.transactions.length;
    if (yieldsChanged || txsChanged) {
      setAppState(normalized);
      saveAppState(normalized);
    }
  }, []);

  // Add new transaction & update account balance
  const handleAddTransaction = (newTxData: Omit<Transaction, 'id'>) => {
    const txMonth = newTxData.date.substring(0, 7);
    if (isMonthLocked(txMonth, appState.monthlyClosures)) {
      triggerNotification(
        `El mes ${txMonth} está oficialmente blindado y cerrado contablemente. Para proteger la cuadratura de los saldos y Pérdidas y Ganancias, no se pueden añadir movimientos directos a periodos cerrados. Si necesitas modificarlo, reabre el mes en Control y Cierre Mensual.`,
        'error'
      );
      return;
    }

    const txId = `tx-${Date.now()}`;
    const newTx: Transaction = {
      ...newTxData,
      id: txId
    };

    const updatedAccounts = appState.accounts.map((acc) => {
      if (acc.id === newTx.accountId) {
        let newBalance = acc.balance;
        if (newTx.type === 'expense') {
          newBalance -= newTx.amount;
        } else {
          newBalance += newTx.amount;
        }
        return {
          ...acc,
          balance: Math.round(newBalance * 100) / 100
        };
      }
      return acc;
    });

    // Detectar automáticamente si este abono es un rendimiento (interés o dividendo)
    const detectedYield = detectYieldFromTransaction(newTx);
    let updatedYields = appState.yieldRecords || [];
    if (detectedYield) {
      const autoYield = createAutoYieldRecord(newTx, detectedYield);
      updatedYields = [autoYield, ...updatedYields];
    }

    const newState: AppState = {
      ...appState,
      accounts: updatedAccounts,
      transactions: [newTx, ...appState.transactions],
      yieldRecords: updatedYields
    };

    setAppState(newState);
    saveAppState(newState);
    triggerNotification(
      detectedYield
        ? `Movimiento "${newTx.title}" guardado y anotado automáticamente en Rendimientos (pendiente de comprobar).`
        : `Movimiento "${newTx.title}" guardado correctamente.`
    );
  };

  // Delete transaction & restore account balance
  const handleDeleteTransaction = (id: string) => {
    const txToDelete = appState.transactions.find((t) => t.id === id);
    if (!txToDelete) return;

    const txMonth = txToDelete.date.substring(0, 7);
    if (isMonthLocked(txMonth, appState.monthlyClosures)) {
      triggerNotification(
        `El movimiento pertenece al mes ${txMonth}, que está blindado y cerrado contablemente. Para proteger la integridad de los saldos y Pérdidas y Ganancias, no se pueden eliminar movimientos de meses cerrados sin reabrirlos antes.`,
        'error'
      );
      return;
    }

    const isDisclaimer =
      (txToDelete.title || '').toLowerCase().includes('cuentas colectivas') ||
      (txToDelete.title || '').toLowerCase().includes('notas sobre el extracto');

    const updatedAccounts = appState.accounts.map((acc) => {
      if (acc.id === txToDelete.accountId && !isDisclaimer) {
        let restoredBalance = acc.balance;
        // Reverse operation
        if (txToDelete.type === 'expense') {
          restoredBalance += txToDelete.amount;
        } else {
          restoredBalance -= txToDelete.amount;
        }
        return {
          ...acc,
          balance: Math.round(restoredBalance * 100) / 100
        };
      }
      return acc;
    });

    const newState: AppState = {
      ...appState,
      accounts: updatedAccounts,
      transactions: appState.transactions.filter((t) => t.id !== id)
    };

    setAppState(newState);
    saveAppState(newState);
    triggerNotification(
      isDisclaimer
        ? 'Anotación eliminada correctamente.'
        : 'Movimiento eliminado y saldo restaurado.'
    );
  };

  // Abrir modal para editar el apunte completo (solo si el mes no está blindado)
  const handleOpenEditTransaction = (tx: Transaction) => {
    const txMonth = tx.date.substring(0, 7);
    if (isMonthLocked(txMonth, appState.monthlyClosures)) {
      triggerNotification(
        `El movimiento pertenece a ${formatMonthName(txMonth)}, que está cerrado y blindado contablemente. Para modificarlo, primero debes reabrir el mes en Cierre Mensual.`,
        'error'
      );
      return;
    }
    setTransactionToEdit(tx);
    setIsTransactionModalOpen(true);
  };

  // Editar apunte contable completo (importe, fecha, concepto, cuenta, categoría y notas)
  const handleEditTransaction = (updatedTx: Transaction) => {
    const oldTx = appState.transactions.find((t) => t.id === updatedTx.id);
    if (!oldTx) return;

    const oldTxMonth = oldTx.date.substring(0, 7);
    const newTxMonth = updatedTx.date.substring(0, 7);

    if (isMonthLocked(oldTxMonth, appState.monthlyClosures)) {
      triggerNotification(
        `El movimiento original pertenece a ${formatMonthName(oldTxMonth)}, que está cerrado y blindado contablemente. No se puede modificar un apunte de un mes cerrado.`,
        'error'
      );
      return;
    }

    if (isMonthLocked(newTxMonth, appState.monthlyClosures)) {
      triggerNotification(
        `La nueva fecha asignada pertenece a ${formatMonthName(newTxMonth)}, que está cerrado y blindado contablemente. No se puede trasladar un apunte a un mes cerrado.`,
        'error'
      );
      return;
    }

    // Revertir efecto de oldTx en su cuenta y aplicar el efecto de updatedTx en la cuenta de destino
    const updatedAccounts = appState.accounts.map((acc) => {
      let b = acc.balance;
      let changed = false;

      // Revertir efecto anterior
      if (acc.id === oldTx.accountId) {
        if (oldTx.type === 'expense') {
          b += oldTx.amount;
        } else {
          b -= oldTx.amount;
        }
        changed = true;
      }

      // Aplicar nuevo efecto
      if (acc.id === updatedTx.accountId) {
        if (updatedTx.type === 'expense') {
          b -= updatedTx.amount;
        } else {
          b += updatedTx.amount;
        }
        changed = true;
      }

      return changed ? { ...acc, balance: Math.round(b * 100) / 100 } : acc;
    });

    // Actualizar rendimientos si este movimiento estaba vinculado a un rendimiento
    let updatedYields = (appState.yieldRecords || []).map((y) => {
      if (y.transactionId === updatedTx.id) {
        return {
          ...y,
          date: updatedTx.date,
          accountId: updatedTx.accountId,
          netAmount: updatedTx.amount,
          title: updatedTx.title
        };
      }
      return y;
    });

    const updatedTransactions = appState.transactions.map((t) =>
      t.id === updatedTx.id ? { ...updatedTx, isManualCategory: true } : t
    );

    const newState: AppState = {
      ...appState,
      accounts: updatedAccounts,
      transactions: updatedTransactions,
      yieldRecords: updatedYields
    };

    setAppState(newState);
    saveAppState(newState);
    setTransactionToEdit(null);
    triggerNotification(`Apunte "${updatedTx.title}" actualizado correctamente.`);
  };

  // Update existing transaction (e.g. adjust date to impute payroll to correct month)
  const handleUpdateTransaction = (updatedTx: Transaction) => {
    const updatedTransactions = appState.transactions.map((t) => (t.id === updatedTx.id ? { ...updatedTx, isManualCategory: true } : t));
    const newState: AppState = {
      ...appState,
      transactions: updatedTransactions
    };
    setAppState(newState);
    saveAppState(newState);
    triggerNotification(`Movimiento "${updatedTx.title}" actualizado con fecha ${formatDate(updatedTx.date)}.`);
  };

  // Actualizar categoría de movimiento (con opción de propagar a todos los meses idénticos)
  const handleUpdateTransactionCategory = (transactionId: string, newCategoryId: string, applyToSimilar: boolean = false) => {
    const targetTx = appState.transactions.find((t) => t.id === transactionId);
    if (!targetTx) return;

    let updatedCount = 0;

    const updatedTransactions = appState.transactions.map((tx) => {
      if (tx.id === transactionId) {
        updatedCount++;
        return { ...tx, categoryId: newCategoryId, isManualCategory: true };
      }
      if (applyToSimilar && areTransactionsSimilar(tx, targetTx)) {
        updatedCount++;
        return { ...tx, categoryId: newCategoryId, isManualCategory: true };
      }
      return tx;
    });

    const catObj = appState.categories.find((c) => c.id === newCategoryId);
    const catName = catObj ? catObj.name : 'Categoría';

    const newState: AppState = {
      ...appState,
      transactions: updatedTransactions
    };
    setAppState(newState);
    saveAppState(newState);

    triggerNotification(
      applyToSimilar && updatedCount > 1
        ? `Categoría «${catName}» aplicada a ${updatedCount} movimientos coincidentes en todos los meses.`
        : `Categoría «${catName}» fijada y protegida para este movimiento.`
    );
  };

  // Actualización masiva de categoría para selección por lotes
  const handleBatchUpdateCategory = (transactionIds: string[], newCategoryId: string) => {
    const idSet = new Set(transactionIds);
    const catObj = appState.categories.find((c) => c.id === newCategoryId);
    const catName = catObj ? catObj.name : 'Categoría';

    const updatedTransactions = appState.transactions.map((tx) => {
      if (idSet.has(tx.id)) {
        return { ...tx, categoryId: newCategoryId, isManualCategory: true };
      }
      return tx;
    });

    const newState: AppState = {
      ...appState,
      transactions: updatedTransactions
    };
    setAppState(newState);
    saveAppState(newState);

    triggerNotification(`Categoría «${catName}» aplicada a ${idSet.size} movimiento(s) seleccionados.`);
  };

  // Reconciliación global inteligente y auto-corrección de traspasos
  const handleAutoReconcile = () => {
    const result = reconcileAndCategorizeAll(appState.transactions, appState.accounts, appState.categories);
    if (result.stats.totalUpdated > 0) {
      const newState: AppState = {
        ...appState,
        transactions: result.updatedTransactions
      };
      setAppState(newState);
      saveAppState(newState);
    }
    return result;
  };

  // Move transactions between accounts and synchronize balances
  const handleMoveTransactions = (
    transactionIds: string[],
    targetAccountId: string,
    adjustBalances: boolean = true
  ) => {
    const idSet = new Set(transactionIds);
    const txsToMove = appState.transactions.filter((t) => idSet.has(t.id));
    if (txsToMove.length === 0) return;

    const targetAccount = appState.accounts.find((a) => a.id === targetAccountId);
    if (!targetAccount) return;

    let updatedAccounts = [...appState.accounts];

    if (adjustBalances) {
      // Agrupar neto por cuenta de origen
      const deltasBySource: Record<string, number> = {};
      let netTargetDelta = 0;
      let latestTxDate = '';

      for (const tx of txsToMove) {
        if (tx.accountId === targetAccountId) continue;
        const delta = tx.type === 'income' ? tx.amount : -tx.amount;
        deltasBySource[tx.accountId] = (deltasBySource[tx.accountId] || 0) + delta;
        netTargetDelta += delta;
        if (tx.date > latestTxDate) latestTxDate = tx.date;
      }

      updatedAccounts = updatedAccounts.map((acc) => {
        // Cuenta de destino (recibe los movimientos)
        if (acc.id === targetAccountId) {
          const newBal = acc.type === 'credit'
            ? acc.balance - netTargetDelta
            : acc.balance + netTargetDelta;
          return {
            ...acc,
            balance: Math.round(newBal * 100) / 100,
            balanceDate: latestTxDate && (!acc.balanceDate || latestTxDate > acc.balanceDate) ? latestTxDate : acc.balanceDate,
            lastSynced: new Date().toISOString()
          };
        }
        // Cuenta de origen (se le restan los movimientos que se equivocaron)
        if (deltasBySource[acc.id] !== undefined) {
          const srcDelta = deltasBySource[acc.id];
          const newBal = acc.type === 'credit'
            ? acc.balance + srcDelta
            : acc.balance - srcDelta;
          return {
            ...acc,
            balance: Math.round(newBal * 100) / 100,
            lastSynced: new Date().toISOString()
          };
        }
        return acc;
      });
    }

    const updatedTransactions = appState.transactions.map((t) => {
      if (idSet.has(t.id)) {
        return { ...t, accountId: targetAccountId };
      }
      return t;
    });

    const newState: AppState = {
      ...appState,
      accounts: updatedAccounts,
      transactions: updatedTransactions
    };

    setAppState(newState);
    saveAppState(newState);
    triggerNotification(
      `¡Listo! ${txsToMove.length} movimiento(s) trasladados a ${targetAccount.bankName} (${targetAccount.accountName})${adjustBalances ? ' y saldos ajustados correctamente.' : '.'}`
    );
  };

  // Batch delete transactions with balance rollback
  const handleBatchDeleteTransactions = (transactionIds: string[], revertBalances: boolean = true) => {
    const idSet = new Set(transactionIds);
    const txsToDelete = appState.transactions.filter((t) => idSet.has(t.id));
    if (txsToDelete.length === 0) return;

    const lockedTxs = txsToDelete.filter((t) => isMonthLocked(t.date.substring(0, 7), appState.monthlyClosures));
    if (lockedTxs.length > 0) {
      triggerNotification(
        `No se pueden eliminar ${lockedTxs.length} movimiento(s) porque pertenecen a periodos oficialmente blindados. Para evitar descuadres, reabre los meses correspondientes si necesitas hacer correcciones.`,
        'error'
      );
      return;
    }

    let updatedAccounts = [...appState.accounts];
    if (revertBalances) {
      const deltasByAccount: Record<string, number> = {};
      for (const tx of txsToDelete) {
        const isDisclaimer =
          (tx.title || '').toLowerCase().includes('cuentas colectivas') ||
          (tx.title || '').toLowerCase().includes('notas sobre el extracto');
        if (isDisclaimer) continue;
        const delta = tx.type === 'income' ? tx.amount : -tx.amount;
        deltasByAccount[tx.accountId] = (deltasByAccount[tx.accountId] || 0) + delta;
      }
      updatedAccounts = updatedAccounts.map((acc) => {
        if (deltasByAccount[acc.id] !== undefined) {
          const delta = deltasByAccount[acc.id];
          const restored = acc.type === 'credit' ? acc.balance + delta : acc.balance - delta;
          return {
            ...acc,
            balance: Math.round(restored * 100) / 100
          };
        }
        return acc;
      });
    }

    const updatedTransactions = appState.transactions.filter((t) => !idSet.has(t.id));
    const newState: AppState = {
      ...appState,
      accounts: updatedAccounts,
      transactions: updatedTransactions
    };
    setAppState(newState);
    saveAppState(newState);
    triggerNotification(`${txsToDelete.length} movimiento(s) eliminados${revertBalances ? ' y saldos restaurados.' : '.'}`);
  };

  const handleOpenImportModal = (targetAccountId?: string) => {
    setImportTargetAccountId(targetAccountId);
    setIsImportModalOpen(true);
  };

  // Import Real Statement Transactions (Excel / CSV)
  const handleImportTransactions = (
    transactions: Array<Omit<Transaction, 'id'>>,
    accountId: string,
    updateBalance: boolean = true,
    explicitBalance?: number,
    explicitBalanceDate?: string,
    statementMovementsWithBalance?: Array<{ date: string; amount: number; type: 'income' | 'expense'; balanceAfter?: number }>
  ) => {
    const { newState, importedCount, enrichedCount } = importStatementTransactions(
      appState,
      transactions,
      accountId,
      updateBalance,
      explicitBalance,
      explicitBalanceDate,
      statementMovementsWithBalance
    );
    setAppState(newState);
    saveAppState(newState);
    const targetAcc = newState.accounts.find((a) => a.id === accountId);
    const bankName = targetAcc ? `${targetAcc.bankName} (${targetAcc.accountName})` : 'tu cuenta';
    const balanceInfo = updateBalance && targetAcc
      ? ` Saldo disponible actualizado a ${formatCurrency(targetAcc.balance)} (fecha: ${targetAcc.balanceDate || 'hoy'}).`
      : '';
    
    if (importedCount === 0) {
      const enrichedMsg = enrichedCount && enrichedCount > 0 ? ` (${enrichedCount} movimientos vinculados con su saldo bancario oficial).` : '';
      triggerNotification(
        `¡Extracto verificado! No se duplicó ningún movimiento existente.${enrichedMsg}${balanceInfo}`
      );
    } else {
      triggerNotification(
        `¡Éxito! Se han importado ${importedCount} movimientos en ${bankName}.${balanceInfo}`
      );
    }
  };

  // Save (add or update) account
  const handleSaveAccount = (account: BankAccount) => {
    const exists = appState.accounts.some((a) => a.id === account.id);
    let updatedAccounts: BankAccount[];

    if (exists) {
      updatedAccounts = appState.accounts.map((a) => (a.id === account.id ? account : a));
    } else {
      updatedAccounts = [...appState.accounts, account];
    }

    // Identificar qué mes corresponde al saldo guardado (por la fecha del saldo o el mes consultado en Patrimonio)
    const targetMonth = account.balanceDate ? account.balanceDate.substring(0, 7) : patrimonioMonth;
    
    let updatedClosures = [...(appState.monthlyClosures || [])];
    const cIdx = updatedClosures.findIndex((c) => c.month === targetMonth);
    const targetClosure = cIdx >= 0 ? updatedClosures[cIdx] : null;

    // COMPROBACIÓN CRÍTICA DE SEGURIDAD:
    // Si el mes está blindado oficialmente (isLocked === true), PROTEGER el saldo contra alteraciones accidentales
    if (targetClosure && targetClosure.isLocked) {
      triggerNotification(
        `🛡️ El mes de ${formatMonthName(targetMonth)} está blindado oficialmente. Para evitar descuadres, el saldo blindado se mantiene protegido y no se ha modificado. Desblinda primero el mes desde el selector de la cabecera si deseas ajustarlo.`,
        'error'
      );
      // Permitir guardar otros datos descriptivos de la cuenta (nombre, IBAN, color, tipo) sin alterar el saldo
      const prevAccount = appState.accounts.find((a) => a.id === account.id);
      if (prevAccount) {
        const safeAccount: BankAccount = {
          ...account,
          balance: prevAccount.balance,
          balanceDate: prevAccount.balanceDate
        };
        const safeAccounts = appState.accounts.map((a) => (a.id === account.id ? safeAccount : a));
        const newState: AppState = { ...appState, accounts: safeAccounts };
        setAppState(newState);
        saveAppState(newState);
      }
      return;
    }
    
    if (cIdx >= 0) {
      const existingClosure = updatedClosures[cIdx];
      const updatedAudited = {
        ...(existingClosure.auditedBalances || {}),
        [account.id]: Math.round(account.balance * 100) / 100
      };
      updatedClosures[cIdx] = {
        ...existingClosure,
        auditedBalances: updatedAudited
      };
    } else if (targetMonth) {
      updatedClosures.push({
        month: targetMonth,
        isClosed: false,
        isLocked: false,
        auditedBalances: {
          [account.id]: Math.round(account.balance * 100) / 100
        }
      });
    }

    // Si también se está consultando patrimonioMonth y es diferente de targetMonth pero no está blindado:
    if (patrimonioMonth && patrimonioMonth !== targetMonth) {
      const pIdx = updatedClosures.findIndex((c) => c.month === patrimonioMonth);
      if (pIdx >= 0) {
        const pClosure = updatedClosures[pIdx];
        if (!pClosure.isLocked) {
          updatedClosures[pIdx] = {
            ...pClosure,
            auditedBalances: {
              ...(pClosure.auditedBalances || {}),
              [account.id]: Math.round(account.balance * 100) / 100
            }
          };
        }
      }
    }

    const newState: AppState = {
      ...appState,
      accounts: updatedAccounts,
      monthlyClosures: updatedClosures
    };

    setAppState(newState);
    saveAppState(newState);
    triggerNotification(`Saldo de "${account.accountName}" guardado en ${formatCurrency(account.balance)}.`);
  };

  // Delete an account
  const handleDeleteAccount = (accountId: string, accountName?: string) => {
    const targetAccount = appState.accounts.find((a) => a.id === accountId);
    const updatedAccounts = appState.accounts.filter((a) => a.id !== accountId);
    const updatedTransactions = appState.transactions.filter((t) => t.accountId !== accountId);
    const updatedYields = (appState.yieldRecords || []).filter((y) => y.accountId !== accountId);

    const newState: AppState = {
      ...appState,
      accounts: updatedAccounts,
      transactions: updatedTransactions,
      yieldRecords: updatedYields
    };

    setAppState(newState);
    saveAppState(newState);
    triggerNotification(
      accountName || targetAccount?.accountName
        ? `Cuenta "${accountName || targetAccount?.accountName}" eliminada.`
        : 'Cuenta bancaria eliminada.'
    );
  };

  // Delete an entire bank entity and all its associated accounts & transactions
  const handleDeleteBank = (bankId: string, bankName: string, accountIds: string[]) => {
    const accountIdSet = new Set(accountIds);
    const updatedAccounts = appState.accounts.filter((a) => !accountIdSet.has(a.id));
    const updatedTransactions = appState.transactions.filter((t) => !accountIdSet.has(t.accountId));
    const updatedYields = (appState.yieldRecords || []).filter((y) => !accountIdSet.has(y.accountId));

    const newState: AppState = {
      ...appState,
      accounts: updatedAccounts,
      transactions: updatedTransactions,
      yieldRecords: updatedYields
    };

    setAppState(newState);
    saveAppState(newState);
    triggerNotification(`Entidad "${bankName}" y sus ${accountIds.length} cuenta(s) asociadas han sido eliminadas.`);
  };

  // Simulate bank synchronization
  const handleExecuteSync = async (targetBankId?: 'bbva' | 'santander') => {
    setIsSyncing(true);
    try {
      const { newState, results, addedCount } = await simulateBankSync(appState, targetBankId);
      setAppState(newState);
      triggerNotification(`Sincronización completada (+${addedCount} nuevos movimientos)`);
      return { results, addedCount };
    } finally {
      setIsSyncing(false);
    }
  };

  const handleQuickSyncBank = async (bankId: 'bbva' | 'santander') => {
    setIsSyncing(true);
    try {
      const { newState, addedCount } = await simulateBankSync(appState, bankId);
      setAppState(newState);
      triggerNotification(`Sincronización con ${bankId.toUpperCase()} completada (+${addedCount} mov).`);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSyncing(false);
    }
  };

  // Update or create a month closure and synchronize account balances
  const handleUpdateClosure = (closure: MonthClosure) => {
    const existing = appState.monthlyClosures || [];
    const index = existing.findIndex((c) => c.month === closure.month);
    let updatedClosures: MonthClosure[];
    if (index >= 0) {
      updatedClosures = [...existing];
      updatedClosures[index] = closure;
    } else {
      updatedClosures = [...existing, closure];
    }

    // Sincronizar automáticamente las cuentas con los saldos de cierre auditados
    // para que la pantalla de Patrimonio y Bancos reflejen los nuevos saldos al instante
    const updatedAccounts = syncAccountsWithClosures(
      appState.accounts,
      updatedClosures,
      appState.transactions
    );

    const newState: AppState = {
      ...appState,
      accounts: updatedAccounts,
      monthlyClosures: updatedClosures
    };
    setAppState(newState);
    saveAppState(newState);
    triggerNotification(
      closure.isClosed 
        ? `Mes ${closure.month} auditado: los saldos se han actualizado en tu pantalla de Patrimonio.`
        : `Cierre del mes ${closure.month} guardado y sincronizado con Patrimonio.`,
      'success'
    );
  };

  // Blindar oficialmente los Ejercicios Históricos (2025 completo y 2026 Ene-Sep)
  const handleLockExercise = () => {
    const newState = lockHistoricalExercise(appState);
    setAppState(newState);
    triggerNotification(
      '🛡️ Blindaje Contable Activo: Los ejercicios históricos (2025 completo y 2026 Enero–Septiembre) han quedado sellados. Los saldos bancarios y las Pérdidas y Ganancias están 100% blindados contra cualquier modificación futura.',
      'success'
    );
  };

  // Repasar, verificar y restaurar saldos oficiales de cierres blindados
  const handleRestoreAuditedClosures = () => {
    if (!window.confirm('¿Deseas repasar y verificar todos los cierres blindados (2025 y 2026)?\n\nEsta auditoría coteja los saldos de cada banco contra los datos oficiales del benchmark y restaura cualquier saldo que haya sido alterado por equivocación en periodos blindados.')) {
      return;
    }
    const { newState, restoredCount, details } = restoreAuditedClosuresFromBenchmark(appState);
    setAppState(newState);
    if (restoredCount > 0) {
      triggerNotification(
        `🛡️ Se han repasado los cierres blindados: ${restoredCount} saldo(s) corregido(s) y restaurado(s) a su valor oficial auditado.`,
        'success'
      );
    } else {
      triggerNotification(
        '🛡️ Cierres blindados verificados: todos los saldos de 2025 y 2026 coinciden al 100% con los datos oficiales y están protegidos.',
        'success'
      );
    }
  };

  // Alternar el candado (Blindado / Abierto / Cerrado) de un mes específico desde el selector
  const handleToggleLockMonth = (monthKey: string) => {
    const existing = appState.monthlyClosures || [];
    const closure = existing.find((c) => c.month === monthKey);
    const isCurrentlyLocked = Boolean(closure?.isLocked);
    const isCurrentlyClosed = Boolean(closure?.isClosed);
    const monthLabel = formatMonthName(monthKey);

    if (isCurrentlyLocked || isCurrentlyClosed) {
      if (!window.confirm(`¿Deseas desblindar y reabrir el mes de ${monthLabel}? Podrás corregir o ajustar los saldos bancarios y de valores.`)) {
        return;
      }
      const updated: MonthClosure = {
        ...(closure || { month: monthKey }),
        isClosed: false,
        isLocked: false,
        notes: closure?.notes || `Reabierto para ajustes de saldos`
      };
      handleUpdateClosure(updated);
      triggerNotification(`🔓 Mes de ${monthLabel} reabierto. Ya puedes corregir saldos en la tarjeta de cada entidad.`, 'info');
    } else {
      // Estaba abierto: cerrar y blindar
      if (!window.confirm(`¿Deseas cerrar y blindar oficialmente el mes de ${monthLabel}? Los saldos quedarán certificados y protegidos.`)) {
        return;
      }
      const auditedBalances: Record<string, number> = {};
      appState.accounts.forEach((acc) => {
        const info = getAccountBalanceForMonth(acc, monthKey, appState.transactions, appState.monthlyClosures);
        auditedBalances[acc.id] = info.balance;
      });

      const updated: MonthClosure = {
        ...(closure || { month: monthKey }),
        month: monthKey,
        isClosed: true,
        isLocked: true,
        closedAt: new Date().toISOString(),
        notes: `🔒 Cierre y blindaje contable`,
        auditedBalances
      };
      handleUpdateClosure(updated);
      triggerNotification(`🔒 Mes de ${monthLabel} cerrado y blindado con éxito.`, 'success');
    }
  };

  // Save (add or update) Yield Record (Intereses Bancarios o Dividendos)
  const handleSaveYield = (record: YieldRecord, syncWithTransactions: boolean) => {
    const existingYields = appState.yieldRecords || [];
    const isEditing = existingYields.some((y) => y.id === record.id);
    let updatedTransactions = [...appState.transactions];
    let updatedAccounts = [...appState.accounts];
    let finalTransactionId = record.transactionId;

    if (syncWithTransactions) {
      if (finalTransactionId) {
        // Actualizar transacción existente
        const txIndex = updatedTransactions.findIndex((t) => t.id === finalTransactionId);
        if (txIndex >= 0) {
          const oldTx = updatedTransactions[txIndex];
          // Revertir saldo de la cuenta anterior
          updatedAccounts = updatedAccounts.map((acc) => {
            if (acc.id === oldTx.accountId) {
              return { ...acc, balance: acc.balance - oldTx.amount };
            }
            return acc;
          });

          // Actualizar transacción con el nuevo importe líquido
          const updatedTx: Transaction = {
            ...oldTx,
            accountId: record.accountId,
            date: record.date,
            title: `${record.type === 'interest' ? 'Intereses' : 'Dividendo'}: ${record.title}`,
            amount: record.netAmount,
            note: `Bruto: ${formatCurrency(record.grossAmount)} | Retención ${record.taxRatePercent}%: ${formatCurrency(record.withholdingTax)} | Líquido: ${formatCurrency(record.netAmount)}`
          };
          updatedTransactions[txIndex] = updatedTx;

          // Abonar nuevo importe líquido en la cuenta
          updatedAccounts = updatedAccounts.map((acc) => {
            if (acc.id === record.accountId) {
              return { ...acc, balance: acc.balance + record.netAmount };
            }
            return acc;
          });
        }
      } else {
        // Crear nueva transacción vinculada
        const newTxId = `tx-yd-${record.id}`;
        finalTransactionId = newTxId;
        const newTx: Transaction = {
          id: newTxId,
          accountId: record.accountId,
          date: record.date,
          title: `${record.type === 'interest' ? 'Intereses' : 'Dividendo'}: ${record.title}`,
          amount: record.netAmount,
          type: 'income',
          categoryId: 'cat-rendimientos',
          note: `Bruto: ${formatCurrency(record.grossAmount)} | Retención ${record.taxRatePercent}%: ${formatCurrency(record.withholdingTax)} | Líquido: ${formatCurrency(record.netAmount)}`
        };
        updatedTransactions = [newTx, ...updatedTransactions];

        // Abonar importe líquido en la cuenta bancaria seleccionada
        updatedAccounts = updatedAccounts.map((acc) => {
          if (acc.id === record.accountId) {
            return { ...acc, balance: acc.balance + record.netAmount };
          }
          return acc;
        });
      }
    }

    const finalRecord: YieldRecord = {
      ...record,
      transactionId: finalTransactionId
    };

    let updatedYields: YieldRecord[];
    if (isEditing) {
      updatedYields = existingYields.map((y) => (y.id === finalRecord.id ? finalRecord : y));
    } else {
      updatedYields = [finalRecord, ...existingYields];
    }

    const newState: AppState = {
      ...appState,
      accounts: updatedAccounts,
      transactions: updatedTransactions,
      yieldRecords: updatedYields
    };

    setAppState(newState);
    saveAppState(newState);
    triggerNotification(
      isEditing
        ? `Rendimiento "${record.title}" actualizado con éxito.`
        : `Rendimiento "${record.title}" guardado (+${formatCurrency(record.netAmount)} líquido).`
    );
  };

  // Delete Yield Record
  const handleDeleteYield = (id: string) => {
    const existingYields = appState.yieldRecords || [];
    const target = existingYields.find((y) => y.id === id);
    if (!target) return;

    let updatedTransactions = [...appState.transactions];
    let updatedAccounts = [...appState.accounts];

    // Si tenía una transacción asociada en cuenta, eliminarla y restaurar el saldo
    if (target.transactionId) {
      const tx = updatedTransactions.find((t) => t.id === target.transactionId);
      if (tx) {
        updatedAccounts = updatedAccounts.map((acc) => {
          if (acc.id === tx.accountId) {
            return { ...acc, balance: acc.balance - tx.amount };
          }
          return acc;
        });
        updatedTransactions = updatedTransactions.filter((t) => t.id !== target.transactionId);
      }
    }

    const updatedYields = existingYields.filter((y) => y.id !== id);
    const newState: AppState = {
      ...appState,
      accounts: updatedAccounts,
      transactions: updatedTransactions,
      yieldRecords: updatedYields
    };

    setAppState(newState);
    saveAppState(newState);
    triggerNotification(`Rendimiento "${target.title}" eliminado.`);
  };

  // Toggle Yield Status (needs_review <-> verified)
  const handleToggleYieldStatus = (id: string) => {
    const existingYields = appState.yieldRecords || [];
    const target = existingYields.find((y) => y.id === id);
    if (!target) return;

    const newStatus: YieldStatus = target.status === 'needs_review' ? 'verified' : 'needs_review';
    const updatedYields: YieldRecord[] = existingYields.map((y) => 
      y.id === id ? { ...y, status: newStatus } : y
    );

    const newState: AppState = {
      ...appState,
      yieldRecords: updatedYields
    };

    setAppState(newState);
    saveAppState(newState);
    triggerNotification(
      newStatus === 'verified'
        ? `Cobro "${target.title}" marcado como comprobado y verificado.`
        : `Cobro "${target.title}" marcado como pendiente de comprobación.`
    );
  };

  // Batch Verify Yields (mark all specified yields as verified in one click)
  const handleBatchVerifyYields = (ids?: string[]) => {
    const existingYields = appState.yieldRecords || [];
    const idSet = ids ? new Set(ids) : null;
    let count = 0;
    const updatedYields: YieldRecord[] = existingYields.map((y) => {
      if (!idSet || idSet.has(y.id)) {
        if (y.status === 'needs_review') count++;
        return { ...y, status: 'verified' as YieldStatus };
      }
      return y;
    });

    const newState: AppState = {
      ...appState,
      yieldRecords: updatedYields
    };

    setAppState(newState);
    saveAppState(newState);
    triggerNotification(`Se han marcado ${count} cobros como comprobados y verificados.`);
  };

  // Lista ordenada de meses disponibles para el selector de Patrimonio
  const availableMonths = useMemo(() => {
    return getAvailableMonths(appState.transactions, appState.monthlyClosures, appState.accounts);
  }, [appState.transactions, appState.monthlyClosures, appState.accounts]);

  const latestLockedMonth = useMemo(() => {
    return getLatestLockedMonth(appState.monthlyClosures);
  }, [appState.monthlyClosures]);

  const latestAvailableMonth = availableMonths[0] || latestLockedMonth;
  const isCurrentPatrimonioMonth = patrimonioMonth === latestLockedMonth;

  // Cuentas con saldos y fechas reconstruidos para el mes seleccionado en Patrimonio
  const effectivePatrimonioAccounts = useMemo(() => {
    return appState.accounts.map((acc) => {
      const info = getAccountBalanceForMonth(acc, patrimonioMonth, appState.transactions, appState.monthlyClosures);
      return {
        ...acc,
        balance: info.balance,
        balanceDate: info.balanceDate,
        balanceSourceLabel: info.label,
        isAudited: info.isAudited
      };
    });
  }, [appState.accounts, patrimonioMonth, appState.transactions, appState.monthlyClosures]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-20 md:pb-12 text-slate-900">
      
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-20 right-4 z-50 animate-in fade-in slide-in-from-top-3 duration-200 max-w-sm">
          <div className={`flex items-center gap-2.5 backdrop-blur text-white px-4 py-3 rounded-2xl shadow-xl text-xs font-medium border ${
            notification.type === 'error'
              ? 'bg-rose-950/95 border-rose-700/80 text-rose-100'
              : 'bg-slate-900/95 border-slate-700/80 text-white'
          }`}>
            {notification.type === 'info' ? (
              <RefreshCw className="w-4 h-4 text-emerald-400 shrink-0 animate-spin" />
            ) : notification.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            )}
            <span className="leading-snug">{notification.message}</span>
          </div>
        </div>
      )}

      {/* Main Header */}
      <Header
        lastSync={appState.lastGlobalSync}
        isSyncing={isSyncing}
        onOpenSyncModal={() => setIsSyncModalOpen(true)}
        onOpenNewTransactionModal={() => {
          setTransactionToEdit(null);
          setIsTransactionModalOpen(true);
        }}
        onOpenImportModal={() => handleOpenImportModal()}
        onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isInstalled={pwa.isInstalled}
        onOpenInstall={() => {
          if (pwa.isInstallable) {
            pwa.installApp().then((accepted) => {
              if (!accepted) {
                setIsInstallModalOpen(true);
              }
            });
          } else {
            setIsInstallModalOpen(true);
          }
        }}
        hasNewUpdate={pwa.hasNewUpdate}
        isCheckingUpdate={pwa.isCheckingUpdate}
        onCheckUpdate={pwa.checkForUpdates}
        onApplyUpdate={pwa.applyUpdate}
        autoUpdateCountdown={pwa.autoUpdateCountdown}
        isAutoUpdatePaused={pwa.isAutoUpdatePaused}
        onPauseAutoUpdate={pwa.pauseAutoUpdate}
        onResumeAutoUpdate={pwa.resumeAutoUpdate}
        hasPassword={Boolean(appState.security?.hasPassword)}
        onLockApp={() => {
          setIsLocked(true);
          setSessionPassword('');
          triggerNotification('Aplicación bloqueada. Se requiere contraseña.');
        }}
      />

      {/* Main App Content Area */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 flex-1">
        
        {/* Full Overview View (Patrimonio) */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Selector de Mes / Año con saldo y fecha de cada banco */}
            <PatrimonioPeriodSelector
              selectedMonth={patrimonioMonth}
              onSelectMonth={setPatrimonioMonth}
              availableMonths={availableMonths}
              closures={appState.monthlyClosures}
              isCurrentMonth={isCurrentPatrimonioMonth}
              onResetToCurrentMonth={() => setPatrimonioMonth(latestLockedMonth)}
              onToggleLockMonth={handleToggleLockMonth}
            />

            <NetWorthCard 
              accounts={effectivePatrimonioAccounts} 
              transactions={appState.transactions}
              selectedMonth={patrimonioMonth}
              onResetToCurrentMonth={() => setPatrimonioMonth(latestLockedMonth)}
            />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Bank Accounts */}
              <div className="lg:col-span-7">
                <BankAccountsList
                  accounts={effectivePatrimonioAccounts}
                  transactions={appState.transactions}
                  selectedMonth={patrimonioMonth}
                  monthlyClosures={appState.monthlyClosures}
                  onSyncBank={handleQuickSyncBank}
                  onOpenNewAccountModal={handleOpenNewAccountModal}
                  onEditAccount={(acc) => {
                    setAccountToEdit(acc);
                    setAccountModalInitialType(undefined);
                    setIsAccountModalOpen(true);
                  }}
                  onSaveAccount={handleSaveAccount}
                  onDeleteAccount={handleDeleteAccount}
                  onDeleteBank={handleDeleteBank}
                  onOpenImportModal={handleOpenImportModal}
                  isSyncing={isSyncing}
                />
              </div>

              {/* Right Column: Expense Categories breakdown */}
              <div className="lg:col-span-5">
                <ExpenseCategoriesChart
                  categories={appState.categories}
                  transactions={appState.transactions}
                  selectedMonth={patrimonioMonth}
                  onSelectMonth={setPatrimonioMonth}
                  availableMonths={availableMonths}
                  closures={appState.monthlyClosures}
                />
              </div>
            </div>
          </div>
        )}

        {/* Dedicated Bank Accounts View */}
        {activeTab === 'accounts' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Selector de Mes / Año también disponible en Bancos para mayor comodidad */}
            <PatrimonioPeriodSelector
              selectedMonth={patrimonioMonth}
              onSelectMonth={setPatrimonioMonth}
              availableMonths={availableMonths}
              closures={appState.monthlyClosures}
              isCurrentMonth={isCurrentPatrimonioMonth}
              onResetToCurrentMonth={() => setPatrimonioMonth(latestLockedMonth)}
              onToggleLockMonth={handleToggleLockMonth}
            />

            <BankAccountsList
              accounts={effectivePatrimonioAccounts}
              transactions={appState.transactions}
              selectedMonth={patrimonioMonth}
              monthlyClosures={appState.monthlyClosures}
              onSyncBank={handleQuickSyncBank}
              onOpenNewAccountModal={handleOpenNewAccountModal}
              onEditAccount={(acc) => {
                setAccountToEdit(acc);
                setAccountModalInitialType(undefined);
                setIsAccountModalOpen(true);
              }}
              onSaveAccount={handleSaveAccount}
              onDeleteAccount={handleDeleteAccount}
              onDeleteBank={handleDeleteBank}
              onOpenImportModal={handleOpenImportModal}
              isSyncing={isSyncing}
            />

            <TransactionsTable
              transactions={appState.transactions}
              accounts={appState.accounts}
              categories={appState.categories}
              onDeleteTransaction={handleDeleteTransaction}
              onOpenNewTransactionModal={() => {
                setTransactionToEdit(null);
                setIsTransactionModalOpen(true);
              }}
              onOpenImportModal={() => handleOpenImportModal()}
              onMoveTransactions={handleMoveTransactions}
              onBatchDeleteTransactions={handleBatchDeleteTransactions}
              onUpdateTransactionCategory={handleUpdateTransactionCategory}
              onBatchUpdateCategory={handleBatchUpdateCategory}
              onAutoReconcile={handleAutoReconcile}
              monthlyClosures={appState.monthlyClosures}
              onEditTransaction={handleOpenEditTransaction}
            />
          </div>
        )}

        {/* Dedicated Categories & Budget View */}
        {activeTab === 'categories' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <ExpenseCategoriesChart
              categories={appState.categories}
              transactions={appState.transactions}
              selectedMonth={patrimonioMonth}
              onSelectMonth={setPatrimonioMonth}
              availableMonths={availableMonths}
              closures={appState.monthlyClosures}
            />
          </div>
        )}

        {/* Dedicated Transactions View */}
        {activeTab === 'transactions' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <TransactionsTable
              transactions={appState.transactions}
              accounts={appState.accounts}
              categories={appState.categories}
              onDeleteTransaction={handleDeleteTransaction}
              onOpenNewTransactionModal={() => {
                setTransactionToEdit(null);
                setIsTransactionModalOpen(true);
              }}
              onOpenImportModal={() => setIsImportModalOpen(true)}
              onMoveTransactions={handleMoveTransactions}
              onBatchDeleteTransactions={handleBatchDeleteTransactions}
              onUpdateTransactionCategory={handleUpdateTransactionCategory}
              onBatchUpdateCategory={handleBatchUpdateCategory}
              onAutoReconcile={handleAutoReconcile}
              monthlyClosures={appState.monthlyClosures}
              onEditTransaction={handleOpenEditTransaction}
            />
          </div>
        )}

        {/* Cierre Mensual View */}
        {activeTab === 'monthly' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <MonthlyClosure
              appState={appState}
              onUpdateClosure={handleUpdateClosure}
              onUpdateTransaction={handleUpdateTransaction}
              initialMonth={patrimonioMonth}
            />
          </div>
        )}

        {/* Cierre por Año View (Saldos totales de cada banco por meses) */}
        {activeTab === 'yearly' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <YearlyClosure
              appState={appState}
              onLockExercise={handleLockExercise}
              onRestoreAuditedClosures={handleRestoreAuditedClosures}
              onUpdateClosure={handleUpdateClosure}
            />
          </div>
        )}

        {/* Rendimientos: Intereses Bancarios y Dividendos de Acciones */}
        {activeTab === 'yields' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <YieldsView
              appState={appState}
              onOpenNewYieldModal={() => {
                setEditingYield(null);
                setIsYieldModalOpen(true);
              }}
              onEditYield={(record) => {
                setEditingYield(record);
                setIsYieldModalOpen(true);
              }}
              onDeleteYield={handleDeleteYield}
              onToggleYieldStatus={handleToggleYieldStatus}
              onBatchVerifyYields={handleBatchVerifyYields}
            />
          </div>
        )}

      </main>

      {/* Mobile Bottom Navigation Bar */}
      <MobileNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenNewTransactionModal={() => {
          setTransactionToEdit(null);
          setIsTransactionModalOpen(true);
        }}
      />

      {/* Modals */}
      <YieldModal
        isOpen={isYieldModalOpen}
        onClose={() => {
          setIsYieldModalOpen(false);
          setEditingYield(null);
        }}
        accounts={appState.accounts}
        onSaveYield={handleSaveYield}
        initialYield={editingYield}
      />

      <TransactionModal
        isOpen={isTransactionModalOpen}
        onClose={() => {
          setIsTransactionModalOpen(false);
          setTransactionToEdit(null);
        }}
        accounts={appState.accounts}
        categories={appState.categories}
        onAddTransaction={handleAddTransaction}
        transactionToEdit={transactionToEdit}
        onEditTransaction={handleEditTransaction}
        monthlyClosures={appState.monthlyClosures}
      />

      <SyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        onExecuteSync={handleExecuteSync}
        lastGlobalSync={appState.lastGlobalSync}
        onOpenImportModal={() => setIsImportModalOpen(true)}
      />

      <ImportStatementModal
        isOpen={isImportModalOpen}
        onClose={() => {
          setIsImportModalOpen(false);
          setImportTargetAccountId(undefined);
        }}
        accounts={appState.accounts}
        categories={appState.categories}
        existingTransactions={appState.transactions}
        initialAccountId={importTargetAccountId}
        onImport={handleImportTransactions}
      />

      <AccountModal
        isOpen={isAccountModalOpen}
        onClose={() => {
          setIsAccountModalOpen(false);
          setAccountToEdit(null);
          setAccountModalInitialType(undefined);
        }}
        onSaveAccount={(account) => {
          handleSaveAccount(account);
          setAccountToEdit(null);
          setAccountModalInitialType(undefined);
          setIsAccountModalOpen(false);
        }}
        onDeleteAccount={(id) => {
          handleDeleteAccount(id);
          setAccountToEdit(null);
          setAccountModalInitialType(undefined);
          setIsAccountModalOpen(false);
        }}
        accountToEdit={accountToEdit}
        initialType={accountModalInitialType}
        transactions={appState.transactions}
        monthlyClosures={appState.monthlyClosures}
        selectedMonth={patrimonioMonth}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        appState={appState}
        onStateUpdated={(newState) => setAppState(newState)}
        onRestoreAuditedClosures={handleRestoreAuditedClosures}
        isInstalled={pwa.isInstalled}
        onOpenInstall={() => {
          if (pwa.isInstallable) {
            pwa.installApp().then((accepted) => {
              if (!accepted) setIsInstallModalOpen(true);
            });
          } else {
            setIsInstallModalOpen(true);
          }
        }}
        currentPassword={sessionPassword}
        onPasswordChanged={(newPass) => {
          setSessionPassword(newPass || '');
        }}
      />

      {/* Modal de Instrucciones e Instalación PWA */}
      <InstallModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
        onInstallDirectly={pwa.installApp}
        canPromptDirectly={pwa.isInstallable}
      />

      {/* Notificación flotante de Actualización Automática */}
      <AutoUpdateNotification
        hasNewUpdate={pwa.hasNewUpdate}
        countdown={pwa.autoUpdateCountdown}
        isPaused={pwa.isAutoUpdatePaused}
        onApplyNow={pwa.applyUpdate}
        onPause={pwa.pauseAutoUpdate}
        onResume={pwa.resumeAutoUpdate}
      />

      {/* Pantalla de Bloqueo por Contraseña si está activada */}
      {isLocked && appState.security?.hasPassword && appState.security?.passwordHash && (
        <LockScreen
          storedPasswordHash={appState.security.passwordHash}
          onUnlock={(unlockedPassword) => {
            setIsLocked(false);
            setSessionPassword(unlockedPassword);
            triggerNotification('¡Bienvenido! Finanzas desbloqueadas.');
          }}
          onForgotOrRestore={() => {
            setIsSettingsModalOpen(true);
            setIsLocked(false);
          }}
        />
      )}

    </div>
  );
}
