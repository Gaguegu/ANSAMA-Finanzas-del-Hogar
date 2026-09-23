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

  // A. Búsqueda específica en "RESUMEN DEL BALANCE" (Trade Republic / brokers)
  for (let i = 0; i < allLines.length; i++) {
    const lineNorm = norm(allLines[i].fullText);
    if (
      lineNorm.includes('resumen del balance') ||
      lineNorm.includes('balance summary') ||
      lineNorm.includes('saldenubersicht') ||
      lineNorm.includes('cuentas colectivas') ||
      lineNorm.includes('cuentas fiduciarias') ||
      lineNorm.includes('omnibus trust')
    ) {
      // Buscar en las siguientes líneas la fecha ("a 31 mar 2025") y el saldo del banco custodio (Citibank, Deutsche Bank, Efectivo, etc.)
      for (let k = i; k < Math.min(allLines.length, i + 15); k++) {
        const subLine = allLines[k];
        const subLineNorm = norm(subLine.fullText);

        // Fecha del balance (ej: "a 31 mar 2025", "31/03/2025", "31.03.2025")
        if (!detectedStatementBalanceDate) {
          const dMatch = subLine.fullText.match(/\b(\d{1,2}\s+(?:de\s+)?[a-z]{3,10}(?:\s+de)?\s+\d{4})\b/i) ||
                         subLine.fullText.match(/\b(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})\b/);
          if (dMatch) {
            const parsedD = parseDateString(dMatch[1]);
            if (parsedD) detectedStatementBalanceDate = parsedD;
          }
        }

        // Importe del saldo de la cuenta de efectivo (ej: "Citibank 15.420,50 €", "Efectivo 15.420,50 €")
        // Extraer si es una línea de entidad bancaria custodia, fiduciaria, o saldo total de efectivo
        const isCustodianLine =
          subLineNorm.includes('citibank') ||
          subLineNorm.includes('deutsche') ||
          subLineNorm.includes('j.p. morgan') ||
          subLineNorm.includes('jp morgan') ||
          subLineNorm.includes('solaris') ||
          subLineNorm.includes('cuentas colectivas') ||
          subLineNorm.includes('cuentas fiduciarias') ||
          subLineNorm.includes('omnibus') ||
          subLineNorm.includes('efectivo') ||
          subLineNorm.includes('saldo total') ||
          subLineNorm.includes('total efectivo');

        if (isCustodianLine) {
          for (let j = subLine.items.length - 1; j >= 0; j--) {
            const val = parseAmountNumber(subLine.items[j].str);
            if (val !== null && val > 0 && Math.abs(val) < 100000000) {
              detectedStatementBalance = val;
              break;
            }
          }
        }
        if (detectedStatementBalance !== undefined && detectedStatementBalanceDate) break;
      }
      if (detectedStatementBalance !== undefined) break;
    }
  }

  // B. Búsqueda genérica estándar ("Saldo final", "Saldo de cierre", etc.)
  if (detectedStatementBalance === undefined) {
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
        lineNorm.includes('saldo a fecha') ||
        lineNorm.includes('saldo actual')
      ) {
        // Buscar el importe en los items de esta línea
        for (let i = line.items.length - 1; i >= 0; i--) {
          const val = parseAmountNumber(line.items[i].str);
          if (val !== null && Math.abs(val) < 100000000) {
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
  }

  // 3. Detectar cabecera de la tabla de movimientos
  // Trade Republic: Fecha | Tipo | Descripción | Entrada | Salida | Saldo
  // Otros bancos: Fecha | Concepto | Cargo | Abono | Saldo  O  Fecha | Concepto | Importe | Saldo
  let headerLineIndex = -1;
  let isTradeRepublic = norm(fullDocText).includes('trade republic');
  let hasSeparateInOut = false;
  let inflowColX: number | null = null;
  let outflowColX: number | null = null;
  let saldoColX: number | null = null;

  for (let i = 0; i < allLines.length; i++) {
    const textNorm = norm(allLines[i].fullText);
    const hasDateKw = textNorm.includes('fecha') || textNorm.includes('date') || textNorm.includes('datum');
    const hasTypeOrDesc = textNorm.includes('tipo') || textNorm.includes('concepto') || textNorm.includes('descripcion') || textNorm.includes('description');
    const hasAmountKw = textNorm.includes('importe') || textNorm.includes('entrada') || textNorm.includes('salida') || textNorm.includes('cargo') || textNorm.includes('abono') || textNorm.includes('saldo');

    if (hasDateKw && (hasTypeOrDesc || hasAmountKw)) {
      headerLineIndex = i;
      const headerLine = allLines[i];
      for (const item of headerLine.items) {
        const itemNorm = norm(item.str);
        if (itemNorm.includes('entrada') || itemNorm.includes('abono') || itemNorm.includes('inflow') || itemNorm.includes('eingang')) {
          inflowColX = item.x;
          hasSeparateInOut = true;
        } else if (itemNorm.includes('salida') || itemNorm.includes('cargo') || itemNorm.includes('outflow') || itemNorm.includes('ausgang')) {
          outflowColX = item.x;
          hasSeparateInOut = true;
        } else if (itemNorm.includes('saldo') || itemNorm.includes('balance') || itemNorm.includes('kontostand')) {
          saldoColX = item.x;
        }
      }
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

  // 4. Extraer filas de transacciones agrupando bloques multilínea
  const rows: ParsedStatementRow[] = [];
  const rawPreviewRows: any[][] = [];
  const startLine = headerLineIndex >= 0 ? headerLineIndex + 1 : 0;

  let i = startLine;
  while (i < allLines.length) {
    const line = allLines[i];
    const lineNorm = norm(line.fullText);

    // Omitir líneas de metadatos o resúmenes de página y notas legales al pie
    if (
      lineNorm.includes('saldo inicial') ||
      lineNorm.includes('saldo final') ||
      lineNorm.includes('total cargos') ||
      lineNorm.includes('total abonos') ||
      lineNorm.includes('iban:') ||
      lineNorm.includes('pagina ') ||
      lineNorm.includes('resumen del balance') ||
      lineNorm.includes('notas sobre el extracto') ||
      lineNorm.includes('cuentas colectivas') ||
      lineNorm.includes('cuenta fiduciaria') ||
      lineNorm.includes('cuentas fiduciarias') ||
      lineNorm.includes('fondo de garantia') ||
      lineNorm.includes('garantia de depositos') ||
      lineNorm.includes('citibank') ||
      lineNorm.includes('deutsche bank') ||
      lineNorm.includes('j.p. morgan') ||
      lineNorm.includes('jp morgan') ||
      lineNorm.includes('solaris')
    ) {
      if (
        lineNorm.includes('notas sobre el extracto') ||
        lineNorm.includes('cuentas colectivas') ||
        lineNorm.includes('fondo de garantia')
      ) {
        // Las notas explicativas de Trade Republic marcan el final de la tabla de movimientos
        break;
      }
      i++;
      continue;
    }

    // Comprobar si la línea i inicia una transacción con fecha
    let parsedDate: string | null = null;
    let hasYearOnNextLine = false;

    // A) En la misma línea (ej: "28/03/2025", "28.03.2025", "28 mar 2025")
    for (let j = 0; j < Math.min(line.items.length, 3); j++) {
      const d = parseDateString(line.items[j].str);
      if (d) {
        parsedDate = d;
        break;
      }
      if (j + 1 < line.items.length) {
        const comb = `${line.items[j].str} ${line.items[j + 1].str}`;
        const dComb = parseDateString(comb);
        if (dComb) {
          parsedDate = dComb;
          break;
        }
      }
    }

    // B) Si la línea i tiene "DD mes" (ej: "28 mar") y la línea i+1 tiene el año "2025"
    if (!parsedDate && i + 1 < allLines.length) {
      for (let j = 0; j < Math.min(line.items.length, 2); j++) {
        const nextFirst = allLines[i + 1].items[0]?.str || '';
        const dNext = parseDateString(`${line.items[j].str} ${nextFirst}`);
        if (dNext) {
          parsedDate = dNext;
          hasYearOnNextLine = true;
          break;
        }
      }
    }

    if (!parsedDate) {
      i++;
      continue;
    }

    // Acumular todas las líneas que forman parte de esta misma transacción
    // (en extractos como Trade Republic, un movimiento puede ocupar 2 o 3 líneas físicas)
    const blockLines: PdfLine[] = [line];
    let nextIdx = i + 1;

    while (nextIdx < allLines.length) {
      const candLine = allLines[nextIdx];
      const candNorm = norm(candLine.fullText);

      // Si encontramos separadores de sección o página, termina el bloque
      if (
        candNorm.includes('saldo final') ||
        candNorm.includes('saldo inicial') ||
        candNorm.includes('resumen del balance') ||
        candNorm.includes('pagina ')
      ) {
        break;
      }

      // Comprobar si candLine es el inicio de una NUEVA transacción
      let isNewTx = false;
      for (let j = 0; j < Math.min(candLine.items.length, 3); j++) {
        if (parseDateString(candLine.items[j].str)) {
          isNewTx = true;
          break;
        }
        if (j + 1 < candLine.items.length && parseDateString(`${candLine.items[j].str} ${candLine.items[j + 1].str}`)) {
          isNewTx = true;
          break;
        }
      }
      if (!isNewTx && nextIdx + 1 < allLines.length) {
        const candFirst = candLine.items[0]?.str || '';
        const nextNextFirst = allLines[nextIdx + 1].items[0]?.str || '';
        if (parseDateString(`${candFirst} ${nextNextFirst}`)) {
          isNewTx = true;
        }
      }

      if (isNewTx) {
        break;
      }

      blockLines.push(candLine);
      nextIdx++;

      // Máximo 4 líneas por movimiento para evitar desbordes accidentales
      if (blockLines.length >= 4) break;
    }

    const currentBlockIndex = i;
    i = nextIdx;

    // Recopilar todos los ítems de texto de las líneas del bloque
    const allBlockItems: PdfTextItem[] = [];
    for (const bLine of blockLines) {
      allBlockItems.push(...bLine.items);
    }

    const dateYear = parsedDate.slice(0, 4);

    // Identificar cantidades o números que pertenecen a la descripción (ej: "quantity: 1000", "ISIN ...")
    // y extraer los candidatos numéricos de importe y saldo
    const numericItems: Array<{ val: number; str: string; x: number; originalItem: PdfTextItem }> = [];

    for (let k = 0; k < allBlockItems.length; k++) {
      const it = allBlockItems[k];
      const sTrim = it.str.trim();

      // Excluir año de la fecha
      if (sTrim === dateYear) continue;

      // Excluir si es parte de la fecha inicial (ej: "28", "mar")
      if (k === 0 && parseDateString(sTrim) !== null) continue;

      // Excluir cantidades asociadas a "quantity:", "cantidad:", etc.
      // IMPORTANTE: Un importe con símbolo de divisa (€, EUR, $) NUNCA es una cantidad de títulos
      const hasCurrency = sTrim.includes('€') || sTrim.includes('EUR') || sTrim.includes('eur') || sTrim.includes('$');
      if (!hasCurrency) {
        if (norm(sTrim).startsWith('quantity') || norm(sTrim).startsWith('cantidad') || norm(sTrim).startsWith('stk')) {
          continue;
        }
        if (k > 0) {
          const prevStr = norm(allBlockItems[k - 1].str);
          if (
            (prevStr.includes('quantity') || prevStr.includes('cantidad') || prevStr.includes('stk') || prevStr.includes('titulos')) &&
            !hasCurrency
          ) {
            continue;
          }
        }
      }

      const num = parseAmountNumber(sTrim);
      if (num !== null) {
        // En extractos con divisas (Trade Republic, bancos españoles), los importes suelen llevar '€'
        // o situarse a la derecha (x > 300) o tener decimales (con coma o punto)
        const hasCurrencyOrDecimals = sTrim.includes('€') || sTrim.includes('EUR') || sTrim.includes(',') || sTrim.includes('.');
        const isRightColumn = it.x > 300;

        if (hasCurrencyOrDecimals || isRightColumn) {
          numericItems.push({ val: num, str: sTrim, x: it.x, originalItem: it });
        }
      }
    }

    if (numericItems.length === 0) continue;

    let transactionAmount = 0;
    let transactionType: 'income' | 'expense' = 'expense';
    let balanceAfter: number | undefined;

    // Detectar texto de descripción: todos los ítems que no son la fecha ni los números de importe/saldo
    const numericItemSet = new Set(numericItems.map(n => n.originalItem));
    const textTokens: string[] = [];

    for (const it of allBlockItems) {
      const s = it.str.trim();
      if (!s) continue;
      if (s === dateYear) continue;
      if (parseDateString(s) !== null) continue;
      if (numericItemSet.has(it)) continue;
      textTokens.push(s);
    }

    const titleText = textTokens.join(' ').trim() || 'Movimiento bancario';

    // Reglas semánticas por Tipo de operación bancaria (Trade Republic / Bancos habituales)
    const titleNorm = norm(titleText);
    const isExplicitIncome =
      titleNorm.includes('venta') || // Venta de acciones / ETF siempre es un ingreso de efectivo
      titleNorm.includes('sell') ||
      titleNorm.includes('verkauf') ||
      titleNorm.includes('rentabilidad') ||
      titleNorm.includes('dividend') ||
      titleNorm.includes('dividendo') ||
      titleNorm.includes('interes') ||
      titleNorm.includes('interest') ||
      titleNorm.includes('zinsen') ||
      titleNorm.includes('saveback') ||
      titleNorm.includes('abono') ||
      titleNorm.includes('ingreso') ||
      titleNorm.includes('deposito') ||
      titleNorm.includes('deposit') ||
      titleNorm.includes('rendimiento') ||
      titleNorm.includes('cashback') ||
      titleNorm.includes('recompensa') ||
      titleNorm.includes('premio') ||
      titleNorm.includes('distribucion') ||
      titleNorm.includes('einlage') ||
      titleNorm.includes('gutschrift') ||
      titleNorm.includes('transferencia recibida') ||
      titleNorm.includes('traspaso entrante') ||
      titleNorm.includes('traspaso desde');

    const isExplicitExpense =
      titleNorm.includes('compra') || // Compra de acciones / ETF saca efectivo
      titleNorm.includes('buy') ||
      titleNorm.includes('kauf') ||
      titleNorm.includes('orden de compra') ||
      titleNorm.includes('cargo') ||
      titleNorm.includes('retirada') ||
      titleNorm.includes('withdrawal') ||
      titleNorm.includes('auszahlung') ||
      titleNorm.includes('pago') ||
      titleNorm.includes('payment') ||
      titleNorm.includes('tarjeta') ||
      titleNorm.includes('card') ||
      titleNorm.includes('round up') ||
      titleNorm.includes('roundup') ||
      titleNorm.includes('comision') ||
      titleNorm.includes('fee') ||
      titleNorm.includes('gebühr') ||
      titleNorm.includes('custodia') ||
      titleNorm.includes('custody') ||
      titleNorm.includes('impuesto') ||
      titleNorm.includes('tax') ||
      titleNorm.includes('retencion') ||
      titleNorm.includes('steuer') ||
      titleNorm.includes('transferencia enviada') ||
      titleNorm.includes('traspaso hacia');

    if (numericItems.length >= 2) {
      // Habitualmente: Penúltimo = Importe de operación, Último = Saldo posterior
      const amountCandidate = numericItems[numericItems.length - 2];
      const balanceCandidate = numericItems[numericItems.length - 1];

      transactionAmount = Math.abs(amountCandidate.val);
      balanceAfter = balanceCandidate.val;

      // 1. Prioridad semántica inequívoca (las ventas de acciones, dividendos, intereses son siempre ingresos; compras y cargos siempre gastos)
      if (isExplicitIncome && !isExplicitExpense) {
        transactionType = 'income';
      } else if (isExplicitExpense && !isExplicitIncome) {
        transactionType = 'expense';
      } else if (amountCandidate.str.includes('+')) {
        transactionType = 'income';
      } else if (amountCandidate.str.includes('-')) {
        transactionType = 'expense';
      } else {
        // 2. Probar por posición de columna X (si detectamos Entrada / Salida en cabecera)
        let resolvedByColumn = false;
        if (inflowColX !== null && outflowColX !== null) {
          const distIn = Math.abs(amountCandidate.x - inflowColX);
          const distOut = Math.abs(amountCandidate.x - outflowColX);
          if (distIn < distOut && distIn < 80) {
            transactionType = 'income';
            resolvedByColumn = true;
          } else if (distOut < distIn && distOut < 80) {
            transactionType = 'expense';
            resolvedByColumn = true;
          }
        }

        if (!resolvedByColumn) {
          transactionType = 'expense';
        }
      }
    } else {
      // Solo 1 número en la línea: es el importe
      const singleNum = numericItems[0];
      transactionAmount = Math.abs(singleNum.val);

      if (isExplicitIncome && !isExplicitExpense) {
        transactionType = 'income';
      } else if (isExplicitExpense && !isExplicitIncome) {
        transactionType = 'expense';
      } else if (singleNum.val < 0 || singleNum.str.includes('-')) {
        transactionType = 'expense';
      } else if (singleNum.str.includes('+')) {
        transactionType = 'income';
      } else {
        let resolvedByColumn = false;
        if (inflowColX !== null && outflowColX !== null) {
          const distIn = Math.abs(singleNum.x - inflowColX);
          const distOut = Math.abs(singleNum.x - outflowColX);
          if (distIn < distOut && distIn < 80) {
            transactionType = 'income';
            resolvedByColumn = true;
          } else if (distOut < distIn && distOut < 80) {
            transactionType = 'expense';
            resolvedByColumn = true;
          }
        }

        if (!resolvedByColumn) {
          transactionType = singleNum.val >= 0 ? 'income' : 'expense';
        }
      }
    }

    if (transactionAmount === 0 || Math.abs(transactionAmount) > 10000000) continue;

    const suggestedCategory = guessCategory(
      titleText,
      transactionType === 'income' ? transactionAmount : -transactionAmount,
      categories
    );

    const isDuplicate = existingTransactions.some(tx => {
      const sameDate = tx.date === parsedDate;
      const sameAmount = Math.abs(tx.amount - transactionAmount) < 0.01;
      const sameType = tx.type === transactionType;
      if (!sameDate || !sameAmount || !sameType) return false;

      const t1 = tx.title.toLowerCase().trim();
      const t2 = titleText.toLowerCase().trim();

      // Coincidencia exacta o parcial del concepto
      if (t1 === t2 || t1.includes(t2) || t2.includes(t1)) return true;

      // O si comparten palabras clave identificativas (ej: ISIN, ticker, nombre de empresa)
      const words1 = t1.split(/\s+/).filter(w => w.length > 3);
      const words2 = t2.split(/\s+/).filter(w => w.length > 3);
      const sharedWords = words1.filter(w => words2.includes(w));
      if (sharedWords.length > 0) return true;

      // Si coincide la misma cuenta bancaria con la misma fecha, importe y tipo
      if (suggestedAccountId && tx.accountId === suggestedAccountId) return true;

      return false;
    });

    const rowId = `pdf-row-${currentBlockIndex}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newRow: ParsedStatementRow = {
      id: rowId,
      originalIndex: currentBlockIndex,
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

  // Verificación matemática de signo basada en el saldo continuo (balanceAfter)
  // Comprobar la dirección temporal del extracto (cronológico antiguo->nuevo vs nuevo->antiguo)
  if (rows.length >= 2) {
    const isOldestFirst = rows[0].date <= rows[rows.length - 1].date;

    for (let k = 1; k < rows.length; k++) {
      const prev = rows[k - 1];
      const curr = rows[k];
      if (prev.balanceAfter !== undefined && curr.balanceAfter !== undefined) {
        // Si el extracto avanza en el tiempo (prev es anterior, curr es posterior):
        // aumento de saldo = curr - prev > 0
        // Si el extracto va hacia atrás (prev es posterior, curr es anterior):
        // aumento de saldo del movimiento curr = prev - curr > 0
        const diff = isOldestFirst
          ? Math.round((curr.balanceAfter - prev.balanceAfter) * 100) / 100
          : Math.round((prev.balanceAfter - curr.balanceAfter) * 100) / 100;

        if (Math.abs(Math.abs(diff) - curr.amount) < 0.05) {
          if (diff > 0 && curr.type !== 'income') {
            curr.type = 'income';
            curr.suggestedCategoryId = guessCategory(curr.title, curr.amount, categories);
          } else if (diff < 0 && curr.type !== 'expense') {
            curr.type = 'expense';
            curr.suggestedCategoryId = guessCategory(curr.title, -curr.amount, categories);
          }
        }
      }
    }
  }

  // Si no se encontró el saldo en cabecera ni en RESUMEN DEL BALANCE,
  // el movimiento con la fecha más reciente contiene el saldo final real del extracto
  if (detectedStatementBalance === undefined && rows.length > 0) {
    const sortedByDateDesc = [...rows].sort((a, b) => b.date.localeCompare(a.date));
    const latestWithBal = sortedByDateDesc.find(r => r.balanceAfter !== undefined);
    if (latestWithBal && latestWithBal.balanceAfter !== undefined) {
      detectedStatementBalance = latestWithBal.balanceAfter;
      detectedStatementBalanceDate = latestWithBal.date;
    }
  }

  // Ordenar cronológicamente descendente para mostrar al usuario (más recientes primero)
  rows.sort((a, b) => b.date.localeCompare(a.date) || b.originalIndex - a.originalIndex);

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
