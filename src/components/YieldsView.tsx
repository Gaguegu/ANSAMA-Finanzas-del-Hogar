import React, { useState, useMemo } from 'react';
import { 
  Coins, 
  Building2, 
  TrendingUp, 
  Filter, 
  Calendar, 
  Plus, 
  Printer, 
  Search, 
  ArrowUpDown, 
  Edit3, 
  Trash2, 
  FileText, 
  Layers,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  PieChart,
  Percent,
  CheckCircle2,
  Clock,
  AlertTriangle,
  CheckSquare,
  Square,
  HelpCircle,
  Globe
} from 'lucide-react';
import { AppState, BankAccount, YieldRecord, YieldType } from '../types';
import { formatCurrency, formatDate } from '../utils/storage';

interface YieldsViewProps {
  appState: AppState;
  onOpenNewYieldModal: () => void;
  onEditYield: (record: YieldRecord) => void;
  onDeleteYield: (id: string) => void;
  onToggleYieldStatus: (id: string) => void;
  onBatchVerifyYields?: (ids?: string[]) => void;
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export function getAccountForYieldRecord(accounts: BankAccount[], accountId: string): BankAccount {
  const acc = accounts.find((a) => a.id === accountId);
  if (acc) return acc;
  const lower = accountId.toLowerCase();
  if (lower.includes('openbank')) {
    const ob = accounts.find(a => a.bankId === 'openbank');
    return ob || {
      id: 'acc-openbank',
      bankId: 'openbank',
      bankName: 'Openbank',
      accountName: 'Imposiciones a Plazo Fijo Openbank',
      accountNumberMasked: 'Openbank •• IPF',
      iban: 'ES76 0073 •••• •••• 1234',
      type: 'savings',
      balance: 0,
      balanceDate: '2025-12-31',
      lastSynced: '2025-12-31T23:59:59Z',
      currency: 'EUR',
      color: '#FD5300',
      textColor: '#ffffff',
      bgLight: '#fff5f0',
      borderColor: '#FD5300'
    };
  }
  if (lower.includes('trade') || lower.includes('tr')) {
    const tr = accounts.find(a => a.bankId === 'traderepublic');
    return tr || {
      id: 'acc-trade-republic',
      bankId: 'traderepublic',
      bankName: 'Trade Republic',
      accountName: 'Trade Republic Broker & Efectivo',
      accountNumberMasked: 'Trade Republic •• Inv',
      iban: 'DE89 •••• •••• 5678',
      type: 'investment',
      balance: 0,
      balanceDate: '2025-12-31',
      lastSynced: '2025-12-31T23:59:59Z',
      currency: 'EUR',
      color: '#111827',
      textColor: '#ffffff',
      bgLight: '#f3f4f6',
      borderColor: '#111827'
    };
  }
  if (lower.includes('bankinter')) {
    const bk = accounts.find(a => a.bankId === 'bankinter');
    return bk || {
      id: 'acc-bankinter',
      bankId: 'bankinter',
      bankName: 'Bankinter',
      accountName: 'Bankinter Depósito IPF',
      accountNumberMasked: 'Bankinter •• IPF',
      iban: 'ES09 0128 •••• •••• 9876',
      type: 'deposit',
      balance: 0,
      balanceDate: '2025-12-31',
      lastSynced: '2025-12-31T23:59:59Z',
      currency: 'EUR',
      color: '#FF6000',
      textColor: '#ffffff',
      bgLight: '#fff7ed',
      borderColor: '#FF6000'
    };
  }
  if (lower.includes('ing')) {
    const ing = accounts.find(a => (a.bankId && a.bankId.toLowerCase().includes('ing')) || (a.bankName && a.bankName.toLowerCase().includes('ing')));
    return ing || {
      id: 'acc-ing',
      bankId: 'ing',
      bankName: 'ING Direct',
      accountName: 'Cuenta Naranja / Nómina ING',
      accountNumberMasked: 'ING •• Ahorro',
      iban: 'ES12 1465 •••• •••• 5566',
      type: 'savings',
      balance: 0,
      balanceDate: '2026-09-20',
      lastSynced: '2026-09-20T23:59:59Z',
      currency: 'EUR',
      color: '#FF6200',
      textColor: '#ffffff',
      bgLight: '#fff7ed',
      borderColor: '#FF6200'
    };
  }
  return {
    id: accountId,
    bankId: 'other',
    bankName: 'Entidad Bancaria',
    accountName: 'Cuenta Valores / IPF',
    accountNumberMasked: '•• ' + accountId.slice(-4),
    iban: '',
    type: 'checking',
    balance: 0,
    balanceDate: '2025-12-31',
    lastSynced: '2025-12-31T23:59:59Z',
    currency: 'EUR',
    color: '#64748b',
    textColor: '#ffffff',
    bgLight: '#f8fafc',
    borderColor: '#64748b'
  };
}

/**
 * Validador robusto para comprobar si un rendimiento pertenece al banco/entidad filtrado
 */
export function isYieldMatchingBank(
  y: YieldRecord,
  bankFilter: string,
  accounts: BankAccount[]
): boolean {
  if (!bankFilter || bankFilter === 'all') return true;
  const acc = getAccountForYieldRecord(accounts, y.accountId);
  const target = bankFilter.toLowerCase().trim();

  const bankName = (acc.bankName || '').toLowerCase().trim();
  const bankId = (acc.bankId || '').toLowerCase().trim();
  const accId = (acc.id || '').toLowerCase().trim();
  const yieldAccId = (y.accountId || '').toLowerCase().trim();
  const accountName = (acc.accountName || '').toLowerCase().trim();

  return (
    bankName === target ||
    bankName.includes(target) ||
    target.includes(bankName) ||
    bankId === target ||
    target.includes(bankId) ||
    accId === target ||
    yieldAccId === target ||
    yieldAccId.includes(target) ||
    accountName.includes(target)
  );
}

export const YieldsView: React.FC<YieldsViewProps> = ({
  appState,
  onOpenNewYieldModal,
  onEditYield,
  onDeleteYield,
  onToggleYieldStatus,
  onBatchVerifyYields
}) => {
  // Filters state
  const [selectedType, setSelectedType] = useState<'all' | 'interest' | 'dividend'>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'needs_review' | 'verified'>('all');
  const [selectedWithholding, setSelectedWithholding] = useState<'all' | 'with_tax' | 'without_tax'>('all');
  const [selectedBankId, setSelectedBankId] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<number>(() => {
    // Current year or latest yield year
    const currentYear = new Date().getFullYear();
    return currentYear;
  });
  const [selectedMonth, setSelectedMonth] = useState<string>('all'); // 'all' or '01'..'12'
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeSubTab, setActiveSubTab] = useState<'matrix' | 'list'>('matrix');

  // Estado para desplegar los apuntes individuales de un mes dentro de la matriz
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());
  // Estado para desplegar los apuntes individuales de un banco/entidad
  const [expandedBanks, setExpandedBanks] = useState<Set<string>>(new Set());

  const toggleMonthExpand = (monthNumStr: string) => {
    setExpandedMonths((prev) => {
      const next = new Set(prev);
      if (next.has(monthNumStr)) {
        next.delete(monthNumStr);
      } else {
        next.add(monthNumStr);
      }
      return next;
    });
  };

  const expandAllMonths = () => {
    const activeMonths = monthlyMatrix.filter((m) => m.count > 0).map((m) => m.monthNumStr);
    setExpandedMonths(new Set(activeMonths));
  };

  const collapseAllMonths = () => {
    setExpandedMonths(new Set());
  };

  const toggleBankExpand = (accountId: string) => {
    setExpandedBanks((prev) => {
      const next = new Set(prev);
      if (next.has(accountId)) {
        next.delete(accountId);
      } else {
        next.add(accountId);
      }
      return next;
    });
  };

  const expandAllBanks = () => {
    const allBankIds = bankBreakdown.map((b) => b.account.id);
    setExpandedBanks(new Set(allBankIds));
  };

  const collapseAllBanks = () => {
    setExpandedBanks(new Set());
  };

  const allYields = appState.yieldRecords || [];

  // Available years from yields: estrictamente desde 2025 en adelante (2025, 2026, 2027, 2028, 2029, 2030)
  const availableYears = useMemo(() => {
    const yearsSet = new Set<number>();
    // Siempre incluir los años del ciclo fiscal de la app (2025) y los ejercicios futuros para poder operar el próximo año
    for (let yr = 2025; yr <= 2030; yr++) {
      yearsSet.add(yr);
    }
    allYields.forEach((y) => {
      const year = parseInt(y.date.split('-')[0], 10);
      if (!isNaN(year) && year >= 2025 && year <= 2030) {
        yearsSet.add(year);
      }
    });
    return Array.from(yearsSet).sort((a, b) => a - b);
  }, [allYields]);

  // Lista deduplicada y normalizada de Bancos / Entidades disponibles
  const availableBanks = useMemo(() => {
    const bankMap = new Map<string, {
      key: string;
      bankName: string;
      color: string;
      totalCount: number;
      yearCount: number;
    }>();

    // 1. Añadir bancos a partir de todos los rendimientos
    allYields.forEach((y) => {
      const acc = getAccountForYieldRecord(appState.accounts, y.accountId);
      const bName = (acc.bankName || 'Otras Entidades').trim();
      const normKey = bName.toLowerCase();
      const yr = parseInt(y.date.split('-')[0], 10);

      const existing = bankMap.get(normKey) || {
        key: normKey,
        bankName: bName,
        color: acc.color || '#0E6A3B',
        totalCount: 0,
        yearCount: 0
      };

      existing.totalCount += 1;
      if (yr === selectedYear) {
        existing.yearCount += 1;
      }
      bankMap.set(normKey, existing);
    });

    // 2. Añadir también cualquier cuenta registrada en la app
    appState.accounts.forEach((acc) => {
      const bName = (acc.bankName || acc.accountName || '').trim();
      if (!bName) return;
      const normKey = bName.toLowerCase();
      if (!bankMap.has(normKey)) {
        bankMap.set(normKey, {
          key: normKey,
          bankName: bName,
          color: acc.color || '#64748b',
          totalCount: 0,
          yearCount: 0
        });
      }
    });

    return Array.from(bankMap.values()).sort((a, b) => {
      if (b.yearCount !== a.yearCount) return b.yearCount - a.yearCount;
      return a.bankName.localeCompare(b.bankName);
    });
  }, [allYields, appState.accounts, selectedYear]);

  // Nombre legible del banco seleccionado para la cabecera y el informe impreso
  const selectedBankName = useMemo(() => {
    if (selectedBankId === 'all') return 'Todas las entidades bancarias';
    const found = availableBanks.find((b) => b.key === selectedBankId);
    if (found) return found.bankName;
    return selectedBankId;
  }, [selectedBankId, availableBanks]);

  // Counts for the currently selected year (for badges and informative filters)
  const yearCounts = useMemo(() => {
    const yearYields = allYields.filter((y) => {
      const yr = parseInt(y.date.split('-')[0], 10);
      if (yr !== selectedYear) return false;
      if (selectedBankId !== 'all') {
        if (!isYieldMatchingBank(y, selectedBankId, appState.accounts)) return false;
      }
      return true;
    });

    const interests = yearYields.filter((y) => y.type === 'interest').length;
    const dividends = yearYields.filter((y) => y.type === 'dividend').length;
    const withTax = yearYields.filter((y) => (y.withholdingTax > 0 || y.taxRatePercent > 0) && !y.noWithholding).length;
    const withoutTax = yearYields.filter((y) => y.withholdingTax === 0 || y.taxRatePercent === 0 || y.noWithholding).length;
    const pendingYear = yearYields.filter((y) => y.status === 'needs_review').length;
    const verifiedYear = yearYields.filter((y) => y.status !== 'needs_review').length;

    return {
      total: yearYields.length,
      interests,
      dividends,
      withTax,
      withoutTax,
      pendingYear,
      verifiedYear,
      yearYields
    };
  }, [allYields, selectedYear, selectedBankId, appState.accounts]);

  // Filtered yields based on all active filters
  const filteredYields = useMemo(() => {
    return allYields.filter((y) => {
      // Filter by Type
      if (selectedType !== 'all' && y.type !== selectedType) {
        return false;
      }

      // Filter by Withholding (con retención vs sin retención)
      if (selectedWithholding === 'with_tax') {
        const hasTax = (y.withholdingTax > 0 || y.taxRatePercent > 0) && !y.noWithholding;
        if (!hasTax) return false;
      } else if (selectedWithholding === 'without_tax') {
        const isZeroTax = y.withholdingTax === 0 || y.taxRatePercent === 0 || !!y.noWithholding;
        if (!isZeroTax) return false;
      }

      // Filter by Bank / Account
      if (selectedBankId !== 'all') {
        if (!isYieldMatchingBank(y, selectedBankId, appState.accounts)) {
          return false;
        }
      }

      // Filter by Year
      const year = parseInt(y.date.split('-')[0], 10);
      if (year !== selectedYear) {
        return false;
      }

      // Filter by Verification Status (check de comprobación)
      if (selectedStatus === 'needs_review' && y.status !== 'needs_review') {
        return false;
      }
      if (selectedStatus === 'verified' && y.status === 'needs_review') {
        return false;
      }

      // Filter by Month
      if (selectedMonth !== 'all') {
        const month = y.date.split('-')[1];
        if (month !== selectedMonth) {
          return false;
        }
      }

      // Filter by Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const acc = getAccountForYieldRecord(appState.accounts, y.accountId);
        const matchTitle = y.title.toLowerCase().includes(term);
        const matchTicker = y.isinOrTicker?.toLowerCase().includes(term);
        const matchBank = acc?.bankName.toLowerCase().includes(term);
        const matchNotes = y.notes?.toLowerCase().includes(term);
        if (!matchTitle && !matchTicker && !matchBank && !matchNotes) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [allYields, selectedType, selectedWithholding, selectedStatus, selectedBankId, selectedYear, selectedMonth, searchTerm, appState.accounts]);

  // Overall pending review stats
  const reviewStats = useMemo(() => {
    const pending = allYields.filter((y) => y.status === 'needs_review');
    const verified = allYields.filter((y) => y.status !== 'needs_review');
    return {
      pendingCount: pending.length,
      verifiedCount: verified.length,
      totalCount: allYields.length,
      pendingIds: pending.map((y) => y.id)
    };
  }, [allYields]);

  // Overall totals for the active filter set
  const totals = useMemo(() => {
    return filteredYields.reduce(
      (acc, item) => {
        acc.gross += item.grossAmount;
        acc.withholding += item.withholdingTax;
        acc.net += item.netAmount;
        if (item.type === 'interest') acc.interestCount += 1;
        if (item.type === 'dividend') acc.dividendCount += 1;
        return acc;
      },
      { gross: 0, withholding: 0, net: 0, interestCount: 0, dividendCount: 0 }
    );
  }, [filteredYields]);

  // Monthly Matrix data for the selected year and bank
  const monthlyMatrix = useMemo(() => {
    return MONTH_NAMES.map((monthName, idx) => {
      const monthNumStr = String(idx + 1).padStart(2, '0');
      
      const monthYields = allYields.filter((y) => {
        const [yYear, yMonth] = y.date.split('-');
        if (parseInt(yYear, 10) !== selectedYear || yMonth !== monthNumStr) return false;
        
        if (selectedBankId !== 'all') {
          if (!isYieldMatchingBank(y, selectedBankId, appState.accounts)) return false;
        }

        // Apply withholding filter
        if (selectedWithholding === 'with_tax') {
          const hasTax = (y.withholdingTax > 0 || y.taxRatePercent > 0) && !y.noWithholding;
          if (!hasTax) return false;
        } else if (selectedWithholding === 'without_tax') {
          const isZeroTax = y.withholdingTax === 0 || y.taxRatePercent === 0 || !!y.noWithholding;
          if (!isZeroTax) return false;
        }

        // Apply status filter
        if (selectedStatus === 'needs_review' && y.status !== 'needs_review') return false;
        if (selectedStatus === 'verified' && y.status === 'needs_review') return false;
        
        return true;
      });

      const interests = monthYields.filter((y) => y.type === 'interest');
      const dividends = monthYields.filter((y) => y.type === 'dividend');

      const rawInterestGross = interests.reduce((sum, y) => sum + y.grossAmount, 0);
      const rawInterestWithholding = interests.reduce((sum, y) => sum + y.withholdingTax, 0);
      const rawInterestNet = interests.reduce((sum, y) => sum + y.netAmount, 0);

      const rawDividendGross = dividends.reduce((sum, y) => sum + y.grossAmount, 0);
      const rawDividendWithholding = dividends.reduce((sum, y) => sum + y.withholdingTax, 0);
      const rawDividendNet = dividends.reduce((sum, y) => sum + y.netAmount, 0);

      // Respetar el tipo seleccionado en los totales
      const includeInterests = selectedType === 'all' || selectedType === 'interest';
      const includeDividends = selectedType === 'all' || selectedType === 'dividend';

      const totalGross = (includeInterests ? rawInterestGross : 0) + (includeDividends ? rawDividendGross : 0);
      const totalWithholding = (includeInterests ? rawInterestWithholding : 0) + (includeDividends ? rawDividendWithholding : 0);
      const totalNet = (includeInterests ? rawInterestNet : 0) + (includeDividends ? rawDividendNet : 0);
      const count = (includeInterests ? interests.length : 0) + (includeDividends ? dividends.length : 0);

      return {
        monthIndex: idx,
        monthName,
        monthNumStr,
        interestGross: rawInterestGross,
        interestWithholding: rawInterestWithholding,
        interestNet: rawInterestNet,
        dividendGross: rawDividendGross,
        dividendWithholding: rawDividendWithholding,
        dividendNet: rawDividendNet,
        totalGross,
        totalWithholding,
        totalNet,
        count
      };
    });
  }, [allYields, selectedYear, selectedBankId, selectedType, selectedWithholding, selectedStatus, appState.accounts]);

  // Obtener los cobros individuales de un mes concreto aplicando los filtros actuales
  const getMonthItems = (monthNumStr: string) => {
    return allYields.filter((y) => {
      const [yYear, yMonth] = y.date.split('-');
      if (parseInt(yYear, 10) !== selectedYear || yMonth !== monthNumStr) return false;
      if (selectedType !== 'all' && y.type !== selectedType) return false;
      if (selectedWithholding === 'with_tax') {
        const hasTax = (y.withholdingTax > 0 || y.taxRatePercent > 0) && !y.noWithholding;
        if (!hasTax) return false;
      } else if (selectedWithholding === 'without_tax') {
        const isZeroTax = y.withholdingTax === 0 || y.taxRatePercent === 0 || !!y.noWithholding;
        if (!isZeroTax) return false;
      }
      if (selectedBankId !== 'all') {
        if (!isYieldMatchingBank(y, selectedBankId, appState.accounts)) return false;
      }
      if (selectedStatus === 'needs_review' && y.status !== 'needs_review') return false;
      if (selectedStatus === 'verified' && y.status === 'needs_review') return false;
      return true;
    }).sort((a, b) => b.date.localeCompare(a.date));
  };

  // Bank summary breakdown for the year
  const bankBreakdown = useMemo(() => {
    const map = new Map<string, {
      account: BankAccount;
      gross: number;
      withholding: number;
      net: number;
      count: number;
    }>();

    allYields.forEach((y) => {
      const year = parseInt(y.date.split('-')[0], 10);
      if (year !== selectedYear) return;
      if (selectedMonth !== 'all' && y.date.split('-')[1] !== selectedMonth) return;
      if (selectedType !== 'all' && y.type !== selectedType) return;

      if (selectedWithholding === 'with_tax') {
        const hasTax = (y.withholdingTax > 0 || y.taxRatePercent > 0) && !y.noWithholding;
        if (!hasTax) return;
      } else if (selectedWithholding === 'without_tax') {
        const isZeroTax = y.withholdingTax === 0 || y.taxRatePercent === 0 || !!y.noWithholding;
        if (!isZeroTax) return;
      }

      if (selectedStatus === 'needs_review' && y.status !== 'needs_review') return;
      if (selectedStatus === 'verified' && y.status === 'needs_review') return;

      if (selectedBankId !== 'all') {
        if (!isYieldMatchingBank(y, selectedBankId, appState.accounts)) return;
      }

      const acc = getAccountForYieldRecord(appState.accounts, y.accountId);

      const existing = map.get(acc.id) || {
        account: acc,
        gross: 0,
        withholding: 0,
        net: 0,
        count: 0
      };

      existing.gross += y.grossAmount;
      existing.withholding += y.withholdingTax;
      existing.net += y.netAmount;
      existing.count += 1;

      map.set(acc.id, existing);
    });

    return Array.from(map.values()).sort((a, b) => b.gross - a.gross);
  }, [allYields, selectedYear, selectedMonth, selectedType, selectedWithholding, selectedStatus, selectedBankId, appState.accounts]);

  // Obtener los cobros individuales de un banco/broker concreto aplicando los filtros actuales
  const getBankItems = (accountId: string) => {
    return allYields.filter((y) => {
      const year = parseInt(y.date.split('-')[0], 10);
      if (year !== selectedYear) return false;
      if (selectedMonth !== 'all' && y.date.split('-')[1] !== selectedMonth) return false;
      if (selectedType !== 'all' && y.type !== selectedType) return false;

      const acc = getAccountForYieldRecord(appState.accounts, y.accountId);
      if (acc.id !== accountId && acc.bankId !== accountId) return false;

      if (selectedWithholding === 'with_tax') {
        const hasTax = (y.withholdingTax > 0 || y.taxRatePercent > 0) && !y.noWithholding;
        if (!hasTax) return false;
      } else if (selectedWithholding === 'without_tax') {
        const isZeroTax = y.withholdingTax === 0 || y.taxRatePercent === 0 || !!y.noWithholding;
        if (!isZeroTax) return false;
      }
      if (selectedStatus === 'needs_review' && y.status !== 'needs_review') return false;
      if (selectedStatus === 'verified' && y.status === 'needs_review') return false;
      return true;
    }).sort((a, b) => b.date.localeCompare(a.date));
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div id="section-yields" className="space-y-6 animate-in fade-in duration-200">
      
      {/* Global Print Style for clean fiscal reporting without clipping */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm 8mm 12mm 8mm;
          }
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            background: #ffffff !important;
          }
          header, #app-header, #mobile-nav, nav, aside, .no-print, .screen-only, .filter-controls, button, select, input, textarea, [class*="print:hidden"], [class*="screen-only"], [class*="no-print"], [class*="filter-controls"] {
            display: none !important;
            visibility: hidden !important;
            height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
          }
          .overflow-x-auto, .overflow-hidden, .overflow-y-auto {
            overflow: visible !important;
          }
          .print-table {
            width: 100% !important;
            table-layout: auto !important;
            border-collapse: collapse !important;
            font-size: 9.5px !important;
          }
          .print-table th, .print-table td {
            overflow: visible !important;
            white-space: normal !important;
            word-break: break-word !important;
            padding: 5px 4px !important;
          }
          tr {
            page-break-inside: avoid !important;
          }
          thead {
            display: table-header-group !important;
          }
          tfoot {
            display: table-footer-group !important;
          }
        }
      `}</style>

      {/* ========================================================================= */}
      {/* SECCIÓN EXCLUSIVA DE IMPRESIÓN (Visible ÚNICAMENTE al imprimir)          */}
      {/* Formato fiscal A4 limpio, sin botones, sin cortes horizontales ni scrolls */}
      {/* ========================================================================= */}
      <div className="print-only print-report mb-6 w-full" data-print="only">
        {/* Cabecera Corporativa Fiscal */}
        <div className="border-b-2 border-zinc-950 pb-3 mb-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                ANSAMA • Finanzas del Hogar
              </div>
              <h1 className="text-xl font-black text-zinc-950 uppercase tracking-tight mt-0.5">
                Informe Fiscal de Rendimientos del Capital Mobiliario
              </h1>
              <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-zinc-700">
                <span className="font-bold">Ejercicio Fiscal: <strong className="text-zinc-950">{selectedYear}</strong></span>
                <span>•</span>
                <span className="font-bold">Entidad: <strong className="text-zinc-950">{selectedBankName}</strong></span>
                <span>•</span>
                <span>Tipo: <strong>{selectedType === 'all' ? 'Intereses y Dividendos' : selectedType === 'interest' ? 'Solo Intereses' : 'Solo Dividendos'}</strong></span>
                {selectedWithholding === 'with_tax' && (
                  <>
                    <span>•</span>
                    <span className="font-semibold text-zinc-800">Con retención (IRPF)</span>
                  </>
                )}
                {selectedWithholding === 'without_tax' && (
                  <>
                    <span>•</span>
                    <span className="font-semibold text-amber-900">Sin retención en origen (IBAN DE)</span>
                  </>
                )}
                {selectedMonth !== 'all' && (
                  <>
                    <span>•</span>
                    <span>Mes: <strong>{MONTH_NAMES[parseInt(selectedMonth, 10) - 1]}</strong></span>
                  </>
                )}
              </div>
            </div>
            <div className="text-right text-[11px] text-zinc-600">
              <div>Fecha de emisión: <strong>{new Date().toLocaleDateString('es-ES')}</strong></div>
              <div className="font-bold text-zinc-950 mt-0.5">{filteredYields.length} operaciones registradas</div>
            </div>
          </div>

          {/* Resumen Fiscal Consolidado (Bruto, Retención, Líquido) */}
          <div className="grid grid-cols-4 gap-2 mt-3 pt-2.5 border-t border-zinc-200 text-center">
            <div className="p-2 border border-zinc-300 rounded bg-zinc-50">
              <div className="text-[9px] uppercase tracking-wider font-bold text-zinc-600">Total Importe Bruto</div>
              <div className="text-sm font-black text-zinc-950">{formatCurrency(totals.gross)}</div>
            </div>
            <div className="p-2 border border-zinc-300 rounded bg-zinc-50">
              <div className="text-[9px] uppercase tracking-wider font-bold text-amber-900">Retención IRPF (Hacienda)</div>
              <div className="text-sm font-black text-amber-900">
                {formatCurrency(totals.withholding)} <span className="text-[9px] font-normal">({totals.gross > 0 ? ((totals.withholding / totals.gross) * 100).toFixed(1) : '19.0'}%)</span>
              </div>
            </div>
            <div className="p-2 border border-zinc-300 rounded bg-zinc-50">
              <div className="text-[9px] uppercase tracking-wider font-bold text-[#0E6A3B]">Líquido Neto Percibido</div>
              <div className="text-sm font-black text-[#0E6A3B]">{formatCurrency(totals.net)}</div>
            </div>
            <div className="p-2 border border-zinc-300 rounded bg-zinc-50">
              <div className="text-[9px] uppercase tracking-wider font-bold text-zinc-600">Operaciones</div>
              <div className="text-xs font-bold text-zinc-900 mt-0.5">
                {filteredYields.length} <span className="text-[9px] font-normal text-zinc-600">({totals.interestCount} int. / {totals.dividendCount} div.)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabla Impresa de Operaciones (Sin botones interactivos ni cortes laterales) */}
        {filteredYields.length === 0 ? (
          <div className="p-6 text-center text-xs text-zinc-500 border border-zinc-200 rounded">
            No constan cobros registrados para los filtros seleccionados en este ejercicio fiscal.
          </div>
        ) : (
          <table className="w-full text-left text-xs border border-zinc-300 border-collapse print-table">
            <thead>
              <tr className="bg-zinc-100 text-zinc-800 font-black uppercase text-[9px] border-b-2 border-zinc-300">
                <th className="py-2 px-2.5 w-20">Fecha</th>
                <th className="py-2 px-2.5">Concepto / Emisor</th>
                <th className="py-2 px-2.5 w-36">Entidad Bancaria</th>
                <th className="py-2 px-2 w-20 text-center">Tipo</th>
                <th className="py-2 px-2.5 text-right w-24">Bruto (€)</th>
                <th className="py-2 px-2.5 text-right w-28 text-amber-950">Retención IRPF</th>
                <th className="py-2 px-2.5 text-right w-24 text-[#0E6A3B]">Líquido Neto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {filteredYields.map((rec) => {
                const acc = getAccountForYieldRecord(appState.accounts, rec.accountId);
                return (
                  <tr key={`print-row-${rec.id}`} className="border-b border-zinc-200">
                    <td className="py-1.5 px-2.5 font-semibold text-zinc-900 whitespace-nowrap">
                      {formatDate(rec.date)}
                    </td>
                    <td className="py-1.5 px-2.5">
                      <div className="font-bold text-zinc-950 leading-tight">{rec.title}</div>
                      {rec.notes && <div className="text-[9px] text-zinc-500 italic mt-0.5">{rec.notes}</div>}
                    </td>
                    <td className="py-1.5 px-2.5 text-zinc-800">
                      <span className="font-bold">{acc.bankName}</span>
                      <div className="text-[9px] text-zinc-500">{acc.accountName}</div>
                    </td>
                    <td className="py-1.5 px-2 text-center whitespace-nowrap">
                      <span className="font-bold text-[9px]">
                        {rec.type === 'interest' ? 'Interés' : 'Dividendo'}
                      </span>
                    </td>
                    <td className="py-1.5 px-2.5 text-right font-bold text-zinc-950 whitespace-nowrap">
                      {formatCurrency(rec.grossAmount)}
                    </td>
                    <td className="py-1.5 px-2.5 text-right font-semibold text-amber-900 whitespace-nowrap">
                      {rec.withholdingTax > 0 ? (
                        <span>{formatCurrency(rec.withholdingTax)} ({rec.taxRatePercent}%)</span>
                      ) : (
                        <span className="text-zinc-500">0,00 € (0%)</span>
                      )}
                    </td>
                    <td className="py-1.5 px-2.5 text-right font-black text-[#0E6A3B] whitespace-nowrap">
                      {formatCurrency(rec.netAmount)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-zinc-100 text-zinc-950 font-black text-xs border-t-2 border-zinc-950">
                <td colSpan={4} className="py-2.5 px-2.5 uppercase tracking-wider">
                  TOTAL LIQUIDACIONES FISCALES ({filteredYields.length})
                </td>
                <td className="py-2.5 px-2.5 text-right font-black">
                  {formatCurrency(totals.gross)}
                </td>
                <td className="py-2.5 px-2.5 text-right font-black text-amber-900">
                  {formatCurrency(totals.withholding)}
                </td>
                <td className="py-2.5 px-2.5 text-right font-black text-[#0E6A3B]">
                  {formatCurrency(totals.net)}
                </td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {/* ========================================================================= */}
      {/* VISTA EXCLUSIVA DE PANTALLA (100% oculta en modo impresión)              */}
      {/* ========================================================================= */}
      <div className="no-print screen-only space-y-6">
        {/* Top Banner / Header (Pantalla) */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-zinc-200/90 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-emerald-100/40 via-transparent to-transparent pointer-events-none rounded-full blur-2xl -mr-20 -mt-20"></div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-50 text-[#0E6A3B] border border-emerald-200">
                <Coins className="w-3.5 h-3.5" />
                Capital Mobiliario & Fiscalidad
              </span>
              <span className="text-xs font-semibold text-zinc-500 hidden sm:inline">
                • Ejercicio {selectedYear}
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-zinc-950 tracking-tight">
              Intereses Bancarios y Dividendos de Acciones
            </h2>

            <p className="text-xs sm:text-sm text-zinc-600 max-w-3xl leading-relaxed">
              Registro contable y fiscal con desglose de <strong>Importe Bruto</strong>, <strong>Retenciones practicadas (IRPF)</strong> y <strong>Líquido neto</strong> percibido por meses, año y entidades bancarias.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={handlePrint}
              className="px-3.5 py-2.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 text-xs font-bold shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer"
              title="Imprimir informe fiscal anual/mensual o guardar en PDF"
            >
              <Printer className="w-4 h-4 text-zinc-600" />
              <span>Imprimir</span>
            </button>

            <button
              onClick={onOpenNewYieldModal}
              className="px-4 py-2.5 rounded-xl bg-[#0E6A3B] hover:bg-[#0a522d] text-white text-xs font-black shadow-xs hover:shadow transition-all flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Registrar Rendimiento</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter Toolbar Card (Pantalla) */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-zinc-200 shadow-2xs space-y-4 print:hidden screen-only no-print filter-controls">
        {/* FILTRO PRINCIPAL: Selector Rápido de Banco / Entidad (Píldoras destacadas) */}
        <div className="pb-3 border-b border-zinc-100 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs font-black text-zinc-700 uppercase tracking-wider mr-1">
            <Building2 className="w-4 h-4 text-[#0E6A3B]" />
            <span>Filtrar por Entidad:</span>
          </div>

          <button
            type="button"
            onClick={() => setSelectedBankId('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              selectedBankId === 'all'
                ? 'bg-[#0E6A3B] text-white shadow-xs font-black ring-2 ring-emerald-500/20'
                : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
            }`}
          >
            Todas ({availableBanks.reduce((sum, b) => sum + b.yearCount, 0)} cobros)
          </button>

          {availableBanks.map((b) => {
            const isSelected = selectedBankId === b.key || selectedBankId === b.bankName.toLowerCase();
            return (
              <button
                key={`bank-pill-top-${b.key}`}
                type="button"
                onClick={() => setSelectedBankId(isSelected ? 'all' : b.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                  isSelected
                    ? 'bg-[#0E6A3B] text-white border-[#0E6A3B] shadow-xs ring-2 ring-emerald-500/20 font-black'
                    : 'bg-white hover:bg-zinc-50 text-zinc-800 border-zinc-200'
                }`}
                title={`Filtrar rendimientos exclusivamente de ${b.bankName}`}
              >
                <span 
                  className="w-2.5 h-2.5 rounded-full shrink-0" 
                  style={{ backgroundColor: b.color }}
                />
                <span>{b.bankName}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-zinc-100 text-zinc-600'
                }`}>
                  {b.yearCount}
                </span>
              </button>
            );
          })}

          {selectedBankId !== 'all' && (
            <button
              type="button"
              onClick={() => setSelectedBankId('all')}
              className="text-xs font-bold text-red-600 hover:text-red-700 ml-1 cursor-pointer flex items-center gap-1 py-1 px-2 rounded-lg hover:bg-red-50 transition-colors"
              title="Quitar filtro de banco y ver todas las entidades"
            >
              <span>✕ Quitar filtro</span>
            </button>
          )}
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* 1. Selector de Tipo: Todos / Intereses / Dividendos */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center p-1 bg-zinc-100 rounded-xl max-w-fit">
              <button
                onClick={() => setSelectedType('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedType === 'all'
                    ? 'bg-white text-[#092B19] shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                Todos ({yearCounts.total})
              </button>

              <button
                onClick={() => setSelectedType('interest')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedType === 'interest'
                    ? 'bg-white text-[#0E6A3B] shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                <Building2 className="w-3.5 h-3.5 text-[#0E6A3B]" />
                <span>Intereses ({yearCounts.interests})</span>
              </button>

              <button
                onClick={() => setSelectedType('dividend')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedType === 'dividend'
                    ? 'bg-white text-emerald-800 shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                <span>Dividendos ({yearCounts.dividends})</span>
              </button>
            </div>

            {/* Selector de Retención Fiscal (Con IRPF vs Sin retención / IBAN extranjero) */}
            <div className="flex items-center p-1 bg-zinc-100 rounded-xl max-w-fit">
              <button
                onClick={() => setSelectedWithholding('all')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedWithholding === 'all'
                    ? 'bg-white text-zinc-900 shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                Toda fiscalidad
              </button>

              <button
                onClick={() => setSelectedWithholding('with_tax')}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedWithholding === 'with_tax'
                    ? 'bg-white text-zinc-900 shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
                title="Mostrar cobros con retención de IRPF practicada en cuenta"
              >
                <Percent className="w-3.5 h-3.5 text-zinc-600" />
                <span>Con IRPF ({yearCounts.withTax})</span>
              </button>

              <button
                onClick={() => setSelectedWithholding('without_tax')}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedWithholding === 'without_tax'
                    ? 'bg-amber-100 text-amber-900 shadow-xs font-black'
                    : 'text-amber-800 hover:bg-amber-50'
                }`}
                title="Mostrar cobros íntegros sin retención (IBAN alemán DE / cuentas internacionales / exentos)"
              >
                <Globe className="w-3.5 h-3.5 text-amber-700" />
                <span>Sin retención ({yearCounts.withoutTax})</span>
              </button>
            </div>

            {/* Selector de Estado de Comprobación (Pendiente vs Comprobado) */}
            <div className="flex items-center p-1 bg-zinc-100 rounded-xl max-w-fit">
              <button
                onClick={() => setSelectedStatus('all')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedStatus === 'all'
                    ? 'bg-white text-zinc-900 shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                Todos
              </button>

              <button
                onClick={() => setSelectedStatus('needs_review')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedStatus === 'needs_review'
                    ? 'bg-amber-100 text-amber-900 shadow-xs'
                    : 'text-amber-800 hover:bg-amber-50'
                }`}
                title="Mostrar solo cobros auto-detectados pendientes de comprobar con el banco"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span>Por Comprobar ({yearCounts.pendingYear})</span>
              </button>

              <button
                onClick={() => setSelectedStatus('verified')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedStatus === 'verified'
                    ? 'bg-emerald-100 text-emerald-900 shadow-xs'
                    : 'text-emerald-800 hover:bg-emerald-50'
                }`}
                title="Mostrar solo cobros verificados"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Comprobados ({yearCounts.verifiedYear})</span>
              </button>
            </div>
          </div>

          {/* 2. Switcher de Sub-pestañas: Matriz Anual vs Listado Detallado */}
          <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-xl self-start md:self-auto">
            <button
              onClick={() => setActiveSubTab('matrix')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === 'matrix'
                  ? 'bg-white text-[#092B19] shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-[#0E6A3B]" />
              <span>Matriz por Meses</span>
            </button>

            <button
              onClick={() => setActiveSubTab('list')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === 'list'
                  ? 'bg-white text-[#092B19] shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-[#0E6A3B]" />
              <span>Listado de Cobros ({filteredYields.length})</span>
            </button>
          </div>
        </div>

        {/* Second Row: Filters for Bank, Year, Month, and Search */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-zinc-100">
          
          {/* Selector de Banco / Entidad */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                Banco / Entidad
              </label>
              {selectedBankId !== 'all' && (
                <button
                  type="button"
                  onClick={() => setSelectedBankId('all')}
                  className="text-[10px] font-bold text-red-600 hover:text-red-700 cursor-pointer"
                  title="Restablecer filtro a todas las entidades"
                >
                  ✕ Quitar filtro
                </button>
              )}
            </div>
            <select
              value={selectedBankId}
              onChange={(e) => setSelectedBankId(e.target.value)}
              className={`w-full px-3 py-2 rounded-xl border text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-[#0E6A3B] transition-colors ${
                selectedBankId !== 'all'
                  ? 'border-[#0E6A3B] bg-emerald-50/50 text-[#092B19] font-bold ring-1 ring-emerald-500/20'
                  : 'border-zinc-300 bg-white text-zinc-800'
              }`}
            >
              <option value="all">Todas las entidades bancarias ({yearCounts.total} cobros)</option>
              {availableBanks.map((b) => (
                <option key={b.key} value={b.key}>
                  {b.bankName} {b.yearCount > 0 ? `(${b.yearCount} en ${selectedYear})` : '(0 cobros)'}
                </option>
              ))}
            </select>
          </div>

          {/* Selector de Año */}
          <div>
            <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
              Ejercicio Fiscal (Año)
            </label>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setSelectedYear((y) => Math.max(2025, y - 1))}
                disabled={selectedYear <= 2025}
                className={`p-2 rounded-xl border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-700 transition-colors ${
                  selectedYear <= 2025 ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
                }`}
                title={selectedYear <= 2025 ? 'Límite inferior: tus datos son del ejercicio 2025 en adelante' : 'Año anterior'}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                className="flex-1 px-3 py-2 rounded-xl border border-zinc-300 bg-white text-xs font-bold text-zinc-900 text-center focus:outline-hidden focus:ring-2 focus:ring-[#0E6A3B] cursor-pointer"
              >
                {availableYears.map((yr) => (
                  <option key={yr} value={yr}>
                    Año {yr}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setSelectedYear((y) => Math.min(2030, y + 1))}
                disabled={selectedYear >= 2030}
                className={`p-2 rounded-xl border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-700 transition-colors ${
                  selectedYear >= 2030 ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
                }`}
                title="Año siguiente"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Selector de Mes */}
          <div>
            <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
              Periodo / Mes
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-zinc-300 bg-white text-xs font-semibold text-zinc-800 focus:outline-hidden focus:ring-2 focus:ring-[#0E6A3B]"
            >
              <option value="all">Todo el año (Enero - Diciembre)</option>
              {MONTH_NAMES.map((name, i) => {
                const numStr = String(i + 1).padStart(2, '0');
                return (
                  <option key={numStr} value={numStr}>
                    {name} ({numStr})
                  </option>
                );
              })}
            </select>
          </div>

          {/* Buscador de texto */}
          <div>
            <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
              Buscar por Concepto o Ticker
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Ej. Iberdrola, Santander, IPF..."
                className="w-full pl-8 pr-3 py-2 rounded-xl border border-zinc-300 text-xs font-medium text-zinc-900 focus:outline-hidden focus:ring-2 focus:ring-[#0E6A3B]"
              />
            </div>
          </div>

        </div>
      </div>

      {/* 4 KPI Summary Cards (Pantalla) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:hidden">
        
        {/* KPI 1: Total Bruto */}
        <div className="bg-white rounded-2xl p-5 border border-zinc-200/90 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-zinc-500 font-bold mb-1">
            <span className="uppercase tracking-wider">Total Importe Bruto</span>
            <span className="p-1.5 rounded-lg bg-zinc-100 text-zinc-700">
              <Coins className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-zinc-950 tracking-tight">
            {formatCurrency(totals.gross)}
          </div>
          <p className="text-[11px] text-zinc-500 mt-1">
            Rendimiento bruto devengado
          </p>
        </div>

        {/* KPI 2: Total Retenciones Practicadas (IRPF) */}
        <div className="bg-white rounded-2xl p-5 border border-amber-200/90 shadow-2xs relative overflow-hidden bg-gradient-to-br from-white to-amber-50/30">
          <div className="flex items-center justify-between text-xs text-amber-800 font-bold mb-1">
            <span className="uppercase tracking-wider">Retenciones IRPF (Hacienda)</span>
            <span className="p-1.5 rounded-lg bg-amber-100 text-amber-800">
              <Percent className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-amber-900 tracking-tight">
            {formatCurrency(totals.withholding)}
          </div>
          <div className="flex items-center gap-1.5 mt-1 text-[11px] text-amber-800">
            <span>
              {totals.gross > 0 
                ? `Tipo medio efectivo: ${((totals.withholding / totals.gross) * 100).toFixed(1)}%`
                : '19% estándar IRPF'}
            </span>
          </div>
        </div>

        {/* KPI 3: Total Líquido Neto Cobrado */}
        <div className="bg-white rounded-2xl p-5 border border-emerald-300 shadow-2xs relative overflow-hidden bg-gradient-to-br from-white to-emerald-50/50">
          <div className="flex items-center justify-between text-xs text-emerald-900 font-black mb-1">
            <span className="uppercase tracking-wider">Total Líquido Neto</span>
            <span className="p-1.5 rounded-lg bg-[#0E6A3B] text-white">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-[#0E6A3B] tracking-tight">
            {formatCurrency(totals.net)}
          </div>
          <p className="text-[11px] text-emerald-800 font-medium mt-1">
            Abonado efectivamente en tus cuentas
          </p>
        </div>

        {/* KPI 4: Conteo y Desglose */}
        <div className="bg-white rounded-2xl p-5 border border-zinc-200/90 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-zinc-500 font-bold mb-1">
            <span className="uppercase tracking-wider">Liquidaciones</span>
            <span className="p-1.5 rounded-lg bg-zinc-100 text-zinc-700">
              <Layers className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-zinc-950 tracking-tight">
            {filteredYields.length} <span className="text-xs font-bold text-zinc-500">cobros</span>
          </div>
          <div className="flex items-center gap-3 mt-1 text-[11px] text-zinc-600 font-medium">
            <span className="flex items-center gap-1">
              <Building2 className="w-3 h-3 text-[#0E6A3B]" />
              {totals.interestCount} intereses
            </span>
            <span className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-emerald-600" />
              {totals.dividendCount} dividendos
            </span>
          </div>
        </div>

      </div>

      {/* Alerta de cobros pendientes de comprobación */}
      {reviewStats.pendingCount > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50/90 border border-amber-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs print:hidden screen-only">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-100 text-amber-800 shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-amber-950">
                {yearCounts.pendingYear > 0 ? (
                  <span>Tienes {yearCounts.pendingYear} cobros pendientes de comprobación en el ejercicio {selectedYear} ({reviewStats.pendingCount} en total de la app)</span>
                ) : (
                  <span>En el ejercicio {selectedYear} todos tus rendimientos están comprobados con tu documento oficial (0 pendientes). Hay {reviewStats.pendingCount} de otros ejercicios pendientes.</span>
                )}
              </h4>
              <p className="text-[11px] sm:text-xs text-amber-800/90">
                Anotados automáticamente desde los extractos bancarios. Puedes revisarlos individualmente o marcarlos como comprobados con un solo clic.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {onBatchVerifyYields && (
              <button
                type="button"
                onClick={() => {
                  const idsToVerify = yearCounts.pendingYear > 0
                    ? yearCounts.yearYields.filter((y) => y.status === 'needs_review').map((y) => y.id)
                    : reviewStats.pendingIds;
                  onBatchVerifyYields(idsToVerify);
                }}
                className="px-3.5 py-2 rounded-xl bg-white hover:bg-zinc-50 border border-amber-300 text-amber-900 text-xs font-bold shrink-0 transition-colors shadow-2xs cursor-pointer flex items-center justify-center gap-1.5"
                title="Marcar los cobros pendientes como comprobados"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Marcar comprobados</span>
              </button>
            )}
            <button
              onClick={() => {
                setSelectedStatus('needs_review');
                setActiveSubTab('list');
              }}
              className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shrink-0 transition-colors shadow-2xs cursor-pointer flex items-center justify-center gap-1.5"
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>Ver pendientes ({yearCounts.pendingYear > 0 ? yearCounts.pendingYear : reviewStats.pendingCount})</span>
            </button>
          </div>
        </div>
      )}

      {/* VIEW 1: Matriz Mensual & Desglose por Bancos */}
      {activeSubTab === 'matrix' && (
        <div className="space-y-6 print:hidden screen-only">
          
          {/* Main Matrix: Enero a Diciembre */}
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xs overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-zinc-50/70">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#0E6A3B]" />
                  Matriz Anual de Rendimientos por Meses — Ejercicio {selectedYear}
                </h3>
                <p className="text-xs text-zinc-500">
                  {selectedType === 'interest' 
                    ? 'Mostrando exclusivamente Intereses bancarios e imposiciones a plazo fijo (IPF)' 
                    : selectedType === 'dividend'
                    ? 'Mostrando exclusivamente Dividendos de acciones cobrados'
                    : 'Desglose mensual de Intereses Bancarios y Dividendos de Acciones con Bruto, Retención y Líquido'}
                </p>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                {selectedType !== 'all' && (
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-lg bg-emerald-100 text-emerald-900 border border-emerald-300">
                    Filtrado: {selectedType === 'interest' ? 'Solo Intereses' : 'Solo Dividendos'}
                  </span>
                )}
                {selectedWithholding === 'without_tax' && (
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-lg bg-amber-100 text-amber-900 border border-amber-300">
                    Solo sin retención (IBAN DE)
                  </span>
                )}
                
                {/* Botón rápido para desplegar o plegar los apuntes de todos los meses */}
                <button
                  type="button"
                  onClick={() => expandedMonths.size > 0 ? collapseAllMonths() : expandAllMonths()}
                  className="text-xs font-bold px-3 py-1 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-[#0E6A3B] transition-colors shadow-2xs flex items-center gap-1 cursor-pointer"
                  title="Desplegar o plegar los cobros detallados de todos los meses de la matriz"
                >
                  {expandedMonths.size > 0 ? (
                    <>
                      <ChevronUp className="w-3.5 h-3.5" />
                      <span>Plegar apuntes</span>
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-3.5 h-3.5" />
                      <span>Desplegar apuntes</span>
                    </>
                  )}
                </button>

                <span className="text-xs font-bold text-zinc-600 bg-white px-3 py-1 rounded-xl border border-zinc-200 shadow-2xs">
                  12 Meses Fiscales
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-zinc-100/90 text-zinc-700 font-extrabold uppercase tracking-wider text-[11px] border-b border-zinc-200">
                    <th className="py-3 px-4">Mes (Click para ver apuntes)</th>
                    <th className={`py-3 px-3 text-right transition-colors ${selectedType === 'interest' ? 'bg-blue-100/90 text-blue-950 font-black' : selectedType === 'dividend' ? 'opacity-30' : ''}`}>
                      Intereses Bruto
                    </th>
                    <th className={`py-3 px-3 text-right transition-colors ${selectedType === 'interest' ? 'bg-blue-100/90 text-blue-950 font-black' : selectedType === 'dividend' ? 'opacity-30' : ''}`}>
                      Intereses Líq.
                    </th>
                    <th className={`py-3 px-3 text-right transition-colors ${selectedType === 'dividend' ? 'bg-emerald-100/90 text-emerald-950 font-black' : selectedType === 'interest' ? 'opacity-30' : ''}`}>
                      Dividendos Bruto
                    </th>
                    <th className={`py-3 px-3 text-right transition-colors ${selectedType === 'dividend' ? 'bg-emerald-100/90 text-emerald-950 font-black' : selectedType === 'interest' ? 'opacity-30' : ''}`}>
                      Dividendos Líq.
                    </th>
                    <th className="py-3 px-3 text-right bg-zinc-200/50">
                      {selectedType === 'interest' ? 'Total Intereses Bruto' : selectedType === 'dividend' ? 'Total Div. Bruto' : 'Total Bruto'}
                    </th>
                    <th className="py-3 px-3 text-right text-amber-900 bg-amber-50/50">Retención IRPF</th>
                    <th className="py-3 px-4 text-right text-[#0E6A3B] bg-emerald-50/60 font-black">Total Líquido</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 text-zinc-800">
                  {monthlyMatrix.map((m) => {
                    const hasActivity = m.count > 0;
                    const isExpanded = expandedMonths.has(m.monthNumStr);
                    const monthItems = isExpanded ? getMonthItems(m.monthNumStr) : [];

                    return (
                      <React.Fragment key={m.monthNumStr}>
                        <tr 
                          onClick={() => hasActivity && toggleMonthExpand(m.monthNumStr)}
                          className={`transition-colors border-b border-zinc-100 ${
                            isExpanded ? 'bg-emerald-50/40 border-emerald-200' : 'hover:bg-zinc-50/80'
                          } ${hasActivity ? 'font-medium cursor-pointer' : 'text-zinc-400'}`}
                        >
                          <td className="py-3 px-4 font-bold text-zinc-900">
                            <div className="flex items-center gap-2">
                              {hasActivity ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleMonthExpand(m.monthNumStr);
                                  }}
                                  className={`p-1 rounded-md transition-all ${
                                    isExpanded 
                                      ? 'bg-[#0E6A3B] text-white shadow-2xs' 
                                      : 'bg-zinc-100 text-zinc-600 hover:bg-emerald-100 hover:text-[#0E6A3B]'
                                  }`}
                                  title={isExpanded ? 'Plegar apuntes' : 'Desplegar apuntes de este mes'}
                                >
                                  {isExpanded ? (
                                    <ChevronDown className="w-3.5 h-3.5" />
                                  ) : (
                                    <ChevronRight className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              ) : (
                                <span className="w-5 h-5 flex items-center justify-center">
                                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-300"></span>
                                </span>
                              )}

                              <span className={isExpanded ? 'text-[#0E6A3B] font-black' : ''}>
                                {m.monthName}
                              </span>

                              {hasActivity && (
                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold transition-colors ${
                                  isExpanded ? 'bg-[#0E6A3B] text-white' : 'bg-zinc-100 text-zinc-700'
                                }`}>
                                  {m.count}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Intereses */}
                          <td className={`py-3 px-3 text-right transition-colors ${selectedType === 'interest' ? 'bg-blue-50/50 font-bold text-blue-900' : selectedType === 'dividend' ? 'opacity-25' : ''}`}>
                            {m.interestGross > 0 ? formatCurrency(m.interestGross) : '—'}
                          </td>
                          <td className={`py-3 px-3 text-right transition-colors ${selectedType === 'interest' ? 'bg-blue-50/50 font-bold text-blue-900' : selectedType === 'dividend' ? 'opacity-25' : 'font-semibold text-zinc-700'}`}>
                            {m.interestNet > 0 ? formatCurrency(m.interestNet) : '—'}
                          </td>

                          {/* Dividendos */}
                          <td className={`py-3 px-3 text-right transition-colors ${selectedType === 'dividend' ? 'bg-emerald-50/50 font-bold text-emerald-900' : selectedType === 'interest' ? 'opacity-25' : ''}`}>
                            {m.dividendGross > 0 ? formatCurrency(m.dividendGross) : '—'}
                          </td>
                          <td className={`py-3 px-3 text-right transition-colors ${selectedType === 'dividend' ? 'bg-emerald-50/50 font-bold text-emerald-900' : selectedType === 'interest' ? 'opacity-25' : 'font-semibold text-zinc-700'}`}>
                            {m.dividendNet > 0 ? formatCurrency(m.dividendNet) : '—'}
                          </td>

                          {/* Totales del mes (respetando filtros) */}
                          <td className="py-3 px-3 text-right font-bold text-zinc-950 bg-zinc-50/50">
                            {m.totalGross > 0 ? formatCurrency(m.totalGross) : '—'}
                          </td>

                          <td className="py-3 px-3 text-right font-bold text-amber-900 bg-amber-50/30">
                            {m.totalWithholding > 0 ? formatCurrency(m.totalWithholding) : '—'}
                          </td>

                          <td className="py-3 px-4 text-right font-black text-[#0E6A3B] bg-emerald-50/40">
                            {m.totalNet > 0 ? formatCurrency(m.totalNet) : '—'}
                          </td>
                        </tr>

                        {/* Desplegable interactivo de apuntes de este mes */}
                        {isExpanded && (
                          <tr className="bg-emerald-50/30 border-b-2 border-emerald-300">
                            <td colSpan={8} className="p-0">
                              <div className="p-3.5 sm:p-5 bg-gradient-to-r from-emerald-50/50 via-white to-zinc-50/50 border-l-4 border-[#0E6A3B] space-y-3 animate-in fade-in duration-150">
                                
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-200/80 pb-2.5">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="w-2.5 h-2.5 rounded-full bg-[#0E6A3B]"></span>
                                    <h4 className="text-xs sm:text-sm font-black text-zinc-950">
                                      Apuntes de {m.monthName} {selectedYear} ({monthItems.length} {monthItems.length === 1 ? 'cobro' : 'cobros'})
                                    </h4>
                                    <span className="text-[11px] text-zinc-500 font-medium">
                                      • Bruto: <strong className="text-zinc-900">{formatCurrency(m.totalGross)}</strong> • Retención: <strong className="text-amber-900">{formatCurrency(m.totalWithholding)}</strong> • Líquido: <strong className="text-[#0E6A3B]">{formatCurrency(m.totalNet)}</strong>
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-2 self-start sm:self-auto">
                                    <button
                                      type="button"
                                      onClick={() => onOpenNewYieldModal()}
                                      className="px-2.5 py-1 rounded-lg bg-[#0E6A3B] hover:bg-[#092B19] text-white text-[11px] font-bold shadow-2xs flex items-center gap-1 transition-colors cursor-pointer"
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                      <span>Añadir apunte</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => toggleMonthExpand(m.monthNumStr)}
                                      className="px-2.5 py-1 rounded-lg bg-white border border-zinc-200 hover:bg-zinc-100 text-zinc-700 text-[11px] font-semibold transition-colors cursor-pointer shadow-2xs"
                                    >
                                      Plegar
                                    </button>
                                  </div>
                                </div>

                                {monthItems.length === 0 ? (
                                  <p className="text-xs text-zinc-500 italic py-2">
                                    No hay cobros registrados en {m.monthName} que cumplan los filtros activos.
                                  </p>
                                ) : (
                                  <div className="overflow-x-auto rounded-xl border border-zinc-200/90 bg-white shadow-2xs">
                                    <table className="w-full text-left text-xs border-collapse">
                                      <thead>
                                        <tr className="bg-zinc-100/90 text-zinc-700 uppercase tracking-wider text-[10px] font-black border-b border-zinc-200">
                                          <th className="py-2.5 px-3">Fecha</th>
                                          <th className="py-2.5 px-3">Concepto / Entidad</th>
                                          <th className="py-2.5 px-3">Cuenta / Broker</th>
                                          <th className="py-2.5 px-2.5">Tipo</th>
                                          <th className="py-2.5 px-3 text-right">Bruto (€)</th>
                                          <th className="py-2.5 px-3 text-right">Retención IRPF</th>
                                          <th className="py-2.5 px-3 text-right">Líquido Neto</th>
                                          <th className="py-2.5 px-3 text-center">Estado</th>
                                          <th className="py-2.5 px-3 text-right">Acciones</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-zinc-100">
                                        {monthItems.map((rec) => {
                                          const acc = getAccountForYieldRecord(appState.accounts, rec.accountId);
                                          return (
                                            <tr key={rec.id} className="hover:bg-zinc-50/80 transition-colors">
                                              <td className="py-2.5 px-3 font-semibold text-zinc-700 whitespace-nowrap">
                                                {formatDate(rec.date)}
                                              </td>
                                              <td className="py-2.5 px-3 font-bold text-zinc-900">
                                                <div>{rec.title}</div>
                                                {rec.notes && (
                                                  <div className="text-[10px] text-zinc-500 font-normal line-clamp-1">{rec.notes}</div>
                                                )}
                                              </td>
                                              <td className="py-2.5 px-3 whitespace-nowrap">
                                                <div className="flex items-center gap-1.5">
                                                  <span 
                                                    className="w-2.5 h-2.5 rounded-full shrink-0" 
                                                    style={{ backgroundColor: acc.color }}
                                                  />
                                                  <span className="font-semibold text-zinc-800 text-xs">
                                                    {acc.bankName}
                                                  </span>
                                                </div>
                                              </td>
                                              <td className="py-2.5 px-2.5 whitespace-nowrap">
                                                {rec.type === 'interest' ? (
                                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                                                    <Building2 className="w-2.5 h-2.5" /> Interés
                                                  </span>
                                                ) : (
                                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                                    <TrendingUp className="w-2.5 h-2.5" /> Dividendo
                                                  </span>
                                                )}
                                              </td>
                                              <td className="py-2.5 px-3 text-right font-bold text-zinc-950 whitespace-nowrap">
                                                {formatCurrency(rec.grossAmount)}
                                              </td>
                                              <td className="py-2.5 px-3 text-right font-semibold whitespace-nowrap">
                                                {rec.withholdingTax > 0 ? (
                                                  <div className="text-amber-900">
                                                    <span>{formatCurrency(rec.withholdingTax)}</span>
                                                    <span className="text-[10px] text-amber-700 font-normal ml-1">({rec.taxRatePercent}%)</span>
                                                  </div>
                                                ) : (
                                                  <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200" title="Cobro íntegro sin retención en origen">
                                                    Sin retención (0%)
                                                  </span>
                                                )}
                                              </td>
                                              <td className="py-2.5 px-3 text-right font-black text-[#0E6A3B] whitespace-nowrap">
                                                {formatCurrency(rec.netAmount)}
                                              </td>
                                              <td className="py-2.5 px-3 text-center whitespace-nowrap">
                                                <button
                                                  type="button"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    onToggleYieldStatus(rec.id);
                                                  }}
                                                  className="cursor-pointer inline-flex items-center gap-1"
                                                  title={rec.status === 'needs_review' ? 'Click para marcar como comprobado' : 'Click para marcar como pendiente'}
                                                >
                                                  {rec.status === 'needs_review' ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                                      <AlertTriangle className="w-3 h-3 text-amber-600" />
                                                      Revisar
                                                    </span>
                                                  ) : (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-200">
                                                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                                      OK
                                                    </span>
                                                  )}
                                                </button>
                                              </td>
                                              <td className="py-2.5 px-3 text-right whitespace-nowrap">
                                                <div className="flex items-center justify-end gap-1">
                                                  <button
                                                    type="button"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      onEditYield(rec);
                                                    }}
                                                    className="px-2.5 py-1 rounded-lg text-xs font-bold text-[#0E6A3B] bg-emerald-50 hover:bg-[#0E6A3B] hover:text-white transition-colors flex items-center gap-1 cursor-pointer shadow-2xs border border-emerald-200"
                                                    title="Editar este apunte"
                                                  >
                                                    <Edit3 className="w-3 h-3" />
                                                    <span>Editar</span>
                                                  </button>
                                                  <button
                                                    type="button"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      onDeleteYield(rec.id);
                                                    }}
                                                    className="p-1 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                                                    title="Eliminar este apunte"
                                                  >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                  </button>
                                                </div>
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>

                {/* Footer Total Consolidado */}
                <tfoot>
                  <tr className="bg-[#092B19] text-white font-extrabold text-xs border-t-2 border-[#0E6A3B]">
                    <td className="py-3.5 px-4 text-emerald-200 uppercase tracking-wider font-black">
                      TOTAL {selectedType === 'interest' ? 'INTERESES' : selectedType === 'dividend' ? 'DIVIDENDOS' : `EJERCICIO ${selectedYear}`}
                    </td>
                    <td className={`py-3.5 px-3 text-right ${selectedType === 'dividend' ? 'opacity-30' : 'text-emerald-100 font-bold'}`}>
                      {formatCurrency(monthlyMatrix.reduce((s, m) => s + m.interestGross, 0))}
                    </td>
                    <td className={`py-3.5 px-3 text-right ${selectedType === 'dividend' ? 'opacity-30' : 'text-emerald-100 font-bold'}`}>
                      {formatCurrency(monthlyMatrix.reduce((s, m) => s + m.interestNet, 0))}
                    </td>
                    <td className={`py-3.5 px-3 text-right ${selectedType === 'interest' ? 'opacity-30' : 'text-emerald-100 font-bold'}`}>
                      {formatCurrency(monthlyMatrix.reduce((s, m) => s + m.dividendGross, 0))}
                    </td>
                    <td className={`py-3.5 px-3 text-right ${selectedType === 'interest' ? 'opacity-30' : 'text-emerald-100 font-bold'}`}>
                      {formatCurrency(monthlyMatrix.reduce((s, m) => s + m.dividendNet, 0))}
                    </td>
                    <td className="py-3.5 px-3 text-right text-white font-black bg-emerald-950/40">
                      {formatCurrency(totals.gross)}
                    </td>
                    <td className="py-3.5 px-3 text-right text-amber-300 font-black bg-emerald-950/40">
                      {formatCurrency(totals.withholding)}
                    </td>
                    <td className="py-3.5 px-4 text-right text-emerald-300 font-black text-sm bg-emerald-950/60">
                      {formatCurrency(totals.net)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Breakdown por Banco / Entidad */}
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xs overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-zinc-50/70">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-[#0E6A3B]" />
                  Resumen por Entidad Bancaria / Broker — Ejercicio {selectedYear}
                </h3>
                <p className="text-xs text-zinc-500">
                  Total de rendimientos percibidos en cada cuenta bancaria o de valores (haz clic en cualquier banco para ver sus apuntes)
                </p>
              </div>

              {/* Botón rápido para desplegar o plegar todos los bancos */}
              {bankBreakdown.length > 0 && (
                <button
                  type="button"
                  onClick={() => expandedBanks.size > 0 ? collapseAllBanks() : expandAllBanks()}
                  className="text-xs font-bold px-3 py-1 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-[#0E6A3B] transition-colors shadow-2xs flex items-center gap-1 cursor-pointer self-start sm:self-auto"
                  title="Desplegar o plegar los cobros detallados de todas las entidades bancarias"
                >
                  {expandedBanks.size > 0 ? (
                    <>
                      <ChevronUp className="w-3.5 h-3.5" />
                      <span>Plegar bancos</span>
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-3.5 h-3.5" />
                      <span>Desplegar bancos</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {selectedBankId !== 'all' && (
              <div className="mx-5 my-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs text-[#0E6A3B]">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-[#0E6A3B]" />
                  <span>Filtrando exclusivamente por: <strong>{selectedBankName}</strong> ({bankBreakdown.reduce((s, b) => s + b.count, 0)} cobros)</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedBankId('all')}
                  className="font-bold text-red-600 hover:text-red-700 underline cursor-pointer"
                >
                  ✕ Ver todas las entidades
                </button>
              </div>
            )}

            {bankBreakdown.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 text-xs">
                No hay rendimientos registrados en los bancos para este ejercicio fiscal con los filtros activos.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-zinc-100/90 text-zinc-700 font-extrabold uppercase tracking-wider text-[11px] border-b border-zinc-200">
                      <th className="py-3 px-4">Banco & Cuenta (Click para ver apuntes)</th>
                      <th className="py-3 px-3 text-center">Tipo Cuenta</th>
                      <th className="py-3 px-3 text-center">Cobros</th>
                      <th className="py-3 px-3 text-right">Importe Bruto</th>
                      <th className="py-3 px-3 text-right text-amber-900">Retención (IRPF)</th>
                      <th className="py-3 px-4 text-right text-[#0E6A3B] font-bold">Líquido Neto</th>
                      <th className="py-3 px-3 text-right">Filtrar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {bankBreakdown.map((item) => {
                      const isExpanded = expandedBanks.has(item.account.id);
                      const bankItems = isExpanded ? getBankItems(item.account.id) : [];

                      return (
                        <React.Fragment key={item.account.id}>
                          <tr 
                            onClick={() => item.count > 0 && toggleBankExpand(item.account.id)}
                            className={`transition-colors border-b border-zinc-100 ${
                              isExpanded ? 'bg-emerald-50/40 border-emerald-200' : 'hover:bg-zinc-50/80'
                            } ${item.count > 0 ? 'font-medium cursor-pointer' : 'text-zinc-400'}`}
                          >
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-2.5">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleBankExpand(item.account.id);
                                  }}
                                  className={`p-1 rounded-md transition-all ${
                                    isExpanded 
                                      ? 'bg-[#0E6A3B] text-white shadow-2xs' 
                                      : 'bg-zinc-100 text-zinc-600 hover:bg-emerald-100 hover:text-[#0E6A3B]'
                                  }`}
                                  title={isExpanded ? 'Plegar apuntes' : 'Desplegar apuntes de este banco'}
                                >
                                  {isExpanded ? (
                                    <ChevronDown className="w-3.5 h-3.5" />
                                  ) : (
                                    <ChevronRight className="w-3.5 h-3.5" />
                                  )}
                                </button>
                                <span 
                                  className="w-3 h-3 rounded-full shrink-0" 
                                  style={{ backgroundColor: item.account.color }}
                                />
                                <div>
                                  <div className={`font-bold ${isExpanded ? 'text-[#0E6A3B]' : 'text-zinc-900'}`}>{item.account.bankName}</div>
                                  <div className="text-[11px] text-zinc-500">{item.account.accountName} ({item.account.accountNumberMasked})</div>
                                </div>
                              </div>
                            </td>

                            <td className="py-3.5 px-3 text-center">
                              <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-zinc-100 text-zinc-700">
                                {item.account.type === 'checking' && 'Corriente'}
                                {item.account.type === 'savings' && 'Ahorro / Metas'}
                                {item.account.type === 'investment' && 'Valores'}
                                {item.account.type === 'credit' && 'Crédito'}
                              </span>
                            </td>

                            <td className="py-3.5 px-3 text-center">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${
                                isExpanded ? 'bg-[#0E6A3B] text-white' : 'bg-zinc-100 text-zinc-800'
                              }`}>
                                {item.count}
                              </span>
                            </td>

                            <td className="py-3.5 px-3 text-right font-bold text-zinc-900">
                              {formatCurrency(item.gross)}
                            </td>

                            <td className="py-3.5 px-3 text-right font-bold text-amber-900">
                              {formatCurrency(item.withholding)}
                            </td>

                            <td className="py-3.5 px-4 text-right font-black text-[#0E6A3B]">
                              {formatCurrency(item.net)}
                            </td>

                            <td className="py-3.5 px-3 text-right">
                              {selectedBankId === item.account.id || selectedBankId === item.account.bankName.toLowerCase() ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedBankId('all');
                                  }}
                                  className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200 transition-colors cursor-pointer"
                                  title="Quitar filtro de banco"
                                >
                                  ✕ Quitar
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedBankId(item.account.bankName.toLowerCase());
                                  }}
                                  className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-[#0E6A3B] border border-emerald-300 hover:bg-[#0E6A3B] hover:text-white transition-colors cursor-pointer shadow-2xs"
                                  title={`Filtrar toda la pantalla solo por ${item.account.bankName}`}
                                >
                                  Filtrar banco
                                </button>
                              )}
                            </td>
                          </tr>

                          {/* Desplegable interactivo de apuntes de este banco */}
                          {isExpanded && (
                            <tr className="bg-emerald-50/30 border-b-2 border-emerald-300">
                              <td colSpan={7} className="p-0">
                                <div className="p-3.5 sm:p-5 bg-gradient-to-r from-emerald-50/50 via-white to-zinc-50/50 border-l-4 border-[#0E6A3B] space-y-3 animate-in fade-in duration-150">
                                  
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-200/80 pb-2.5">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span 
                                        className="w-3 h-3 rounded-full shrink-0" 
                                        style={{ backgroundColor: item.account.color }}
                                      />
                                      <h4 className="text-xs sm:text-sm font-black text-zinc-950">
                                        Apuntes en {item.account.bankName} ({bankItems.length} {bankItems.length === 1 ? 'cobro' : 'cobros'})
                                      </h4>
                                      <span className="text-[11px] text-zinc-500 font-medium">
                                        • Bruto: <strong className="text-zinc-900">{formatCurrency(item.gross)}</strong> • Retención: <strong className="text-amber-900">{formatCurrency(item.withholding)}</strong> • Líquido: <strong className="text-[#0E6A3B]">{formatCurrency(item.net)}</strong>
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-2 self-start sm:self-auto">
                                      <button
                                        type="button"
                                        onClick={() => onOpenNewYieldModal()}
                                        className="px-2.5 py-1 rounded-lg bg-[#0E6A3B] hover:bg-[#092B19] text-white text-[11px] font-bold shadow-2xs flex items-center gap-1 transition-colors cursor-pointer"
                                      >
                                        <Plus className="w-3.5 h-3.5" />
                                        <span>Añadir apunte</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => toggleBankExpand(item.account.id)}
                                        className="px-2.5 py-1 rounded-lg bg-white border border-zinc-200 hover:bg-zinc-100 text-zinc-700 text-[11px] font-semibold transition-colors cursor-pointer shadow-2xs"
                                      >
                                        Plegar
                                      </button>
                                    </div>
                                  </div>

                                  {bankItems.length === 0 ? (
                                    <p className="text-xs text-zinc-500 italic py-2">
                                      No hay cobros registrados en {item.account.bankName} con los filtros activos.
                                    </p>
                                  ) : (
                                    <div className="overflow-x-auto rounded-xl border border-zinc-200/90 bg-white shadow-2xs">
                                      <table className="w-full text-left text-xs border-collapse">
                                        <thead>
                                          <tr className="bg-zinc-100/90 text-zinc-700 uppercase tracking-wider text-[10px] font-black border-b border-zinc-200">
                                            <th className="py-2.5 px-3">Fecha</th>
                                            <th className="py-2.5 px-3">Concepto / Entidad</th>
                                            <th className="py-2.5 px-2.5">Tipo</th>
                                            <th className="py-2.5 px-3 text-right">Bruto (€)</th>
                                            <th className="py-2.5 px-3 text-right">Retención IRPF</th>
                                            <th className="py-2.5 px-3 text-right">Líquido Neto</th>
                                            <th className="py-2.5 px-3 text-center">Estado</th>
                                            <th className="py-2.5 px-3 text-right">Acciones</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-zinc-100">
                                          {bankItems.map((rec) => (
                                            <tr key={rec.id} className="hover:bg-zinc-50/80 transition-colors">
                                              <td className="py-2.5 px-3 font-semibold text-zinc-700 whitespace-nowrap">
                                                {formatDate(rec.date)}
                                              </td>
                                              <td className="py-2.5 px-3 font-bold text-zinc-900">
                                                <div>{rec.title}</div>
                                                {rec.notes && (
                                                  <div className="text-[10px] text-zinc-500 font-normal line-clamp-1">{rec.notes}</div>
                                                )}
                                              </td>
                                              <td className="py-2.5 px-2.5 whitespace-nowrap">
                                                {rec.type === 'interest' ? (
                                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                                                    <Building2 className="w-2.5 h-2.5" /> Interés
                                                  </span>
                                                ) : (
                                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                                    <TrendingUp className="w-2.5 h-2.5" /> Dividendo
                                                  </span>
                                                )}
                                              </td>
                                              <td className="py-2.5 px-3 text-right font-bold text-zinc-950 whitespace-nowrap">
                                                {formatCurrency(rec.grossAmount)}
                                              </td>
                                              <td className="py-2.5 px-3 text-right font-semibold whitespace-nowrap">
                                                {rec.withholdingTax > 0 ? (
                                                  <div className="text-amber-900">
                                                    <span>{formatCurrency(rec.withholdingTax)}</span>
                                                    <span className="text-[10px] text-amber-700 font-normal ml-1">({rec.taxRatePercent}%)</span>
                                                  </div>
                                                ) : (
                                                  <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200" title="Cobro íntegro sin retención en origen">
                                                    Sin retención (0%)
                                                  </span>
                                                )}
                                              </td>
                                              <td className="py-2.5 px-3 text-right font-black text-[#0E6A3B] whitespace-nowrap">
                                                {formatCurrency(rec.netAmount)}
                                              </td>
                                              <td className="py-2.5 px-3 text-center whitespace-nowrap">
                                                <button
                                                  type="button"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    onToggleYieldStatus(rec.id);
                                                  }}
                                                  className="cursor-pointer inline-flex items-center gap-1"
                                                  title={rec.status === 'needs_review' ? 'Click para marcar como comprobado' : 'Click para marcar como pendiente'}
                                                >
                                                  {rec.status === 'needs_review' ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                                      <AlertTriangle className="w-3 h-3 text-amber-600" />
                                                      Revisar
                                                    </span>
                                                  ) : (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-200">
                                                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                                      OK
                                                    </span>
                                                  )}
                                                </button>
                                              </td>
                                              <td className="py-2.5 px-3 text-right whitespace-nowrap">
                                                <div className="flex items-center justify-end gap-1">
                                                  <button
                                                    type="button"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      onEditYield(rec);
                                                    }}
                                                    className="px-2.5 py-1 rounded-lg text-xs font-bold text-[#0E6A3B] bg-emerald-50 hover:bg-[#0E6A3B] hover:text-white transition-colors flex items-center gap-1 cursor-pointer shadow-2xs border border-emerald-200"
                                                    title="Editar este apunte"
                                                  >
                                                    <Edit3 className="w-3 h-3" />
                                                    <span>Editar</span>
                                                  </button>
                                                  <button
                                                    type="button"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      onDeleteYield(rec.id);
                                                    }}
                                                    className="p-1 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                                                    title="Eliminar este apunte"
                                                  >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                  </button>
                                                </div>
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      )}

      {/* VIEW 2: Listado Detallado de Cobros */}
      {activeSubTab === 'list' && (
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xs overflow-hidden print:hidden screen-only">
          <div className="px-5 py-4 border-b border-zinc-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-zinc-50/70">
            <div>
              <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#0E6A3B]" />
                Liquidaciones Detalladas — Ejercicio {selectedYear}
              </h3>
              <p className="text-xs text-zinc-500">
                Mostrando {filteredYields.length} registros según los filtros seleccionados
              </p>
            </div>

            <button
              onClick={onOpenNewYieldModal}
              className="px-3.5 py-1.5 rounded-xl bg-[#0E6A3B] hover:bg-[#0a522d] text-white text-xs font-bold shadow-2xs flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Añadir Cobro</span>
            </button>
          </div>

          {/* Barra de Filtros Integrada para el Listado de Cobros */}
          <div className="p-4 bg-zinc-50/70 border-b border-zinc-200 space-y-3">
            {/* 1. Selector de Banco / Entidad con píldoras interactivas */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-black uppercase text-zinc-500 mr-1 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-[#0E6A3B]" />
                <span>Filtrar Banco:</span>
              </span>
              <button
                type="button"
                onClick={() => setSelectedBankId('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedBankId === 'all'
                    ? 'bg-[#0E6A3B] text-white shadow-2xs font-black'
                    : 'bg-white hover:bg-zinc-100 text-zinc-700 border border-zinc-200'
                }`}
              >
                Todas las entidades ({availableBanks.reduce((s, b) => s + b.yearCount, 0)})
              </button>
              {availableBanks.map((b) => {
                const isSelected = selectedBankId === b.key || selectedBankId === b.bankName.toLowerCase();
                return (
                  <button
                    key={`list-pill-${b.key}`}
                    type="button"
                    onClick={() => setSelectedBankId(isSelected ? 'all' : b.key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-[#0E6A3B] text-white border-[#0E6A3B] shadow-2xs font-black'
                        : 'bg-white hover:bg-zinc-100 text-zinc-800 border-zinc-200'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: b.color }} />
                    <span>{b.bankName}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-zinc-100 text-zinc-600'
                    }`}>
                      {b.yearCount}
                    </span>
                  </button>
                );
              })}
              {selectedBankId !== 'all' && (
                <button
                  type="button"
                  onClick={() => setSelectedBankId('all')}
                  className="text-xs font-bold text-rose-600 hover:text-rose-700 ml-1 cursor-pointer flex items-center gap-1 py-1 px-2 rounded-lg hover:bg-rose-50"
                >
                  <span>✕ Ver todas</span>
                </button>
              )}
            </div>

            {/* 2. Filtros secundarios: Año, Estado, Tipo y Buscador */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-zinc-200/60">
              <div className="flex flex-wrap items-center gap-2">
                {/* Selector de Ejercicio Fiscal */}
                <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-zinc-200">
                  <span className="text-[10px] font-black uppercase text-zinc-400 px-2">Año:</span>
                  {availableYears.map((yr) => (
                    <button
                      key={`list-yr-${yr}`}
                      type="button"
                      onClick={() => setSelectedYear(yr)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                        selectedYear === yr
                          ? 'bg-[#0E6A3B] text-white shadow-2xs font-black'
                          : 'text-zinc-600 hover:text-zinc-900'
                      }`}
                    >
                      {yr}
                    </button>
                  ))}
                </div>

                {/* Selector de Estado (Todos / Por Comprobar / Comprobados) */}
                <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-zinc-200">
                  <button
                    type="button"
                    onClick={() => setSelectedStatus('all')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                      selectedStatus === 'all'
                        ? 'bg-zinc-800 text-white shadow-2xs font-bold'
                        : 'text-zinc-600 hover:text-zinc-900'
                    }`}
                  >
                    Todos ({yearCounts.total})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedStatus('needs_review')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                      selectedStatus === 'needs_review'
                        ? 'bg-amber-600 text-white shadow-2xs font-bold'
                        : 'text-amber-800 hover:bg-amber-50'
                    }`}
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Por Comprobar ({yearCounts.pendingYear})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedStatus('verified')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                      selectedStatus === 'verified'
                        ? 'bg-emerald-700 text-white shadow-2xs font-bold'
                        : 'text-emerald-800 hover:bg-emerald-50'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Comprobados ({yearCounts.verifiedYear})</span>
                  </button>
                </div>

                {/* Selector de Tipo (Todos / Intereses / Dividendos) */}
                <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-zinc-200">
                  <button
                    type="button"
                    onClick={() => setSelectedType('all')}
                    className={`px-2 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                      selectedType === 'all' ? 'bg-zinc-800 text-white shadow-2xs font-bold' : 'text-zinc-600'
                    }`}
                  >
                    Todos
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedType('interest')}
                    className={`px-2 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                      selectedType === 'interest' ? 'bg-[#0E6A3B] text-white shadow-2xs font-bold' : 'text-zinc-600'
                    }`}
                  >
                    Intereses
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedType('dividend')}
                    className={`px-2 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                      selectedType === 'dividend' ? 'bg-emerald-800 text-white shadow-2xs font-bold' : 'text-zinc-600'
                    }`}
                  >
                    Dividendos
                  </button>
                </div>
              </div>

              {/* Buscador de texto */}
              <div className="relative min-w-[200px] flex-1 sm:flex-initial">
                <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar concepto o banco..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs font-medium rounded-xl border border-zinc-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-[#0E6A3B]"
                />
              </div>
            </div>

            {/* Aviso informativo si hay filtros activos */}
            {(selectedBankId !== 'all' || selectedStatus !== 'all' || selectedType !== 'all' || selectedMonth !== 'all' || searchTerm.trim()) && (
              <div className="flex items-center justify-between gap-2 p-2 px-3 bg-emerald-50/80 border border-emerald-200 rounded-xl text-xs text-emerald-950">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold">Filtros activos:</span>
                  {selectedBankId !== 'all' && (
                    <span className="px-2 py-0.5 rounded-full bg-white font-bold border border-emerald-300 text-emerald-900">
                      Banco: {selectedBankName}
                    </span>
                  )}
                  {selectedStatus === 'needs_review' && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 font-bold border border-amber-300 text-amber-950">
                      Solo Por Comprobar ({yearCounts.pendingYear})
                    </span>
                  )}
                  {selectedStatus === 'verified' && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 font-bold border border-emerald-300 text-emerald-950">
                      Solo Comprobados ({yearCounts.verifiedYear})
                    </span>
                  )}
                  {selectedType !== 'all' && (
                    <span className="px-2 py-0.5 rounded-full bg-white font-bold border border-emerald-300 text-emerald-900">
                      Tipo: {selectedType === 'interest' ? 'Intereses' : 'Dividendos'}
                    </span>
                  )}
                  {searchTerm.trim() && (
                    <span className="px-2 py-0.5 rounded-full bg-white font-bold border border-emerald-300 text-emerald-900">
                      Búsqueda: "{searchTerm}"
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedBankId('all');
                    setSelectedStatus('all');
                    setSelectedType('all');
                    setSelectedMonth('all');
                    setSearchTerm('');
                  }}
                  className="font-bold text-rose-600 hover:text-rose-800 cursor-pointer text-xs shrink-0"
                >
                  Restablecer todos
                </button>
              </div>
            )}
          </div>

          {filteredYields.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-zinc-100 text-zinc-400 flex items-center justify-center mx-auto">
                <Coins className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-zinc-900">No hay cobros registrados con estos filtros</h4>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                No se encontraron intereses o dividendos para el año {selectedYear} y los filtros activos.
              </p>
              <button
                onClick={onOpenNewYieldModal}
                className="mt-2 px-4 py-2 bg-[#0E6A3B] text-white text-xs font-bold rounded-xl cursor-pointer hover:bg-[#0a522d]"
              >
                Registrar primer cobro
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-zinc-50 text-zinc-600 font-bold uppercase tracking-wider text-[11px] border-b border-zinc-200">
                    <th className="py-3 px-3 text-center w-24">Comprobación</th>
                    <th className="py-3 px-3">Fecha</th>
                    <th className="py-3 px-3">Tipo</th>
                    <th className="py-3 px-4">Concepto / Emisor</th>
                    <th className="py-3 px-3">Banco Receptora</th>
                    <th className="py-3 px-3 text-right">Bruto (€)</th>
                    <th className="py-3 px-3 text-right text-amber-900">Retención</th>
                    <th className="py-3 px-3 text-right text-[#0E6A3B] font-bold">Líquido Neto (€)</th>
                    <th className="py-3 px-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filteredYields.map((record) => {
                    const acc = getAccountForYieldRecord(appState.accounts, record.accountId);
                    const isNeedsReview = record.status === 'needs_review';
                    return (
                      <tr 
                        key={record.id} 
                        className={`transition-colors ${
                          isNeedsReview 
                            ? 'bg-amber-50/40 hover:bg-amber-50/70' 
                            : 'hover:bg-zinc-50/80'
                        }`}
                      >
                        {/* Check de comprobación interactivo */}
                        <td className="py-3.5 px-3 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => onToggleYieldStatus(record.id)}
                            className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer shadow-2xs ${
                              isNeedsReview
                                ? 'bg-amber-100/90 text-amber-900 hover:bg-amber-200 border border-amber-300 ring-1 ring-amber-400/30'
                                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                            }`}
                            title={
                              isNeedsReview
                                ? 'Check activado: Pendiente de comprobar con el banco. Haz clic cuando lo hayas verificado para desactivarlo.'
                                : 'Check desactivado: Comprobado y verificado. Haz clic si deseas volver a marcarlo como pendiente.'
                            }
                          >
                            {isNeedsReview ? (
                              <>
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                                <span>Por revisar</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Comprobado</span>
                              </>
                            )}
                          </button>
                        </td>

                        <td className="py-3.5 px-3 font-semibold text-zinc-900 whitespace-nowrap">
                          {formatDate(record.date)}
                        </td>

                        <td className="py-3.5 px-3 whitespace-nowrap">
                          {record.type === 'interest' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                              <Building2 className="w-3 h-3" />
                              Interés
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              <TrendingUp className="w-3 h-3" />
                              Dividendo
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-zinc-900 leading-snug">
                              {record.title}
                            </span>
                            {record.autoDetected && (
                              <span 
                                className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-sky-50 text-sky-700 border border-sky-200" 
                                title="Detectado y anotado automáticamente a partir de un movimiento del banco"
                              >
                                Auto-detectado
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-zinc-500">
                            {record.isinOrTicker && (
                              <span className="font-bold text-zinc-700 bg-zinc-100 px-1.5 py-0.2 rounded text-[10px]">
                                {record.isinOrTicker}
                              </span>
                            )}
                            {record.sharesCount && (
                              <span>
                                {record.sharesCount} accs.
                                {record.grossPerShare ? ` a ${record.grossPerShare} €` : ''}
                              </span>
                            )}
                            {record.notes && (
                              <span className="truncate max-w-xs italic text-zinc-400">
                                • {record.notes}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-3">
                          {acc ? (
                            <div className="flex items-center gap-1.5">
                              <span 
                                className="w-2.5 h-2.5 rounded-full shrink-0" 
                                style={{ backgroundColor: acc.color }}
                              />
                              <span className="font-semibold text-zinc-800 text-xs">
                                {acc.bankName}
                              </span>
                            </div>
                          ) : (
                            <span className="text-zinc-400">Cuenta eliminada</span>
                          )}
                        </td>

                        <td className="py-3.5 px-3 text-right font-semibold text-zinc-950">
                          {formatCurrency(record.grossAmount)}
                        </td>

                        <td className="py-3.5 px-3 text-right font-semibold">
                          {record.withholdingTax > 0 ? (
                            <>
                              <div className="text-amber-900">{formatCurrency(record.withholdingTax)}</div>
                              <div className="text-[10px] text-amber-700 font-medium">({record.taxRatePercent}%)</div>
                            </>
                          ) : (
                            <>
                              <div className="text-zinc-500 text-xs">0,00 €</div>
                              <span 
                                className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 mt-0.5" 
                                title="Rendimiento percibido íntegro sin retención en origen (IBAN alemán). Debe incluirse en la Declaración de la Renta anual."
                              >
                                Sin retención (IBAN DE)
                              </span>
                            </>
                          )}
                        </td>

                        <td className="py-3.5 px-3 text-right font-black text-[#0E6A3B] text-sm">
                          {formatCurrency(record.netAmount)}
                        </td>

                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => onEditYield(record)}
                              className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors cursor-pointer"
                              title="Editar y cotejar importes de este cobro con el justificante del banco"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                onDeleteYield(record.id);
                              }}
                              className="p-1.5 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors cursor-pointer"
                              title="Eliminar este cobro"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      </div>
    </div>
  );
};
