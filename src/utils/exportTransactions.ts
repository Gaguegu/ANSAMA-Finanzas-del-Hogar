import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Transaction, BankAccount, TransactionCategory } from '../types';

export interface ExportTransactionsOptions {
  filterLabel?: string;
  bankLabel?: string;
  customFilename?: string;
}

/**
 * Exporta transacciones a formato Excel (.xlsx) o CSV (.csv) con columnas financieras profesionales.
 */
export function exportTransactionsToSpreadsheet(
  transactions: Transaction[],
  accounts: BankAccount[],
  categories: TransactionCategory[],
  format: 'xlsx' | 'csv',
  options?: ExportTransactionsOptions
): { filename: string; count: number } {
  const accountMap = new Map<string, BankAccount>();
  accounts.forEach((a) => accountMap.set(a.id, a));

  const categoryMap = new Map<string, TransactionCategory>();
  categories.forEach((c) => categoryMap.set(c.id, c));

  // Orden cronológico descendente (más recientes primero)
  const sortedTxs = [...transactions].sort((a, b) => b.date.localeCompare(a.date));

  let totalIncome = 0;
  let totalExpense = 0;

  const rows = sortedTxs.map((tx) => {
    const acc = accountMap.get(tx.accountId);
    const cat = categoryMap.get(tx.categoryId);
    const isIncome = tx.type === 'income';
    const signedAmount = isIncome ? tx.amount : -tx.amount;

    if (isIncome) {
      totalIncome += tx.amount;
    } else {
      totalExpense += tx.amount;
    }

    return {
      'Fecha': tx.date,
      'Banco / Entidad': acc?.bankName || 'General',
      'Cuenta': acc?.accountName || 'Cuenta',
      'IBAN / Identificador': acc?.accountNumberMasked || acc?.type || '',
      'Concepto': tx.title,
      'Categoría': cat?.name || 'General',
      'Tipo': isIncome ? 'Ingreso' : 'Gasto',
      'Importe (€)': Math.round(signedAmount * 100) / 100,
      'Notas / Observaciones': tx.note || ''
    };
  });

  const wsMovimientos = XLSX.utils.json_to_sheet(rows);

  // Anchos de columna optimizados
  wsMovimientos['!cols'] = [
    { wch: 12 }, // Fecha
    { wch: 16 }, // Banco
    { wch: 24 }, // Cuenta
    { wch: 20 }, // IBAN
    { wch: 38 }, // Concepto
    { wch: 22 }, // Categoría
    { wch: 10 }, // Tipo
    { wch: 15 }, // Importe
    { wch: 35 }, // Notas
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsMovimientos, 'Movimientos');

  // Si es Excel (.xlsx), añadimos una segunda pestaña de Resumen y Auditoría
  if (format === 'xlsx') {
    const netTotal = Math.round((totalIncome - totalExpense) * 100) / 100;
    const summaryRows = [
      { 'Concepto': 'Aplicación', 'Detalle': 'ANSAMA Finanzas del Hogar' },
      { 'Concepto': 'Fecha de Exportación', 'Detalle': new Date().toLocaleString('es-ES') },
      { 'Concepto': 'Filtro / Periodo', 'Detalle': options?.filterLabel || 'Todos los periodos' },
      { 'Concepto': 'Banco / Entidad', 'Detalle': options?.bankLabel || 'Todas las entidades' },
      { 'Concepto': 'Total Registros Exportados', 'Detalle': sortedTxs.length },
      { 'Concepto': 'Total Ingresos (€)', 'Detalle': Math.round(totalIncome * 100) / 100 },
      { 'Concepto': 'Total Gastos (€)', 'Detalle': -Math.round(totalExpense * 100) / 100 },
      { 'Concepto': 'Balance Neto (€)', 'Detalle': netTotal }
    ];

    const wsResumen = XLSX.utils.json_to_sheet(summaryRows);
    wsResumen['!cols'] = [
      { wch: 26 },
      { wch: 40 }
    ];
    XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen Contable');
  }

  // Generar nombre de archivo limpio y descriptivo
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = `${String(now.getHours()).padStart(2, '0')}h${String(now.getMinutes()).padStart(2, '0')}m`;
  
  let sanitizedFilter = (options?.filterLabel || '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/__+/g, '_')
    .substring(0, 30);
  
  let prefix = options?.customFilename || 'ANSAMA_Movimientos';
  if (sanitizedFilter) {
    prefix += `_${sanitizedFilter}`;
  }

  const finalFilename = `${prefix}_${dateStr}_${timeStr}.${format}`;

  XLSX.writeFile(wb, finalFilename, { bookType: format });

  return { filename: finalFilename, count: sortedTxs.length };
}

/**
 * Exporta transacciones a formato PDF (.pdf) formal y estructurado para imprimir o guardar.
 */
export function exportTransactionsToPdf(
  transactions: Transaction[],
  accounts: BankAccount[],
  categories: TransactionCategory[],
  options?: ExportTransactionsOptions
): { filename: string; count: number } {
  const accountMap = new Map<string, BankAccount>();
  accounts.forEach((a) => accountMap.set(a.id, a));

  const categoryMap = new Map<string, TransactionCategory>();
  categories.forEach((c) => categoryMap.set(c.id, c));

  const sortedTxs = [...transactions].sort((a, b) => b.date.localeCompare(a.date));

  let totalIncome = 0;
  let totalExpense = 0;

  const tableBody = sortedTxs.map((tx) => {
    const acc = accountMap.get(tx.accountId);
    const cat = categoryMap.get(tx.categoryId);
    const isIncome = tx.type === 'income';
    const signedAmount = isIncome ? tx.amount : -tx.amount;

    if (isIncome) {
      totalIncome += tx.amount;
    } else {
      totalExpense += tx.amount;
    }

    const formattedAmt = isIncome 
      ? `+${signedAmount.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`
      : `${signedAmount.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

    return [
      tx.date,
      acc ? `${acc.bankName} (${acc.accountName})` : 'General',
      tx.title || 'Sin concepto',
      cat?.name || 'General',
      formattedAmt,
      tx.type // para estilizar en didParseCell
    ];
  });

  const netTotal = Math.round((totalIncome - totalExpense) * 100) / 100;

  // Inicializar documento jsPDF en formato A4 vertical
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  // 1. Cabecera corporativa verde ANSAMA
  doc.setFillColor(9, 43, 25); // #092B19
  doc.rect(0, 0, pageWidth, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('ANSAMA FINANZAS DEL HOGAR', 14, 11);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(167, 243, 208); // emerald-200
  doc.text('INFORME OFICIAL DE EXTRACTO Y MOVIMIENTOS BANCARIOS', 14, 18);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.text(`Fecha de emisión: ${new Date().toLocaleDateString('es-ES')}`, pageWidth - 14, 11, { align: 'right' });
  doc.text(`Hora: ${new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`, pageWidth - 14, 18, { align: 'right' });

  // 2. Metadatos del informe
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Detalles del extracto:', 14, 31);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  const filterDesc = options?.filterLabel ? `Periodo: ${options.filterLabel}` : 'Periodo: Todo el histórico';
  const bankDesc = options?.bankLabel ? `Entidad: ${options.bankLabel}` : 'Entidad: Todas las entidades y bancos';
  doc.text(`${filterDesc}   |   ${bankDesc}   |   Registros: ${sortedTxs.length}`, 14, 36);

  // 3. Tarjetas resumen de KPIs contables
  const kpiY = 40;
  const kpiWidth = (pageWidth - 28 - 8) / 3;

  // KPI Ingresos
  doc.setFillColor(240, 253, 244); // emerald-50
  doc.setDrawColor(187, 247, 208); // emerald-200
  doc.roundedRect(14, kpiY, kpiWidth, 13, 2, 2, 'FD');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(22, 101, 52); // emerald-800
  doc.text('TOTAL INGRESOS', 17, kpiY + 4.5);
  doc.setFontSize(10);
  doc.text(`+${totalIncome.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`, 17, kpiY + 10.5);

  // KPI Gastos
  const kpi2X = 14 + kpiWidth + 4;
  doc.setFillColor(255, 241, 242); // rose-50
  doc.setDrawColor(254, 205, 211); // rose-200
  doc.roundedRect(kpi2X, kpiY, kpiWidth, 13, 2, 2, 'FD');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(190, 18, 60); // rose-700
  doc.text('TOTAL GASTOS', kpi2X + 3, kpiY + 4.5);
  doc.setFontSize(10);
  doc.text(`-${totalExpense.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`, kpi2X + 3, kpiY + 10.5);

  // KPI Balance Neto
  const kpi3X = kpi2X + kpiWidth + 4;
  const isNetPositive = netTotal >= 0;
  doc.setFillColor(isNetPositive ? 236 : 255, isNetPositive ? 253 : 241, isNetPositive ? 245 : 242);
  doc.setDrawColor(isNetPositive ? 167 : 254, isNetPositive ? 243 : 205, isNetPositive ? 208 : 211);
  doc.roundedRect(kpi3X, kpiY, kpiWidth, 13, 2, 2, 'FD');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(isNetPositive ? 14 : 190, isNetPositive ? 106 : 18, isNetPositive ? 59 : 60);
  doc.text(isNetPositive ? 'SUPERÁVIT NETO' : 'DÉFICIT NETO', kpi3X + 3, kpiY + 4.5);
  doc.setFontSize(10);
  const netPrefix = netTotal > 0 ? '+' : '';
  doc.text(`${netPrefix}${netTotal.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`, kpi3X + 3, kpiY + 10.5);

  // 4. Tabla con autoTable
  autoTable(doc, {
    startY: 57,
    head: [['Fecha', 'Cuenta / Banco', 'Concepto', 'Categoría', 'Importe']],
    body: tableBody.map((r) => [r[0], r[1], r[2], r[3], r[4]]),
    theme: 'striped',
    headStyles: {
      fillColor: [9, 43, 25],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'left'
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 2,
      overflow: 'linebreak',
      valign: 'middle'
    },
    columnStyles: {
      0: { cellWidth: 20 }, // Fecha
      1: { cellWidth: 40 }, // Cuenta
      2: { cellWidth: 62 }, // Concepto
      3: { cellWidth: 32 }, // Categoría
      4: { cellWidth: 28, halign: 'right', fontStyle: 'bold' } // Importe
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252] // zinc-50
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 4) {
        const rawRow = tableBody[data.row.index];
        const isInc = rawRow && rawRow[5] === 'income';
        data.cell.styles.textColor = isInc ? [14, 106, 59] : [225, 29, 72];
      }
    },
    didDrawPage: (data) => {
      // Pie de página en todas las páginas
      const pageCount = (doc.internal as unknown as { getNumberOfPages: () => number }).getNumberOfPages();
      const currentPage = (doc.internal as unknown as { getCurrentPageInfo: () => { pageNumber: number } }).getCurrentPageInfo().pageNumber;
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text('ANSAMA Finanzas del Hogar · Documento Confidencial y Privado', 14, doc.internal.pageSize.getHeight() - 8);
      doc.text(`Página ${currentPage} de ${pageCount}`, pageWidth - 14, doc.internal.pageSize.getHeight() - 8, { align: 'right' });
    },
    margin: { top: 26, left: 14, right: 14, bottom: 12 }
  });

  // Generar nombre de archivo
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = `${String(now.getHours()).padStart(2, '0')}h${String(now.getMinutes()).padStart(2, '0')}m`;

  let sanitizedFilter = (options?.filterLabel || '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/__+/g, '_')
    .substring(0, 30);

  let prefix = options?.customFilename || 'ANSAMA_Movimientos';
  if (sanitizedFilter) {
    prefix += `_${sanitizedFilter}`;
  }

  const finalFilename = `${prefix}_${dateStr}_${timeStr}.pdf`;

  doc.save(finalFilename);

  return { filename: finalFilename, count: sortedTxs.length };
}
