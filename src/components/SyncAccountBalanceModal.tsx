import React, { useState, useEffect } from 'react';
import { X, RefreshCw, Check, Calendar, TrendingUp, TrendingDown, ArrowRight, ShieldCheck } from 'lucide-react';
import { BankAccount, Transaction } from '../types';
import { formatCurrency, formatDate, parseCurrencyInput, recalculateAccountBalanceFromTransactions } from '../utils/storage';

interface SyncAccountBalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: BankAccount | null;
  transactions: Transaction[];
  onSaveAccount: (account: BankAccount) => void;
}

export const SyncAccountBalanceModal: React.FC<SyncAccountBalanceModalProps> = ({
  isOpen,
  onClose,
  account,
  transactions,
  onSaveAccount
}) => {
  const [manualBalanceStr, setManualBalanceStr] = useState('');
  const [manualDate, setManualDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [activeTab, setActiveTab] = useState<'calculated' | 'manual'>('calculated');

  const recalc = account ? recalculateAccountBalanceFromTransactions(account, transactions) : null;

  useEffect(() => {
    if (account) {
      setManualBalanceStr(account.balance.toString());
      setManualDate(new Date().toISOString().split('T')[0]);
      setActiveTab('calculated');
    }
  }, [account, isOpen]);

  if (!isOpen || !account) return null;

  const handleApplyCalculated = () => {
    if (!recalc) return;
    const updatedAccount: BankAccount = {
      ...account,
      balance: recalc.calculatedBalance,
      balanceDate: recalc.latestTransactionDate || new Date().toISOString().split('T')[0],
      lastSynced: new Date().toISOString()
    };
    onSaveAccount(updatedAccount);
    onClose();
  };

  const handleApplyManual = () => {
    const parsed = parseCurrencyInput(manualBalanceStr);
    const updatedAccount: BankAccount = {
      ...account,
      balance: parsed,
      balanceDate: manualDate || new Date().toISOString().split('T')[0],
      lastSynced: new Date().toISOString()
    };
    onSaveAccount(updatedAccount);
    onClose();
  };

  const parsedManual = parseCurrencyInput(manualBalanceStr);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/65 backdrop-blur-xs animate-in fade-in">
      <div 
        className="bg-white rounded-3xl shadow-2xl border border-zinc-200/90 w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 bg-zinc-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 border border-emerald-300 flex items-center justify-center text-[#0E6A3B]">
              <RefreshCw className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-950">
                Ajustar y Sincronizar Saldo
              </h3>
              <p className="text-[11px] text-zinc-500">
                {account.bankName} - {account.accountName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200/60 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto">
          
          {/* Tarjeta de estado actual */}
          <div className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-zinc-500 block">
                Saldo actual en la aplicación
              </span>
              <span className="text-xl font-extrabold text-zinc-950 font-mono">
                {formatCurrency(account.balance)}
              </span>
            </div>
            <div className="text-right">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-200/70 text-[10px] font-bold text-zinc-700">
                <Calendar className="w-3 h-3" />
                {account.balanceDate ? `Fijado al ${formatDate(account.balanceDate)}` : 'Sin fecha fijada'}
              </span>
            </div>
          </div>

          {/* Selector de modo */}
          <div className="flex rounded-xl bg-zinc-100 p-1 text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveTab('calculated')}
              className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer text-center ${
                activeTab === 'calculated'
                  ? 'bg-white text-zinc-900 shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Calcular por movimientos ({recalc?.transactionCount || 0})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('manual')}
              className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer text-center ${
                activeTab === 'manual'
                  ? 'bg-white text-zinc-900 shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Fijar saldo manual
            </button>
          </div>

          {/* Modo 1: Calculado por movimientos */}
          {activeTab === 'calculated' && recalc && (
            <div className="space-y-3 animate-in fade-in">
              <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-emerald-950">Movimientos encontrados:</span>
                  <span className="font-extrabold font-mono text-emerald-900">
                    {recalc.transactionCount} posteriores al {account.balanceDate ? formatDate(account.balanceDate) : 'inicio'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 bg-white rounded-xl border border-emerald-100 flex items-center justify-between">
                    <span className="text-zinc-500 flex items-center gap-1">
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                      Ingresos
                    </span>
                    <span className="font-bold font-mono text-emerald-700">
                      +{formatCurrency(recalc.incomesTotal)}
                    </span>
                  </div>

                  <div className="p-2 bg-white rounded-xl border border-emerald-100 flex items-center justify-between">
                    <span className="text-zinc-500 flex items-center gap-1">
                      <TrendingDown className="w-3.5 h-3.5 text-rose-500" />
                      Gastos
                    </span>
                    <span className="font-bold font-mono text-zinc-800">
                      -{formatCurrency(recalc.expensesTotal)}
                    </span>
                  </div>
                </div>

                <div className="p-2.5 bg-white rounded-xl border border-emerald-200 flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-700">Variación neta:</span>
                  <span className={`text-xs font-mono font-extrabold ${recalc.netDelta >= 0 ? 'text-emerald-700' : 'text-zinc-800'}`}>
                    {recalc.netDelta >= 0 ? `+${formatCurrency(recalc.netDelta)}` : formatCurrency(recalc.netDelta)}
                  </span>
                </div>

                {/* Saldo Resultante */}
                <div className="p-3 bg-gradient-to-br from-emerald-100/90 to-emerald-50 rounded-xl border-2 border-emerald-500/40 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider block">
                      Nuevo Saldo Calculado
                    </span>
                    <span className="text-xl font-black text-[#0E6A3B] font-mono">
                      {formatCurrency(recalc.calculatedBalance)}
                    </span>
                    {recalc.latestTransactionDate && (
                      <span className="text-[10px] font-medium text-emerald-800 block">
                        a fecha del último movimiento ({formatDate(recalc.latestTransactionDate)})
                      </span>
                    )}
                  </div>
                  <ArrowRight className="w-6 h-6 text-[#0E6A3B]" />
                </div>
              </div>

              <button
                type="button"
                onClick={handleApplyCalculated}
                className="w-full py-2.5 px-4 bg-[#0E6A3B] hover:bg-[#0a522d] text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Actualizar saldo a {formatCurrency(recalc.calculatedBalance)}</span>
              </button>
            </div>
          )}

          {/* Modo 2: Manual */}
          {activeTab === 'manual' && (
            <div className="space-y-3 animate-in fade-in">
              <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    Saldo exacto actual en tu banco (€):
                  </label>
                  <input
                    type="text"
                    value={manualBalanceStr}
                    onChange={(e) => setManualBalanceStr(e.target.value)}
                    placeholder="Ej: 4599.13 o 4.599,13"
                    className="w-full px-3 py-2 text-sm font-mono font-bold bg-white border border-zinc-300 rounded-xl text-zinc-900"
                  />
                  <span className="text-[11px] text-zinc-500 mt-1 block">
                    Interpretado: <strong className="font-bold text-emerald-800">{formatCurrency(parsedManual)}</strong>
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    Fecha del saldo:
                  </label>
                  <input
                    type="date"
                    value={manualDate}
                    onChange={(e) => setManualDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-zinc-300 rounded-xl text-zinc-900"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleApplyManual}
                className="w-full py-2.5 px-4 bg-[#0E6A3B] hover:bg-[#0a522d] text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Fijar saldo manual ({formatCurrency(parsedManual)})</span>
              </button>
            </div>
          )}

          <div className="flex items-center gap-2 text-[11px] text-zinc-500 pt-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Los saldos y movimientos se guardan localmente en tu dispositivo.</span>
          </div>

        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-zinc-100 bg-zinc-50/70 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-bold text-zinc-600 hover:bg-zinc-200/60 rounded-xl transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
