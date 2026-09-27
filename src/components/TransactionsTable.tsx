import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Search, 
  Trash2, 
  Sparkles, 
  RotateCcw, 
  Plus, 
  FileSpreadsheet,
  ArrowRightLeft,
  AlertTriangle,
  CheckSquare,
  Square,
  CheckCircle2,
  X,
  Calendar,
  CalendarRange,
  Download,
  ChevronDown,
  FileText,
  Check
} from 'lucide-react';
import { Transaction, BankAccount, TransactionCategory } from '../types';
import { formatCurrency, formatDate, formatMonthName } from '../utils/storage';
import { exportTransactionsToSpreadsheet, exportTransactionsToPdf } from '../utils/exportTransactions';

export type PeriodFilterMode = 'all' | 'single' | 'range' | 'multi' | 'custom-dates';

export interface PeriodFilterState {
  mode: PeriodFilterMode;
  singleValue: string; // 'all' | 'year-2025' | '2025-02'
  rangeStart: string;  // '2025-02'
  rangeEnd: string;    // '2025-03'
  selectedMonths: string[]; // e.g. ['2025-02', '2025-03']
  startDate: string;   // 'YYYY-MM-DD'
  endDate: string;     // 'YYYY-MM-DD'
}

interface TransactionsTableProps {
  transactions: Transaction[];
  accounts: BankAccount[];
  categories: TransactionCategory[];
  onDeleteTransaction: (id: string) => void;
  onOpenNewTransactionModal: () => void;
  onOpenImportModal?: () => void;
  onMoveTransactions?: (transactionIds: string[], targetAccountId: string, adjustBalances: boolean) => void;
  onBatchDeleteTransactions?: (transactionIds: string[], revertBalances: boolean) => void;
}

export const TransactionsTable: React.FC<TransactionsTableProps> = ({
  transactions,
  accounts,
  categories,
  onDeleteTransaction,
  onOpenNewTransactionModal,
  onOpenImportModal,
  onMoveTransactions,
  onBatchDeleteTransactions
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  
  // Estado flexible del filtro de Periodo (Rango, Multiselección, Mes o Año Único)
  const [periodFilter, setPeriodFilter] = useState<PeriodFilterState>({
    mode: 'all',
    singleValue: 'all',
    rangeStart: '2025-02',
    rangeEnd: '2025-03',
    selectedMonths: [],
    startDate: '',
    endDate: ''
  });
  const [isPeriodMenuOpen, setIsPeriodMenuOpen] = useState(false);
  const [periodActiveTab, setPeriodActiveTab] = useState<'range' | 'multi' | 'single' | 'dates'>('range');
  const [tempRangeStart, setTempRangeStart] = useState('2025-02');
  const [tempRangeEnd, setTempRangeEnd] = useState('2025-03');
  const [tempSelectedMonths, setTempSelectedMonths] = useState<string[]>([]);
  const [tempStartDate, setTempStartDate] = useState('');
  const [tempEndDate, setTempEndDate] = useState('');
  const periodMenuRef = useRef<HTMLDivElement>(null);

  const [filterBank, setFilterBank] = useState<string>('all');
  const [filterType, setFilterType] = useState<'all' | 'expense' | 'income'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // Selección múltiple para traslados o borrado por lotes
  const [selectedTxIds, setSelectedTxIds] = useState<Set<string>>(new Set());
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [targetAccountIdForMove, setTargetAccountIdForMove] = useState<string>('');
  const [adjustBalancesOnMove, setAdjustBalancesOnMove] = useState(true);

  // Estado de descarga / exportación de movimientos
  const [isDownloadMenuOpen, setIsDownloadMenuOpen] = useState(false);
  const [downloadToast, setDownloadToast] = useState<string | null>(null);
  const downloadMenuRef = useRef<HTMLDivElement>(null);

  // Cerrar menús al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (downloadMenuRef.current && !downloadMenuRef.current.contains(event.target as Node)) {
        setIsDownloadMenuOpen(false);
      }
      if (periodMenuRef.current && !periodMenuRef.current.contains(event.target as Node)) {
        setIsPeriodMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const accountMap = useMemo(() => {
    const map = new Map<string, BankAccount>();
    accounts.forEach((a) => map.set(a.id, a));
    return map;
  }, [accounts]);

  // Lista única de bancos disponibles
  const availableBanks = useMemo(() => {
    const bankSet = new Map<string, string>();
    accounts.forEach((acc) => {
      if (!bankSet.has(acc.bankId)) {
        bankSet.set(acc.bankId, acc.bankName);
      }
    });
    return Array.from(bankSet.entries()).map(([id, name]) => ({ id, name }));
  }, [accounts]);

  // Lista ordenada de periodos disponibles (Años completos y Meses específicos)
  const availablePeriods = useMemo(() => {
    const monthSet = new Set<string>();
    const yearSet = new Set<string>();
    transactions.forEach((tx) => {
      if (tx.date && tx.date.length >= 7) {
        monthSet.add(tx.date.substring(0, 7));
        yearSet.add(tx.date.substring(0, 4));
      }
    });
    return {
      months: Array.from(monthSet).sort().reverse(),
      years: Array.from(yearSet).sort().reverse()
    };
  }, [transactions]);

  // Lista de todos los meses seleccionables (año actual, anterior, siguiente y con movimientos)
  const selectableMonthsList = useMemo(() => {
    const yearsSet = new Set<number>();
    const currentYear = new Date().getFullYear();
    yearsSet.add(currentYear);
    yearsSet.add(currentYear - 1);
    yearsSet.add(currentYear + 1);
    transactions.forEach((tx) => {
      if (tx.date && tx.date.length >= 4) {
        const y = parseInt(tx.date.substring(0, 4), 10);
        if (!isNaN(y)) yearsSet.add(y);
      }
    });

    const sortedYears = Array.from(yearsSet).sort((a, b) => b - a);
    const months: { value: string; label: string; year: number; monthNum: number; shortName: string }[] = [];
    const monthNamesShort = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

    sortedYears.forEach((y) => {
      for (let m = 12; m >= 1; m--) {
        const mStr = String(m).padStart(2, '0');
        const val = `${y}-${mStr}`;
        months.push({
          value: val,
          label: formatMonthName(val),
          year: y,
          monthNum: m,
          shortName: monthNamesShort[m - 1]
        });
      }
    });

    return months;
  }, [transactions]);

  // Meses agrupados por año para multiselección rápida
  const monthsByYear = useMemo(() => {
    const map = new Map<number, typeof selectableMonthsList>();
    selectableMonthsList.forEach((m) => {
      if (!map.has(m.year)) {
        map.set(m.year, []);
      }
      map.get(m.year)!.push(m);
    });
    map.forEach((list) => {
      list.sort((a, b) => a.monthNum - b.monthNum);
    });
    return Array.from(map.entries()).sort((a, b) => b[0] - a[0]);
  }, [selectableMonthsList]);

  // Etiqueta legible del periodo actualmente seleccionado
  const periodLabel = useMemo(() => {
    if (periodFilter.mode === 'all') {
      return 'Todos los Meses y Años';
    }
    if (periodFilter.mode === 'single') {
      if (periodFilter.singleValue === 'all') return 'Todos los Meses y Años';
      if (periodFilter.singleValue.startsWith('year-')) {
        return `Año Completo ${periodFilter.singleValue.replace('year-', '')}`;
      }
      return formatMonthName(periodFilter.singleValue);
    }
    if (periodFilter.mode === 'range') {
      const minM = periodFilter.rangeStart < periodFilter.rangeEnd ? periodFilter.rangeStart : periodFilter.rangeEnd;
      const maxM = periodFilter.rangeStart > periodFilter.rangeEnd ? periodFilter.rangeStart : periodFilter.rangeEnd;
      if (minM === maxM) return formatMonthName(minM);
      return `${formatMonthName(minM)} a ${formatMonthName(maxM)}`;
    }
    if (periodFilter.mode === 'multi') {
      if (periodFilter.selectedMonths.length === 0) return 'Ningún mes seleccionado';
      if (periodFilter.selectedMonths.length === 1) {
        return formatMonthName(periodFilter.selectedMonths[0]);
      }
      if (periodFilter.selectedMonths.length === 2) {
        const sorted = [...periodFilter.selectedMonths].sort();
        return `${formatMonthName(sorted[0])} y ${formatMonthName(sorted[1])}`;
      }
      return `${periodFilter.selectedMonths.length} meses seleccionados`;
    }
    if (periodFilter.mode === 'custom-dates') {
      const s = periodFilter.startDate ? formatDate(periodFilter.startDate) : 'Inicio';
      const e = periodFilter.endDate ? formatDate(periodFilter.endDate) : 'Hoy';
      return `${s} al ${e}`;
    }
    return 'Todos los Meses y Años';
  }, [periodFilter]);

  const categoryMap = useMemo(() => {
    const map = new Map<string, TransactionCategory>();
    categories.forEach((c) => map.set(c.id, c));
    return map;
  }, [categories]);

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // Search query
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        const matchesTitle = tx.title.toLowerCase().includes(query);
        const matchesNote = tx.note?.toLowerCase().includes(query);
        const matchesAmount = tx.amount.toString().includes(query);
        if (!matchesTitle && !matchesNote && !matchesAmount) return false;
      }

      // Filter by Period
      if (periodFilter.mode === 'single') {
        if (periodFilter.singleValue !== 'all') {
          if (periodFilter.singleValue.startsWith('year-')) {
            const y = periodFilter.singleValue.replace('year-', '');
            if (!tx.date.startsWith(y)) return false;
          } else {
            if (!tx.date.startsWith(periodFilter.singleValue)) return false;
          }
        }
      } else if (periodFilter.mode === 'range') {
        const minM = periodFilter.rangeStart < periodFilter.rangeEnd ? periodFilter.rangeStart : periodFilter.rangeEnd;
        const maxM = periodFilter.rangeStart > periodFilter.rangeEnd ? periodFilter.rangeStart : periodFilter.rangeEnd;
        const txMonth = tx.date.substring(0, 7);
        if (txMonth < minM || txMonth > maxM) return false;
      } else if (periodFilter.mode === 'multi') {
        if (periodFilter.selectedMonths.length > 0) {
          const txMonth = tx.date.substring(0, 7);
          if (!periodFilter.selectedMonths.includes(txMonth)) return false;
        }
      } else if (periodFilter.mode === 'custom-dates') {
        if (periodFilter.startDate && tx.date < periodFilter.startDate) return false;
        if (periodFilter.endDate && tx.date > periodFilter.endDate) return false;
      }

      // Filter by type
      if (filterType !== 'all' && tx.type !== filterType) return false;

      // Filter by bank
      if (filterBank !== 'all') {
        const account = accountMap.get(tx.accountId);
        if (!account || account.bankId !== filterBank) return false;
      }

      // Filter by category
      if (filterCategory !== 'all' && tx.categoryId !== filterCategory) return false;

      return true;
    });
  }, [transactions, searchQuery, periodFilter, filterType, filterBank, filterCategory, accountMap]);

  // Resumen contable de la selección filtrada
  const filteredStats = useMemo(() => {
    const inc = filteredTransactions
      .filter((t) => t.type === 'income')
      .reduce((s, t) => s + t.amount, 0);
    const exp = filteredTransactions
      .filter((t) => t.type === 'expense')
      .reduce((s, t) => s + t.amount, 0);
    return {
      income: Math.round(inc * 100) / 100,
      expense: Math.round(exp * 100) / 100,
      net: Math.round((inc - exp) * 100) / 100,
      incomeCount: filteredTransactions.filter((t) => t.type === 'income').length,
      expenseCount: filteredTransactions.filter((t) => t.type === 'expense').length
    };
  }, [filteredTransactions]);

  const hasActiveFilters = searchQuery !== '' || periodFilter.mode !== 'all' || filterBank !== 'all' || filterType !== 'all' || filterCategory !== 'all';

  const resetFilters = () => {
    setSearchQuery('');
    setPeriodFilter({
      mode: 'all',
      singleValue: 'all',
      rangeStart: '2025-02',
      rangeEnd: '2025-03',
      selectedMonths: [],
      startDate: '',
      endDate: ''
    });
    setFilterBank('all');
    setFilterType('all');
    setFilterCategory('all');
  };

  // Manejadores para abrir y aplicar periodos
  const handleOpenPeriodMenu = () => {
    setTempRangeStart(periodFilter.rangeStart || '2025-02');
    setTempRangeEnd(periodFilter.rangeEnd || '2025-03');
    setTempSelectedMonths(periodFilter.selectedMonths.length > 0 ? periodFilter.selectedMonths : ['2025-02', '2025-03']);
    setTempStartDate(periodFilter.startDate || '');
    setTempEndDate(periodFilter.endDate || '');
    if (periodFilter.mode === 'range') setPeriodActiveTab('range');
    else if (periodFilter.mode === 'multi') setPeriodActiveTab('multi');
    else if (periodFilter.mode === 'custom-dates') setPeriodActiveTab('dates');
    else setPeriodActiveTab('range');
    setIsPeriodMenuOpen(true);
  };

  const handleApplyRange = (start?: string, end?: string) => {
    const s = start || tempRangeStart;
    const e = end || tempRangeEnd;
    const minM = s < e ? s : e;
    const maxM = s > e ? s : e;
    setPeriodFilter({
      mode: 'range',
      singleValue: 'all',
      rangeStart: minM,
      rangeEnd: maxM,
      selectedMonths: [],
      startDate: '',
      endDate: ''
    });
    setIsPeriodMenuOpen(false);
  };

  const handleApplyMulti = (months?: string[]) => {
    const mList = months || tempSelectedMonths;
    if (mList.length === 0) {
      setPeriodFilter({
        mode: 'all',
        singleValue: 'all',
        rangeStart: '2025-02',
        rangeEnd: '2025-03',
        selectedMonths: [],
        startDate: '',
        endDate: ''
      });
    } else {
      setPeriodFilter({
        mode: 'multi',
        singleValue: 'all',
        rangeStart: '2025-02',
        rangeEnd: '2025-03',
        selectedMonths: [...mList].sort(),
        startDate: '',
        endDate: ''
      });
    }
    setIsPeriodMenuOpen(false);
  };

  const handleToggleMonthInMulti = (monthVal: string) => {
    setTempSelectedMonths((prev) => {
      if (prev.includes(monthVal)) {
        return prev.filter((m) => m !== monthVal);
      } else {
        return [...prev, monthVal];
      }
    });
  };

  const handleApplySingle = (val: string) => {
    if (val === 'all') {
      setPeriodFilter({
        mode: 'all',
        singleValue: 'all',
        rangeStart: '2025-02',
        rangeEnd: '2025-03',
        selectedMonths: [],
        startDate: '',
        endDate: ''
      });
    } else {
      setPeriodFilter({
        mode: 'single',
        singleValue: val,
        rangeStart: '2025-02',
        rangeEnd: '2025-03',
        selectedMonths: [],
        startDate: '',
        endDate: ''
      });
    }
    setIsPeriodMenuOpen(false);
  };

  const handleApplyCustomDates = () => {
    setPeriodFilter({
      mode: 'custom-dates',
      singleValue: 'all',
      rangeStart: '2025-02',
      rangeEnd: '2025-03',
      selectedMonths: [],
      startDate: tempStartDate,
      endDate: tempEndDate
    });
    setIsPeriodMenuOpen(false);
  };

  const handleResetPeriodToAll = () => {
    setPeriodFilter({
      mode: 'all',
      singleValue: 'all',
      rangeStart: '2025-02',
      rangeEnd: '2025-03',
      selectedMonths: [],
      startDate: '',
      endDate: ''
    });
    setIsPeriodMenuOpen(false);
  };

  // Manejadores de selección
  const toggleSelectTx = (id: string) => {
    setSelectedTxIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const isAllFilteredSelected = filteredTransactions.length > 0 && filteredTransactions.every((tx) => selectedTxIds.has(tx.id));

  const toggleSelectAllFiltered = () => {
    if (isAllFilteredSelected) {
      setSelectedTxIds((prev) => {
        const next = new Set(prev);
        filteredTransactions.forEach((tx) => next.delete(tx.id));
        return next;
      });
    } else {
      setSelectedTxIds((prev) => {
        const next = new Set(prev);
        filteredTransactions.forEach((tx) => next.add(tx.id));
        return next;
      });
    }
  };

  const handleOpenMoveModal = () => {
    if (selectedTxIds.size === 0) return;
    // Seleccionar por defecto la primera cuenta distinta
    const firstSelected = transactions.find((t) => selectedTxIds.has(t.id));
    const altAccount = accounts.find((a) => a.id !== firstSelected?.accountId);
    setTargetAccountIdForMove(altAccount ? altAccount.id : (accounts[0]?.id || ''));
    setIsMoveModalOpen(true);
  };

  const handleConfirmMove = () => {
    if (!onMoveTransactions || !targetAccountIdForMove || selectedTxIds.size === 0) return;
    onMoveTransactions(Array.from(selectedTxIds), targetAccountIdForMove, adjustBalancesOnMove);
    setSelectedTxIds(new Set());
    setIsMoveModalOpen(false);
  };

  const handleBatchDelete = () => {
    if (!onBatchDeleteTransactions || selectedTxIds.size === 0) return;
    if (confirm(`¿Estás seguro de que deseas eliminar ${selectedTxIds.size} movimiento(s) seleccionados? Se restaurarán los saldos en las cuentas.`)) {
      onBatchDeleteTransactions(Array.from(selectedTxIds), true);
      setSelectedTxIds(new Set());
    }
  };

  // Descarga de movimientos en PDF, Excel o CSV
  const handleExportPdfFiltered = () => {
    const filterLabel = periodFilter.mode !== 'all' ? periodLabel : 'Todos los periodos';
    const bankObj = accounts.find((a) => a.bankId === filterBank);
    const bankName = filterBank !== 'all' ? (bankObj?.bankName || filterBank) : undefined;
    const sanitizedPeriod = periodFilter.mode !== 'all' 
      ? `_${periodLabel.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 30)}` 
      : '';

    const { filename, count } = exportTransactionsToPdf(
      filteredTransactions,
      accounts,
      categories,
      {
        filterLabel,
        bankLabel: bankName,
        customFilename: filterBank !== 'all' ? `ANSAMA_${bankName}_Extracto${sanitizedPeriod}` : `ANSAMA_Extracto${sanitizedPeriod}`
      }
    );

    setIsDownloadMenuOpen(false);
    setDownloadToast(`Generado extracto PDF con ${count} movimiento(s): ${filename}`);
    setTimeout(() => setDownloadToast(null), 5000);
  };

  const handleExportPdfAll = () => {
    const { filename, count } = exportTransactionsToPdf(
      transactions,
      accounts,
      categories,
      {
        filterLabel: 'Historico_Completo',
        customFilename: 'ANSAMA_Extracto_Completo'
      }
    );

    setIsDownloadMenuOpen(false);
    setDownloadToast(`Generado extracto PDF con todos los ${count} movimientos: ${filename}`);
    setTimeout(() => setDownloadToast(null), 5000);
  };

  const handleExportPdfSelected = () => {
    const selectedList = transactions.filter((t) => selectedTxIds.has(t.id));
    if (selectedList.length === 0) return;

    const { filename, count } = exportTransactionsToPdf(
      selectedList,
      accounts,
      categories,
      {
        filterLabel: 'Seleccionados',
        customFilename: 'ANSAMA_Extracto_Seleccionados'
      }
    );

    setDownloadToast(`Generado extracto PDF con ${count} movimiento(s) seleccionados: ${filename}`);
    setTimeout(() => setDownloadToast(null), 5000);
  };

  const handleExportFiltered = (format: 'xlsx' | 'csv') => {
    const filterLabel = periodFilter.mode !== 'all' ? periodLabel : 'Todos los periodos';
    const bankObj = accounts.find((a) => a.bankId === filterBank);
    const bankName = filterBank !== 'all' ? (bankObj?.bankName || filterBank) : undefined;
    const sanitizedPeriod = periodFilter.mode !== 'all' 
      ? `_${periodLabel.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 30)}` 
      : '';

    const { filename, count } = exportTransactionsToSpreadsheet(
      filteredTransactions,
      accounts,
      categories,
      format,
      {
        filterLabel,
        bankLabel: bankName,
        customFilename: filterBank !== 'all' ? `ANSAMA_${bankName}_Movimientos${sanitizedPeriod}` : `ANSAMA_Movimientos${sanitizedPeriod}`
      }
    );

    setIsDownloadMenuOpen(false);
    setDownloadToast(`Descargados ${count} movimiento(s) en ${filename}`);
    setTimeout(() => setDownloadToast(null), 5000);
  };

  const handleExportAll = (format: 'xlsx' | 'csv') => {
    const { filename, count } = exportTransactionsToSpreadsheet(
      transactions,
      accounts,
      categories,
      format,
      {
        filterLabel: 'Historico_Completo',
        customFilename: 'ANSAMA_Historico_Completo'
      }
    );

    setIsDownloadMenuOpen(false);
    setDownloadToast(`Descargados ${count} movimientos en ${filename}`);
    setTimeout(() => setDownloadToast(null), 5000);
  };

  const handleExportSelected = (format: 'xlsx' | 'csv') => {
    const selectedList = transactions.filter((t) => selectedTxIds.has(t.id));
    if (selectedList.length === 0) return;

    const { filename, count } = exportTransactionsToSpreadsheet(
      selectedList,
      accounts,
      categories,
      format,
      {
        filterLabel: 'Seleccionados',
        customFilename: 'ANSAMA_Movimientos_Seleccionados'
      }
    );

    setDownloadToast(`Descargados ${count} movimiento(s) seleccionados en ${filename}`);
    setTimeout(() => setDownloadToast(null), 5000);
  };

  return (
    <div id="section-transactions" className="bg-white rounded-2xl border-2 border-emerald-600/35 shadow-sm ring-1 ring-emerald-950/5 p-5 sm:p-6 space-y-4">
      
      {/* Title & Action Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-emerald-100/90">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base sm:text-lg font-black text-zinc-950">Historial Consolidado de Movimientos</h3>
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-[#0E6A3B] border border-emerald-200">
              {filteredTransactions.length} registros
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">
            Extracto de cuentas bancarias y operaciones registradas
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {onOpenImportModal && (
            <button
              id="btn-import-statement"
              onClick={onOpenImportModal}
              title="Importar extracto en Excel (.xlsx) o CSV descargado de tu banco"
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-emerald-950 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-xl transition-all cursor-pointer shadow-2xs active:scale-95"
            >
              <FileSpreadsheet className="w-4 h-4 text-[#0E6A3B]" />
              Importar Extracto (Excel/CSV)
            </button>
          )}

          {/* Botón Descargar Movimientos con menú desplegable */}
          <div className="relative" ref={downloadMenuRef}>
            <button
              id="btn-download-transactions"
              type="button"
              onClick={() => setIsDownloadMenuOpen(!isDownloadMenuOpen)}
              title="Descargar y exportar movimientos en Excel (.xlsx) o CSV"
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-emerald-950 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-xl transition-all cursor-pointer shadow-2xs active:scale-95"
            >
              <Download className="w-4 h-4 text-[#0E6A3B]" />
              <span>Descargar</span>
              <ChevronDown className={`w-3.5 h-3.5 text-zinc-500 transition-transform ${isDownloadMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {isDownloadMenuOpen && (
              <div 
                className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border-2 border-emerald-600/30 p-2 z-50 animate-in fade-in zoom-in-95 space-y-2"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-3 py-1.5 border-b border-zinc-100">
                  <span className="text-[11px] font-black text-zinc-900 uppercase tracking-wide block">
                    Descargar Movimientos
                  </span>
                  <span className="text-[10px] text-zinc-500 block">
                    {filteredTransactions.length} registros en pantalla · {transactions.length} en total
                  </span>
                </div>

                {/* Opción 1: Documento PDF (.pdf) */}
                <div className="space-y-1">
                  <div className="px-2 pt-1 text-[10px] font-extrabold text-rose-700 uppercase flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5" />
                    <span>Documento Oficial PDF (.pdf)</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleExportPdfFiltered}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-zinc-800 hover:bg-rose-50 hover:text-rose-950 transition-colors flex items-center justify-between cursor-pointer"
                  >
                    <div>
                      <span className="font-bold block">Descargar vista filtrada en PDF</span>
                      <span className="text-[10px] text-zinc-500">{filteredTransactions.length} movimiento(s) mostrados</span>
                    </div>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-800">.pdf</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportPdfAll}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-zinc-800 hover:bg-rose-50 hover:text-rose-950 transition-colors flex items-center justify-between cursor-pointer"
                  >
                    <div>
                      <span className="font-bold block">Descargar TODO el histórico en PDF</span>
                      <span className="text-[10px] text-zinc-500">Todos los {transactions.length} movimientos</span>
                    </div>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-800">.pdf</span>
                  </button>
                </div>

                {/* Opción 2: Excel (.xlsx) */}
                <div className="space-y-1 pt-1 border-t border-zinc-100">
                  <div className="px-2 pt-1 text-[10px] font-extrabold text-emerald-800 uppercase flex items-center gap-1">
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Formato Excel (.xlsx)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleExportFiltered('xlsx')}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-zinc-800 hover:bg-emerald-50 hover:text-emerald-950 transition-colors flex items-center justify-between cursor-pointer"
                  >
                    <div>
                      <span className="font-bold block">Descargar vista filtrada</span>
                      <span className="text-[10px] text-zinc-500">{filteredTransactions.length} movimiento(s) mostrados</span>
                    </div>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">.xlsx</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleExportAll('xlsx')}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-zinc-800 hover:bg-emerald-50 hover:text-emerald-950 transition-colors flex items-center justify-between cursor-pointer"
                  >
                    <div>
                      <span className="font-bold block">Descargar TODO el histórico</span>
                      <span className="text-[10px] text-zinc-500">Todos los {transactions.length} movimientos</span>
                    </div>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">.xlsx</span>
                  </button>
                </div>

                {/* Opción 3: CSV (.csv) */}
                <div className="space-y-1 pt-1 border-t border-zinc-100">
                  <div className="px-2 pt-1 text-[10px] font-extrabold text-blue-800 uppercase flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5" />
                    <span>Formato CSV universal (.csv)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleExportFiltered('csv')}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-zinc-800 hover:bg-blue-50 hover:text-blue-950 transition-colors flex items-center justify-between cursor-pointer"
                  >
                    <div>
                      <span className="font-bold block">Vista filtrada en CSV</span>
                      <span className="text-[10px] text-zinc-500">{filteredTransactions.length} movimiento(s)</span>
                    </div>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">.csv</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExportAll('csv')}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-zinc-800 hover:bg-blue-50 hover:text-blue-950 transition-colors flex items-center justify-between cursor-pointer"
                  >
                    <div>
                      <span className="font-bold block">Todo el histórico en CSV</span>
                      <span className="text-[10px] text-zinc-500">{transactions.length} movimiento(s)</span>
                    </div>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">.csv</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            id="btn-add-transaction-table"
            onClick={onOpenNewTransactionModal}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-[#0E6A3B] hover:bg-[#0a522d] rounded-xl transition-all cursor-pointer shadow-2xs active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            Añadir Movimiento
          </button>
        </div>
      </div>

      {/* Toast de confirmación de descarga */}
      {downloadToast && (
        <div className="p-3 bg-emerald-100 border border-emerald-300 text-emerald-950 rounded-xl text-xs font-bold flex items-center justify-between gap-2 animate-in fade-in shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#0E6A3B] shrink-0" />
            <span>{downloadToast}</span>
          </div>
          <button 
            type="button" 
            onClick={() => setDownloadToast(null)}
            className="text-zinc-500 hover:text-zinc-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Barra de acciones en lote si hay selección */}
      {selectedTxIds.size > 0 && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs text-emerald-950 animate-in fade-in">
          <div className="flex items-center gap-2 font-bold">
            <CheckCircle2 className="w-4 h-4 text-[#0E6A3B]" />
            <span>{selectedTxIds.size} movimiento(s) seleccionados</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Descargar seleccionados en PDF, Excel o CSV */}
            <div className="inline-flex rounded-lg border border-emerald-300 bg-white p-0.5 shadow-2xs">
              <button
                type="button"
                onClick={handleExportPdfSelected}
                className="px-2.5 py-1 text-xs font-bold text-rose-800 hover:bg-rose-50 rounded-md transition-all flex items-center gap-1 cursor-pointer"
                title="Descargar movimientos seleccionados en documento PDF (.pdf)"
              >
                <FileText className="w-3.5 h-3.5 text-rose-600" />
                <span>PDF ({selectedTxIds.size})</span>
              </button>
              <button
                type="button"
                onClick={() => handleExportSelected('xlsx')}
                className="px-2.5 py-1 text-xs font-bold text-emerald-900 hover:bg-emerald-50 rounded-md transition-all flex items-center gap-1 cursor-pointer"
                title="Descargar movimientos seleccionados en Excel (.xlsx)"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-[#0E6A3B]" />
                <span>Excel</span>
              </button>
              <button
                type="button"
                onClick={() => handleExportSelected('csv')}
                className="px-2 py-1 text-xs font-bold text-zinc-600 hover:bg-zinc-100 rounded-md transition-all cursor-pointer"
                title="Descargar movimientos seleccionados en CSV (.csv)"
              >
                <span>CSV</span>
              </button>
            </div>

            {onMoveTransactions && (
              <button
                type="button"
                onClick={handleOpenMoveModal}
                className="px-3 py-1.5 bg-[#0E6A3B] hover:bg-[#0a522d] text-white font-bold rounded-lg shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                <span>Mover a otra cuenta...</span>
              </button>
            )}

            {onBatchDeleteTransactions && (
              <button
                type="button"
                onClick={handleBatchDelete}
                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-300 text-rose-800 font-bold rounded-lg shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>Eliminar lote</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setSelectedTxIds(new Set())}
              className="p-1.5 text-zinc-500 hover:text-zinc-800 rounded-lg cursor-pointer"
              title="Cancelar selección"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Filter Controls Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        
        {/* Search input */}
        <div className="relative">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por concepto o notas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-zinc-50 border border-zinc-200 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 transition-all text-zinc-900 placeholder:text-zinc-400 font-medium"
          />
        </div>

        {/* Month & Year Filter: Selector Flexible (Rango, Varios Meses, Mes/Año, Fechas) */}
        <div className="relative" ref={periodMenuRef}>
          <button
            type="button"
            onClick={() => {
              if (!isPeriodMenuOpen) handleOpenPeriodMenu();
              else setIsPeriodMenuOpen(false);
            }}
            className={`w-full px-3 py-2 text-xs rounded-xl border flex items-center justify-between gap-1.5 transition-all cursor-pointer font-bold shadow-2xs ${
              periodFilter.mode !== 'all'
                ? 'bg-emerald-100 border-emerald-400 text-emerald-950 ring-2 ring-emerald-500/20'
                : 'bg-emerald-50/70 border-emerald-300 text-zinc-900 hover:bg-emerald-100/60'
            }`}
            title="Elegir periodo: mes, año, rango de meses o varios meses a la vez"
          >
            <div className="flex items-center gap-1.5 truncate">
              <Calendar className="w-4 h-4 text-[#0E6A3B] shrink-0" />
              <span className="truncate">{periodLabel}</span>
            </div>
            <ChevronDown className={`w-3.5 h-3.5 text-zinc-500 shrink-0 transition-transform ${isPeriodMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Menú Desplegable de Configuración de Periodo */}
          {isPeriodMenuOpen && (
            <div 
              className="absolute left-0 mt-2 w-[340px] sm:w-[480px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border-2 border-emerald-600/35 p-4 z-50 animate-in fade-in zoom-in-95 space-y-3.5"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Cabecera del popover */}
              <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
                <div className="flex items-center gap-1.5">
                  <CalendarRange className="w-4 h-4 text-[#0E6A3B]" />
                  <span className="text-xs font-black text-zinc-900 uppercase tracking-wide">
                    Elegir Periodo de Consulta
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPeriodMenuOpen(false)}
                  className="p-1 text-zinc-400 hover:text-zinc-700 rounded-lg cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Pestañas de modo */}
              <div className="grid grid-cols-4 gap-1 p-1 bg-zinc-100 rounded-xl text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setPeriodActiveTab('range')}
                  className={`py-1.5 px-2 rounded-lg transition-all cursor-pointer text-center ${
                    periodActiveTab === 'range'
                      ? 'bg-white text-[#0E6A3B] shadow-2xs font-black'
                      : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  🎯 Rango
                </button>
                <button
                  type="button"
                  onClick={() => setPeriodActiveTab('multi')}
                  className={`py-1.5 px-2 rounded-lg transition-all cursor-pointer text-center ${
                    periodActiveTab === 'multi'
                      ? 'bg-white text-[#0E6A3B] shadow-2xs font-black'
                      : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  ☑️ Varios
                </button>
                <button
                  type="button"
                  onClick={() => setPeriodActiveTab('single')}
                  className={`py-1.5 px-2 rounded-lg transition-all cursor-pointer text-center ${
                    periodActiveTab === 'single'
                      ? 'bg-white text-[#0E6A3B] shadow-2xs font-black'
                      : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  📆 Mes/Año
                </button>
                <button
                  type="button"
                  onClick={() => setPeriodActiveTab('dates')}
                  className={`py-1.5 px-2 rounded-lg transition-all cursor-pointer text-center ${
                    periodActiveTab === 'dates'
                      ? 'bg-white text-[#0E6A3B] shadow-2xs font-black'
                      : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  📅 Fechas
                </button>
              </div>

              {/* Contenido Pestaña 1: Rango de Meses (Desde - Hasta) */}
              {periodActiveTab === 'range' && (
                <div className="space-y-3">
                  <p className="text-[11px] text-zinc-500">
                    Selecciona el mes de inicio y de fin (ejemplo: <span className="font-bold text-zinc-700">febrero y marzo del 2025</span>):
                  </p>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[10px] font-extrabold uppercase text-zinc-500 mb-1">
                        Desde:
                      </label>
                      <select
                        value={tempRangeStart}
                        onChange={(e) => setTempRangeStart(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs font-bold rounded-xl border border-zinc-300 bg-zinc-50 text-zinc-900 focus:bg-white focus:border-emerald-600"
                      >
                        {selectableMonthsList.map((m) => (
                          <option key={`start-${m.value}`} value={m.value}>
                            {m.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-extrabold uppercase text-zinc-500 mb-1">
                        Hasta:
                      </label>
                      <select
                        value={tempRangeEnd}
                        onChange={(e) => setTempRangeEnd(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs font-bold rounded-xl border border-zinc-300 bg-zinc-50 text-zinc-900 focus:bg-white focus:border-emerald-600"
                      >
                        {selectableMonthsList.map((m) => (
                          <option key={`end-${m.value}`} value={m.value}>
                            {m.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Atajos rápidos frecuentes */}
                  <div>
                    <span className="block text-[10px] font-extrabold uppercase text-zinc-400 mb-1.5">
                      Atajos Rápidos:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleApplyRange('2025-02', '2025-03')}
                        className="px-2 py-1 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-900 border border-emerald-200 hover:bg-emerald-100 cursor-pointer"
                      >
                        ⚡ Feb + Mar 2025
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplyRange('2025-01', '2025-03')}
                        className="px-2 py-1 rounded-lg text-[10px] font-bold bg-zinc-100 text-zinc-800 hover:bg-zinc-200 cursor-pointer"
                      >
                        Q1 2025 (Ene-Mar)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplyRange('2025-04', '2025-06')}
                        className="px-2 py-1 rounded-lg text-[10px] font-bold bg-zinc-100 text-zinc-800 hover:bg-zinc-200 cursor-pointer"
                      >
                        Q2 2025 (Abr-Jun)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplyRange('2025-07', '2025-09')}
                        className="px-2 py-1 rounded-lg text-[10px] font-bold bg-zinc-100 text-zinc-800 hover:bg-zinc-200 cursor-pointer"
                      >
                        Q3 2025 (Jul-Sep)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplyRange('2025-01', '2025-06')}
                        className="px-2 py-1 rounded-lg text-[10px] font-bold bg-zinc-100 text-zinc-800 hover:bg-zinc-200 cursor-pointer"
                      >
                        1º Semestre 2025
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplyRange('2025-07', '2025-12')}
                        className="px-2 py-1 rounded-lg text-[10px] font-bold bg-zinc-100 text-zinc-800 hover:bg-zinc-200 cursor-pointer"
                      >
                        2º Semestre 2025
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleApplyRange()}
                    className="w-full py-2 bg-[#0E6A3B] hover:bg-[#0a522d] text-white text-xs font-black rounded-xl transition-all cursor-pointer shadow-xs active:scale-98 flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>Aplicar Rango</span>
                  </button>
                </div>
              )}

              {/* Contenido Pestaña 2: Varios Meses a la vez (Multiselección) */}
              {periodActiveTab === 'multi' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-zinc-500">
                      Marca los meses que deseas combinar:
                    </span>
                    <span className="font-extrabold text-[#0E6A3B]">
                      {tempSelectedMonths.length} seleccionado(s)
                    </span>
                  </div>

                  <div className="max-h-52 overflow-y-auto space-y-2.5 pr-1 divide-y divide-zinc-100">
                    {monthsByYear.map(([year, months]) => (
                      <div key={`multi-year-${year}`} className="pt-2 first:pt-0">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[11px] font-black text-zinc-900">{year}</span>
                          <div className="flex gap-2 text-[10px]">
                            <button
                              type="button"
                              onClick={() => {
                                const yearMonthVals = months.map((m) => m.value);
                                setTempSelectedMonths((prev) => Array.from(new Set([...prev, ...yearMonthVals])));
                              }}
                              className="text-emerald-700 hover:underline font-bold cursor-pointer"
                            >
                              Marcar todo el año
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const yearMonthVals = new Set(months.map((m) => m.value));
                                setTempSelectedMonths((prev) => prev.filter((v) => !yearMonthVals.has(v)));
                              }}
                              className="text-zinc-400 hover:text-zinc-700 cursor-pointer"
                            >
                              Limpiar
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
                          {months.map((m) => {
                            const isSelected = tempSelectedMonths.includes(m.value);
                            return (
                              <button
                                key={`chip-${m.value}`}
                                type="button"
                                onClick={() => handleToggleMonthInMulti(m.value)}
                                className={`px-2 py-1.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer text-center ${
                                  isSelected
                                    ? 'bg-[#0E6A3B] border-[#0E6A3B] text-white shadow-2xs'
                                    : 'bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100'
                                }`}
                              >
                                {m.shortName}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleApplyMulti()}
                    className="w-full py-2 bg-[#0E6A3B] hover:bg-[#0a522d] text-white text-xs font-black rounded-xl transition-all cursor-pointer shadow-xs active:scale-98 flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>Aplicar Selección ({tempSelectedMonths.length} meses)</span>
                  </button>
                </div>
              )}

              {/* Contenido Pestaña 3: Mes o Año Único */}
              {periodActiveTab === 'single' && (
                <div className="space-y-2">
                  <p className="text-[11px] text-zinc-500">
                    Selecciona un único mes o un año completo:
                  </p>

                  <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
                    <button
                      type="button"
                      onClick={() => handleApplySingle('all')}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-between ${
                        periodFilter.mode === 'all'
                          ? 'bg-emerald-100 text-[#0E6A3B]'
                          : 'text-zinc-800 hover:bg-zinc-50'
                      }`}
                    >
                      <span>📅 Todos los Meses y Años</span>
                      {periodFilter.mode === 'all' && <Check className="w-3.5 h-3.5 text-[#0E6A3B]" />}
                    </button>

                    {availablePeriods.years.length > 0 && (
                      <div className="pt-1.5 pb-0.5">
                        <span className="text-[10px] font-black uppercase text-zinc-400 block px-3">
                          Años Completos
                        </span>
                      </div>
                    )}
                    {availablePeriods.years.map((y) => (
                      <button
                        key={`single-year-${y}`}
                        type="button"
                        onClick={() => handleApplySingle(`year-${y}`)}
                        className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center justify-between ${
                          periodFilter.mode === 'single' && periodFilter.singleValue === `year-${y}`
                            ? 'bg-emerald-100 text-[#0E6A3B] font-bold'
                            : 'text-zinc-700 hover:bg-zinc-50'
                        }`}
                      >
                        <span>Año Completo {y}</span>
                        {periodFilter.mode === 'single' && periodFilter.singleValue === `year-${y}` && (
                          <Check className="w-3.5 h-3.5 text-[#0E6A3B]" />
                        )}
                      </button>
                    ))}

                    <div className="pt-2 pb-0.5">
                      <span className="text-[10px] font-black uppercase text-zinc-400 block px-3">
                        Meses Específicos
                      </span>
                    </div>
                    {availablePeriods.months.map((m) => (
                      <button
                        key={`single-month-${m}`}
                        type="button"
                        onClick={() => handleApplySingle(m)}
                        className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center justify-between ${
                          periodFilter.mode === 'single' && periodFilter.singleValue === m
                            ? 'bg-emerald-100 text-[#0E6A3B] font-bold'
                            : 'text-zinc-700 hover:bg-zinc-50'
                        }`}
                      >
                        <span>{formatMonthName(m)}</span>
                        {periodFilter.mode === 'single' && periodFilter.singleValue === m && (
                          <Check className="w-3.5 h-3.5 text-[#0E6A3B]" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Contenido Pestaña 4: Por Fechas Exactas */}
              {periodActiveTab === 'dates' && (
                <div className="space-y-3">
                  <p className="text-[11px] text-zinc-500">
                    Introduce un rango de fechas exactas (día, mes y año):
                  </p>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[10px] font-extrabold uppercase text-zinc-500 mb-1">
                        Desde:
                      </label>
                      <input
                        type="date"
                        value={tempStartDate}
                        onChange={(e) => setTempStartDate(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs font-bold rounded-xl border border-zinc-300 bg-zinc-50 text-zinc-900 focus:bg-white focus:border-emerald-600"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-extrabold uppercase text-zinc-500 mb-1">
                        Hasta:
                      </label>
                      <input
                        type="date"
                        value={tempEndDate}
                        onChange={(e) => setTempEndDate(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs font-bold rounded-xl border border-zinc-300 bg-zinc-50 text-zinc-900 focus:bg-white focus:border-emerald-600"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleApplyCustomDates}
                    className="w-full py-2 bg-[#0E6A3B] hover:bg-[#0a522d] text-white text-xs font-black rounded-xl transition-all cursor-pointer shadow-xs active:scale-98 flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>Aplicar Fechas</span>
                  </button>
                </div>
              )}

              {/* Pie con botón de restablecer */}
              {periodFilter.mode !== 'all' && (
                <div className="pt-2 border-t border-zinc-100 flex justify-between items-center text-xs">
                  <span className="text-[11px] text-zinc-500">
                    Filtro activo: <strong className="text-zinc-800">{periodLabel}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={handleResetPeriodToAll}
                    className="text-xs font-bold text-rose-600 hover:text-rose-800 cursor-pointer"
                  >
                    Quitar filtro
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bank Filter */}
        <div>
          <select
            value={filterBank}
            onChange={(e) => setFilterBank(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-50 border border-zinc-200 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 transition-all text-zinc-800 font-semibold cursor-pointer"
          >
            <option value="all">Todos los Bancos</option>
            {availableBanks.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        {/* Type Filter */}
        <div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as 'all' | 'expense' | 'income')}
            className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-50 border border-zinc-200 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 transition-all text-zinc-800 font-semibold cursor-pointer"
          >
            <option value="all">Tipo: Todos los Flujos</option>
            <option value="expense">Solo Gastos</option>
            <option value="income">Solo Ingresos</option>
          </select>
        </div>

        {/* Category Filter */}
        <div>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-50 border border-zinc-200 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 transition-all text-zinc-800 font-semibold cursor-pointer"
          >
            <option value="all">Todas las Categorías</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.type === 'expense' ? 'Gasto' : 'Ingreso'})
              </option>
            ))}
          </select>
        </div>

      </div>

      {hasActiveFilters && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-emerald-50/90 border border-emerald-300 rounded-xl p-3 text-xs text-emerald-950 animate-in fade-in">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-extrabold flex items-center gap-1.5 text-zinc-900">
              <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
              {filteredTransactions.length} movimiento(s)
            </span>
            {periodFilter.mode !== 'all' && (
              <>
                <span className="text-zinc-300">|</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 font-bold text-[11px] border border-emerald-200">
                  <Calendar className="w-3 h-3 text-[#0E6A3B]" />
                  <span>{periodLabel}</span>
                  <button
                    type="button"
                    onClick={handleResetPeriodToAll}
                    className="hover:text-rose-700 ml-0.5 cursor-pointer"
                    title="Quitar filtro de periodo"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              </>
            )}
            <span className="text-zinc-300">|</span>
            <span className="text-emerald-800 font-bold">
              Ingresos: +{formatCurrency(filteredStats.income)} ({filteredStats.incomeCount})
            </span>
            <span className="text-zinc-300">|</span>
            <span className="text-rose-700 font-bold">
              Gastos: -{formatCurrency(filteredStats.expense)} ({filteredStats.expenseCount})
            </span>
            <span className="text-zinc-300">|</span>
            <span className={`font-black ${filteredStats.net >= 0 ? 'text-[#0E6A3B]' : 'text-rose-700'}`}>
              Neto: {filteredStats.net >= 0 ? `+${formatCurrency(filteredStats.net)}` : formatCurrency(filteredStats.net)}
            </span>
          </div>

          <button
            onClick={resetFilters}
            className="inline-flex items-center gap-1 font-bold text-[#0E6A3B] hover:text-emerald-950 cursor-pointer text-xs shrink-0 self-end sm:self-auto"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Restablecer filtros
          </button>
        </div>
      )}

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-zinc-200/80 text-[11px] font-bold text-zinc-500 uppercase tracking-wider bg-zinc-50/50">
              <th className="py-3 px-3 rounded-l-lg w-10 text-center">
                <button
                  type="button"
                  onClick={toggleSelectAllFiltered}
                  className="text-zinc-400 hover:text-zinc-700 cursor-pointer"
                  title={isAllFilteredSelected ? 'Deseleccionar todos' : 'Seleccionar todos los visibles'}
                >
                  {isAllFilteredSelected ? (
                    <CheckSquare className="w-4 h-4 text-[#0E6A3B]" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                </button>
              </th>
              <th className="py-3 px-3">Fecha</th>
              <th className="py-3 px-3.5">Concepto & Detalle</th>
              <th className="py-3 px-3.5">Categoría</th>
              <th className="py-3 px-3.5">Cuenta / Entidad</th>
              <th className="py-3 px-3.5 text-right">Importe</th>
              <th className="py-3 px-3.5 text-center rounded-r-lg w-20">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 text-xs">
            {filteredTransactions.length > 0 ? (
              filteredTransactions.map((tx) => {
                const account = accountMap.get(tx.accountId);
                const category = categoryMap.get(tx.categoryId);
                const isIncome = tx.type === 'income';
                const isSelected = selectedTxIds.has(tx.id);

                return (
                  <tr 
                    key={tx.id} 
                    className={`transition-colors group ${isSelected ? 'bg-emerald-50/60' : 'hover:bg-zinc-50/70'}`}
                  >
                    <td className="py-3.5 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => toggleSelectTx(tx.id)}
                        className="text-zinc-400 hover:text-zinc-700 cursor-pointer"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-[#0E6A3B]" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </td>

                    <td className="py-3.5 px-3 text-zinc-500 whitespace-nowrap font-medium font-feature-settings-tnum">
                      {formatDate(tx.date)}
                    </td>

                    <td className="py-3.5 px-3.5">
                      <div className="font-semibold text-zinc-950 flex items-center gap-2">
                        {tx.title}
                        {tx.isSimulated && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-[#004481] border border-blue-200" title="Sincronizado automáticamente por PSD2">
                            <Sparkles className="w-2.5 h-2.5 text-[#004481]" />
                            PSD2
                          </span>
                        )}
                      </div>
                      {tx.note && (
                        <div className="text-[11px] text-zinc-400 mt-0.5 truncate max-w-xs" title={tx.note}>
                          {tx.note}
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-3.5 whitespace-nowrap">
                      {category ? (
                        <span 
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold"
                          style={{
                            backgroundColor: category.bgLight,
                            color: category.color
                          }}
                        >
                          <span 
                            className="w-1.5 h-1.5 rounded-full" 
                            style={{ backgroundColor: category.color }}
                          />
                          {category.name}
                        </span>
                      ) : (
                        <span className="text-zinc-400">General</span>
                      )}
                    </td>

                    <td className="py-3.5 px-3.5 whitespace-nowrap">
                      {account ? (
                        <span className="inline-flex items-center gap-1.5 font-medium text-zinc-700">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: account.color }}
                          />
                          <span className="font-bold text-[11px] text-zinc-900">{account.bankName}</span>
                          <span className="text-zinc-400 text-[11px]">({account.accountName})</span>
                        </span>
                      ) : (
                        <span className="text-zinc-400">Cuenta general</span>
                      )}
                    </td>

                    <td className="py-3.5 px-3.5 text-right whitespace-nowrap font-bold">
                      <span className={`font-feature-settings-tnum text-sm ${isIncome ? 'text-[#0E6A3B]' : 'text-zinc-950'}`}>
                        {isIncome ? '+' : '-'}{formatCurrency(tx.amount)}
                      </span>
                    </td>

                    <td className="py-3.5 px-3.5 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        {onMoveTransactions && accounts.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTxIds(new Set([tx.id]));
                              const altAccount = accounts.find((a) => a.id !== tx.accountId);
                              setTargetAccountIdForMove(altAccount ? altAccount.id : accounts[0]?.id || '');
                              setIsMoveModalOpen(true);
                            }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 text-zinc-400 hover:text-emerald-700 rounded-lg hover:bg-emerald-50 cursor-pointer"
                            title="Mover movimiento a otra cuenta bancaria"
                          >
                            <ArrowRightLeft className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            if (confirm(`¿Eliminar el movimiento "${tx.title}"?`)) {
                              onDeleteTransaction(tx.id);
                            }
                          }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 text-zinc-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 cursor-pointer"
                          title="Eliminar movimiento"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={7} className="py-12 text-center text-zinc-400">
                  <p className="font-medium text-sm">No se encontraron movimientos con los filtros seleccionados</p>
                  <p className="text-xs text-zinc-400 mt-1">Prueba a restablecer los filtros de búsqueda</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Touch Card View */}
      <div className="md:hidden divide-y divide-zinc-100">
        {filteredTransactions.length > 0 ? (
          filteredTransactions.map((tx) => {
            const account = accountMap.get(tx.accountId);
            const category = categoryMap.get(tx.categoryId);
            const isIncome = tx.type === 'income';
            const isSelected = selectedTxIds.has(tx.id);

            return (
              <div 
                key={tx.id} 
                className={`py-3.5 flex items-start justify-between gap-3 ${isSelected ? 'bg-emerald-50/50 p-2 rounded-xl' : ''}`}
              >
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => toggleSelectTx(tx.id)}
                    className="text-zinc-400 hover:text-zinc-700 cursor-pointer"
                  >
                    {isSelected ? (
                      <CheckSquare className="w-4 h-4 text-[#0E6A3B]" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                    <span className="text-xs text-zinc-400 font-medium font-feature-settings-tnum">
                      {formatDate(tx.date)}
                    </span>
                    {account && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-800 border border-zinc-200/60">
                        {account.bankName}
                      </span>
                    )}
                    {tx.isSimulated && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-[#004481] border border-blue-200">
                        PSD2
                      </span>
                    )}
                  </div>

                  <h4 className="font-bold text-zinc-900 text-sm truncate">
                    {tx.title}
                  </h4>

                  {category && (
                    <div className="mt-1">
                      <span 
                        className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold"
                        style={{
                          backgroundColor: category.bgLight,
                          color: category.color
                        }}
                      >
                        {category.name}
                      </span>
                    </div>
                  )}

                  {tx.note && (
                    <p className="text-[11px] text-zinc-400 mt-1 truncate">
                      {tx.note}
                    </p>
                  )}
                </div>

                <div className="text-right flex flex-col items-end justify-between self-stretch">
                  <span className={`text-base font-extrabold font-feature-settings-tnum ${isIncome ? 'text-[#0E6A3B]' : 'text-zinc-950'}`}>
                    {isIncome ? '+' : '-'}{formatCurrency(tx.amount)}
                  </span>

                  <div className="flex items-center gap-1 mt-2">
                    {onMoveTransactions && accounts.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTxIds(new Set([tx.id]));
                          const altAccount = accounts.find((a) => a.id !== tx.accountId);
                          setTargetAccountIdForMove(altAccount ? altAccount.id : accounts[0]?.id || '');
                          setIsMoveModalOpen(true);
                        }}
                        className="p-1.5 text-zinc-400 hover:text-emerald-700 rounded-lg hover:bg-emerald-50 cursor-pointer"
                        title="Mover a otra cuenta"
                      >
                        <ArrowRightLeft className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => {
                        if (confirm(`¿Eliminar movimiento "${tx.title}"?`)) {
                          onDeleteTransaction(tx.id);
                        }
                      }}
                      className="p-1.5 text-zinc-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 cursor-pointer"
                      title="Eliminar movimiento"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="py-8 text-center text-zinc-400 text-xs font-medium">
            No hay movimientos que coincidan con la búsqueda.
          </div>
        )}
      </div>

      {/* Modal para mover movimientos a otra cuenta bancaria */}
      {isMoveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-zinc-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-[#0E6A3B] flex items-center justify-center">
                  <ArrowRightLeft className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold text-zinc-950">
                    Mover movimientos de cuenta
                  </h3>
                  <p className="text-xs text-zinc-500">
                    {selectedTxIds.size} movimiento(s) seleccionados
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMoveModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">
                  Cuenta bancaria de destino:
                </label>
                <select
                  value={targetAccountIdForMove}
                  onChange={(e) => setTargetAccountIdForMove(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold text-zinc-900 bg-white border border-zinc-300 rounded-xl focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 cursor-pointer"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.bankName} - {acc.accountName} ({formatCurrency(acc.balance)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl">
                <label className="flex items-start gap-2.5 cursor-pointer text-xs text-zinc-700">
                  <input
                    type="checkbox"
                    checked={adjustBalancesOnMove}
                    onChange={(e) => setAdjustBalancesOnMove(e.target.checked)}
                    className="mt-0.5 rounded text-[#0E6A3B] focus:ring-emerald-500"
                  />
                  <div>
                    <span className="font-bold text-zinc-900 block">
                      Ajustar saldos automáticamente
                    </span>
                    <span className="text-[11px] text-zinc-500 leading-snug block mt-0.5">
                      Resta los importes de la cuenta de origen y los suma en la cuenta de destino, actualizando la fecha de saldo al movimiento más reciente.
                    </span>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100">
              <button
                type="button"
                onClick={() => setIsMoveModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmMove}
                className="px-4 py-2 text-xs font-bold bg-[#0E6A3B] hover:bg-[#0a522d] text-white rounded-xl shadow-xs transition-all cursor-pointer"
              >
                Mover y Guardar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
