import React, { useState, useEffect } from 'react';
import { AppState, BankAccount, Transaction, BankSyncResult } from './types';
import { 
  loadAppState, 
  saveAppState, 
  simulateBankSync, 
  formatCurrency,
  formatRelativeTime 
} from './utils/storage';
import { Header } from './components/Header';
import { NetWorthCard } from './components/NetWorthCard';
import { BankAccountsList } from './components/BankAccountsList';
import { ExpenseCategoriesChart } from './components/ExpenseCategoriesChart';
import { TransactionsTable } from './components/TransactionsTable';
import { TransactionModal } from './components/TransactionModal';
import { SyncModal } from './components/SyncModal';
import { AccountModal } from './components/AccountModal';
import { SettingsModal } from './components/SettingsModal';
import { InstallModal } from './components/InstallModal';
import { MobileNav } from './components/MobileNav';
import { Sparkles, CheckCircle2 } from 'lucide-react';
import { usePWA } from './utils/usePWA';

export default function App() {
  const [appState, setAppState] = useState<AppState>(() => loadAppState());
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState<boolean>(false);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState<boolean>(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState<boolean>(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState<boolean>(false);
  const [accountToEdit, setAccountToEdit] = useState<BankAccount | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

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

    const newState: AppState = {
      ...appState,
      accounts: updatedAccounts,
      transactions: [newTx, ...appState.transactions]
    };

    setAppState(newState);
    saveAppState(newState);
    triggerNotification(`Movimiento "${newTx.title}" guardado correctamente.`);
  };

  // Delete transaction & restore account balance
  const handleDeleteTransaction = (id: string) => {
    const txToDelete = appState.transactions.find((t) => t.id === id);
    if (!txToDelete) return;

    const updatedAccounts = appState.accounts.map((acc) => {
      if (acc.id === txToDelete.accountId) {
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
    triggerNotification('Movimiento eliminado y saldo restaurado.');
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

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-20 md:pb-12 text-slate-900">
      
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-20 right-4 z-50 animate-in fade-in slide-in-from-top-3 duration-200">
          <div className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-lg text-xs font-medium border border-slate-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{notification.message}</span>
          </div>
        </div>
      )}

      {/* Main Header */}
      <Header
        lastSync={appState.lastGlobalSync}
        isSyncing={isSyncing}
        onOpenSyncModal={() => setIsSyncModalOpen(true)}
        onOpenNewTransactionModal={() => setIsTransactionModalOpen(true)}
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
      />

      {/* Main App Content Area */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 flex-1">
        
        {/* Full Overview View (Patrimonio) */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <NetWorthCard 
              accounts={appState.accounts} 
              transactions={appState.transactions} 
            />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Bank Accounts */}
              <div className="lg:col-span-7">
                <BankAccountsList
                  accounts={appState.accounts}
                  onSyncBank={handleQuickSyncBank}
                  onOpenNewAccountModal={() => {
                    setAccountToEdit(null);
                    setIsAccountModalOpen(true);
                  }}
                  onEditAccount={(acc) => {
                    setAccountToEdit(acc);
                    setIsAccountModalOpen(true);
                  }}
                  isSyncing={isSyncing}
                />
              </div>

              {/* Right Column: Expense Categories breakdown */}
              <div className="lg:col-span-5">
                <ExpenseCategoriesChart
                  categories={appState.categories}
                  transactions={appState.transactions}
                />
              </div>
            </div>

            {/* Recent Transactions List */}
            <TransactionsTable
              transactions={appState.transactions}
              accounts={appState.accounts}
              categories={appState.categories}
              onDeleteTransaction={handleDeleteTransaction}
              onOpenNewTransactionModal={() => setIsTransactionModalOpen(true)}
            />
          </div>
        )}

        {/* Dedicated Bank Accounts View */}
        {activeTab === 'accounts' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <BankAccountsList
              accounts={appState.accounts}
              onSyncBank={handleQuickSyncBank}
              onOpenNewAccountModal={() => {
                setAccountToEdit(null);
                setIsAccountModalOpen(true);
              }}
              onEditAccount={(acc) => {
                setAccountToEdit(acc);
                setIsAccountModalOpen(true);
              }}
              isSyncing={isSyncing}
            />

            <TransactionsTable
              transactions={appState.transactions}
              accounts={appState.accounts}
              categories={appState.categories}
              onDeleteTransaction={handleDeleteTransaction}
              onOpenNewTransactionModal={() => setIsTransactionModalOpen(true)}
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
      />

      <AccountModal
        isOpen={isAccountModalOpen}
        onClose={() => {
          setIsAccountModalOpen(false);
          setAccountToEdit(null);
        }}
        onSaveAccount={handleSaveAccount}
        accountToEdit={accountToEdit}
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
      />

      {/* Modal de Instrucciones e Instalación PWA */}
      <InstallModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
        onInstallDirectly={pwa.installApp}
        canPromptDirectly={pwa.isInstallable}
      />

    </div>
  );
}
