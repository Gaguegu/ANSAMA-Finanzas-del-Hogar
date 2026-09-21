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
}

export interface StatementColumnMapping {
  dateCol: string;
  titleCol: string;
  amountCol: string;
  incomeCol?: string; // si vienen en columnas separadas (ingreso / cargo)
  expenseCol?: string;
}

export interface ParseResult {
  fileName: string;
  headers: string[];
  suggestedMapping: StatementColumnMapping;
  rows: ParsedStatementRow[];
  totalDetected: number;
  suggestedAccountId?: string;
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
    'dividendo', 'intereses', 'liquidacion intereses', 'retribucion', 'cupon',
    'rendimiento', 'deposito', 'broker', 'degiro', 'trade republic', 'myinvestor'
  ],
  'cat-otros-ingresos': [
    'bizum recibido', 'devolucion', 'abono', 'ingreso', 'reembolso'
  ]
};

// Intenta adivinar la categoría a partir del texto
export function guessCategory(text: string, amount: number, categories: TransactionCategory[]): string {
  const lower = text.toLowerCase();
  
  // Si es ingreso
  if (amount > 0) {
    if (lower.includes('nomina') || lower.includes('sueldo') || lower.includes('haberes')) {
      const nomCat = categories.find(c => c.name.toLowerCase().includes('nómina') || c.id === 'cat-nomina');
      if (nomCat) return nomCat.id;
    }
    if (lower.includes('dividendo') || lower.includes('interes') || lower.includes('rendimiento') || lower.includes('cupon')) {
      const renCat = categories.find(c => c.name.toLowerCase().includes('rendimiento') || c.id === 'cat-rendimientos');
      if (renCat) return renCat.id;
    }
  }

  for (const [catId, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const kw of keywords) {
      if (lower.includes(kw)) {
        // Verificar que la categoría exista en la lista actual
        const matched = categories.find(c => c.id === catId || c.name.toLowerCase().includes(kw));
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
    return defaultExpense ? defaultExpense.id : 'cat-ocio';
  }
}

// Normaliza fechas en formato DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD o fechas seriales de Excel
export function parseDateString(val: any): string | null {
  if (!val) return null;

  // Si viene como número serial de Excel (ej: 45320)
  if (typeof val === 'number') {
    const jsDate = XLSX.SSF.parse_date_code(val);
    if (jsDate) {
      const y = jsDate.y;
      const m = String(jsDate.m).padStart(2, '0');
      const d = String(jsDate.d).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }

  const str = String(val).trim();

  // YYYY-MM-DD
  if (/^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}$/.test(str)) {
    const parts = str.split(/[-/.]/);
    return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
  }

  // DD/MM/YYYY o DD-MM-YYYY
  if (/^\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}$/.test(str)) {
    const parts = str.split(/[-/.]/);
    let year = parts[2];
    if (year.length === 2) year = '20' + year;
    const month = parts[1].padStart(2, '0');
    const day = parts[0].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Intentar con Date nativo
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime()) && parsed.getFullYear() > 2000 && parsed.getFullYear() < 2100) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  return null;
}

// Normaliza números españoles: "1.234,56", "-50,20 €", "1234.56"
export function parseAmountNumber(val: any): number | null {
  if (val === undefined || val === null || val === '') return null;
  if (typeof val === 'number') return isNaN(val) ? null : val;

  let str = String(val).trim();
  // Quitar símbolos de divisa y espacios
  str = str.replace(/[€$£\s]/g, '');

  if (str === '' || str === '-') return null;

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
  return isNaN(num) ? null : num;
}

// Analiza el contenido de un archivo (Buffer / ArrayBuffer)
export function parseStatementFile(
  fileData: ArrayBuffer,
  fileName: string,
  categories: TransactionCategory[],
  existingAccounts: BankAccount[] = [],
  existingTransactions: Transaction[] = []
): ParseResult {
  // Leer libro de trabajo con XLSX
  const workbook = XLSX.read(fileData, { type: 'array', cellDates: false });
  const firstSheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheetName];

  // Convertir a matriz bidimensional de filas
  const rawData: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  if (!rawData || rawData.length === 0) {
    throw new Error('El archivo está vacío o no tiene datos reconocibles.');
  }

  // Buscar la fila de cabecera real
  // Muchos bancos españoles (BBVA, CaixaBank, Santander) ponen las primeras 2-6 líneas con metadatos
  let headerRowIndex = -1;
  let headers: string[] = [];

  const dateKeywords = ['fecha', 'f. operacion', 'f. oper', 'f. valor', 'f. valoracion', 'date', 'operación'];
  const titleKeywords = ['concepto', 'descripcion', 'descripción', 'detalle', 'movimiento', 'concept', 'operacion', 'beneficiario'];
  const amountKeywords = ['importe', 'cantidad', 'monto', 'saldo', 'cargo', 'abono', 'amount', 'movimiento'];

  for (let r = 0; r < Math.min(rawData.length, 25); r++) {
    const row = rawData[r].map((cell) => String(cell || '').toLowerCase().trim());
    
    const hasDate = row.some(cell => dateKeywords.some(kw => cell.includes(kw)));
    const hasTitle = row.some(cell => titleKeywords.some(kw => cell.includes(kw)));
    const hasAmount = row.some(cell => amountKeywords.some(kw => cell.includes(kw)));

    if (hasDate && (hasTitle || hasAmount)) {
      headerRowIndex = r;
      headers = rawData[r].map((cell, idx) => {
        const cleaned = String(cell || '').trim();
        return cleaned !== '' ? cleaned : `Columna_${idx + 1}`;
      });
      break;
    }
  }

  // Si no se encontró cabecera con palabras clave, tomar la primera fila con más de 2 celdas con texto
  if (headerRowIndex === -1) {
    for (let r = 0; r < Math.min(rawData.length, 10); r++) {
      const nonEmpties = rawData[r].filter(c => String(c).trim() !== '');
      if (nonEmpties.length >= 3) {
        headerRowIndex = r;
        headers = rawData[r].map((c, idx) => String(c).trim() || `Columna_${idx + 1}`);
        break;
      }
    }
  }

  if (headerRowIndex === -1) {
    headerRowIndex = 0;
    headers = (rawData[0] || []).map((c, idx) => String(c).trim() || `Columna_${idx + 1}`);
  }

  // Detectar columnas sugeridas
  let dateCol = '';
  let titleCol = '';
  let amountCol = '';
  let incomeCol = '';
  let expenseCol = '';

  const lowerHeaders = headers.map(h => h.toLowerCase());

  // Fecha
  for (let i = 0; i < lowerHeaders.length; i++) {
    const h = lowerHeaders[i];
    if (h.includes('f. operacion') || h.includes('f. oper') || h === 'fecha' || h.startsWith('fecha op')) {
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

  // Concepto / Título
  for (let i = 0; i < lowerHeaders.length; i++) {
    const h = lowerHeaders[i];
    if (h.includes('concepto') || h.includes('descripcion') || h.includes('descripción') || h.includes('detalle')) {
      titleCol = headers[i];
      break;
    }
  }
  if (!titleCol) {
    for (let i = 0; i < lowerHeaders.length; i++) {
      if (titleKeywords.some(kw => lowerHeaders[i].includes(kw)) && headers[i] !== dateCol) {
        titleCol = headers[i];
        break;
      }
    }
  }

  // Columnas separadas de Ingreso y Gasto (comunes en algunos bancos)
  for (let i = 0; i < lowerHeaders.length; i++) {
    const h = lowerHeaders[i];
    if (h.includes('abono') || h.includes('ingreso') || h.includes('haber')) {
      incomeCol = headers[i];
    }
    if (h.includes('cargo') || h.includes('gasto') || h.includes('debe')) {
      expenseCol = headers[i];
    }
  }

  // Si no hay columnas separadas, buscar columna única de Importe
  if (!incomeCol || !expenseCol) {
    for (let i = 0; i < lowerHeaders.length; i++) {
      const h = lowerHeaders[i];
      if (h.includes('importe') || h.includes('monto') || h.includes('cantidad') || h === 'movimiento') {
        amountCol = headers[i];
        break;
      }
    }
  }

  // Si no detectó Fecha o Concepto o Importe, usar índices por defecto
  if (!dateCol && headers.length > 0) dateCol = headers[0];
  if (!titleCol && headers.length > 1) titleCol = headers[1];
  if (!amountCol && !incomeCol && headers.length > 2) amountCol = headers[2];

  const suggestedMapping: StatementColumnMapping = {
    dateCol,
    titleCol,
    amountCol: amountCol || headers[Math.min(2, headers.length - 1)],
    incomeCol: incomeCol || undefined,
    expenseCol: expenseCol || undefined
  };

  // Intentar deducir la cuenta bancaria si el archivo o los metadatos iniciales mencionan el banco o IBAN
  let suggestedAccountId: string | undefined;
  const rawTextSnippet = (fileName + ' ' + rawData.slice(0, 15).map(r => r.join(' ')).join(' ')).toLowerCase();
  const normalizedSnippet = rawTextSnippet.replace(/[\s\-_.]+/g, '');

  // 1. Buscar coincidencia exacta por IBAN o número de cuenta
  for (const acc of existingAccounts) {
    const rawIban = acc.iban ? acc.iban.toLowerCase().replace(/[\s\-_.]+/g, '') : '';
    const lastDigits = acc.accountNumberMasked.replace(/\D/g, '');
    
    // Coincidencia con IBAN completo o los últimos 10-12 dígitos del IBAN
    if (rawIban.length >= 8 && (normalizedSnippet.includes(rawIban) || normalizedSnippet.includes(rawIban.slice(-10)))) {
      suggestedAccountId = acc.id;
      break;
    }

    // Coincidencia con los últimos 4 o más dígitos enmascarados
    if (lastDigits.length >= 4 && (rawTextSnippet.includes(lastDigits) || normalizedSnippet.includes(lastDigits))) {
      suggestedAccountId = acc.id;
      break;
    }
  }

  // 2. Si aún no hay cuenta sugerida, buscar por nombre o identificador de entidad bancaria
  if (!suggestedAccountId) {
    const bankKeywordsMap: Record<string, string[]> = {
      bbva: ['bbva', 'banco bilbao'],
      santander: ['santander', 'banco santander', 'openbank'],
      caixabank: ['caixa', 'caixabank', 'la caixa', 'imagin', 'bankia'],
      ing: ['ing', 'ing direct', 'cuenta nomina ing', 'cuenta naranja'],
      sabadell: ['sabadell', 'banco sabadell'],
      bankinter: ['bankinter', 'coinc'],
      unicaja: ['unicaja', 'liberbank'],
      abanca: ['abanca'],
      openbank: ['openbank'],
      myinvestor: ['myinvestor', 'andbank'],
      traderepublic: ['trade republic'],
      degiro: ['degiro', 'flatex'],
      renta4: ['renta 4', 'renta4']
    };

    for (const acc of existingAccounts) {
      const bName = acc.bankName.toLowerCase();
      const bId = acc.bankId.toLowerCase();
      const keywords = bankKeywordsMap[bId] || [bName, bId];

      const matchesBank = keywords.some(kw => rawTextSnippet.includes(kw));
      if (matchesBank) {
        suggestedAccountId = acc.id;
        break;
      }
    }
  }

  // Parsear filas de datos
  const rows: ParsedStatementRow[] = [];
  const dateIdx = headers.indexOf(suggestedMapping.dateCol);
  const titleIdx = headers.indexOf(suggestedMapping.titleCol);
  const amountIdx = headers.indexOf(suggestedMapping.amountCol);
  const incomeIdx = suggestedMapping.incomeCol ? headers.indexOf(suggestedMapping.incomeCol) : -1;
  const expenseIdx = suggestedMapping.expenseCol ? headers.indexOf(suggestedMapping.expenseCol) : -1;

  for (let r = headerRowIndex + 1; r < rawData.length; r++) {
    const rawRowArray = rawData[r];
    if (!rawRowArray || rawRowArray.length === 0) continue;

    // Objeto con los nombres de cabecera
    const rawRow: Record<string, any> = {};
    headers.forEach((h, idx) => {
      rawRow[h] = rawRowArray[idx] !== undefined ? rawRowArray[idx] : '';
    });

    // Extraer fecha
    const rawDateVal = dateIdx >= 0 ? rawRowArray[dateIdx] : null;
    const parsedDate = parseDateString(rawDateVal);
    if (!parsedDate) continue; // Si la fila no tiene una fecha válida, probablemente sea un pie de página o saldo

    // Extraer concepto
    let title = titleIdx >= 0 ? String(rawRowArray[titleIdx] || '').trim() : '';
    if (!title) {
      title = 'Movimiento bancario';
    }

    // Extraer importe
    let signedAmount: number | null = null;

    if (incomeIdx >= 0 && expenseIdx >= 0) {
      const incVal = parseAmountNumber(rawRowArray[incomeIdx]);
      const expVal = parseAmountNumber(rawRowArray[expenseIdx]);

      if (incVal !== null && incVal !== 0) {
        signedAmount = Math.abs(incVal);
      } else if (expVal !== null && expVal !== 0) {
        signedAmount = -Math.abs(expVal);
      }
    }

    if (signedAmount === null && amountIdx >= 0) {
      signedAmount = parseAmountNumber(rawRowArray[amountIdx]);
    }

    if (signedAmount === null) continue; // Si no hay importe válido, omitir

    const type: 'income' | 'expense' = signedAmount >= 0 ? 'income' : 'expense';
    const absAmount = Math.abs(signedAmount);
    const suggestedCategory = guessCategory(title, signedAmount, categories);

    // Detección de duplicado contra los movimientos ya existentes en la app
    const isDuplicate = existingTransactions.some((tx) => {
      return (
        tx.date === parsedDate &&
        Math.abs(tx.amount - absAmount) < 0.01 &&
        tx.type === type &&
        tx.title.toLowerCase().trim() === title.toLowerCase().trim()
      );
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
      selected: !isDuplicate, // Si es duplicado, desmarcarlo por defecto para no duplicar
      isDuplicate
    });
  }

  // Ordenar cronológicamente descendente (más recientes primero)
  rows.sort((a, b) => b.date.localeCompare(a.date));

  return {
    fileName,
    headers,
    suggestedMapping,
    rows,
    totalDetected: rows.length,
    suggestedAccountId
  };
}
