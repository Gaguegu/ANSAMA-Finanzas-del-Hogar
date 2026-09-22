import * as pdfjsLib from 'pdfjs-dist';
import {
  ParsedStatementRow,
  ParseResult,
  StatementColumnMapping,
  guessCategory,
  parseDateString,
  parseAmountNumber
} from './statementParser';
import { BankAccount, Transaction, TransactionCategory } from '../types';

// Configurar worker de pdfjs desde CDN oficial coincidente con la versión instalada
if (typeof window !== 'undefined') {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
  } catch (e) {
    console.warn('No se pudo inicializar worker externo de PDF.js:', e);
  }
}

interface PdfTextItem {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface PdfLine {
  y: number;
  items: PdfTextItem[];
  fullText: string;
}

const norm = (s: any): string =>
  String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

/**
 * Extrae todas las líneas de texto estructuradas ordenadas por coordenada Y descendente y X ascendente
 */
async function extractLinesFromPdf(fileData: ArrayBuffer): Promise<{
  linesByPage: PdfLine[][];
  allLines: PdfLine[];
  fullDocText: string;
}> {
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(fileData),
    useSystemFonts: true,
  });

  const pdfDoc = await loadingTask.promise;
  const linesByPage: PdfLine[][] = [];
  const allLines: PdfLine[] = [];
  let fullDocText = '';

  for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const textContent = await page.getTextContent();
    const rawItems: PdfTextItem[] = [];

    for (const item of textContent.items) {
      if ('str' in item && item.str.trim() !== '') {
        const transform = item.transform;
        rawItems.push({
          str: item.str,
          x: transform[4],
          y: transform[5],
          width: item.width || 0,
          height: item.height || 0
        });
      }
    }

    // Agrupar items por línea vertical (Y similar con tolerancia de ~3.5px)
    // En PDF el eje Y va desde abajo hacia arriba (Y mayor = más arriba en la página)
    rawItems.sort((a, b) => b.y - a.y || a.x - b.x);

    const pageLines: PdfLine[] = [];
    let currentLine: PdfTextItem[] = [];
    let currentY: number | null = null;

    for (const item of rawItems) {
      if (currentY === null) {
        currentY = item.y;
        currentLine.push(item);
      } else if (Math.abs(item.y - currentY) <= 3.8) {
        currentLine.push(item);
      } else {
        // Guardar línea anterior ordenada de izquierda a derecha (X)
        currentLine.sort((a, b) => a.x - b.x);
        const fullText = currentLine.map(it => it.str).join(' ').trim();
        if (fullText) {
          pageLines.push({ y: currentY, items: [...currentLine], fullText });
        }
        currentY = item.y;
        currentLine = [item];
      }
    }

    if (currentLine.length > 0 && currentY !== null) {
      currentLine.sort((a, b) => a.x - b.x);
      const fullText = currentLine.map(it => it.str).join(' ').trim();
      if (fullText) {
        pageLines.push({ y: currentY, items: [...currentLine], fullText });
      }
    }

    linesByPage.push(pageLines);
    for (const line of pageLines) {
      allLines.push(line);
      fullDocText += line.fullText + '\n';
    }
  }

  return { linesByPage, allLines, fullDocText };
}

/**
 * Parser especializado para PDFs de bancos (Trade Republic, BBVA, Santander, CaixaBank, ING, etc.)
 */
export async function parsePdfStatementFile(
  fileData: ArrayBuffer,
  fileName: string,
  categories: TransactionCategory[],
  existingAccounts: BankAccount[] = [],
  existingTransactions: Transaction[] = []
): Promise<ParseResult> {
  const { allLines, fullDocText } = await extractLinesFromPdf(fileData);

  if (allLines.length === 0) {
    throw new Error('No se pudo extraer texto del archivo PDF. Puede que sea un PDF escaneado como imagen.');
  }

  // 1. Detectar IBAN o Banco para sugerir cuenta
  let suggestedAccountId: string | undefined;
  const ibanMatch = fullDocText.match(/([A-Z]{2}[0-9]{2}[A-Z0-9]{10,30})/i);
  if (ibanMatch && existingAccounts.length > 0) {
    const rawIban = ibanMatch[1].replace(/\s+/g, '').toUpperCase();
    const last4 = rawIban.slice(-4);
    const foundAcc = existingAccounts.find(a => {
      const aIban = (a.iban || '').replace(/\s+/g, '').toUpperCase();
      return (aIban && aIban.includes(rawIban)) || (aIban && aIban.endsWith(last4));
    });
    if (foundAcc) {
      suggestedAccountId = foundAcc.id;
    }
  }

  if (!suggestedAccountId && existingAccounts.length > 0) {
    const normFull = norm(fullDocText);
    for (const acc of existingAccounts) {
      const aName = norm(acc.accountName);
      const aBank = norm(acc.bankName);
      if ((aName && normFull.includes(aName)) || (aBank && normFull.includes(aBank))) {
        suggestedAccountId = acc.id;
        break;
      }
      if (normFull.includes('trade republic') && (aName.includes('trade') || aBank.includes('trade'))) {
        suggestedAccountId = acc.id;
        break;
      }
    }
  }

  // 2. Extraer Saldo Final o de Cierre explícito del extracto (Trade Republic, BBVA, Santander, etc.)
  let detectedStatementBalance: number | undefined;
  let detectedStatementBalanceDate: string | undefined;

  for (const line of allLines) {
    const lineNorm = norm(line.fullText);
    if (
      lineNorm.includes('saldo final') ||
      lineNorm.includes('saldo al cierre') ||
      lineNorm.includes('saldo de cierre') ||
      lineNorm.includes('closing balance') ||
      lineNorm.includes('end balance') ||
      lineNorm.includes('kontostand am ende') ||
      lineNorm.includes('saldo disponible al') ||
      lineNorm.includes('saldo a fecha')
    ) {
      // Buscar el importe en los items de esta línea
      for (let i = line.items.length - 1; i >= 0; i--) {
        const val = parseAmountNumber(line.items[i].str);
        if (val !== null && Math.abs(val) < 10000000) {
          detectedStatementBalance = val;
          break;
        }
      }
      // Buscar posible fecha en la misma línea
      for (const item of line.items) {
        const d = parseDateString(item.str);
        if (d) {
          detectedStatementBalanceDate = d;
          break;
        }
      }
      if (detectedStatementBalance !== undefined) break;
    }
  }

  // 3. Detectar cabecera de la tabla de movimientos
  // Trade Republic: Fecha | Tipo | Descripción | Entrada | Salida | Saldo
  // Otros bancos: Fecha | Concepto | Cargo | Abono | Saldo  O  Fecha | Concepto | Importe | Saldo
  let headerLineIndex = -1;
  let isTradeRepublic = norm(fullDocText).includes('trade republic');
  let hasSeparateInOut = false;

  for (let i = 0; i < allLines.length; i++) {
    const textNorm = norm(allLines[i].fullText);
    const hasDateKw = textNorm.includes('fecha') || textNorm.includes('date');
    const hasTypeOrDesc = textNorm.includes('tipo') || textNorm.includes('concepto') || textNorm.includes('descripcion') || textNorm.includes('description');
    const hasAmountKw = textNorm.includes('importe') || textNorm.includes('entrada') || textNorm.includes('salida') || textNorm.includes('cargo') || textNorm.includes('abono') || textNorm.includes('saldo');

    if (hasDateKw && (hasTypeOrDesc || hasAmountKw)) {
      headerLineIndex = i;
      if (
        (textNorm.includes('entrada') && textNorm.includes('salida')) ||
        (textNorm.includes('cargo') && textNorm.includes('abono')) ||
        (textNorm.includes('inflow') && textNorm.includes('outflow'))
      ) {
        hasSeparateInOut = true;
      }
      break;
    }
  }

  // Columnas base simuladas para la vista previa y mapping
  const headers = hasSeparateInOut
    ? ['Fecha', 'Tipo', 'Descripción', 'Entradas (+)', 'Salidas (-)', 'Saldo']
    : ['Fecha', 'Concepto', 'Importe', 'Saldo'];

  const suggestedMapping: StatementColumnMapping = hasSeparateInOut
    ? {
        dateCol: 'Fecha',
        titleCol: 'Descripción',
        incomeCol: 'Entradas (+)',
        expenseCol: 'Salidas (-)',
        balanceCol: 'Saldo'
      }
    : {
        dateCol: 'Fecha',
        titleCol: 'Concepto',
        amountCol: 'Importe',
        balanceCol: 'Saldo'
      };

  // 4. Extraer filas de transacciones
  const rows: ParsedStatementRow[] = [];
  const rawPreviewRows: any[][] = [];
  const startLine = headerLineIndex >= 0 ? headerLineIndex + 1 : 0;

  for (let i = startLine; i < allLines.length; i++) {
    const line = allLines[i];
    const items = line.items;
    if (items.length < 2) continue;

    // Comprobar si la línea comienza con una fecha válida (DD.MM.YYYY, DD/MM/YYYY, YYYY-MM-DD, etc.)
    let parsedDate: string | null = null;
    let dateItemIdx = -1;

    for (let j = 0; j < Math.min(items.length, 3); j++) {
      const d = parseDateString(items[j].str);
      if (d) {
        parsedDate = d;
        dateItemIdx = j;
        break;
      }
    }

    if (!parsedDate) continue;

    // Omitir líneas de metadatos o resúmenes
    const lineNorm = norm(line.fullText);
    if (
      lineNorm.includes('saldo inicial') ||
      lineNorm.includes('saldo final') ||
      lineNorm.includes('total cargos') ||
      lineNorm.includes('total abonos') ||
      lineNorm.includes('iban:') ||
      lineNorm.includes('pagina ')
    ) {
      continue;
    }

    // Extraer números e importes en la línea
    // En extractos con Saldo: los últimos números son generalmente [Entrada/Salida, Saldo] o [Importe, Saldo]
    const numericItems: Array<{ idx: number; val: number; str: string; x: number }> = [];
    for (let j = dateItemIdx + 1; j < items.length; j++) {
      const num = parseAmountNumber(items[j].str);
      if (num !== null) {
        numericItems.push({ idx: j, val: num, str: items[j].str, x: items[j].x });
      }
    }

    if (numericItems.length === 0) continue;

    let transactionAmount = 0;
    let transactionType: 'income' | 'expense' = 'expense';
    let balanceAfter: number | undefined;

    // Detectar texto de descripción y tipo entre la fecha y los importes
    const firstNumIdx = numericItems[0].idx;
    const textTokens: string[] = [];
    for (let j = dateItemIdx + 1; j < firstNumIdx; j++) {
      const s = items[j].str.trim();
      if (s && parseDateString(s) === null) {
        textTokens.push(s);
      }
    }
    const titleText = textTokens.join(' ').trim() || 'Movimiento bancario';

    // Reglas semánticas por Tipo de operación bancaria (Trade Republic / Bancos habituales)
    const titleNorm = norm(titleText);
    const isExplicitIncome =
      titleNorm.includes('interes') ||
      titleNorm.includes('dividendo') ||
      titleNorm.includes('saveback') ||
      titleNorm.includes('abono') ||
      titleNorm.includes('ingreso') ||
      titleNorm.includes('deposito');

    const isExplicitExpense =
      titleNorm.includes('operar') ||
      titleNorm.includes('compra') ||
      titleNorm.includes('cargo') ||
      titleNorm.includes('retirada') ||
      titleNorm.includes('pago') ||
      titleNorm.includes('tarjeta') ||
      titleNorm.includes('comision');

    if (numericItems.length >= 2) {
      // Habitualmente: Penúltimo = Importe de operación, Último = Saldo posterior
      const amountCandidate = numericItems[numericItems.length - 2];
      const balanceCandidate = numericItems[numericItems.length - 1];

      transactionAmount = Math.abs(amountCandidate.val);
      balanceAfter = balanceCandidate.val;

      if (amountCandidate.str.includes('-')) {
        transactionType = 'expense';
      } else if (amountCandidate.str.includes('+')) {
        transactionType = 'income';
      } else if (isExplicitIncome) {
        transactionType = 'income';
      } else if (isExplicitExpense) {
        transactionType = 'expense';
      } else {
        // Comparar con el saldo posterior si es posible
        transactionType = 'expense';
      }
    } else {
      // Solo 1 número en la línea: es el importe
      const singleNum = numericItems[0];
      transactionAmount = Math.abs(singleNum.val);

      if (singleNum.val < 0 || singleNum.str.includes('-')) {
        transactionType = 'expense';
      } else if (isExplicitIncome) {
        transactionType = 'income';
      } else if (isExplicitExpense) {
        transactionType = 'expense';
      } else {
        transactionType = singleNum.val >= 0 ? 'income' : 'expense';
      }
    }

    if (transactionAmount === 0 || Math.abs(transactionAmount) > 10000000) continue;

    const suggestedCategory = guessCategory(
      titleText,
      transactionType === 'income' ? transactionAmount : -transactionAmount,
      categories
    );

    const isDuplicate = existingTransactions.some(tx => {
      return (
        tx.date === parsedDate &&
        Math.abs(tx.amount - transactionAmount) < 0.01 &&
        tx.type === transactionType &&
        tx.title.toLowerCase().trim() === titleText.toLowerCase().trim()
      );
    });

    const rowId = `pdf-row-${i}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newRow: ParsedStatementRow = {
      id: rowId,
      originalIndex: i,
      date: parsedDate,
      title: titleText,
      amount: transactionAmount,
      type: transactionType,
      suggestedCategoryId: suggestedCategory,
      rawRow: {
        Fecha: parsedDate,
        Concepto: titleText,
        Importe: transactionAmount,
        Saldo: balanceAfter !== undefined ? balanceAfter : ''
      },
      selected: !isDuplicate,
      isDuplicate,
      balanceAfter
    };

    rows.push(newRow);

    if (rawPreviewRows.length < 5) {
      rawPreviewRows.push([
        parsedDate,
        titleText,
        transactionType === 'income' ? `+${transactionAmount}` : `-${transactionAmount}`,
        balanceAfter !== undefined ? `${balanceAfter}` : ''
      ]);
    }
  }

  // Ordenar cronológicamente descendente
  rows.sort((a, b) => b.date.localeCompare(a.date));

  // Detectar saldo final desde la operación más reciente si no se encontró en cabecera
  if (detectedStatementBalance === undefined && rows.length > 0) {
    for (const r of rows) {
      if (r.balanceAfter !== undefined) {
        detectedStatementBalance = r.balanceAfter;
        detectedStatementBalanceDate = r.date;
        break;
      }
    }
  }

  let netMovementDelta = 0;
  for (const r of rows) {
    if (r.type === 'income') netMovementDelta += r.amount;
    else netMovementDelta -= r.amount;
  }

  return {
    fileName,
    sheetName: 'Extracto PDF',
    headers,
    suggestedMapping,
    rows,
    totalDetected: rows.length,
    suggestedAccountId,
    rawPreviewRows,
    rawData: rawPreviewRows,
    headerRowIndex: 0,
    detectedStatementBalance,
    detectedStatementBalanceDate: detectedStatementBalanceDate || (rows.length > 0 ? rows[0].date : undefined),
    netMovementDelta: Math.round(netMovementDelta * 100) / 100,
    latestTransactionDate: rows.length > 0 ? rows[0].date : undefined
  };
}
