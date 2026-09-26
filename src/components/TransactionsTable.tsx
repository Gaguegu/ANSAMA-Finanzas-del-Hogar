import React, { useState, useMemo } from 'react';
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
  Calendar
} from 'lucide-react';
import { Transaction, BankAccount, TransactionCategory } from '../types';
import { formatCurrency, formatDate, formatMonthName } from '../utils/storage';

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
  const [filterMonth, setFilterMonth] = useState<string>('all');
  const [filterBank, setFilterBank] = useState<string>('all');
  const [filterType, setFilterType] = useState<'all' | 'expense' | 'income'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // Selección múltiple para traslados o borrado por lotes
  const [selectedTxIds, setSelectedTxIds] = useState<Set<string>>(new Set());
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [targetAccountIdForMove, setTargetAccountIdForMove] = useState<string>('');
  const [adjustBalancesOnMove, setAdjustBalancesOnMove] = useState(true);

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

      // Filter by Month or Year
      if (filterMonth !== 'all') {
        if (filterMonth.startsWith('year-')) {
          const y = filterMonth.replace('year-', '');
          if (!tx.date.startsWith(y)) return false;
        } else {
          if (!tx.date.startsWith(filterMonth)) return false;
        }
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
  }, [transactions, searchQuery, filterMonth, filterType, filterBank, filterCategory, accountMap]);

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

  const hasActiveFilters = searchQuery !== '' || filterMonth !== 'all' || filterBank !== 'all' || filterType !== 'all' || filterCategory !== 'all';

  const resetFilters = () => {
    setSearchQuery('');
    setFilterMonth('all');
    setFilterBank('all');
    setFilterType('all');
    setFilterCategory('all');
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

      {/* Barra de acciones en lote si hay selección */}
      {selectedTxIds.size > 0 && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs text-emerald-950 animate-in fade-in">
          <div className="flex items-center gap-2 font-bold">
            <CheckCircle2 className="w-4 h-4 text-[#0E6A3B]" />
            <span>{selectedTxIds.size} movimiento(s) seleccionados</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
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

        {/* Month & Year Filter */}
        <div>
          <select
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-xl bg-emerald-50/70 border border-emerald-300 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 transition-all text-zinc-900 font-bold cursor-pointer shadow-2xs"
            title="Filtrar por Mes o Año específico"
          >
            <option value="all">📅 Todos los Meses y Años</option>
            {availablePeriods.years.length > 0 && (
              <optgroup label="── Años Completos ──">
                {availablePeriods.years.map((y) => (
                  <option key={`year-${y}`} value={`year-${y}`}>
                    Año Completo {y}
                  </option>
                ))}
              </optgroup>
            )}
            <optgroup label="── Meses Específicos ──">
              {availablePeriods.months.map((m) => (
                <option key={m} value={m}>
                  {formatMonthName(m)}
                </option>
              ))}
            </optgroup>
          </select>
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
