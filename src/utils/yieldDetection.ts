import { YieldRecord, YieldType, Transaction } from '../types';

/**
 * Palabras clave para detectar rendimientos en conceptos bancarios
 */
const INTEREST_KEYWORDS = [
  'interes',
  'intereses',
  'liquidacion de intereses',
  'liquidación de intereses',
  'abono intereses',
  'abono de intereses',
  'rendimiento cuenta',
  'remuneracion cuenta',
  'remuneración cuenta',
  'interes acreedor',
  'interés acreedor',
  'abono de liquidacion',
  'abono de liquidación',
  'rentabilidad cuenta'
];

const DIVIDEND_KEYWORDS = [
  'dividendo',
  'dividendos',
  'abono dividendo',
  'abono de dividendos',
  'pago dividendo',
  'pago de dividendo',
  'retribucion accionista',
  'retribución accionista',
  'dividend yield',
  'dvd '
];

export interface DetectedYieldMatch {
  isYield: boolean;
  type: YieldType;
  title: string;
  grossAmount: number;
  taxRatePercent: number;
  withholdingTax: number;
  netAmount: number;
}

/**
 * Detecta si una transacción bancaria entrante corresponde a un cobro de intereses o dividendos.
 * Asume que el importe abonado en la cuenta del banco es el LÍQUIDO NETO percibido (habitualmente 81%),
 * deduciendo automáticamente la retención típica en España del 19% de IRPF y deduciendo el Bruto.
 */
export function detectYieldFromTransaction(
  tx: Pick<Transaction, 'title' | 'amount' | 'type' | 'note'>
): DetectedYieldMatch | null {
  // Solo los ingresos pueden ser rendimientos de capital mobiliario
  if (tx.type !== 'income' || tx.amount <= 0) {
    return null;
  }

  const textToScan = `${tx.title} ${tx.note || ''}`.toLowerCase();

  let detectedType: YieldType | null = null;

  // Comprobar primero dividendos
  if (DIVIDEND_KEYWORDS.some((kw) => textToScan.includes(kw))) {
    detectedType = 'dividend';
  } else if (INTEREST_KEYWORDS.some((kw) => textToScan.includes(kw))) {
    detectedType = 'interest';
  }

  if (!detectedType) {
    return null;
  }

  // En extractos bancarios normales, el banco anota el importe neto/líquido ingresado
  const netAmount = Math.round(tx.amount * 100) / 100;
  const taxRatePercent = 19; // 19% estándar en España
  
  // Si neto = bruto * (1 - 0.19) => bruto = neto / 0.81
  const grossAmount = Math.round((netAmount / (1 - (taxRatePercent / 100))) * 100) / 100;
  const withholdingTax = Math.round((grossAmount - netAmount) * 100) / 100;

  return {
    isYield: true,
    type: detectedType,
    title: tx.title,
    grossAmount,
    taxRatePercent,
    withholdingTax,
    netAmount
  };
}

/**
 * Genera un YieldRecord a partir de una transacción detectada con estado 'needs_review' (por comprobar)
 */
export function createAutoYieldRecord(
  tx: Transaction,
  detected: DetectedYieldMatch
): YieldRecord {
  return {
    id: `yd-auto-${tx.id}-${Date.now().toString(36)}`,
    type: detected.type,
    accountId: tx.accountId,
    date: tx.date,
    title: detected.title,
    grossAmount: detected.grossAmount,
    taxRatePercent: detected.taxRatePercent,
    withholdingTax: detected.withholdingTax,
    netAmount: detected.netAmount,
    status: 'needs_review', // Pendiente de comprobación por el usuario
    autoDetected: true,
    transactionId: tx.id,
    notes: `Anotado automáticamente al detectarse abono en cuenta bancaria. Comprobar contra justificante del banco.`
  };
}
