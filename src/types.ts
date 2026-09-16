export type BankId = 'bbva' | 'santander' | 'caixabank' | 'ing' | 'other';

export type AccountType = 'checking' | 'savings' | 'credit';

export interface BankAccount {
  id: string;
  bankId: BankId;
  bankName: string;
  accountName: string;
  iban: string;
  type: AccountType;
  balance: number;
  currency: string;
  lastSynced: string;
  accountNumberMasked: string;
  color: string;
  textColor: string;
  bgLight: string;
  borderColor: string;
}

export interface TransactionCategory {
  id: string;
  name: string;
  iconName: string;
  type: 'expense' | 'income';
  color: string;
  bgLight: string;
  monthlyBudget?: number;
}

export interface Transaction {
  id: string;
  accountId: string;
  date: string; // YYYY-MM-DD
  title: string;
  amount: number; // positive for income, positive absolute for expenses with type='expense'
  type: 'expense' | 'income';
  categoryId: string;
  note?: string;
  isSimulated?: boolean;
}

export interface AppState {
  accounts: BankAccount[];
  transactions: Transaction[];
  categories: TransactionCategory[];
  lastGlobalSync: string;
  currency: string;
}

export interface BankSyncResult {
  bankId: BankId;
  bankName: string;
  newTransactionsCount: number;
  updatedBalance: number;
  status: 'success' | 'warning' | 'error';
  timestamp: string;
}
