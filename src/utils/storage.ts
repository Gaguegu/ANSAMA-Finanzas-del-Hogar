import { AppState, BankAccount, Transaction, TransactionCategory, BankSyncResult, YieldRecord, MonthClosure } from '../types';
import { INITIAL_STATE } from '../data/defaultData';
import { detectYieldFromTransaction, createAutoYieldRecord } from './yieldDetection';

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
    // Backward compatibility: ensure yieldRecords is present
    if (!parsed.yieldRecords) {
      parsed.yieldRecords = INITIAL_STATE.yieldRecords || [];
    }

    // Auto-reparar cuentas afectadas por el truncamiento de separador de miles y asegurar balanceDate
    let hasRepairedAccount = false;
    if (Array.isArray(parsed.accounts)) {
      parsed.accounts = parsed.accounts.map((acc: BankAccount) => {
        let updated = { ...acc };
        let modified = false;

        // Corregir bug 4.599 -> 4599.13
        if (Math.abs(updated.balance - 4.599) < 0.001) {
          updated.balance = 4599.13;
          modified = true;
        }

        // Asegurar que toda cuenta tenga fecha del saldo
        if (!updated.balanceDate) {
          updated.balanceDate = updated.lastSynced 
            ? updated.lastSynced.split('T')[0] 
            : new Date().toISOString().split('T')[0];
          modified = true;
        }

        if (modified) {
          hasRepairedAccount = true;
        }
        return updated;
      });
    }

    // 2. Auto-reparar transacciones genuinamente de abono/broker mal clasificadas como gasto (dividendos, intereses, saveback),
    // Y REPARAR transacciones de salida (imposiciones a plazo fijo, transferencias emitidas, cargos) que fueron erróneamente marcadas como ingreso
    let hasRepairedTransactions = false;
    if (Array.isArray(parsed.transactions)) {
      parsed.transactions = parsed.transactions.map((tx: Transaction) => {
        const titleLower = (tx.title || '').toLowerCase();

        // Si es gasto pero es genuinamente un abono de dividendos, intereses o saveback:
        if (tx.type === 'expense') {
          if (
            titleLower.includes('dividendo') ||
            titleLower.includes('dividend') ||
            titleLower.includes('saveback') ||
            titleLower.includes('interes') ||
            titleLower.includes('interest') ||
            titleLower.includes('zinsen') ||
            titleLower.includes('rentabilidad') ||
            titleLower.includes('rendimiento') ||
            titleLower.includes('pay-in') ||
            titleLower.includes('pay in') ||
            titleLower.includes('einzahlung')
          ) {
            hasRepairedTransactions = true;
            return { ...tx, type: 'income' };
          }
        }

        // Si fue erróneamente marcada como ingreso pero es una salida de dinero (imposición a plazo fijo, traspaso enviado, adeudo, compra, cargo):
        if (tx.type === 'income') {
          const isActuallyExpense =
            titleLower.includes('imposicion') ||
            titleLower.includes('imposición') ||
            titleLower.includes('constitucion') ||
            titleLower.includes('constitución') ||
            titleLower.includes('deposito a plazo') ||
            titleLower.includes('depósito a plazo') ||
            titleLower.includes('plazo fijo') ||
            titleLower.includes('traspaso a ') ||
            titleLower.includes('traspaso hacia') ||
            titleLower.includes('transferencia a ') ||
            titleLower.includes('transferencia realizada') ||
            titleLower.includes('transf. realizada') ||
            titleLower.includes('transferencia ordenada') ||
            titleLower.includes('transferencia emitida') ||
            titleLower.includes('transferencia enviada') ||
            titleLower.includes('cargo') ||
            titleLower.includes('adeudo') ||
            titleLower.includes('recibo') ||
            titleLower.includes('compra') ||
            titleLower.includes('tarjeta') ||
            titleLower.includes('pago') ||
            titleLower.includes('comision') ||
            titleLower.includes('comisión') ||
            titleLower.includes('retencion') ||
            titleLower.includes('retención') ||
            titleLower.includes('reintegro') ||
            titleLower.includes('extraccion') ||
            titleLower.includes('extracción');

          if (
            isActuallyExpense &&
            !titleLower.includes('anulacion') &&
            !titleLower.includes('anulación') &&
            !titleLower.includes('devolucion') &&
            !titleLower.includes('devolución')
          ) {
            hasRepairedTransactions = true;
            return { ...tx, type: 'expense' };
          }
        }

        return tx;
      });

      // 3. Purgar automáticamente transacciones espurias generadas por notas legales/fiduciarias de extractos
      const prevCount = parsed.transactions.length;
      parsed.transactions = parsed.transactions.filter((tx: Transaction) => {
        const titleLower = (tx.title || '').toLowerCase();
        const isLegalDisclaimer =
          titleLower.includes('cuentas colectivas') ||
          titleLower.includes('cuenta fiduciaria') ||
          titleLower.includes('cuentas fiduciarias') ||
          titleLower.includes('notas sobre el extracto') ||
          titleLower.includes('fondo de garantia') ||
          (titleLower.includes('citibank') && (titleLower.includes('saldo') || titleLower.includes('extracto')));
        return !isLegalDisclaimer;
      });
      if (parsed.transactions.length !== prevCount) {
        hasRepairedTransactions = true;
      }

      // 4. Asegurar que existe la categoría de gasto Transferencias & Traspasos
      if (Array.isArray(parsed.categories)) {
        const hasTransferExpenseCat = parsed.categories.some((c: TransactionCategory) => c.id === 'cat-transferencias-gasto');
        if (!hasTransferExpenseCat) {
          parsed.categories.push({
            id: 'cat-transferencias-gasto',
            name: 'Transferencias & Traspasos',
            iconName: 'ArrowUpRight',
            type: 'expense',
            color: '#0d9488',
            bgLight: '#f0fdfa'
          });
          hasRepairedTransactions = true;
        }
      }

      // 5. Corregir y afinar categorías de transacciones históricas mal asignadas
      let hasRecategorized = false;
      parsed.transactions = parsed.transactions.map((tx: Transaction) => {
        const titleNorm = (tx.title || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        let newCategoryId = tx.categoryId;

        // A. Liquidación de cuentas son intereses/rendimientos (NUNCA nóminas ni hipotecas)
        if (
          titleNorm.includes('liquidacion') ||
          titleNorm.includes('intereses acreedores') ||
          titleNorm.includes('abono intereses') ||
          titleNorm.includes('rendimiento cuenta') ||
          titleNorm.includes('retribucion cuenta')
        ) {
          if (tx.categoryId === 'cat-nomina' || tx.categoryId === 'cat-vivienda') {
            newCategoryId = 'cat-rendimientos';
          }
        }

        // B. Traspasos entre cuentas (NO son nóminas ni hipotecas)
        if (
          titleNorm.includes('traspaso') ||
          titleNorm.includes('transferencia propia') ||
          titleNorm.includes('transferencia interna') ||
          titleNorm.includes('entre mis cuentas') ||
          (titleNorm.includes('transferencia') && titleNorm.includes('andres'))
        ) {
          if (tx.categoryId === 'cat-nomina' || tx.categoryId === 'cat-vivienda') {
            newCategoryId = tx.type === 'income' ? 'cat-bizum-ingreso' : 'cat-transferencias-gasto';
          }
        }

        // C. Salidas por transferencia o traspaso erróneamente puestas en Vivienda / Hipoteca
        if (tx.categoryId === 'cat-vivienda') {
          const isRealHousing =
            titleNorm.includes('hipoteca') ||
            titleNorm.includes('prestamo') ||
            titleNorm.includes('comunidad') ||
            titleNorm.includes('alquiler') ||
            titleNorm.includes('ibi');

          if (!isRealHousing && (titleNorm.includes('transferencia') || titleNorm.includes('traspaso') || titleNorm.includes('bizum'))) {
            newCategoryId = 'cat-transferencias-gasto';
          }
        }

        // D. Ingresos con transferencia o traspaso erróneamente puestos en Nómina
        if (tx.categoryId === 'cat-nomina') {
          const isRealSalary =
            titleNorm.includes('nomina') ||
            titleNorm.includes('sueldo') ||
            titleNorm.includes('haberes') ||
            titleNorm.includes('pension') ||
            titleNorm.includes('sepe');

          if (!isRealSalary && (titleNorm.includes('transferencia') || titleNorm.includes('traspaso') || titleNorm.includes('bizum'))) {
            newCategoryId = 'cat-bizum-ingreso';
          }
        }

        if (newCategoryId !== tx.categoryId) {
          hasRecategorized = true;
          return { ...tx, categoryId: newCategoryId };
        }
        return tx;
      });

      if (hasRecategorized) {
        hasRepairedTransactions = true;
      }
    }

    // 4. Si la cuenta Trade Republic tiene balanceDate de emisión (ej: 2026) mientras sus movimientos son de 2025
    if (Array.isArray(parsed.accounts)) {
      parsed.accounts = parsed.accounts.map((acc: BankAccount) => {
        if (
          acc.bankName.toLowerCase().includes('trade') &&
          acc.balanceDate &&
          acc.balanceDate.startsWith('2026')
        ) {
          const accTxs = (parsed.transactions || [])
            .filter((t: Transaction) => t.accountId === acc.id)
            .sort((a: Transaction, b: Transaction) => b.date.localeCompare(a.date));
          if (accTxs.length > 0 && accTxs[0].date.startsWith('2025')) {
            hasRepairedAccount = true;
            return {
              ...acc,
              balanceDate: accTxs[0].date
            };
          }
        }
        return acc;
      });
    }

    // 5. Sincronizar cuentas con los cierres auditados más recientes
    // (garantiza que la pantalla de Patrimonio y Bancos reflejen los saldos de cierre ajustados)
    if (Array.isArray(parsed.monthlyClosures) && parsed.monthlyClosures.length > 0 && Array.isArray(parsed.accounts)) {
      const synced = syncAccountsWithClosures(
        parsed.accounts,
        parsed.monthlyClosures,
        parsed.transactions || []
      );
      let changed = false;
      for (let i = 0; i < parsed.accounts.length; i++) {
        if (
          parsed.accounts[i].balance !== synced[i]?.balance ||
          parsed.accounts[i].balanceDate !== synced[i]?.balanceDate
        ) {
          changed = true;
          break;
        }
      }
      if (changed) {
        parsed.accounts = synced;
        hasRepairedAccount = true;
      }
    }

    if (hasRepairedAccount || hasRepairedTransactions) {
      saveAppState(parsed);
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

export function resetToZero(
  currentState?: AppState, 
  clearAccountsMode: 'keep' | 'clearDemo' | 'clearAll' = 'clearDemo'
): AppState {
  let finalAccounts: BankAccount[] = [];

  if (clearAccountsMode === 'clearAll') {
    finalAccounts = [];
  } else if (clearAccountsMode === 'clearDemo') {
    // Remove default demo accounts (acc-1, acc-2, acc-3, acc-4)
    const demoIds = new Set(['acc-1', 'acc-2', 'acc-3', 'acc-4']);
    finalAccounts = (currentState?.accounts || [])
      .filter((a) => !demoIds.has(a.id))
      .map((acc) => ({
        ...acc,
        balance: 0,
        lastSynced: new Date().toISOString()
      }));
  } else {
    const sourceAccounts = currentState?.accounts && currentState.accounts.length > 0 
      ? currentState.accounts 
      : INITIAL_STATE.accounts;

    finalAccounts = sourceAccounts.map((acc) => ({
      ...acc,
      balance: 0,
      lastSynced: new Date().toISOString()
    }));
  }

  const zeroState: AppState = {
    accounts: finalAccounts,
    transactions: [],
    categories: currentState?.categories || INITIAL_STATE.categories,
    lastGlobalSync: new Date().toISOString(),
    currency: currentState?.currency || 'EUR',
    monthlyClosures: [],
    yieldRecords: []
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

/**
 * Parsea de forma robusta cantidades monetarias introducidas en formato español/europeo o internacional.
 * Ejemplos:
 *  - "4.599,13" -> 4599.13 (punto como separador de miles, coma como decimal)
 *  - "4599,13"  -> 4599.13 (coma decimal)
 *  - "4599.13"  -> 4599.13 (punto decimal)
 *  - "4,599.13" -> 4599.13 (coma miles, punto decimal formato anglosajón)
 *  - "4 599,13" -> 4599.13 (espacios miles)
 *  - "4.599"    -> 4599.00 (punto de miles sin decimales)
 *  - "1.250.000,50" -> 1250000.50
 *  - "4,60"     -> 4.60
 */
export function parseCurrencyInput(value: string | number): number {
  if (typeof value === 'number') return isNaN(value) ? 0 : value;
  if (!value) return 0;

  let str = value.toString().trim();
  // Quitar símbolos monetarios (€, $, etc.) y espacios
  str = str.replace(/[€$£\s\u00A0]/g, '');

  if (!str) return 0;

  const hasComma = str.includes(',');
  const hasDot = str.includes('.');

  if (hasComma && hasDot) {
    const lastCommaIndex = str.lastIndexOf(',');
    const lastDotIndex = str.lastIndexOf('.');
    if (lastCommaIndex > lastDotIndex) {
      // Formato español/europeo: 4.599,13 o 1.250.000,50
      // Los puntos son miles, la última coma es el separador decimal
      str = str.replace(/\./g, '').replace(',', '.');
    } else {
      // Formato anglosajón: 4,599.13 o 1,250,000.50
      // Las comas son miles, el último punto es el separador decimal
      str = str.replace(/,/g, '');
    }
  } else if (hasComma) {
    // Solo comas
    const commaParts = str.split(',');
    if (commaParts.length > 2) {
      // Múltiples comas: separador de miles anglosajón (ej. 1,000,000)
      str = str.replace(/,/g, '');
    } else {
      // Una sola coma: decimal europeo (ej. 4599,13 o 4,60)
      str = str.replace(',', '.');
    }
  } else if (hasDot) {
    // Solo puntos
    const dotParts = str.split('.');
    if (dotParts.length > 2) {
      // Múltiples puntos: separador de miles español (ej. 1.250.000 o 4.599.000)
      str = str.replace(/\./g, '');
    } else if (dotParts.length === 2) {
      // Un solo punto: ej. "4599.13" o "4.599" o "4.60"
      // Si la parte tras el punto tiene exactamente 3 dígitos (ej: "4.599", "10.000", "25.500")
      // En contabilidad española, "4.599" son cuatro mil quinientos noventa y nueve euros.
      if (dotParts[1].length === 3 && dotParts[0].length >= 1 && dotParts[0].length <= 3) {
        str = str.replace('.', '');
      }
      // Si tiene 1 o 2 dígitos tras el punto (ej. "4599.13" o "4.60"), se deja como decimal
    }
  }

  const result = parseFloat(str);
  return isNaN(result) ? 0 : result;
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
  },
  {
    title: 'Liquidación de Intereses Cuenta Remunerada',
    amount: 28.35,
    type: 'income',
    categoryId: 'cat-rendimientos',
    note: 'Liquidación periódica intereses acreedores BBVA'
  },
  {
    title: 'Abono Dividendo Iberdrola S.A.',
    amount: 85.05,
    type: 'income',
    categoryId: 'cat-rendimientos',
    note: 'Retribución dividendo flexible Iberdrola'
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
    title: 'Liquidación Intereses Depósito Ahorro',
    amount: 34.42,
    type: 'income',
    categoryId: 'cat-rendimientos',
    note: 'Intereses devengados cuenta Santander'
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

  // Detección y anotación automática de Rendimientos (Intereses y Dividendos)
  const currentYields = currentState.yieldRecords || [];
  const newAutoYields: YieldRecord[] = [];

  for (const tx of newTransactions) {
    const detected = detectYieldFromTransaction(tx);
    if (detected) {
      // Comprobar que no exista ya un registro para esta transacción
      const alreadyExists = currentYields.some((y) => y.transactionId === tx.id);
      if (!alreadyExists) {
        newAutoYields.push(createAutoYieldRecord(tx, detected));
      }
    }
  }

  const newState: AppState = {
    ...currentState,
    accounts: accountsCopy,
    transactions: [...newTransactions, ...currentState.transactions],
    yieldRecords: [...newAutoYields, ...currentYields],
    lastGlobalSync: nowIso
  };

  saveAppState(newState);
  return { newState, results, addedCount: totalNewAdded };
}

export function importStatementTransactions(
  currentState: AppState,
  transactionsToImport: Array<Omit<Transaction, 'id'>>,
  accountId: string,
  updateAccountBalance: boolean = true,
  explicitBalance?: number,
  explicitBalanceDate?: string
): { newState: AppState; importedCount: number } {
  const accountsCopy = [...currentState.accounts];
  const targetAcc = accountsCopy.find((a) => a.id === accountId);
  const currentMonthStr = new Date().toISOString().substring(0, 7);
  const todayStr = new Date().toISOString().split('T')[0];

  // Si no hay nuevos movimientos (por ejemplo porque todos ya estaban importados como duplicados)
  // pero se ha indicado un saldo oficial del extracto para actualizar la cuenta:
  if (!transactionsToImport || transactionsToImport.length === 0) {
    if (targetAcc && updateAccountBalance && explicitBalance !== undefined && !isNaN(explicitBalance)) {
      let calculatedCurrentBal = explicitBalance;
      let finalBalanceDate = explicitBalanceDate || todayStr;

      // Si el extracto tiene una fecha (ej: 31/08/2026) y ya existen movimientos posteriores en la cuenta:
      if (explicitBalanceDate) {
        const postTxs = currentState.transactions.filter(
          (t) => t.accountId === accountId && t.date > explicitBalanceDate
        );
        if (postTxs.length > 0) {
          const postInc = postTxs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
          const postExp = postTxs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
          const postNet = postInc - postExp;
          calculatedCurrentBal = targetAcc.type === 'credit'
            ? explicitBalance - postNet
            : explicitBalance + postNet;
          finalBalanceDate = postTxs.reduce((latest, t) => (t.date > latest ? t.date : latest), explicitBalanceDate);
        }
      }

      targetAcc.balance = Math.round(calculatedCurrentBal * 100) / 100;
      targetAcc.balanceDate = finalBalanceDate;
      targetAcc.lastSynced = new Date().toISOString();

      // Guardar también el saldo oficial en el cierre del mes correspondiente
      let updatedClosures = [...(currentState.monthlyClosures || [])];
      const extractMonth = explicitBalanceDate?.substring(0, 7);
      if (extractMonth) {
        const closureIdx = updatedClosures.findIndex((c) => c.month === extractMonth);
        if (closureIdx >= 0) {
          updatedClosures[closureIdx] = {
            ...updatedClosures[closureIdx],
            auditedBalances: {
              ...(updatedClosures[closureIdx].auditedBalances || {}),
              [accountId]: Math.round(explicitBalance * 100) / 100
            }
          };
        } else {
          updatedClosures.push({
            month: extractMonth,
            isClosed: false,
            auditedBalances: {
              [accountId]: Math.round(explicitBalance * 100) / 100
            }
          });
        }
      }

      const newState: AppState = {
        ...currentState,
        accounts: accountsCopy,
        monthlyClosures: updatedClosures
      };
      saveAppState(newState);
      return { newState, importedCount: 0 };
    }
    return { newState: currentState, importedCount: 0 };
  }

  let netBalanceDelta = 0;
  const newTransactions: Transaction[] = transactionsToImport.map((item, idx) => {
    const txId = `tx-imp-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`;
    
    if (item.type === 'income') {
      netBalanceDelta += item.amount;
    } else {
      netBalanceDelta -= item.amount;
    }

    return {
      ...item,
      id: txId,
      accountId: accountId,
      isSimulated: false
    };
  });

  let updatedClosures = [...(currentState.monthlyClosures || [])];

  if (targetAcc && updateAccountBalance) {
    if (explicitBalance !== undefined && !isNaN(explicitBalance)) {
      let calculatedCurrentBal = explicitBalance;
      let finalBalanceDate = explicitBalanceDate || todayStr;

      // Comprobar si hay movimientos posteriores al saldo oficial indicado
      if (explicitBalanceDate) {
        const allTransactions = [...currentState.transactions, ...newTransactions];
        const postTxs = allTransactions.filter(
          (t) => t.accountId === accountId && t.date > explicitBalanceDate
        );
        if (postTxs.length > 0) {
          const postInc = postTxs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
          const postExp = postTxs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
          const postNet = postInc - postExp;
          calculatedCurrentBal = targetAcc.type === 'credit'
            ? explicitBalance - postNet
            : explicitBalance + postNet;
          finalBalanceDate = postTxs.reduce((latest, t) => (t.date > latest ? t.date : latest), explicitBalanceDate);
        }
      }

      targetAcc.balance = Math.round(calculatedCurrentBal * 100) / 100;
      targetAcc.balanceDate = finalBalanceDate;

      // Registrar también el saldo oficial en el mes al que corresponde el extracto
      const extractMonth = explicitBalanceDate?.substring(0, 7);
      if (extractMonth) {
        const closureIdx = updatedClosures.findIndex((c) => c.month === extractMonth);
        if (closureIdx >= 0) {
          updatedClosures[closureIdx] = {
            ...updatedClosures[closureIdx],
            auditedBalances: {
              ...(updatedClosures[closureIdx].auditedBalances || {}),
              [accountId]: Math.round(explicitBalance * 100) / 100
            }
          };
        } else {
          updatedClosures.push({
            month: extractMonth,
            isClosed: false,
            auditedBalances: {
              [accountId]: Math.round(explicitBalance * 100) / 100
            }
          });
        }
      }
    } else {
      if (targetAcc.type === 'credit') {
        targetAcc.balance = Math.round((targetAcc.balance - netBalanceDelta) * 100) / 100;
      } else {
        targetAcc.balance = Math.round((targetAcc.balance + netBalanceDelta) * 100) / 100;
      }
      // Actualizar la fecha del saldo al movimiento más reciente de los importados
      let latestTxDate = explicitBalanceDate || '';
      if (!latestTxDate && newTransactions.length > 0) {
        latestTxDate = newTransactions.reduce((latest, tx) => {
          return tx.date > latest ? tx.date : latest;
        }, '');
      }
      if (latestTxDate) {
        targetAcc.balanceDate = latestTxDate;
      }
    }
    targetAcc.lastSynced = new Date().toISOString();
  }

  // Detección automática de Rendimientos (intereses / dividendos)
  const currentYields = currentState.yieldRecords || [];
  const newAutoYields: YieldRecord[] = [];

  for (const tx of newTransactions) {
    const detected = detectYieldFromTransaction(tx);
    if (detected) {
      const alreadyExists = currentYields.some((y) => y.transactionId === tx.id);
      if (!alreadyExists) {
        newAutoYields.push(createAutoYieldRecord(tx, detected));
      }
    }
  }

  const newState: AppState = {
    ...currentState,
    accounts: accountsCopy,
    monthlyClosures: updatedClosures,
    transactions: [...newTransactions, ...currentState.transactions],
    yieldRecords: [...newAutoYields, ...currentYields]
  };

  saveAppState(newState);
  return { newState, importedCount: newTransactions.length };
}

/**
 * Recalcula el saldo de una cuenta a partir de los movimientos registrados
 */
export function recalculateAccountBalanceFromTransactions(
  account: BankAccount,
  transactions: Transaction[]
): {
  baseBalance: number;
  baseDate: string;
  calculatedBalance: number;
  incomesTotal: number;
  expensesTotal: number;
  netDelta: number;
  transactionCount: number;
  latestTransactionDate: string;
  hasNewerTransactions: boolean;
} {
  const accountTxs = transactions.filter((t) => t.accountId === account.id);
  const baseDate = account.balanceDate || '';
  
  // 1. Si existen transacciones con saldo oficial del banco (balanceAfter), usar la más reciente
  const txsWithBal = accountTxs
    .filter((t) => t.balanceAfter !== undefined && t.balanceAfter !== null && !isNaN(t.balanceAfter))
    .sort((a, b) => b.date.localeCompare(a.date));

  const latestTxWithBal = txsWithBal[0];

  let calculatedBalance: number;
  let incomesTotal = 0;
  let expensesTotal = 0;
  let netDelta = 0;
  let relevantTxs: Transaction[] = [];

  if (latestTxWithBal && (!baseDate || latestTxWithBal.date >= baseDate)) {
    // Tomamos el saldo fidedigno del banco como punto de partida
    relevantTxs = accountTxs.filter((t) => t.date > latestTxWithBal.date);
    incomesTotal = relevantTxs.filter((t) => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    expensesTotal = relevantTxs.filter((t) => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    netDelta = Math.round((incomesTotal - expensesTotal) * 100) / 100;
    
    if (account.type === 'credit') {
      calculatedBalance = Math.round((latestTxWithBal.balanceAfter! - netDelta) * 100) / 100;
    } else {
      calculatedBalance = Math.round((latestTxWithBal.balanceAfter! + netDelta) * 100) / 100;
    }
  } else {
    // Movimientos estrictamente posteriores a la fecha del saldo actual
    relevantTxs = baseDate
      ? accountTxs.filter((t) => t.date > baseDate)
      : accountTxs;

    incomesTotal = relevantTxs
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    expensesTotal = relevantTxs
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    netDelta = Math.round((incomesTotal - expensesTotal) * 100) / 100;

    if (account.type === 'credit') {
      calculatedBalance = Math.round((account.balance - netDelta) * 100) / 100;
    } else {
      calculatedBalance = Math.round((account.balance + netDelta) * 100) / 100;
    }
  }

  const latestTransactionDate = accountTxs.length > 0
    ? accountTxs.reduce((latest, t) => (t.date > latest ? t.date : latest), '')
    : baseDate || new Date().toISOString().split('T')[0];

  const hasNewerTransactions = Boolean(baseDate && latestTransactionDate && latestTransactionDate > baseDate);

  return {
    baseBalance: account.balance,
    baseDate,
    calculatedBalance,
    incomesTotal: Math.round(incomesTotal * 100) / 100,
    expensesTotal: Math.round(expensesTotal * 100) / 100,
    netDelta,
    transactionCount: relevantTxs.length,
    latestTransactionDate,
    hasNewerTransactions
  };
}

/**
 * Sincroniza los saldos de las cuentas (appState.accounts) con los cierres auditados más recientes
 * garantizando que la pantalla de Patrimonio y Bancos reflejen inmediatamente los saldos de cierre
 * guardados o ajustados por el usuario, sin dejar los del mes anterior.
 */
export function syncAccountsWithClosures(
  accounts: BankAccount[],
  closures: MonthClosure[],
  transactions: Transaction[]
): BankAccount[] {
  if (!Array.isArray(accounts) || accounts.length === 0) return accounts;
  if (!Array.isArray(closures) || closures.length === 0) return accounts;

  return accounts.map((acc) => {
    // Buscar todos los cierres que contengan saldo auditado válido para esta cuenta
    const closuresWithAcc = closures
      .filter((c) => c.auditedBalances && c.auditedBalances[acc.id] !== undefined && !isNaN(c.auditedBalances[acc.id]))
      .sort((a, b) => a.month.localeCompare(b.month)); // Meses ordenados cronológicamente

    if (closuresWithAcc.length === 0) {
      return acc;
    }

    // El cierre auditado más reciente para esta cuenta
    const latestClosure = closuresWithAcc[closuresWithAcc.length - 1];
    const [cYear, cMonth] = latestClosure.month.split('-');
    const lastDayOfMonth = new Date(parseInt(cYear, 10), parseInt(cMonth, 10), 0).getDate();
    const closureEndDateStr = `${latestClosure.month}-${String(lastDayOfMonth).padStart(2, '0')}`;
    const auditedVal = Math.round(latestClosure.auditedBalances![acc.id] * 100) / 100;

    const accDate = acc.balanceDate || '';
    const isClosureNewerOrEqual = !accDate || closureEndDateStr >= accDate || latestClosure.month >= accDate.substring(0, 7);

    // Si la cuenta tiene una fecha de saldo estrictamente más reciente en otro mes futuro
    // y tiene transacciones en ese mes futuro, respetamos esa fecha futura (a no ser que sea inversión/depósito)
    if (!isClosureNewerOrEqual && acc.type !== 'investment' && acc.type !== 'deposit') {
      const hasLaterTxs = transactions.some((t) => t.accountId === acc.id && t.date > closureEndDateStr);
      if (hasLaterTxs) {
        return acc;
      }
    }

    // Buscar transacciones de esta cuenta estrictamente posteriores al fin del mes del cierre auditado
    const newerTxs = transactions.filter((t) => t.accountId === acc.id && t.date > closureEndDateStr);

    let newBalance = auditedVal;
    let newBalanceDate = closureEndDateStr;

    if (acc.type === 'investment' || acc.type === 'deposit') {
      // Para carteras de valores y depósitos: el saldo es la valoración auditada al cierre
      newBalance = auditedVal;
      newBalanceDate = closureEndDateStr;
    } else {
      // Para cuentas bancarias: saldo auditado al cierre + ingresos posteriores - gastos posteriores
      if (newerTxs.length > 0) {
        const inc = newerTxs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
        const exp = newerTxs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
        const net = inc - exp;
        newBalance = acc.type === 'credit'
          ? Math.round((auditedVal - net) * 100) / 100
          : Math.round((auditedVal + net) * 100) / 100;
        newBalanceDate = newerTxs.reduce((latest, t) => (t.date > latest ? t.date : latest), closureEndDateStr);
      } else {
        newBalance = auditedVal;
        newBalanceDate = closureEndDateStr;
      }
    }

    return {
      ...acc,
      balance: newBalance,
      balanceDate: newBalanceDate,
      lastSynced: new Date().toISOString()
    };
  });
}

export interface AccountHistoricalBalanceInfo {
  accountId: string;
  balance: number;
  balanceDate: string; // YYYY-MM-DD
  source: 'audited' | 'statement' | 'calculated' | 'current';
  isAudited: boolean;
  label: string;
}

/**
 * Reconstruye el saldo y la fecha efectiva de una cuenta para un mes específico (YYYY-MM).
 * Se apoya en:
 *  1. Cierres auditados registrados en ese mes.
 *  2. Extractos bancarios con movimientos y balanceAfter en ese mes.
 *  3. Fecha de saldo registrada en la cuenta si cae en ese mes.
 *  4. Cierres previos auditados con movimientos intermedios.
 *  5. Reconstrucción matemática a partir del saldo actual si no hay auditorías previas.
 */
export function getAccountBalanceForMonth(
  acc: BankAccount,
  monthStr: string, // YYYY-MM
  transactions: Transaction[] = [],
  monthlyClosures: MonthClosure[] = []
): AccountHistoricalBalanceInfo {
  const [yearStr, mStr] = monthStr.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(mStr, 10);
  const lastDay = new Date(year, month, 0).getDate();
  const lastDayOfMonthStr = `${monthStr}-${String(lastDay).padStart(2, '0')}`;
  
  const todayStr = new Date().toISOString().split('T')[0];
  const currentMonthStr = todayStr.substring(0, 7);
  const isCurrentMonth = monthStr === currentMonthStr;

  const closure = monthlyClosures.find((c) => c.month === monthStr);

  // 1. Si existe un cierre auditado con saldo específico para esta cuenta en este mes
  if (closure?.auditedBalances?.[acc.id] !== undefined) {
    const audBal = Math.round(closure.auditedBalances[acc.id] * 100) / 100;
    const closedDate = closure.closedAt ? closure.closedAt.split('T')[0] : lastDayOfMonthStr;
    return {
      accountId: acc.id,
      balance: audBal,
      balanceDate: closedDate > lastDayOfMonthStr ? lastDayOfMonthStr : closedDate,
      source: 'audited',
      isAudited: true,
      label: 'Cierre auditado'
    };
  }

  // 2. Si es el mes actual y no está cerrado, el saldo base es el saldo actual en tiempo real
  if (isCurrentMonth) {
    const effectiveDate = acc.balanceDate || todayStr;
    return {
      accountId: acc.id,
      balance: acc.balance,
      balanceDate: effectiveDate,
      source: 'current',
      isAudited: false,
      label: 'Tiempo real'
    };
  }

  // 3. Evaluar saldos dentro de este mes a partir de extractos y fecha de saldo de la cuenta
  const accBalDate = acc.balanceDate || '';
  const hasAccBalInMonth = accBalDate.startsWith(monthStr);

  const monthTxsWithBal = transactions
    .filter((tx) => tx.accountId === acc.id && tx.date.startsWith(monthStr) && tx.balanceAfter !== undefined && tx.balanceAfter !== null && !isNaN(tx.balanceAfter))
    .sort((a, b) => a.date.localeCompare(b.date));

  const lastTxWithBal = monthTxsWithBal.length > 0 ? monthTxsWithBal[monthTxsWithBal.length - 1] : null;

  // A. Si la fecha del saldo de la cuenta está dentro de este mes y es más reciente o igual al último movimiento con saldo
  if (hasAccBalInMonth && (!lastTxWithBal || accBalDate >= lastTxWithBal.date)) {
    const txsAfterBal = transactions.filter(
      (tx) => tx.accountId === acc.id && tx.date > accBalDate && tx.date <= lastDayOfMonthStr
    );
    if (txsAfterBal.length === 0) {
      return {
        accountId: acc.id,
        balance: Math.round(acc.balance * 100) / 100,
        balanceDate: accBalDate,
        source: 'statement',
        isAudited: false,
        label: 'Saldo registrado'
      };
    }
    const inc = txsAfterBal.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const exp = txsAfterBal.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const net = inc - exp;
    const calc = acc.type === 'credit' ? acc.balance - net : acc.balance + net;
    return {
      accountId: acc.id,
      balance: Math.round(calc * 100) / 100,
      balanceDate: lastDayOfMonthStr,
      source: 'calculated',
      isAudited: false,
      label: 'Calculado a fin de mes'
    };
  }

  // B. Si existe un movimiento con saldo de extracto en este mes
  if (lastTxWithBal) {
    const txsAfterLastBal = transactions.filter(
      (tx) => tx.accountId === acc.id && tx.date > lastTxWithBal.date && tx.date <= lastDayOfMonthStr
    );

    if (txsAfterLastBal.length === 0) {
      return {
        accountId: acc.id,
        balance: Math.round(lastTxWithBal.balanceAfter! * 100) / 100,
        balanceDate: lastTxWithBal.date,
        source: 'statement',
        isAudited: false,
        label: 'Extracto bancario'
      };
    }

    // Si hay movimientos posteriores dentro del mismo mes (nómina, transferencias, gastos),
    // proyectamos el saldo hasta fin de mes sumando ingresos y restando gastos
    const inc = txsAfterLastBal.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const exp = txsAfterLastBal.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const net = inc - exp;
    const rolled = acc.type === 'credit'
      ? lastTxWithBal.balanceAfter! - net
      : lastTxWithBal.balanceAfter! + net;

    const lastDate = txsAfterLastBal.reduce((latest, t) => (t.date > latest ? t.date : latest), lastTxWithBal.date);

    return {
      accountId: acc.id,
      balance: Math.round(rolled * 100) / 100,
      balanceDate: lastDate || lastDayOfMonthStr,
      source: 'calculated',
      isAudited: false,
      label: 'Calculado a fin de mes'
    };
  }

  // 4. Si la fecha del saldo de la cuenta está dentro de este mes y no hay movimientos posteriores en el mes
  if (hasAccBalInMonth) {
    const txsAfterBal = transactions.filter(
      (tx) => tx.accountId === acc.id && tx.date > acc.balanceDate! && tx.date <= lastDayOfMonthStr
    );
    if (txsAfterBal.length === 0) {
      return {
        accountId: acc.id,
        balance: Math.round(acc.balance * 100) / 100,
        balanceDate: acc.balanceDate!,
        source: 'statement',
        isAudited: false,
        label: 'Saldo registrado'
      };
    }
  }

  // 5. Si hay un cierre auditado PREVIO más reciente para esta cuenta
  const priorClosures = monthlyClosures
    .filter((c) => c.month < monthStr && c.auditedBalances && c.auditedBalances[acc.id] !== undefined)
    .sort((a, b) => b.month.localeCompare(a.month));

  const latestPrior = priorClosures[0];
  if (latestPrior && latestPrior.auditedBalances) {
    const priorBalance = latestPrior.auditedBalances[acc.id];

    if (acc.type === 'deposit' || acc.type === 'investment') {
      return {
        accountId: acc.id,
        balance: Math.round(priorBalance * 100) / 100,
        balanceDate: lastDayOfMonthStr,
        source: 'audited',
        isAudited: false,
        label: 'Arrastrado de cierre previo'
      };
    }

    const [pYear, pMonth] = latestPrior.month.split('-');
    const pLastDay = new Date(parseInt(pYear, 10), parseInt(pMonth, 10), 0).getDate();
    const pEndStr = `${latestPrior.month}-${String(pLastDay).padStart(2, '0')}`;

    const intervalTxs = transactions.filter(
      (tx) => tx.accountId === acc.id && tx.date > pEndStr && tx.date <= lastDayOfMonthStr
    );
    const inc = intervalTxs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const exp = intervalTxs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    
    // Fecha del último movimiento en el mes o fin de mes
    const lastTxDate = intervalTxs.length > 0
      ? intervalTxs.reduce((latest, t) => (t.date > latest ? t.date : latest), '')
      : lastDayOfMonthStr;

    const net = inc - exp;
    const calcBal = acc.type === 'credit'
      ? priorBalance - net
      : priorBalance + net;

    return {
      accountId: acc.id,
      balance: Math.round(calcBal * 100) / 100,
      balanceDate: lastTxDate || lastDayOfMonthStr,
      source: 'calculated',
      isAudited: false,
      label: 'Calculado a fin de mes'
    };
  }

  // 6. Si no hay cierres previos:
  if (acc.type === 'investment' || acc.type === 'deposit') {
    return {
      accountId: acc.id,
      balance: Math.round(acc.balance * 100) / 100,
      balanceDate: acc.balanceDate || lastDayOfMonthStr,
      source: 'current',
      isAudited: false,
      label: 'Saldo actual'
    };
  }

  // Para cuentas bancarias sin historial previo:
  // Saldo fin de mes = Saldo actual - (Ingresos posteriores a ese mes) + (Gastos posteriores a ese mes)
  const futureTxs = transactions.filter((tx) => tx.accountId === acc.id && tx.date > lastDayOfMonthStr);
  const futureIncome = futureTxs.filter((tx) => tx.type === 'income').reduce((s, tx) => s + tx.amount, 0);
  const futureExpense = futureTxs.filter((tx) => tx.type === 'expense').reduce((s, tx) => s + tx.amount, 0);
  const netFuture = futureIncome - futureExpense;
  const calculated = acc.type === 'credit'
    ? acc.balance + netFuture
    : acc.balance - netFuture;

  // Fecha del saldo: última transacción dentro o antes de ese mes
  const pastTxs = transactions.filter((tx) => tx.accountId === acc.id && tx.date <= lastDayOfMonthStr);
  const lastPastDate = pastTxs.length > 0
    ? pastTxs.reduce((latest, t) => (t.date > latest ? t.date : latest), '')
    : lastDayOfMonthStr;

  return {
    accountId: acc.id,
    balance: Math.round(calculated * 100) / 100,
    balanceDate: lastPastDate || lastDayOfMonthStr,
    source: 'calculated',
    isAudited: false,
    label: 'Calculado a fin de mes'
  };
}

/**
 * Obtiene la lista ordenada de todos los meses (YYYY-MM) relevantes disponibles en la app
 * (mes actual + meses con movimientos + meses con cierres).
 */
export function getAvailableMonths(
  transactions: Transaction[] = [],
  monthlyClosures: MonthClosure[] = []
): string[] {
  const monthSet = new Set<string>();
  
  // Mes actual garantizado
  const currentMonth = new Date().toISOString().substring(0, 7);
  monthSet.add(currentMonth);

  // De los cierres mensuales
  if (Array.isArray(monthlyClosures)) {
    monthlyClosures.forEach((c) => {
      if (c.month && c.month.length === 7) {
        monthSet.add(c.month);
      }
    });
  }

  // De las transacciones
  if (Array.isArray(transactions)) {
    transactions.forEach((t) => {
      if (t.date && t.date.length >= 7) {
        monthSet.add(t.date.substring(0, 7));
      }
    });
  }

  // Orden descendente (el más reciente primero)
  return Array.from(monthSet).sort((a, b) => b.localeCompare(a));
}

/**
 * Formatea un identificador YYYY-MM en nombre de mes en español capitalizado (ej. "Agosto 2026")
 */
export function formatMonthName(monthStr: string): string {
  try {
    const [year, month] = monthStr.split('-').map(Number);
    const date = new Date(year, month - 1, 1);
    const name = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(date);
    return name.charAt(0).toUpperCase() + name.slice(1);
  } catch {
    return monthStr;
  }
}

/**
 * Determina si una transacción es un traspaso interno o movimiento entre cuentas propias
 * (imposiciones/cancelaciones a plazo fijo, transferencias entre cuentas bancarias, traspasos a valores).
 * Estos movimientos no constituyen ingresos de nómina ni gastos reales del hogar, sino reubicación de capital.
 */
export function isInternalTransfer(tx: Transaction): boolean {
  const t = (tx.title || '').toLowerCase();
  const note = (tx.note || '').toLowerCase();
  const combined = `${t} ${note}`;
  
  return (
    combined.includes('traspaso') ||
    combined.includes('imposicion') ||
    combined.includes('imposición') ||
    combined.includes('constitucion') ||
    combined.includes('constitución') ||
    combined.includes('vencimiento deposito') ||
    combined.includes('vencimiento depósito') ||
    combined.includes('cancelacion deposito') ||
    combined.includes('cancelación depósito') ||
    combined.includes('deposito a plazo') ||
    combined.includes('depósito a plazo') ||
    combined.includes('plazo fijo') ||
    combined.includes('entre mis cuentas') ||
    combined.includes('entre cuentas') ||
    combined.includes('transferencia propia') ||
    combined.includes('transferencia interna') ||
    combined.includes('aportacion cartera') ||
    combined.includes('aportación cartera') ||
    combined.includes('retirada broker') ||
    combined.includes('suscripcion fondo') ||
    combined.includes('suscripción fondo') ||
    combined.includes('reembolso fondo')
  );
}


