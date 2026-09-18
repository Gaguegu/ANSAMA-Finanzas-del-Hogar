export type BankId = 'bbva' | 'santander' | 'caixabank' | 'ing' | 'myinvestor' | 'degiro' | 'renta4' | 'other';

export type AccountType = 'checking' | 'savings' | 'credit' | 'investment';

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

export interface MonthClosure {
  month: string; // YYYY-MM
  isClosed: boolean;
  closedAt?: string;
  notes?: string;
  auditedBalances?: Record<string, number>; // accountId -> closing balance
}

export interface AppState {
  accounts: BankAccount[];
  transactions: Transaction[];
  categories: TransactionCategory[];
  lastGlobalSync: string;
  currency: string;
  monthlyClosures?: MonthClosure[];
}

export interface BankSyncResult {
  bankId: BankId;
  bankName: string;
  newTransactionsCount: number;
  updatedBalance: number;
  status: 'success' | 'warning' | 'error';
  timestamp: string;
}
