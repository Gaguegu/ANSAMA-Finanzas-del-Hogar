import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, Lock } from 'lucide-react';
import { BankAccount, TransactionCategory, Transaction, MonthClosure } from '../types';
import { parseCurrencyInput, formatCurrency, formatMonthName, isMonthLocked } from '../utils/storage';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: BankAccount[];
  categories: TransactionCategory[];
  onAddTransaction: (transaction: Omit<Transaction, 'id'>) => void;
  transactionToEdit?: Transaction | null;
  onEditTransaction?: (transaction: Transaction) => void;
  monthlyClosures?: MonthClosure[];
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  accounts,
  categories,
  onAddTransaction,
  transactionToEdit,
  onEditTransaction,
  monthlyClosures = []
}) => {
  const isEditing = Boolean(transactionToEdit);

  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [amountStr, setAmountStr] = useState('');
  const [title, setTitle] = useState('');
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [categoryId, setCategoryId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Sync state whenever modal opens or transactionToEdit changes
  useEffect(() => {
    if (isOpen) {
      setError(null);
      if (transactionToEdit) {
        setType(transactionToEdit.type);
        setAmountStr(String(transactionToEdit.amount));
        setTitle(transactionToEdit.title || '');
        setAccountId(transactionToEdit.accountId || accounts[0]?.id || '');
        setCategoryId(transactionToEdit.categoryId || '');
        setDate(transactionToEdit.date || new Date().toISOString().split('T')[0]);
        setNote(transactionToEdit.note || '');
      } else {
        setType('expense');
        setAmountStr('');
        setTitle('');
        setAccountId(accounts[0]?.id || '');
        setCategoryId('');
        setDate(new Date().toISOString().split('T')[0]);
        setNote('');
      }
    }
  }, [isOpen, transactionToEdit, accounts]);

  if (!isOpen) return null;

  // Filter categories by type
  const availableCategories = categories.filter((c) => c.type === type);

  // Set default category when type switches
  const currentCategory = categoryId || availableCategories[0]?.id || '';

  const targetMonth = date.substring(0, 7);
  const isTargetMonthLocked = isMonthLocked(targetMonth, monthlyClosures);

  const originalMonth = transactionToEdit ? transactionToEdit.date.substring(0, 7) : null;
  const isOriginalMonthLocked = originalMonth ? isMonthLocked(originalMonth, monthlyClosures) : false;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Bloqueo estricto por cierre contable
    if (isOriginalMonthLocked && originalMonth) {
      setError(`Este apunte pertenece a ${formatMonthName(originalMonth)}, que está oficialmente cerrado y blindado. Los movimientos de meses blindados no pueden modificarse.`);
      return;
    }

    if (isTargetMonthLocked) {
      setError(`La fecha seleccionada corresponde a ${formatMonthName(targetMonth)}, que está oficialmente cerrado y blindado. No se pueden añadir ni trasladar movimientos a un mes blindado.`);
      return;
    }

    const parsedAmount = parseCurrencyInput(amountStr);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Por favor, introduce un importe numérico válido mayor que 0.');
      return;
    }

    if (!title.trim()) {
      setError('Por favor, indica un concepto o descripción del movimiento.');
      return;
    }

    if (!accountId) {
      setError('Por favor, selecciona una cuenta bancaria asociada.');
      return;
    }

    const finalCategoryId = currentCategory || availableCategories[0]?.id || (type === 'expense' ? 'cat-otros-gastos' : 'cat-otros-ingresos');

    if (isEditing && transactionToEdit && onEditTransaction) {
      onEditTransaction({
        ...transactionToEdit,
        accountId,
        date,
        title: title.trim(),
        amount: parsedAmount,
        type,
        categoryId: finalCategoryId,
        note: note.trim() ? note.trim() : undefined
      });
    } else {
      onAddTransaction({
        accountId,
        date,
        title: title.trim(),
        amount: parsedAmount,
        type,
        categoryId: finalCategoryId,
        note: note.trim() ? note.trim() : undefined
      });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div 
        className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-emerald-50/40">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              {isEditing ? 'Editar Apunte Contable Completo' : 'Registrar Nuevo Movimiento'}
            </h3>
            <p className="text-xs text-slate-500">
              {isEditing 
                ? 'Modifica importe, fecha, concepto, cuenta de cargo o categoría del apunte'
                : 'Añade un gasto o ingreso manual a las cuentas del hogar'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {error && (
            <div className="p-3 text-xs rounded-xl bg-rose-50 text-rose-700 border border-rose-200 flex items-start gap-2">
              <Lock className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Aviso si el mes está blindado */}
          {isTargetMonthLocked && (
            <div className="p-3 text-xs rounded-xl bg-amber-50 text-amber-900 border border-amber-300 flex items-start gap-2">
              <Lock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <span>
                El mes de <strong>{formatMonthName(targetMonth)}</strong> está cerrado y blindado contablemente.
                Para guardar cambios en este mes, primero debes reabrirlo en la pantalla de Cierre Mensual.
              </span>
            </div>
          )}

          {/* Type Selector Tabs */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Tipo de Operación
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setType('expense');
                  setCategoryId('');
                }}
                className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                  type === 'expense'
                    ? 'bg-rose-50 text-rose-700 border-rose-300 ring-2 ring-rose-500/20'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Gasto / Pago (-)
              </button>
              <button
                type="button"
                onClick={() => {
                  setType('income');
                  setCategoryId('');
                }}
                className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                  type === 'income'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300 ring-2 ring-emerald-500/20'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Ingreso / Cobro (+)
              </button>
            </div>
          </div>

          {/* Amount & Date in 2 columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Importe (€) *
              </label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="Ej: 4.599,13 o 45,90"
                  required
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-bold rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 text-slate-900"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  EUR
                </span>
              </div>
              <div className="mt-1 min-h-[16px]">
                {amountStr.trim() !== '' && !isNaN(parseCurrencyInput(amountStr)) && parseCurrencyInput(amountStr) > 0 ? (
                  <span className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                    Interpretado: <strong className="font-extrabold">{formatCurrency(parseCurrencyInput(amountStr))}</strong>
                  </span>
                ) : null}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Fecha *
              </label>
              <input
                type="date"
                required
                min="2025-01-01"
                max="2030-12-31"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 text-xs font-medium rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 text-slate-900"
              />
            </div>
          </div>

          {/* Title / Concept */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Concepto / Detalle *
            </label>
            <input
              type="text"
              placeholder="Ej: Mercadona, Nómina, Recibo Luz, Abono intereses..."
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 text-slate-900"
            />
          </div>

          {/* Bank Account */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Cuenta Bancaria
            </label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 text-slate-900 font-medium"
            >
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.bankName} - {acc.accountName} ({acc.accountNumberMasked})
                </option>
              ))}
            </select>
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Categoría
            </label>
            <select
              value={currentCategory}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 text-slate-900 font-medium"
            >
              {availableCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Notas adicionales (opcional)
            </label>
            <input
              type="text"
              placeholder="Detalle adicional, etiqueta o referencia..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 text-slate-900"
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isTargetMonthLocked || isOriginalMonthLocked}
              className={`px-4 py-2 text-xs font-bold text-white rounded-xl transition-colors shadow-sm cursor-pointer ${
                isTargetMonthLocked || isOriginalMonthLocked
                  ? 'bg-zinc-400 cursor-not-allowed opacity-60'
                  : 'bg-[#0E6A3B] hover:bg-[#0a522d]'
              }`}
            >
              {isEditing ? 'Guardar Cambios' : 'Guardar Movimiento'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
