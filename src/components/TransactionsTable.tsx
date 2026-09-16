import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  Trash2, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Sparkles, 
  Calendar,
  Building,
  RotateCcw,
  FileText,
  Plus
} from 'lucide-react';
import { Transaction, BankAccount, TransactionCategory } from '../types';
import { formatCurrency, formatDate } from '../utils/storage';

interface TransactionsTableProps {
  transactions: Transaction[];
  accounts: BankAccount[];
  categories: TransactionCategory[];
  onDeleteTransaction: (id: string) => void;
  onOpenNewTransactionModal: () => void;
}

export const TransactionsTable: React.FC<TransactionsTableProps> = ({
  transactions,
  accounts,
  categories,
  onDeleteTransaction,
  onOpenNewTransactionModal
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBank, setFilterBank] = useState<string>('all');
  const [filterType, setFilterType] = useState<'all' | 'expense' | 'income'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const accountMap = useMemo(() => {
    const map = new Map<string, BankAccount>();
    accounts.forEach((a) => map.set(a.id, a));
    return map;
  }, [accounts]);

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
  }, [transactions, searchQuery, filterType, filterBank, filterCategory, accountMap]);

  const hasActiveFilters = searchQuery !== '' || filterBank !== 'all' || filterType !== 'all' || filterCategory !== 'all';

  const resetFilters = () => {
    setSearchQuery('');
    setFilterBank('all');
    setFilterType('all');
    setFilterCategory('all');
  };

  return (
    <div id="section-transactions" className="bg-white rounded-2xl border border-zinc-200/90 shadow-2xs p-5 sm:p-6">
      
      {/* Title & Filter Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-zinc-100">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-zinc-950">Historial Consolidado de Movimientos</h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 border border-zinc-200">
              {filteredTransactions.length} registros
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">
            Extracto de cuentas BBVA, Santander y operaciones registradas
          </p>
        </div>

        <button
          onClick={onOpenNewTransactionModal}
          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-[#0E6A3B] hover:bg-[#0a522d] rounded-xl transition-all cursor-pointer self-start md:self-auto shadow-2xs active:scale-95"
        >
          <Plus className="w-3.5 h-3.5" />
          Añadir Movimiento
        </button>
      </div>

      {/* Filter Controls Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 my-4">
        
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

        {/* Bank Filter */}
        <div>
          <select
            value={filterBank}
            onChange={(e) => setFilterBank(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-50 border border-zinc-200 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 transition-all text-zinc-800 font-semibold"
          >
            <option value="all">Todos los Bancos</option>
            <option value="bbva">Solo BBVA</option>
            <option value="santander">Solo Santander</option>
          </select>
        </div>

        {/* Type Filter */}
        <div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as 'all' | 'expense' | 'income')}
            className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-50 border border-zinc-200 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 transition-all text-zinc-800 font-semibold"
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
            className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-50 border border-zinc-200 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 transition-all text-zinc-800 font-semibold"
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
        <div className="flex items-center justify-between bg-emerald-50/80 border border-emerald-200 rounded-xl px-3 py-2 mb-4 text-xs text-emerald-950">
          <span className="font-medium">Filtros aplicados ({filteredTransactions.length} encontrados)</span>
          <button
            onClick={resetFilters}
            className="inline-flex items-center gap-1 font-bold text-[#0E6A3B] hover:text-emerald-950 cursor-pointer"
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
              <th className="py-3 px-3.5 rounded-l-lg">Fecha</th>
              <th className="py-3 px-3.5">Concepto & Detalle</th>
              <th className="py-3 px-3.5">Categoría</th>
              <th className="py-3 px-3.5">Cuenta / Entidad</th>
              <th className="py-3 px-3.5 text-right">Importe</th>
              <th className="py-3 px-3.5 text-center rounded-r-lg">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 text-xs">
            {filteredTransactions.length > 0 ? (
              filteredTransactions.map((tx) => {
                const account = accountMap.get(tx.accountId);
                const category = categoryMap.get(tx.categoryId);
                const isIncome = tx.type === 'income';

                return (
                  <tr 
                    key={tx.id} 
                    className="hover:bg-zinc-50/70 transition-colors group"
                  >
                    <td className="py-3.5 px-3.5 text-zinc-500 whitespace-nowrap font-medium font-feature-settings-tnum">
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
                        <div className="text-[11px] text-zinc-400 mt-0.5 truncate max-w-xs">
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
                            className="w-2 h-2 rounded-full"
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
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={6} className="py-12 text-center text-zinc-400">
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

            return (
              <div key={tx.id} className="py-3.5 flex items-start justify-between gap-3">
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
            );
          })
        ) : (
          <div className="py-8 text-center text-zinc-400 text-xs font-medium">
            No hay movimientos que coincidan con la búsqueda.
          </div>
        )}
      </div>

    </div>
  );
};
