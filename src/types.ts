export type BankId = 
  | 'bbva' 
  | 'santander' 
  | 'caixabank' 
  | 'ing' 
  | 'sabadell' 
  | 'bankinter' 
  | 'unicaja' 
  | 'abanca' 
  | 'openbank' 
  | 'myinvestor' 
  | 'traderepublic' 
  | 'degiro' 
  | 'renta4' 
  | 'other';

export type AccountType = 'checking' | 'savings' | 'credit' | 'investment' | 'deposit';

export interface BankAccount {
  id: string;
  bankId: BankId;
  bankName: string;
  accountName: string;
  iban: string;
  type: AccountType;
  balance: number;
  balanceDate?: string; // Fecha (YYYY-MM-DD) a la que corresponde este saldo
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

export type YieldType = 'interest' | 'dividend';

export type YieldStatus = 'needs_review' | 'verified';

export interface YieldRecord {
  id: string;
  type: YieldType; // 'interest' = Interés Bancario | 'dividend' = Dividendo de Acciones
  accountId: string; // Cuenta bancaria / broker pagador o depositario
  date: string; // YYYY-MM-DD
  title: string; // Concepto o Empresa (ej. "Dividendo Iberdrola", "Intereses Cuenta Ahorro")
  grossAmount: number; // Importe Bruto (€)
  taxRatePercent: number; // Porcentaje de retención aplicado (ej. 19%)
  withholdingTax: number; // Retención practicada en €
  netAmount: number; // Importe Líquido ingresado en € (Bruto - Retención)
  sharesCount?: number; // Para dividendos: nº de títulos / acciones
  grossPerShare?: number; // Para dividendos: dividendo bruto por título en €
  isinOrTicker?: string; // Ticker o ISIN del valor
  notes?: string;
  transactionId?: string; // ID de la transacción en cuenta vinculada (si aplica)
  status?: YieldStatus; // 'needs_review' = Pendiente de comprobar con el extracto/justificante | 'verified' = Comprobado
  autoDetected?: boolean; // true si fue anotado automáticamente al recibirse en el banco
}

export interface MonthClosure {
  month: string; // YYYY-MM
  isClosed: boolean;
  closedAt?: string;
  notes?: string;
  auditedBalances?: Record<string, number>; // accountId -> closing balance
}

export interface SecurityConfig {
  passwordHash?: string;
  hasPassword?: boolean;
  autoLockMinutes?: number; // e.g. 5, 15, 30 or 0 for never
}

export interface AppState {
  accounts: BankAccount[];
  transactions: Transaction[];
  categories: TransactionCategory[];
  lastGlobalSync: string;
  currency: string;
  monthlyClosures?: MonthClosure[];
  yieldRecords?: YieldRecord[];
  security?: SecurityConfig;
}

export interface BankSyncResult {
  bankId: BankId;
  bankName: string;
  newTransactionsCount: number;
  updatedBalance: number;
  status: 'success' | 'warning' | 'error';
  timestamp: string;
}
