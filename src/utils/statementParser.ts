import * as XLSX from 'xlsx';
import { Transaction, BankAccount, TransactionCategory } from '../types';

export interface ParsedStatementRow {
  id: string;
  originalIndex: number;
  date: string; // YYYY-MM-DD
  title: string;
  amount: number; // positive number
  type: 'expense' | 'income';
  suggestedCategoryId: string;
  note?: string;
  rawRow: Record<string, any>;
  selected: boolean;
  isDuplicate?: boolean;
  balanceAfter?: number;
}

export interface StatementColumnMapping {
  dateCol: string;
  titleCol: string;
  amountCol?: string;
  incomeCol?: string; // si vienen en columnas separadas (ingreso / cargo)
  expenseCol?: string;
  balanceCol?: string; // columna opcional de saldo o disponible en el extracto
}

export interface ParseResult {
  fileName: string;
  sheetName: string;
  headers: string[];
  suggestedMapping: StatementColumnMapping;
  rows: ParsedStatementRow[];
  totalDetected: number;
  suggestedAccountId?: string;
  rawPreviewRows: any[][];
  rawData: any[][];
  headerRowIndex: number;
  detectedStatementBalance?: number;
  detectedStatementBalanceDate?: string;
  netMovementDelta: number;
  latestTransactionDate?: string;
}

// Palabras clave para categorización inteligente automática en España
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'cat-supermercado': [
    'mercadona', 'carrefour', 'lidl', 'dia', 'aldi', 'alcampo', 'eroski', 
    'consum', 'hipercor', 'supercor', 'bonarea', 'masymas', 'ahorramas', 
    'supermercado', 'fruteria', 'carniceria', 'panaderia'
  ],
  'cat-hogar': [
    'ikea', 'leroy', 'bricomart', 'bricodepot', 'bauhaus', 'zara home',
    'ferreteria', 'muebles', 'decoracion', 'conforama', 'amazon'
  ],
  'cat-suministros': [
    'endesa', 'iberdrola', 'naturgy', 'repsol luz', 'totalenergies', 'curenergia',
    'vodafone', 'movistar', 'orange', 'pepephone', 'o2', 'digi', 'jazztel', 'yoigo',
    'agua', 'canal de isabel', 'aqualia', 'agas', 'butano', 'luz', 'gas', 'recibo electrico'
  ],
  'cat-transporte': [
    'repsol', 'cepsa', 'bp', 'galp', 'petronor', 'shell', 'plenoil', 'ballenoil',
    'renfe', 'metro', 'emt', 'autobus', 'tussam', 'uber', 'cabify', 'bolt',
    'peaje', 'ap-7', 'ap-6', 'autopista', 'aparcamiento', 'parking', 'itv', 'taller'
  ],
  'cat-ocio': [
    'restaurante', 'bar', 'cafeteria', 'cerveceria', 'pizzeria', 'mcdonald',
    'burger king', 'kfc', 'starbucks', 'cine', 'cinesa', 'yelmo', 'teatro',
    'concierto', 'ticketmaster', 'entradas', 'netflix', 'spotify', 'hbo', 'disney',
    'amazon prime', 'playstation', 'steam', 'glovo', 'just eat', 'ubereats'
  ],
  'cat-salud': [
    'farmacia', 'optica', 'dentista', 'clinica', 'sanitas', 'adeslas', 'asisa',
    'mapfre salud', 'hospital', 'psicologo', 'fisioterapia', 'analisis'
  ],
  'cat-nomina': [
    'nomina', 'sueldo', 'haberes', 'transferencia nomina', 'pension', 'prestacion',
    'sepe', 'seguridad social prestacion'
  ],
  'cat-rendimientos': [
    'dividendo', 'interes', 'intereses', 'liquidacion intereses', 'retribucion', 'cupon',
    'rendimiento', 'deposito', 'broker', 'degiro', 'trade republic', 'myinvestor', 'saveback',
    'efectivo al', 'inversion', 'plusvalia'
  ],
  'cat-otros-ingresos': [
    'bizum recibido', 'devolucion', 'abono', 'ingreso', 'reembolso'
  ],
  'cat-otros-gastos': [
    'operar', 'compra acciones', 'compra etf', 'orden de compra', 'comision', 'custodia'
  ]
};

// Intenta adivinar la categoría a partir del texto
export function guessCategory(text: string, amount: number, categories: TransactionCategory[]): string {
  const normText = String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
  
  // 1. Reglas específicas para inversiones y broker (Trade Republic, DeGiro, MyInvestor, etc.)
  if (
    normText.includes('interes') ||
    normText.includes('dividendo') ||
    normText.includes('saveback') ||
    normText.includes('cupon') ||
    normText.includes('rendimiento')
  ) {
    const renCat = categories.find(c => c.id === 'cat-rendimientos' || c.name.toLowerCase().includes('interes') || c.name.toLowerCase().includes('rendimiento'));
    if (renCat) return renCat.id;
  }

  if (normText.includes('operar') || normText.includes('acciones') || normText.includes('etf') || normText.includes('bolsa') || normText.includes('inversion')) {
    if (amount < 0) {
      const expCat = categories.find(c => c.id === 'cat-otros-gastos') || categories.find(c => c.type === 'expense');
      if (expCat) return expCat.id;
    } else {
      const renCat = categories.find(c => c.id === 'cat-rendimientos') || categories.find(c => c.type === 'income');
      if (renCat) return renCat.id;
    }
  }

  // 2. Si es ingreso
  if (amount > 0) {
    if (normText.includes('nomina') || normText.includes('sueldo') || normText.includes('haberes') || normText.includes('pension')) {
      const nomCat = categories.find(c => c.name.toLowerCase().includes('nomina') || c.id === 'cat-nomina');
      if (nomCat) return nomCat.id;
    }
    if (normText.includes('transferencia') || normText.includes('traspaso') || normText.includes('bizum') || normText.includes('deposito') || normText.includes('abono')) {
      const bizCat = categories.find(c => c.name.toLowerCase().includes('transferencia') || c.id === 'cat-bizum-ingreso' || c.name.toLowerCase().includes('bizum'));
      if (bizCat) return bizCat.id;
    }
  }

  for (const [catId, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const kw of keywords) {
      const normKw = kw.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (normText.includes(normKw)) {
        // Verificar que la categoría exista en la lista actual
        const matched = categories.find(c => c.id === catId || c.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(normKw));
        if (matched) return matched.id;
        const byId = categories.find(c => c.id === catId);
        if (byId) return byId.id;
      }
    }
  }

  // Por defecto
  if (amount >= 0) {
    const defaultIncome = categories.find(c => c.type === 'income');
    return defaultIncome ? defaultIncome.id : 'cat-otros-ingresos';
  } else {
    const defaultExpense = categories.find(c => c.type === 'expense');
    return defaultExpense ? defaultExpense.id : 'cat-otros-gastos';
  }
}

// Normaliza fechas en formato DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD o fechas seriales de Excel
export function parseDateString(val: any): string | null {
  if (val === undefined || val === null || val === '') return null;

  // Si viene como objeto Date nativo de JS
  if (val instanceof Date) {
    if (!isNaN(val.getTime())) {
      const y = val.getFullYear();
      const m = String(val.getMonth() + 1).padStart(2, '0');
      const d = String(val.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    return null;
  }

  // Si viene como número serial de Excel (ej: 46286 para 2026-09-21)
  if (typeof val === 'number') {
    if (val > 20000 && val < 90000) {
      const utcDate = new Date(Math.round((val - 25569) * 86400 * 1000));
      const y = utcDate.getUTCFullYear();
      const m = String(utcDate.getUTCMonth() + 1).padStart(2, '0');
      const d = String(utcDate.getUTCDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }

  let str = String(val).trim();
  if (!str) return null;

  // 1. Formato DD/MM/YYYY o DD-MM-YYYY o DD.MM.YYYY (incluso si tiene hora como 21/09/2026 17:18:52)
  const dmyMatch = str.match(/\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})\b/);
  if (dmyMatch) {
    let year = dmyMatch[3];
    if (year.length === 2) year = '20' + year;
    const month = parseInt(dmyMatch[2], 10);
    const day = parseInt(dmyMatch[1], 10);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  // 2. Formato YYYY-MM-DD o YYYY/MM/DD
  const ymdMatch = str.match(/\b(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})\b/);
  if (ymdMatch) {
    const year = ymdMatch[1];
    const month = parseInt(ymdMatch[2], 10);
    const day = parseInt(ymdMatch[3], 10);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  // 3. Formato con mes en texto español (ej: 21-sep-2026 o 21 sep 2026)
  const spanishMonths: Record<string, string> = {
    ene: '01', feb: '02', mar: '03', abr: '04', may: '05', jun: '06',
    jul: '07', ago: '08', sep: '09', oct: '10', nov: '11', dic: '12'
  };
  const textMonthMatch = str.toLowerCase().match(/\b(\d{1,2})[-/\s]([a-z]{3,4})[-/\s](\d{2,4})\b/);
  if (textMonthMatch) {
    const day = parseInt(textMonthMatch[1], 10);
    const monthStr = textMonthMatch[2].slice(0, 3);
    let year = textMonthMatch[3];
    if (year.length === 2) year = '20' + year;
    const monthNum = spanishMonths[monthStr];
    if (monthNum && day >= 1 && day <= 31) {
      return `${year}-${monthNum}-${String(day).padStart(2, '0')}`;
    }
  }

  // 4. Intentar con Date nativo
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime()) && parsed.getFullYear() > 2000 && parsed.getFullYear() < 2100) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  return null;
}

// Normaliza números españoles: "1.234,56", "-50,20 €", "-42,50 EUR", "42,50-", "(42,50)"
export function parseAmountNumber(val: any): number | null {
  if (val === undefined || val === null || val === '') return null;
  if (typeof val === 'number') {
    if (isNaN(val) || Math.abs(val) > 20000000) return null;
    return val;
  }

  let str = String(val).trim();
  if (str === '' || str === '-') return null;

  // Si contiene un IBAN o número de cuenta bancaria (ej. "ES17...", "DE...", "IBAN", etc.), NO es un importe
  if (/\b[A-Za-z]{2}\d{2}[A-Za-z0-9\s]{8,}\b/.test(str) || /\biban\b/i.test(str) || /\bcuenta\b/i.test(str) || /\bswift\b/i.test(str) || /\bbic\b/i.test(str)) {
    return null;
  }

  // Si tiene palabras bancarias de más de 3 letras que no sean divisas (EUR, USD, CHF, GBP)
  const nonCurrencyWords = str.match(/[a-df-rt-zA-DF-RT-Z]{4,}/g);
  if (nonCurrencyWords && nonCurrencyWords.length > 0) {
    return null;
  }

  let isNegative = false;

  // Detectar formato negativo con paréntesis contable: (42,50)
  if (/^\(.*\)$/.test(str)) {
    isNegative = true;
    str = str.replace(/[()]/g, '');
  }

  // Detectar signos menos Unicode: − (U+2212), – (U+2013), — (U+2014)
  str = str.replace(/[\u2212\u2013\u2014]/g, '-');

  // Detectar signo menos al final: 42,50- o 42.50 -
  if (/[-]$/.test(str.trim())) {
    isNegative = true;
    str = str.replace(/[-]$/, '').trim();
  }

  if (str.includes('-')) {
    isNegative = true;
    str = str.replace(/-/g, '');
  }

  // Quitar símbolos de divisa (EUR, €, $, etc.), letras y espacios
  str = str.replace(/[€$£a-zA-Z\s]/g, '');
  if (str === '') return null;

  // Si tiene tanto punto como coma, ej: 1.250,50 o 1,250.50
  if (str.includes('.') && str.includes(',')) {
    if (str.lastIndexOf(',') > str.lastIndexOf('.')) {
      // Formato europeo: 1.250,50
      str = str.replace(/\./g, '').replace(',', '.');
    } else {
      // Formato anglosajón: 1,250.50
      str = str.replace(/,/g, '');
    }
  } else if (str.includes(',')) {
    // Solo coma: 1250,50
    str = str.replace(',', '.');
  }

  const num = parseFloat(str);
  if (isNaN(num)) return null;

  // Rechazar cantidades absurdas que no corresponden a movimientos reales (ej. 137 mil millones por un IBAN o referencia)
  if (Math.abs(num) > 10000000) return null;

  return isNegative ? -Math.abs(num) : num;
}

// Función pura para extraer movimientos con un mapeo de columnas específico
export function extractRowsWithMapping(
  rawData: any[][],
  headers: string[],
  headerRowIndex: number,
  mapping: StatementColumnMapping,
  categories: TransactionCategory[],
  existingTransactions: Transaction[] = []
): ParsedStatementRow[] {
  const rows: ParsedStatementRow[] = [];
  const dateIdx = headers.indexOf(mapping.dateCol);
  const titleIdx = headers.indexOf(mapping.titleCol);
  const amountIdx = headers.indexOf(mapping.amountCol);
  const incomeIdx = mapping.incomeCol ? headers.indexOf(mapping.incomeCol) : -1;
  const expenseIdx = mapping.expenseCol ? headers.indexOf(mapping.expenseCol) : -1;
  const balanceIdx = mapping.balanceCol ? headers.indexOf(mapping.balanceCol) : -1;

  for (let r = headerRowIndex + 1; r < rawData.length; r++) {
    const rawRowArray = rawData[r];
    if (!rawRowArray || rawRowArray.length === 0) continue;

    // Verificar si la fila está completamente vacía
    const hasAnyValue = rawRowArray.some(cell => cell !== undefined && cell !== null && String(cell).trim() !== '');
    if (!hasAnyValue) continue;

    // FILTRADO DE FILAS DE METADATOS / ENCABEZADOS / RESÚMENES:
    // En conversiones de PDF a Excel (como Trade Republic), cada página suele repetir encabezados y pies.
    const rowFullText = rawRowArray.map(c => String(c || '').toLowerCase()).join(' ');
    const isMetaRow = [
      'extracto', 'trade republic', 'titular', 'iban', 'periodo', 'período', 
      'página', 'pagina', 'page ', 'saldo inicial', 'saldo al inicio', 'saldo final', 
      'saldo al cierre', 'resumen de cuenta', 'total general', 'cuenta de efectivo'
    ].some(kw => rowFullText.includes(kw));
    if (isMetaRow) continue;

    // Extraer fecha
    const rawDateVal = dateIdx >= 0 ? rawRowArray[dateIdx] : null;
    const parsedDate = parseDateString(rawDateVal);
    if (!parsedDate) continue; // Si no hay fecha válida, probablemente sea un pie de página o saldo

    // Extraer concepto de forma inteligente
    let title = titleIdx >= 0 ? String(rawRowArray[titleIdx] || '').trim() : '';
    const isTitleDate = parseDateString(title) !== null || /^\d{1,2}\s+[a-z]{3}\s*\d{2,4}$/i.test(title);

    // Buscar componentes de tipo y descripción en las columnas de la fila
    let foundType = '';
    let foundDesc = '';

    for (let c = 0; c < rawRowArray.length; c++) {
      if (c === dateIdx || c === amountIdx || c === incomeIdx || c === expenseIdx || c === balanceIdx) continue;
      const hNorm = headers[c] ? headers[c].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim() : '';
      const cellVal = String(rawRowArray[c] || '').trim();
      if (!cellVal) continue;
      if (parseDateString(cellVal) !== null || /^\d{1,2}\s+[a-z]{3}\s*\d{2,4}$/i.test(cellVal) || parseAmountNumber(cellVal) !== null) {
        continue;
      }

      if (hNorm.includes('tipo') || hNorm.includes('transacc') || hNorm.includes('operacion')) {
        foundType = cellVal;
      } else if (hNorm.includes('descrip') || hNorm.includes('concepto') || hNorm.includes('detalle')) {
        foundDesc = cellVal;
      } else if (!foundDesc && cellVal.length > 2) {
        foundDesc = cellVal;
      }
    }

    if (foundType && foundDesc && foundType.toLowerCase() !== foundDesc.toLowerCase()) {
      title = `${foundType} - ${foundDesc}`;
    } else if (foundDesc) {
      title = foundDesc;
    } else if (foundType) {
      title = foundType;
    } else if (isTitleDate || !title) {
      // Buscar cualquier celda de texto que no sea fecha ni número
      let fallbackText = '';
      for (let c = 0; c < rawRowArray.length; c++) {
        if (c === dateIdx) continue;
        const cellVal = String(rawRowArray[c] || '').trim();
        if (cellVal && parseDateString(cellVal) === null && parseAmountNumber(cellVal) === null && !/^\d{1,2}\s+[a-z]{3}\s*\d{2,4}$/i.test(cellVal)) {
          fallbackText = cellVal;
          break;
        }
      }
      title = fallbackText || 'Movimiento bancario';
    }

    if (!title || parseDateString(title) !== null || /^\d{1,2}\s+[a-z]{3}\s*\d{2,4}$/i.test(title)) {
      title = 'Movimiento bancario';
    }

    // Extraer importe
    let signedAmount: number | null = null;

    if (incomeIdx >= 0 || expenseIdx >= 0) {
      const incVal = incomeIdx >= 0 ? parseAmountNumber(rawRowArray[incomeIdx]) : null;
      const expVal = expenseIdx >= 0 ? parseAmountNumber(rawRowArray[expenseIdx]) : null;

      if (incVal !== null && incVal !== 0) {
        signedAmount = Math.abs(incVal);
      } else if (expVal !== null && expVal !== 0) {
        signedAmount = -Math.abs(expVal);
      }
    }

    if (signedAmount === null && amountIdx >= 0) {
      signedAmount = parseAmountNumber(rawRowArray[amountIdx]);
    }

    // Si la columna seleccionada no tenía número, buscar en columnas adyacentes que sí tengan importe
    // CRÍTICO: NUNCA buscar en fecha, concepto ni en la columna de saldo/disponible
    if (signedAmount === null) {
      for (let c = 0; c < rawRowArray.length; c++) {
        if (c === dateIdx || c === titleIdx || c === balanceIdx) continue;
        const hName = headers[c] ? headers[c].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') : '';
        if (
          hName.includes('saldo') ||
          hName.includes('balance') ||
          hName.includes('disponible') ||
          hName.includes('fecha') ||
          hName.includes('date')
        ) {
          continue;
        }

        const testNum = parseAmountNumber(rawRowArray[c]);
        if (testNum !== null) {
          signedAmount = testNum;
          break;
        }
      }
    }

    if (signedAmount === null || Math.abs(signedAmount) > 10000000) continue;

    let type: 'income' | 'expense' = signedAmount >= 0 ? 'income' : 'expense';

    // Regla semántica bancaria: Si la columna no traía signo negativo pero el concepto indica compra o gasto
    // (muy frecuente en extractos de Trade Republic donde 'Operar' es compra pero el número viene sin signo)
    if (signedAmount > 0 && !(incomeIdx >= 0 && expenseIdx >= 0)) {
      const lowerTitle = title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const isExplicitExpense =
        lowerTitle.startsWith('operar') ||
        lowerTitle.includes('compra') ||
        lowerTitle.includes('cargo') ||
        lowerTitle.includes('comision') ||
        lowerTitle.includes('retirada') ||
        lowerTitle.includes('pago con tarjeta') ||
        lowerTitle.includes('tarjeta') ||
        lowerTitle.includes('suscripcion');

      if (isExplicitExpense && !lowerTitle.includes('venta') && !lowerTitle.includes('interes') && !lowerTitle.includes('dividendo')) {
        type = 'expense';
      }
    }

    const absAmount = Math.abs(signedAmount);
    const suggestedCategory = guessCategory(title, type === 'income' ? absAmount : -absAmount, categories);

    // Extraer saldo posterior si existe columna de saldo/disponible
    let balanceAfter: number | undefined;
    if (balanceIdx >= 0) {
      const bVal = parseAmountNumber(rawRowArray[balanceIdx]);
      if (bVal !== null) {
        balanceAfter = bVal;
      }
    }

    // Detección de duplicado
    const isDuplicate = existingTransactions.some((tx) => {
      return (
        tx.date === parsedDate &&
        Math.abs(tx.amount - absAmount) < 0.01 &&
        tx.type === type &&
        tx.title.toLowerCase().trim() === title.toLowerCase().trim()
      );
    });

    const rawRow: Record<string, any> = {};
    headers.forEach((h, idx) => {
      rawRow[h] = rawRowArray[idx] !== undefined ? rawRowArray[idx] : '';
    });

    rows.push({
      id: `row-${r}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      originalIndex: r,
      date: parsedDate,
      title,
      amount: absAmount,
      type,
      suggestedCategoryId: suggestedCategory,
      rawRow,
      selected: !isDuplicate,
      isDuplicate,
      balanceAfter
    });
  }

  // Ordenar cronológicamente descendente
  rows.sort((a, b) => b.date.localeCompare(a.date));
  return rows;
}

// Analiza el contenido de un archivo (Buffer / ArrayBuffer)
export function parseStatementFile(
  fileData: ArrayBuffer,
  fileName: string,
  categories: TransactionCategory[],
  existingAccounts: BankAccount[] = [],
  existingTransactions: Transaction[] = []
): ParseResult {
  // Leer libro con cellDates: true para que XLSX parsee fechas nativas de Excel
  const workbook = XLSX.read(fileData, { type: 'array', cellDates: true });
  
  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error('El archivo no contiene hojas de cálculo válidas.');
  }

  // Función de normalización sin acentos y en minúsculas
  const norm = (s: any): string => 
    String(s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();

  // Palabras clave bancarias
  const dateKeywords = ['fecha', 'f.oper', 'f. oper', 'f.valor', 'f. valor', 'date', 'operacion', 'valoracion'];
  const titleKeywords = ['concepto', 'descripcion', 'detalle', 'tipo', 'transaccion', 'beneficiario', 'observacion', 'datos', 'asunto', 'movimiento', 'referencia'];
  const amountKeywords = ['importe', 'cargo', 'abono', 'monto', 'cantidad', 'saldo', 'haber', 'debe'];
  const metaExcludeKeywords = ['extracto', 'titular', 'periodo', 'iban', 'nº de cuenta', 'nro cuenta', 'cuenta:'];

  // 1. Cargar todas las hojas disponibles en el libro
  const sheets: Array<{ name: string; data: any[][] }> = [];
  for (const sName of workbook.SheetNames) {
    const s = workbook.Sheets[sName];
    if (!s) continue;
    const data: any[][] = XLSX.utils.sheet_to_json(s, { header: 1, defval: '' });
    if (data && data.length > 0) {
      sheets.push({ name: sName, data });
    }
  }

  if (sheets.length === 0) {
    throw new Error('La hoja de cálculo está vacía o no tiene datos reconocibles.');
  }

  // 2. Evaluar qué hoja contiene la mejor cabecera de extracto bancario
  let bestSheetIdx = 0;
  let bestCandidate: { r: number; score: number; headers: string[] } | null = null;
  const candidateRows: Array<{ r: number; score: number; headers: string[] }> = [];

  for (let sIdx = 0; sIdx < sheets.length; sIdx++) {
    const sheetData = sheets[sIdx].data;
    for (let r = 0; r < Math.min(sheetData.length, 35); r++) {
      const row = sheetData[r];
      if (!row || row.length === 0) continue;
      const nonEmpties = row.filter(c => String(c || '').trim() !== '');
      if (nonEmpties.length < 2) continue;

      const rowNormalized: string[] = row.map(norm);
      let score = 0;
      const hasDate = rowNormalized.some((c: string) => dateKeywords.some(kw => c.includes(kw)));
      const hasTitle = rowNormalized.some((c: string) => titleKeywords.some(kw => c.includes(kw)));
      const hasAmount = rowNormalized.some((c: string) => amountKeywords.some(kw => c.includes(kw)));
      const isMetadata = rowNormalized.some((c: string) => metaExcludeKeywords.some(kw => c.includes(kw)));

      if (hasDate) score += 3;
      if (hasTitle) score += 3;
      if (hasAmount) score += 3;
      if (rowNormalized.some((c: string) => c.includes('divisa') || c.includes('disponible') || c.includes('movimiento'))) score += 1;
      if (isMetadata && nonEmpties.length < 4) score -= 4;

      if (score >= 4 || (hasDate && (hasTitle || hasAmount))) {
        const hdrs = row.map((cell, idx) => {
          const cleaned = String(cell || '').trim();
          return cleaned !== '' ? cleaned : `Columna_${idx + 1}`;
        });
        const cand = { r, score, headers: hdrs };
        candidateRows.push(cand);
        if (!bestCandidate || score > bestCandidate.score) {
          bestCandidate = cand;
          bestSheetIdx = sIdx;
        }
      }
    }
  }

  // Si no se encontró por palabras clave, elegir la hoja con mayor volumen de filas
  if (!bestCandidate) {
    let maxRows = 0;
    for (let sIdx = 0; sIdx < sheets.length; sIdx++) {
      if (sheets[sIdx].data.length > maxRows) {
        maxRows = sheets[sIdx].data.length;
        bestSheetIdx = sIdx;
      }
    }
  }

  let selectedSheetName = sheets[bestSheetIdx].name;
  let rawData: any[][] = [...sheets[bestSheetIdx].data];
  let headerRowIndex = bestCandidate ? bestCandidate.r : -1;
  let headers: string[] = bestCandidate ? bestCandidate.headers : [];

  // Si no se encontró por palabras clave, buscar la primera fila con 3 o más columnas con texto
  if (headerRowIndex === -1) {
    for (let r = 0; r < Math.min(rawData.length, 10); r++) {
      const nonEmpties = rawData[r].filter(c => String(c || '').trim() !== '');
      if (nonEmpties.length >= 3) {
        headerRowIndex = r;
        headers = rawData[r].map((c, idx) => String(c || '').trim() || `Columna_${idx + 1}`);
        break;
      }
    }
  }

  if (headerRowIndex === -1) {
    headerRowIndex = 0;
    headers = (rawData[0] || []).map((c, idx) => String(c || '').trim() || `Columna_${idx + 1}`);
  }

  // 3. COMBINACIÓN AUTOMÁTICA DE MÚLTIPLES HOJAS (Especial para PDFs convertidos a Excel en varias páginas)
  // Cuando una herramienta (como iLovePDF o Acrobat) convierte un extracto bancario PDF de varias páginas,
  // suele generar una hoja por página. Si detectamos varias hojas con filas de datos, las unimos todas
  // para que no se pierda ningún movimiento de las páginas siguientes.
  let combinedSheetsCount = 1;
  if (sheets.length > 1) {
    for (let sIdx = 0; sIdx < sheets.length; sIdx++) {
      if (sIdx === bestSheetIdx) continue;
      const otherSheet = sheets[sIdx];
      const otherData = otherSheet.data;
      if (!otherData || otherData.length === 0) continue;

      // Buscar si tiene fila de cabecera propia (inspeccionar hasta 25 filas)
      let otherHeaderIdx = -1;
      let otherHeaders: string[] = [];
      for (let r = 0; r < Math.min(otherData.length, 25); r++) {
        const row = otherData[r];
        if (!row || row.length === 0) continue;
        const rowNorm = row.map(norm);
        if (rowNorm.some(c => dateKeywords.some(kw => c.includes(kw))) && 
            rowNorm.some(c => amountKeywords.some(kw => c.includes(kw)))) {
          otherHeaderIdx = r;
          otherHeaders = row.map(c => String(c || '').trim());
          break;
        }
      }

      // Si tiene cabecera propia y coincide con los nombres de la cabecera principal, alinear columnas
      const startRow = otherHeaderIdx >= 0 ? otherHeaderIdx + 1 : 0;
      let addedFromThisSheet = 0;

      for (let r = startRow; r < otherData.length; r++) {
        const row = otherData[r];
        if (!row || row.length === 0) continue;
        const nonEmpties = row.filter(c => String(c || '').trim() !== '');
        if (nonEmpties.length < 2) continue;

        // Omitir filas que sean metadatos de página, números de cuenta, o encabezados repetidos
        const rowText = row.map(c => String(c || '').toLowerCase()).join(' ');
        if (
          rowText.includes('iban') || 
          rowText.includes('titular') || 
          rowText.includes('trade republic') || 
          rowText.includes('página') || 
          rowText.includes('pagina') || 
          rowText.includes('page ') ||
          rowText.includes('extracto') ||
          rowText.includes('saldo inicial') || 
          rowText.includes('saldo final') ||
          rowText.includes('total general')
        ) {
          continue;
        }

        if (otherHeaderIdx >= 0 && otherHeaders.length > 0) {
          // Alinear columnas según coincidencia de nombre con headers principales
          const alignedRow: any[] = new Array(headers.length).fill('');
          headers.forEach((h, hIdx) => {
            const matchIdx = otherHeaders.findIndex(oh => norm(oh) === norm(h));
            if (matchIdx >= 0 && matchIdx < row.length) {
              alignedRow[hIdx] = row[matchIdx];
            } else if (hIdx < row.length) {
              alignedRow[hIdx] = row[hIdx];
            }
          });
          rawData.push(alignedRow);
        } else {
          // Usar la fila tal cual si tiene estructura uniforme
          rawData.push(row);
        }
        addedFromThisSheet++;
      }

      if (addedFromThisSheet > 0) {
        combinedSheetsCount++;
      }
    }

    if (combinedSheetsCount > 1) {
      selectedSheetName = `Todas las hojas (${combinedSheetsCount} páginas combinadas)`;
    }
  }

  // Detectar columnas sugeridas
  let dateCol = '';
  let titleCol = '';
  let amountCol = '';
  let incomeCol = '';
  let expenseCol = '';

  const lowerHeaders = headers.map(h => norm(h));

  // Función auxiliar para saber si una columna contiene principalmente fechas en lugar de conceptos
  const isColumnMostlyDates = (colIdx: number): boolean => {
    let dateHits = 0;
    let validCells = 0;
    for (let r = headerRowIndex + 1; r < Math.min(rawData.length, headerRowIndex + 15); r++) {
      if (!rawData[r] || rawData[r].length <= colIdx) continue;
      const val = rawData[r][colIdx];
      if (val !== undefined && val !== null && String(val).trim() !== '') {
        validCells++;
        const sVal = String(val).trim();
        if (parseDateString(val) !== null || /^\d{1,2}\s+[a-z]{3}\s*\d{2,4}$/i.test(sVal)) {
          dateHits++;
        }
      }
    }
    return validCells > 0 && (dateHits / validCells) >= 0.5;
  };

  // 1. FECHA: Priorizar 'f. oper', 'f.oper', 'fecha operacion', 'fecha'
  for (let i = 0; i < lowerHeaders.length; i++) {
    const h = lowerHeaders[i];
    if (h.includes('f.oper') || h.includes('f. oper') || h.includes('fecha oper') || h === 'fecha') {
      dateCol = headers[i];
      break;
    }
  }
  if (!dateCol) {
    for (let i = 0; i < lowerHeaders.length; i++) {
      if (dateKeywords.some(kw => lowerHeaders[i].includes(kw))) {
        dateCol = headers[i];
        break;
      }
    }
  }

  // 2. CONCEPTO:
  // IMPORTANTE: Una columna que contenga fechas (como fecha valor, fecha contable) NUNCA debe ser elegida como concepto
  for (let i = 0; i < lowerHeaders.length; i++) {
    const h = lowerHeaders[i];
    if (headers[i] === dateCol) continue;
    if (h.includes('fecha') || h.includes('date') || isColumnMostlyDates(i)) continue;

    if (h.includes('descrip') || h.includes('concepto') || h.includes('detalle')) {
      titleCol = headers[i];
      break;
    }
  }

  if (!titleCol) {
    for (let i = 0; i < lowerHeaders.length; i++) {
      const h = lowerHeaders[i];
      if (headers[i] === dateCol) continue;
      if (h.includes('fecha') || h.includes('date') || isColumnMostlyDates(i)) continue;

      if (h.includes('tipo') || h.includes('transacc') || h.includes('operacion') || h.includes('asunto')) {
        titleCol = headers[i];
        break;
      }
    }
  }

  if (!titleCol) {
    for (let i = 0; i < lowerHeaders.length; i++) {
      if (headers[i] === dateCol) continue;
      if (lowerHeaders[i].includes('fecha') || lowerHeaders[i].includes('date') || isColumnMostlyDates(i)) continue;

      if (titleKeywords.some(kw => lowerHeaders[i].includes(kw))) {
        titleCol = headers[i];
        break;
      }
    }
  }

  // Si aún no se encontró, buscar la columna con el texto más rico (no fecha ni número ni saldo)
  if (!titleCol) {
    let bestTextCol = '';
    let maxAvgLength = 0;
    for (let i = 0; i < headers.length; i++) {
      if (headers[i] === dateCol) continue;
      if (isColumnMostlyDates(i)) continue;
      const h = lowerHeaders[i];
      if (h.includes('saldo') || h.includes('importe') || h.includes('monto') || h.includes('cantidad') || h.includes('divisa')) continue;

      let textLenSum = 0;
      let textCount = 0;
      for (let r = headerRowIndex + 1; r < Math.min(rawData.length, headerRowIndex + 12); r++) {
        if (!rawData[r] || rawData[r].length <= i) continue;
        const s = String(rawData[r][i] || '').trim();
        if (s && parseDateString(s) === null && parseAmountNumber(s) === null && !/^\d{1,2}\s+[a-z]{3}\s*\d{2,4}$/i.test(s)) {
          textCount++;
          textLenSum += s.length;
        }
      }
      if (textCount > 0 && (textLenSum / textCount) > maxAvgLength) {
        maxAvgLength = textLenSum / textCount;
        bestTextCol = headers[i];
      }
    }
    if (bestTextCol) {
      titleCol = bestTextCol;
    }
  }

  // 3. COLUMNA DE SALDO O DISPONIBLE (muy común en BBVA 'Disponible', Santander 'Saldo', CaixaBank 'Saldo', Trade Republic 'Saldo')
  // CRÍTICO: Detectar la columna de Saldo ANTES de las columnas de importes. 'Saldo' jamás debe ser seleccionado como importe.
  let balanceCol: string | undefined;
  const balanceKeywords = ['saldo', 'balance', 'disponible', 'kontostand', 'saldo final', 'saldo cierre', 'saldo resultante', 'saldo contable'];
  for (let i = 0; i < lowerHeaders.length; i++) {
    const h = lowerHeaders[i];
    if (headers[i] === dateCol || headers[i] === titleCol) continue;
    if (balanceKeywords.some(kw => h.includes(kw))) {
      balanceCol = headers[i];
      break;
    }
  }

  // 4. COLUMNAS SEPARADAS DE INGRESO / GASTO (Entradas / Salidas / Abonos / Cargos)
  const incomeKeywords = [
    'entrada', 'entradas', 'inflow', 'inflows', 'abono', 'abonos', 'ingreso', 'ingresos',
    'haber', 'credit', 'credito', 'deposito', 'depositos', 'eingang', 'dinero entrada'
  ];
  const expenseKeywords = [
    'salida', 'salidas', 'outflow', 'outflows', 'cargo', 'cargos', 'gasto', 'gastos',
    'debe', 'debit', 'debito', 'retirada', 'retiradas', 'pago', 'pagos', 'ausgang', 'dinero salida'
  ];

  for (let i = 0; i < lowerHeaders.length; i++) {
    const h = lowerHeaders[i];
    if (headers[i] === dateCol || headers[i] === titleCol || headers[i] === balanceCol) continue;
    if (incomeKeywords.some(kw => h.includes(kw))) {
      incomeCol = headers[i];
    }
    if (expenseKeywords.some(kw => h.includes(kw))) {
      expenseCol = headers[i];
    }
  }

  // 5. IMPORTE ÚNICO:
  // Si no se encontraron ambas columnas de ingreso y gasto, buscar la columna de importe único
  if (!incomeCol || !expenseCol) {
    const amountKeywords = ['importe', 'monto', 'cantidad', 'transaccion', 'valor', 'cuantia', 'amount'];
    for (let i = 0; i < lowerHeaders.length; i++) {
      const h = lowerHeaders[i];
      if (headers[i] === dateCol || headers[i] === titleCol || headers[i] === balanceCol) continue;
      if (amountKeywords.some(kw => h.includes(kw))) {
        amountCol = headers[i];
        break;
      }
    }

    // Si aún no se encontró, probar qué columna en las filas siguientes contiene números reales
    // CRÍTICO: Excluir explícitamente cualquier columna que tenga que ver con saldo, balance o fecha
    if (!amountCol) {
      for (let i = 0; i < headers.length; i++) {
        if (headers[i] === dateCol || headers[i] === titleCol || headers[i] === balanceCol) continue;
        const h = lowerHeaders[i];
        if (balanceKeywords.some(kw => h.includes(kw)) || h.includes('fecha') || h.includes('date') || isColumnMostlyDates(i)) continue;

        let numericCount = 0;
        let testRows = 0;
        for (let r = headerRowIndex + 1; r < Math.min(rawData.length, headerRowIndex + 8); r++) {
          if (!rawData[r] || rawData[r].length <= i) continue;
          testRows++;
          if (parseAmountNumber(rawData[r][i]) !== null) {
            numericCount++;
          }
        }
        if (testRows > 0 && numericCount / testRows >= 0.25) {
          amountCol = headers[i];
          break;
        }
      }
    }

    // Fallback secundario a palabras como 'movimiento' (pero NUNCA 'saldo')
    if (!amountCol) {
      for (let i = 0; i < lowerHeaders.length; i++) {
        const h = lowerHeaders[i];
        if (headers[i] === dateCol || headers[i] === titleCol || headers[i] === balanceCol) continue;
        if (balanceKeywords.some(kw => h.includes(kw))) continue;
        if (h.includes('movimiento') || h.includes('total') || h.includes('precio')) {
          amountCol = headers[i];
          break;
        }
      }
    }
  }

  // Fallbacks de columnas por índice si fuera necesario garantizando que titleCol no sea una fecha ni saldo
  if (!dateCol && headers.length > 0) dateCol = headers[0];
  if (!titleCol) {
    const nonDateCols = headers.filter((h, idx) => h !== dateCol && h !== balanceCol && !isColumnMostlyDates(idx));
    titleCol = nonDateCols.length > 0 ? nonDateCols[0] : (headers.length > 1 ? headers[1] : headers[0]);
  }
  if (!amountCol && (!incomeCol || !expenseCol) && headers.length > 2) {
    const available = headers.filter(h => h !== dateCol && h !== titleCol && h !== balanceCol);
    if (available.length > 0) {
      amountCol = available[0];
    }
  }

  const suggestedMapping: StatementColumnMapping = {
    dateCol: dateCol || headers[0] || 'Columna_1',
    titleCol: titleCol || headers[1] || 'Columna_2',
    amountCol: amountCol || (!incomeCol && !expenseCol ? headers[Math.min(2, headers.length - 1)] : ''),
    incomeCol: incomeCol || undefined,
    expenseCol: expenseCol || undefined,
    balanceCol: balanceCol || undefined
  };

  // Deducir cuenta bancaria mediante puntuación ponderada (Nombre de archivo > Metadatos de cabecera > IBAN)
  // IMPORTANTE: Nunca buscar coincidencias en los conceptos de los movimientos (porque las transferencias suelen mencionar otros bancos)
  let suggestedAccountId: string | undefined;
  
  const cleanFileName = fileName.toLowerCase().replace(/[^a-z0-9áéíóúüñ]/g, ' ');
  const headerMetaRows = rawData.slice(0, Math.max(headerRowIndex, 3));
  const headerMetaText = headerMetaRows.map(r => (r || []).join(' ')).join(' ').toLowerCase();
  const normalizedMetaText = headerMetaText.replace(/[\s\-_.]+/g, '');

  const bankKeywordsMap: Record<string, string[]> = {
    bbva: ['bbva', 'banco bilbao', 'últimos movimientos'],
    santander: ['santander', 'banco santander'],
    caixabank: ['caixa', 'caixabank', 'la caixa', 'imagin', 'bankia'],
    ing: ['ing', 'ing direct', 'cuenta nomina ing', 'cuenta naranja'],
    sabadell: ['sabadell', 'banco sabadell'],
    bankinter: ['bankinter', 'coinc'],
    unicaja: ['unicaja', 'liberbank'],
    abanca: ['abanca'],
    openbank: ['openbank', 'banco openbank'],
    myinvestor: ['myinvestor', 'andbank'],
    traderepublic: ['trade republic', 'traderepublic'],
    degiro: ['degiro', 'flatex'],
    renta4: ['renta 4', 'renta4']
  };

  let bestAccount: BankAccount | null = null;
  let highestScore = 0;

  for (const acc of existingAccounts) {
    let score = 0;
    const bName = acc.bankName.trim().toLowerCase();
    const accName = acc.accountName.trim().toLowerCase();
    const rawIban = acc.iban ? acc.iban.toLowerCase().replace(/[\s\-_.]+/g, '') : '';
    const lastDigits = acc.accountNumberMasked.replace(/\D/g, '');

    // 1. Coincidencia de nombre de banco en el nombre del archivo (MÁXIMA PRIORIDAD)
    // Ej: "extracto Imagin.xls" con banco "Imagin" -> 400 puntos
    if (bName.length >= 3 && cleanFileName.includes(bName)) {
      score += 400;
    }

    // 2. Coincidencia de nombre de cuenta en el nombre del archivo
    if (accName.length >= 4 && cleanFileName.includes(accName)) {
      score += 200;
    }

    // 3. IBAN completo o últimos 10 dígitos en la cabecera/metadatos iniciales del extracto
    if (rawIban.length >= 10 && normalizedMetaText.includes(rawIban)) {
      score += 350;
    } else if (rawIban.length >= 8 && normalizedMetaText.includes(rawIban.slice(-10))) {
      score += 250;
    }

    // 4. Nombre de banco exacto en las primeras filas de metadatos (donde el banco estampa su cabecera)
    if (bName.length >= 3 && headerMetaText.includes(bName)) {
      score += 150;
    }

    // 5. Palabras clave específicas del banco en nombre de archivo o cabecera
    const bId = acc.bankId.toLowerCase();
    const keywords = bankKeywordsMap[bId] || [bName, bId];
    for (const kw of keywords) {
      if (kw.length >= 3) {
        if (cleanFileName.includes(kw)) score += 120;
        else if (headerMetaText.includes(kw)) score += 60;
      }
    }

    // 6. Últimos dígitos en la cabecera (sólo si no es un número genérico)
    if (lastDigits.length >= 4 && headerMetaText.includes(lastDigits)) {
      score += 40;
    }

    if (score > highestScore) {
      highestScore = score;
      bestAccount = acc;
    }
  }

  if (bestAccount && highestScore >= 50) {
    suggestedAccountId = bestAccount.id;
  }

  // Extraer movimientos usando la función pura
  let rows = extractRowsWithMapping(
    rawData,
    headers,
    headerRowIndex,
    suggestedMapping,
    categories,
    existingTransactions
  );

  // Si con la primera fila candidata salieron 0 movimientos y hay más candidatas, probar la siguiente
  if (rows.length === 0 && candidateRows.length > 1) {
    for (let c = 1; c < candidateRows.length; c++) {
      const nextCandidate = candidateRows[c];
      const nextHeaders = nextCandidate.headers;
      const nextDateCol = nextHeaders.find(h => norm(h).includes('fecha') || norm(h).includes('f.oper')) || nextHeaders[0];
      const nextTitleCol = nextHeaders.find(h => norm(h).includes('concepto') || norm(h).includes('descrip')) || nextHeaders[1];
      const nextAmountCol = nextHeaders.find(h => norm(h).includes('importe') || norm(h).includes('monto') || norm(h).includes('cantidad')) || nextHeaders[2];

      const nextMapping: StatementColumnMapping = {
        dateCol: nextDateCol,
        titleCol: nextTitleCol,
        amountCol: nextAmountCol
      };

      const testRows = extractRowsWithMapping(
        rawData,
        nextHeaders,
        nextCandidate.r,
        nextMapping,
        categories,
        existingTransactions
      );

      if (testRows.length > 0) {
        headerRowIndex = nextCandidate.r;
        headers = nextHeaders;
        suggestedMapping.dateCol = nextDateCol;
        suggestedMapping.titleCol = nextTitleCol;
        suggestedMapping.amountCol = nextAmountCol;
        rows = testRows;
        break;
      }
    }
  }

  // Muestra de primeras 5 filas para vista previa / configuración manual
  const rawPreviewRows = rawData.slice(headerRowIndex + 1, headerRowIndex + 6);

  // Calcular delta neto de movimientos y detectar saldo final si existe
  let netMovementDelta = 0;
  let detectedStatementBalance: number | undefined;
  let detectedStatementBalanceDate: string | undefined;
  let latestTransactionDate: string | undefined;

  for (const row of rows) {
    if (row.type === 'income') {
      netMovementDelta += row.amount;
    } else {
      netMovementDelta -= row.amount;
    }
  }

  // Como rows está ordenado cronológicamente descendente, la primera fila es la más reciente
  if (rows.length > 0) {
    latestTransactionDate = rows[0].date;
    for (const r of rows) {
      if (r.balanceAfter !== undefined) {
        detectedStatementBalance = r.balanceAfter;
        detectedStatementBalanceDate = r.date;
        break;
      }
    }
  }

  // Si no se encontró en las filas de movimientos, buscar en metadatos o resumen del extracto (Saldo final / Saldo cierre)
  if (detectedStatementBalance === undefined) {
    for (let r = 0; r < Math.min(rawData.length, 30); r++) {
      const row = rawData[r];
      if (!row) continue;
      for (let c = 0; c < row.length; c++) {
        const cellStr = norm(row[c]);
        if (
          cellStr.includes('saldo final') ||
          cellStr.includes('saldo al cierre') ||
          cellStr.includes('saldo de cierre') ||
          cellStr.includes('saldo actual') ||
          cellStr.includes('saldo en cuenta')
        ) {
          for (let c2 = c; c2 < row.length; c2++) {
            const num = parseAmountNumber(row[c2]);
            if (num !== null && Math.abs(num) < 10000000) {
              detectedStatementBalance = num;
              detectedStatementBalanceDate = latestTransactionDate;
              break;
            }
          }
          if (detectedStatementBalance !== undefined) break;
        }
      }
      if (detectedStatementBalance !== undefined) break;
    }
  }

  return {
    fileName,
    sheetName: selectedSheetName,
    headers,
    suggestedMapping,
    rows,
    totalDetected: rows.length,
    suggestedAccountId,
    rawPreviewRows,
    rawData,
    headerRowIndex,
    detectedStatementBalance,
    detectedStatementBalanceDate,
    netMovementDelta: Math.round(netMovementDelta * 100) / 100,
    latestTransactionDate
  };
}
