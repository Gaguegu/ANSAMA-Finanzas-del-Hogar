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
  syncAccountsWithClosures,
  getAvailableMonths,
  getAccountBalanceForMonth
} from './utils/storage';
import { detectYieldFromTransaction, createAutoYieldRecord } from './utils/yieldDetection';
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
import { Sparkles, CheckCircle2, RefreshCw, Info } from 'lucide-react';
import { usePWA } from './utils/usePWA';

export default function App() {
  const [appState, setAppState] = useState<AppState>(() => loadAppState());
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  
  // Selector de Mes y Año para consultar el Patrimonio y saldos bancarios a esa fecha
  const [patrimonioMonth, setPatrimonioMonth] = useState<string>(() => new Date().toISOString().substring(0, 7));
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState<boolean>(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [importTargetAccountId, setImportTargetAccountId] = useState<string | undefined>(undefined);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState<boolean>(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState<boolean>(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState<boolean>(false);
  const [isYieldModalOpen, setIsYieldModalOpen] = useState<boolean>(false);
  const [editingYield, setEditingYield] = useState<YieldRecord | null>(null);
  const [accountToEdit, setAccountToEdit] = useState<BankAccount | null>(null);
  const [accountModalInitialType, setAccountModalInitialType] = useState<AccountType | undefined>(undefined);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

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
  const triggerNotification = (message: string, type: 'success' | 'info' = 'success') => {
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

  // Add new transaction & update account balance
  const handleAddTransaction = (newTxData: Omit<Transaction, 'id'>) => {
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

  // Update existing transaction (e.g. adjust date to impute payroll to correct month)
  const handleUpdateTransaction = (updatedTx: Transaction) => {
    const updatedTransactions = appState.transactions.map((t) => (t.id === updatedTx.id ? updatedTx : t));
    const newState: AppState = {
      ...appState,
      transactions: updatedTransactions
    };
    setAppState(newState);
    saveAppState(newState);
    triggerNotification(`Movimiento "${updatedTx.title}" actualizado con fecha ${formatDate(updatedTx.date)}.`);
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
    explicitBalanceDate?: string
  ) => {
    const { newState, importedCount } = importStatementTransactions(
      appState,
      transactions,
      accountId,
      updateBalance,
      explicitBalance,
      explicitBalanceDate
    );
    setAppState(newState);
    saveAppState(newState);
    const targetAcc = newState.accounts.find((a) => a.id === accountId);
    const bankName = targetAcc ? `${targetAcc.bankName} (${targetAcc.accountName})` : 'tu cuenta';
    const balanceInfo = updateBalance && targetAcc
      ? ` Saldo disponible actualizado a ${formatCurrency(targetAcc.balance)} (fecha: ${targetAcc.balanceDate || 'hoy'}).`
      : '';
    triggerNotification(
      `¡Éxito! Se han importado ${importedCount} movimientos en ${bankName}.${balanceInfo}`
    );
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

    const newState: AppState = {
      ...appState,
      accounts: updatedAccounts
    };

    setAppState(newState);
    saveAppState(newState);
    triggerNotification(`Cuenta "${account.accountName}" guardada correctamente.`);
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

  // Lista ordenada de meses disponibles para el selector de Patrimonio
  const availableMonths = useMemo(() => {
    return getAvailableMonths(appState.transactions, appState.monthlyClosures);
  }, [appState.transactions, appState.monthlyClosures]);

  const currentMonthStr = new Date().toISOString().substring(0, 7);
  const isCurrentPatrimonioMonth = patrimonioMonth === currentMonthStr;

  // Cuentas con saldos y fechas reconstruidos para el mes seleccionado en Patrimonio
  const effectivePatrimonioAccounts = useMemo(() => {
    if (isCurrentPatrimonioMonth) {
      return appState.accounts;
    }
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
  }, [appState.accounts, patrimonioMonth, isCurrentPatrimonioMonth, appState.transactions, appState.monthlyClosures]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-20 md:pb-12 text-slate-900">
      
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-20 right-4 z-50 animate-in fade-in slide-in-from-top-3 duration-200 max-w-sm">
          <div className="flex items-center gap-2.5 bg-slate-900/95 backdrop-blur text-white px-4 py-3 rounded-2xl shadow-xl text-xs font-medium border border-slate-700/80">
            {notification.type === 'info' ? (
              <RefreshCw className="w-4 h-4 text-emerald-400 shrink-0 animate-spin" />
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
        onOpenNewTransactionModal={() => setIsTransactionModalOpen(true)}
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
              onResetToCurrentMonth={() => setPatrimonioMonth(currentMonthStr)}
            />

            <NetWorthCard 
              accounts={effectivePatrimonioAccounts} 
              transactions={appState.transactions}
              selectedMonth={patrimonioMonth}
              onResetToCurrentMonth={() => setPatrimonioMonth(currentMonthStr)}
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
              onResetToCurrentMonth={() => setPatrimonioMonth(currentMonthStr)}
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
              onOpenNewTransactionModal={() => setIsTransactionModalOpen(true)}
              onOpenImportModal={() => handleOpenImportModal()}
              onMoveTransactions={handleMoveTransactions}
              onBatchDeleteTransactions={handleBatchDeleteTransactions}
            />
          </div>
        )}

        {/* Dedicated Categories & Budget View */}
        {activeTab === 'categories' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <ExpenseCategoriesChart
              categories={appState.categories}
              transactions={appState.transactions}
            />

            <TransactionsTable
              transactions={appState.transactions}
              accounts={appState.accounts}
              categories={appState.categories}
              onDeleteTransaction={handleDeleteTransaction}
              onOpenNewTransactionModal={() => setIsTransactionModalOpen(true)}
              onOpenImportModal={() => setIsImportModalOpen(true)}
              onMoveTransactions={handleMoveTransactions}
              onBatchDeleteTransactions={handleBatchDeleteTransactions}
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
              onOpenNewTransactionModal={() => setIsTransactionModalOpen(true)}
              onOpenImportModal={() => setIsImportModalOpen(true)}
              onMoveTransactions={handleMoveTransactions}
              onBatchDeleteTransactions={handleBatchDeleteTransactions}
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
            />
          </div>
        )}

        {/* Cierre por Año View (Saldos totales de cada banco por meses) */}
        {activeTab === 'yearly' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <YearlyClosure
              appState={appState}
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
            />
          </div>
        )}

      </main>

      {/* Mobile Bottom Navigation Bar */}
      <MobileNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenNewTransactionModal={() => setIsTransactionModalOpen(true)}
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
        onClose={() => setIsTransactionModalOpen(false)}
        accounts={appState.accounts}
        categories={appState.categories}
        onAddTransaction={handleAddTransaction}
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
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        appState={appState}
        onStateUpdated={(newState) => setAppState(newState)}
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
