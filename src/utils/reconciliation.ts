import { Transaction, BankAccount, TransactionCategory } from '../types';

/**
 * Normaliza un concepto eliminando fechas, referencias numéricas variables,
 * identificadores de recibos (Openbank, Santander, BBVA) y espacios redundantes
 * para poder comparar apuntes idénticos entre diferentes meses (ej: "RECIBO C.P. VALPARAISO Nº RECIBO ...").
 */
export function normalizeConceptForMatching(title: string): string {
  if (!title) return '';

  let norm = title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Quitar tildes
    .trim();

  // 1. Quitar fechas en formatos DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD o DD.MM.YY
  norm = norm.replace(/\b\d{1,2}[-/. ]\d{1,2}[-/. ]\d{2,4}\b/g, ' ');
  norm = norm.replace(/\b\d{4}[-/. ]\d{1,2}[-/. ]\d{1,2}\b/g, ' ');

  // 2. Quitar meses con año (ej: "ene 25", "febrero 2025", "marzo 2026", "02/25", "03/2025")
  norm = norm.replace(/\b(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s*(del?)?\s*\d{2,4}\b/g, ' ');
  norm = norm.replace(/\b(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)[./\s-]*\d{2,4}\b/g, ' ');
  norm = norm.replace(/\b\d{1,2}\/\d{2,4}\b/g, ' ');

  // 3. Quitar códigos de tarjeta o máscaras (ej: "•••• 1234", "**** 4321", "tarjeta 9942")
  norm = norm.replace(/[•*]{2,}\s*\d+/g, ' ');
  norm = norm.replace(/\b(tarj|tarjeta|card)\s*\d+\b/g, ' ');

  // 4. Quitar coletilla bancaria de recibos de Openbank/Santander/BBVA (Nº RECIBO ..., REF. MANDATO ...)
  norm = norm.replace(/\b(n[ºo]|no|num|numero)?\s*recibo\s+[\w\s.-]{6,}(ref\.?\s*mandato.*$|$)/gi, ' ');
  norm = norm.replace(/\bref\.?\s*mandato\s+[\w\s.-]+/gi, ' ');
  norm = norm.replace(/\bmandato\s+[\w\s.-]+/gi, ' ');

  // 5. Quitar referencias o identificadores alfanuméricos largos (ej: "ref: 12345678", "id: 987654")
  norm = norm.replace(/\b(ref|fra|factura|recibo|nº|no|num|id|operacion)[:\s#]*[a-z0-9-]{4,}\b/g, ' ');

  // 6. Quitar cadenas puramente numéricas de 3 o más dígitos (ej: "0073 0100 755")
  norm = norm.replace(/\b\d{3,}\b/g, ' ');

  // 7. Quitar prefijo genérico de operación si queda contenido significativo
  const strippedPrefix = norm.replace(/^(recibo\s+sepa|recibo|adeudo\s+sepa|adeudo|cargo\s+en\s+cuenta|cargo|abono)\s+/gi, '').trim();
  if (strippedPrefix.length >= 3) {
    norm = strippedPrefix;
  }

  // 8. Quitar caracteres especiales residuales y colapsar espacios
  norm = norm.replace(/[^a-z0-9\s]/g, ' ');
  norm = norm.replace(/\s+/g, ' ').trim();

  return norm;
}

/**
 * Determina de forma inteligente si dos transacciones corresponden al mismo concepto recurrente,
 * teniendo en cuenta variaciones mensuales de hashes, números de recibo o referencias bancarias.
 */
export function areTransactionsSimilar(t1: Transaction, t2: Transaction): boolean {
  if (t1.type !== t2.type) return false;
  const p1 = normalizeConceptForMatching(t1.title);
  const p2 = normalizeConceptForMatching(t2.title);
  if (!p1 || !p2) return false;
  if (p1 === p2) return true;

  // Si uno incluye al otro (ej: "c p valparaiso" vs "c p valparaiso fase 1")
  if (p1.length >= 4 && p2.length >= 4) {
    if (p1.includes(p2) || p2.includes(p1)) return true;
  }

  // Coincidencia por palabras clave identificativas (longitud >= 4)
  const words1 = p1.split(/\s+/).filter(w => w.length >= 4);
  const words2 = p2.split(/\s+/).filter(w => w.length >= 4);
  if (words1.length > 0 && words2.length > 0) {
    const common = words1.filter(w => words2.includes(w));
    if (common.length >= Math.min(words1.length, words2.length)) return true;
    if (common.length >= 2) return true;
  }

  return false;
}

/**
 * Obtiene las palabras clave y nombres de las demás cuentas bancarias registradas en la app.
 */
function getOtherAccountsKeywords(currentAccountId: string, accounts: BankAccount[]): Array<{ account: BankAccount; keywords: string[] }> {
  return accounts
    .filter((a) => a.id !== currentAccountId)
    .map((acc) => {
      const keywords: string[] = [];

      // Nombre del banco (ej: "Santander", "BBVA", "Trade Republic")
      if (acc.bankName) {
        keywords.push(acc.bankName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim());
      }
      // bankId (ej: "santander", "bbva", "trade republic")
      if (acc.bankId) {
        keywords.push(acc.bankId.toLowerCase().trim());
      }
      // Nombre de la cuenta (ej: "Cuenta Metas Ahorro", "Aqua Credito")
      if (acc.accountName) {
        keywords.push(acc.accountName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim());
      }
      // Últimos dígitos de la cuenta o IBAN (ej: "7890", "4321")
      if (acc.iban) {
        const cleanIban = acc.iban.replace(/\s+/g, '').toLowerCase();
        if (cleanIban.length >= 4) {
          keywords.push(cleanIban.slice(-4));
        }
      }
      if (acc.accountNumberMasked) {
        const digits = acc.accountNumberMasked.replace(/[^0-9]/g, '');
        if (digits.length >= 4) {
          keywords.push(digits.slice(-4));
        }
      }

      return {
        account: acc,
        keywords: keywords.filter((k) => k.length >= 3)
      };
    });
}

/**
 * Evalúa si una transacción corresponde a un Traspaso entre cuentas registradas.
 * Comprueba:
 * 1. Si existe la contrapartida (cargo <-> abono) en otra cuenta registrada con el mismo importe en un margen de ±7 días.
 * 2. Si el concepto menciona el nombre de otra cuenta o banco registrado en la app a nombre del usuario.
 * 3. Si el concepto indica explícitamente traspaso interno ("a mi nombre", "propia", "entre mis cuentas", etc.).
 */
export function detectAccountTransfer(
  tx: Transaction,
  accounts: BankAccount[],
  allTransactions: Transaction[]
): {
  isTransfer: boolean;
  category: 'cat-transferencias-gasto' | 'cat-traspaso-ingreso' | null;
  counterpart?: Transaction;
  reason?: string;
} {
  const normTitle = (tx.title || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const normNote = (tx.note || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const fullText = `${normTitle} ${normNote}`;

  const isExpense = tx.type === 'expense';
  const targetCategory = isExpense ? 'cat-transferencias-gasto' : 'cat-traspaso-ingreso';

  // Rendimientos, intereses y dividendos nunca son traspasos entre cuentas
  if (fullText.includes('interes') || fullText.includes('dividendo') || fullText.includes('remuneracion') || fullText.includes('liq. propia')) {
    return { isTransfer: false, category: null };
  }

  // 1. COMPROBAR CONTRAPARTIDA: Si lo compruebas estará el cargo/abono en la otra cuenta registrada
  const txTime = new Date(tx.date).getTime();
  const oppositeType = isExpense ? 'income' : 'expense';

  const counterpart = allTransactions.find((otherTx) => {
    if (otherTx.id === tx.id) return false;
    if (otherTx.accountId === tx.accountId) return false; // En OTRA cuenta registrada
    if (otherTx.type !== oppositeType) return false;
    if (Math.abs(otherTx.amount - tx.amount) > 0.05) return false; // Mismo importe

    const otherTime = new Date(otherTx.date).getTime();
    const daysDiff = Math.abs(txTime - otherTime) / (1000 * 60 * 60 * 24);
    if (daysDiff > 7) return false; // Ventana de 7 días (fines de semana / festivos)

    const otherText = `${otherTx.title} ${otherTx.note || ''}`.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    // Comprobar si al menos uno contiene términos de transferencia o traspaso o coincide banco
    const hasTransferWord = 
      fullText.includes('transferencia') || fullText.includes('transf') || fullText.includes('traspaso') ||
      otherText.includes('transferencia') || otherText.includes('transf') || otherText.includes('traspaso') ||
      fullText.includes('abono') || fullText.includes('cargo') || otherText.includes('abono') || otherText.includes('cargo') ||
      fullText.includes('envio') || otherText.includes('envio');

    return hasTransferWord || daysDiff <= 3;
  });

  if (counterpart) {
    const otherAccount = accounts.find((a) => a.id === counterpart.accountId);
    const bankLabel = otherAccount ? otherAccount.bankName : 'otra cuenta';
    return {
      isTransfer: true,
      category: targetCategory,
      counterpart,
      reason: isExpense 
        ? `Traspaso enviado detectado con abono en ${bankLabel} (${counterpart.date}, ${counterpart.amount} €)`
        : `Traspaso recibido detectado con cargo en ${bankLabel} (${counterpart.date}, ${counterpart.amount} €)`
    };
  }

  // 2. COMPROBAR SI MENCIONA OTRA CUENTA REGISTRADA EN LA APP
  const otherAccs = getOtherAccountsKeywords(tx.accountId, accounts);
  for (const { account, keywords } of otherAccs) {
    for (const kw of keywords) {
      if (fullText.includes(kw)) {
        // Asegurar que es un concepto de transferencia/traspaso/envío
        const isTransferType = 
          fullText.includes('transferencia') || 
          fullText.includes('transf') || 
          fullText.includes('traspaso') ||
          fullText.includes('abono') ||
          fullText.includes('orden') ||
          fullText.includes('envio') ||
          fullText.includes('cargo');

        if (isTransferType) {
          return {
            isTransfer: true,
            category: targetCategory,
            reason: `Menciona cuenta registrada de ${account.bankName} (${account.accountName})`
          };
        }
      }
    }
  }

  // 3. TRANSFERENCIAS A MI NOMBRE / PROPIAS / ENTRE MIS CUENTAS
  const isOwnTransfer = 
    fullText.includes('a mi nombre') ||
    fullText.includes('entre mis cuentas') ||
    fullText.includes('transferencia propia') ||
    fullText.includes('traspaso propio') ||
    fullText.includes('traspaso entre cuentas') ||
    fullText.includes('transferencia interna') ||
    fullText.includes('traspaso interno') ||
    fullText.includes('cuenta propia') ||
    fullText.includes('mismo titular');

  if (isOwnTransfer) {
    return {
      isTransfer: true,
      category: targetCategory,
      reason: 'Traspaso propio entre cuentas del mismo titular'
    };
  }

  return {
    isTransfer: false,
    category: null
  };
}

/**
 * Aprende las categorías asignadas por el usuario a conceptos específicos
 * y las propaga de manera inteligente a todos los meses idénticos o equivalentes.
 */
export function reconcileAndCategorizeAll(
  transactions: Transaction[],
  accounts: BankAccount[],
  categories: TransactionCategory[]
): {
  updatedTransactions: Transaction[];
  stats: {
    transfersMatched: number;
    patternsLearned: number;
    totalUpdated: number;
  };
  details: string[];
} {
  const details: string[] = [];
  let transfersMatched = 0;
  let patternsLearned = 0;
  let totalUpdated = 0;

  // 1. Construir diccionario de categorías aprendidas a partir de movimientos reales
  // Priorizamos aquellas categorías que no sean genéricas (otros gastos / otros ingresos)
  const categoryUsageByConcept = new Map<string, Map<string, number>>();

  transactions.forEach((tx) => {
    if (!tx.categoryId) return;
    const cleanPattern = normalizeConceptForMatching(tx.title);
    if (!cleanPattern || cleanPattern.length < 3) return;

    if (!categoryUsageByConcept.has(cleanPattern)) {
      categoryUsageByConcept.set(cleanPattern, new Map());
    }
    const catMap = categoryUsageByConcept.get(cleanPattern)!;
    // Damos mayor peso a categorías específicas
    const weight = (tx.categoryId === 'cat-otros-gastos' || tx.categoryId === 'cat-otros-ingresos') ? 1 : 10;
    catMap.set(tx.categoryId, (catMap.get(tx.categoryId) || 0) + weight);
  });

  // Elegir la categoría más fuerte para cada concepto normalizado
  const learnedCategoryMap = new Map<string, string>();
  categoryUsageByConcept.forEach((catMap, concept) => {
    let topCat = '';
    let topWeight = -1;
    catMap.forEach((weight, catId) => {
      if (weight > topWeight) {
        topWeight = weight;
        topCat = catId;
      }
    });
    if (topCat) {
      learnedCategoryMap.set(concept, topCat);
    }
  });

  // 2. Procesar cada transacción
  const updatedTransactions = transactions.map((tx) => {
    // Si el usuario fijó manualmente la categoría como excepción personal, RESPETARLA SIEMPRE
    if (tx.isManualCategory) {
      return tx;
    }

    let modified = false;
    let newCategoryId = tx.categoryId;
    let noteAddition = '';

    // A. REGLA 1: Traspaso entre cuentas registradas (Transferencias recibidas / enviadas)
    const transferCheck = detectAccountTransfer(tx, accounts, transactions);
    if (transferCheck.isTransfer && transferCheck.category) {
      if (tx.categoryId !== transferCheck.category) {
        newCategoryId = transferCheck.category;
        modified = true;
        transfersMatched++;
        if (transferCheck.reason) {
          details.push(`«${tx.title}» (${tx.date}): Asignado a Traspaso entre Cuentas [${transferCheck.reason}]`);
        }
      }
    }

    // B. REGLA 2: Aprendizaje de conceptos y correcciones del usuario en BBVA y otros bancos en todos los meses
    if (!modified) {
      const cleanPattern = normalizeConceptForMatching(tx.title);
      const learnedCatId = learnedCategoryMap.get(cleanPattern);

      if (learnedCatId && learnedCatId !== tx.categoryId) {
        // Validar coherencia de tipo (gasto vs ingreso)
        const targetCategory = categories.find((c) => c.id === learnedCatId);
        if (targetCategory && targetCategory.type === tx.type) {
          newCategoryId = learnedCatId;
          modified = true;
          patternsLearned++;
          details.push(`«${tx.title}» (${tx.date}): Asignado a «${targetCategory.name}» por patrón recurrente del hogar`);
        }
      }
    }

    // C. REGLA 3: Ingreso regular recurrente de liquidación de alquiler (BBVA / cuentas registradas) -> Nómina & Sueldo
    if (tx.type === 'income') {
      const titleClean = (tx.title || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const noteClean = (tx.note || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const isBBVA = (tx.accountId || '').toLowerCase().includes('bbva');

      const isRental =
        titleClean.includes('alquiler') ||
        titleClean.includes('arrendamiento') ||
        noteClean.includes('alquiler') ||
        (isBBVA && tx.amount >= 300 && tx.amount <= 750 && (
          titleClean.includes('transferencia') ||
          titleClean.includes('abono')
        ));

      if (isRental) {
        const nomCat = categories.find((c) => c.id === 'cat-nomina' || c.name.toLowerCase().includes('nomina'));
        if (nomCat && newCategoryId !== nomCat.id) {
          newCategoryId = nomCat.id;
          modified = true;
          patternsLearned++;
          details.push(`«${tx.title}» (${tx.date}): Asignado a «${nomCat.name}» [Liquidación alquiler recurrente BBVA]`);
        }
      }
    }

    if (modified) {
      totalUpdated++;
      return {
        ...tx,
        categoryId: newCategoryId,
        note: tx.note ? tx.note : (noteAddition || undefined)
      };
    }

    return tx;
  });

  return {
    updatedTransactions,
    stats: {
      transfersMatched,
      patternsLearned,
      totalUpdated
    },
    details
  };
}
