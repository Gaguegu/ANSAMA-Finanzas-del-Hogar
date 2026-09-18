import { AppState, BankAccount, Transaction, TransactionCategory, BankSyncResult } from '../types';
import { INITIAL_STATE } from '../data/defaultData';

const STORAGE_KEY = 'ansama_finanzas_hogar_v1';

export function loadAppState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      saveAppState(INITIAL_STATE);
      return INITIAL_STATE;
    }
    const parsed = JSON.parse(raw);
    if (!parsed.accounts || !parsed.transactions || !parsed.categories) {
      saveAppState(INITIAL_STATE);
      return INITIAL_STATE;
    }
    return parsed;
  } catch (error) {
    console.error('Error al cargar datos locales:', error);
    return INITIAL_STATE;
  }
}

export function saveAppState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Error al guardar datos locales:', error);
  }
}

export function resetToDefaults(): AppState {
  saveAppState(INITIAL_STATE);
  return INITIAL_STATE;
}

export function resetToZero(currentState?: AppState): AppState {
  const sourceAccounts = currentState?.accounts && currentState.accounts.length > 0 
    ? currentState.accounts 
    : INITIAL_STATE.accounts;

  const zeroAccounts: BankAccount[] = sourceAccounts.map((acc) => ({
    ...acc,
    balance: 0,
    lastSynced: new Date().toISOString()
  }));

  const zeroState: AppState = {
    accounts: zeroAccounts,
    transactions: [],
    categories: currentState?.categories || INITIAL_STATE.categories,
    lastGlobalSync: new Date().toISOString(),
    currency: currentState?.currency || 'EUR'
  };

  saveAppState(zeroState);
  return zeroState;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

export function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return new Intl.DateTimeFormat('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }).format(date);
  } catch {
    return dateString;
  }
}

export function formatRelativeTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSec < 45) return 'Hace unos segundos';
    if (diffSec < 3600) return `Hace ${Math.floor(diffSec / 60)} min`;
    if (diffSec < 86400) return `Hace ${Math.floor(diffSec / 3600)} h`;
    return `El ${formatDate(isoString)}`;
  } catch {
    return 'Reciente';
  }
}

// Simulated banking feeds for BBVA and Santander
const SIMULATED_FEED_BBVA: Array<Omit<Transaction, 'id' | 'accountId' | 'date'>> = [
  {
    title: 'Mercadona S.A. Express',
    amount: 43.15,
    type: 'expense',
    categoryId: 'cat-alimentacion',
    note: 'Pago con tarjeta contactless BBVA'
  },
  {
    title: 'Bizum de Laura (Regalo Cumpleaños)',
    amount: 25.00,
    type: 'income',
    categoryId: 'cat-bizum-ingreso',
    note: 'Bizum recibido en BBVA'
  },
  {
    title: 'Estación de Servicio Repsol',
    amount: 55.40,
    type: 'expense',
    categoryId: 'cat-transporte',
    note: 'Combustible diésel'
  },
  {
    title: 'Cafetería & Panadería Delicias',
    amount: 6.80,
    type: 'expense',
    categoryId: 'cat-ocio',
    note: 'Desayuno familiar'
  }
];

const SIMULATED_FEED_SANTANDER: Array<Omit<Transaction, 'id' | 'accountId' | 'date'>> = [
  {
    title: 'Recibo Agua Municipal Canal',
    amount: 38.60,
    type: 'expense',
    categoryId: 'cat-suministros',
    note: 'Domiciliación bancaria Santander'
  },
  {
    title: 'Bizum recibido de Javier',
    amount: 40.00,
    type: 'income',
    categoryId: 'cat-bizum-ingreso',
    note: 'Compartir gastos compra'
  },
  {
    title: 'Amazon Prime Suscripción Mensual',
    amount: 4.99,
    type: 'expense',
    categoryId: 'cat-suscripciones',
    note: 'Cargo en tarjeta Santander'
  },
  {
    title: 'Aportación Ahorro Automático Metas',
    amount: 150.00,
    type: 'income',
    categoryId: 'cat-rendimientos',
    note: 'Traspaso automático a ahorro'
  }
];

export async function simulateBankSync(
  currentState: AppState,
  targetBankId?: 'bbva' | 'santander',
  fromDate?: string
): Promise<{ newState: AppState; results: BankSyncResult[]; addedCount: number }> {
  // Simulate network latency (between 900ms and 1500ms)
  await new Promise((resolve) => setTimeout(resolve, 1100));

  const todayStr = new Date().toISOString().split('T')[0];
  const nowIso = new Date().toISOString();
  const newTransactions: Transaction[] = [];
  const results: BankSyncResult[] = [];

  const accountsCopy = currentState.accounts.map((acc) => ({ ...acc }));

  // Pick target accounts
  const accountsToSync = targetBankId 
    ? accountsCopy.filter((a) => a.bankId === targetBankId)
    : accountsCopy;

  let totalNewAdded = 0;

  for (const acc of accountsToSync) {
    // Generate 1-2 realistic new transactions
    const pool = acc.bankId === 'bbva' ? SIMULATED_FEED_BBVA : SIMULATED_FEED_SANTANDER;
    // Pick random item from pool
    const randomItem = pool[Math.floor(Math.random() * pool.length)];

    // If fromDate is set, choose a realistic date between fromDate and today
    let txDate = todayStr;
    if (fromDate && fromDate < todayStr) {
      const startMs = new Date(fromDate).getTime();
      const endMs = new Date(todayStr).getTime();
      const randomMs = startMs + Math.random() * (endMs - startMs);
      txDate = new Date(randomMs).toISOString().split('T')[0];
    }

    const txId = `tx-sync-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const createdTx: Transaction = {
      id: txId,
      accountId: acc.id,
      date: txDate,
      title: randomItem.title,
      amount: randomItem.amount,
      type: randomItem.type,
      categoryId: randomItem.categoryId,
      note: `${randomItem.note} • Sincronizado vía OpenBanking (${txDate})`,
      isSimulated: true
    };

    newTransactions.push(createdTx);
    totalNewAdded += 1;

    // Update account balance
    if (acc.type === 'credit') {
      // For credit cards, expenses increase the negative or used balance
      if (createdTx.type === 'expense') {
        acc.balance -= createdTx.amount;
      } else {
        acc.balance += createdTx.amount;
      }
    } else {
      if (createdTx.type === 'income') {
        acc.balance += createdTx.amount;
      } else {
        acc.balance -= createdTx.amount;
      }
    }

    acc.lastSynced = nowIso;

    results.push({
      bankId: acc.bankId,
      bankName: acc.bankName,
      newTransactionsCount: 1,
      updatedBalance: acc.balance,
      status: 'success',
      timestamp: nowIso
    });
  }

  const newState: AppState = {
    ...currentState,
    accounts: accountsCopy,
    transactions: [...newTransactions, ...currentState.transactions],
    lastGlobalSync: nowIso
  };

  saveAppState(newState);
  return { newState, results, addedCount: totalNewAdded };
}
