import React, { useState, useMemo } from 'react';
import { 
  Building2, 
  CreditCard, 
  PiggyBank, 
  Copy, 
  Check, 
  RefreshCw, 
  Plus, 
  ShieldCheck, 
  Edit2, 
  Wifi, 
  TrendingUp, 
  LineChart, 
  Landmark, 
  Trash2, 
  AlertTriangle,
  X,
  Calendar
} from 'lucide-react';
import { BankAccount, Transaction } from '../types';
import { formatCurrency, formatRelativeTime, formatDate } from '../utils/storage';

interface BankAccountsListProps {
  accounts: BankAccount[];
  transactions?: Transaction[];
  onSyncBank: (bankId: 'bbva' | 'santander') => void;
  onOpenNewAccountModal: () => void;
  onEditAccount: (account: BankAccount) => void;
  onDeleteAccount?: (accountId: string, accountName?: string) => void;
  onDeleteBank?: (bankId: string, bankName: string, accountIds: string[]) => void;
  isSyncing: boolean;
}

export const BankAccountsList: React.FC<BankAccountsListProps> = ({
  accounts,
  transactions,
  onSyncBank,
  onOpenNewAccountModal,
  onEditAccount,
  onDeleteAccount,
  onDeleteBank,
  isSyncing
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [bankToDelete, setBankToDelete] = useState<{
    bankId: string;
    bankName: string;
    color: string;
    accounts: BankAccount[];
    total: number;
  } | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  // Compute transactions associated with bank selected for deletion
  const bankTransactionsCount = useMemo(() => {
    if (!bankToDelete || !transactions) return 0;
    const idSet = new Set(bankToDelete.accounts.map((a) => a.id));
    return transactions.filter((t) => idSet.has(t.accountId)).length;
  }, [bankToDelete, transactions]);

  // Specialized accounts
  const investmentAccounts = accounts.filter((a) => a.type === 'investment');
  const depositAccounts = accounts.filter((a) => a.type === 'deposit');
  const investmentTotal = investmentAccounts.reduce((sum, a) => sum + a.balance, 0);
  const depositTotal = depositAccounts.reduce((sum, a) => sum + a.balance, 0);

  // Standard banking accounts (checking, savings, credit)
  const bankingAccounts = accounts.filter((a) => a.type !== 'investment' && a.type !== 'deposit');

  // Dynamically group banking accounts by bank entity
  const bankGroups = useMemo(() => {
    const map = new Map<string, { bankId: string; bankName: string; color: string; accounts: BankAccount[]; total: number }>();
    for (const acc of bankingAccounts) {
      const key = acc.bankId === 'other' ? (acc.bankName || 'other') : acc.bankId;
      if (!map.has(key)) {
        map.set(key, {
          bankId: acc.bankId,
          bankName: acc.bankName,
          color: acc.color || '#0E6A3B',
          accounts: [],
          total: 0
        });
      }
      const group = map.get(key)!;
      group.accounts.push(acc);
      group.total += acc.balance;
    }
    return Array.from(map.values());
  }, [bankingAccounts]);

  const renderAccountCard = (account: BankAccount) => {
    const isCredit = account.type === 'credit';
    const isSavings = account.type === 'savings';
    const isInvestment = account.type === 'investment';
    const isDeposit = account.type === 'deposit';

    return (
      <div
        key={account.id}
        id={`account-card-${account.id}`}
        className="relative bg-white rounded-xl border-2 border-emerald-600/25 hover:border-emerald-600/60 hover:shadow-xs transition-all p-4 sm:p-5 flex flex-col justify-between group overflow-hidden"
      >
        {/* Accent colored top strip */}
        <div 
          className="absolute top-0 left-0 right-0 h-1"
          style={{ backgroundColor: account.color || '#0E6A3B' }}
        />

        <div>
          {/* Header row with card type, contactless icon, and actions */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              {isInvestment ? (
                <div className="w-7 h-5 rounded-xs bg-emerald-100 border border-emerald-300 flex items-center justify-center text-[#0E6A3B] shadow-2xs">
                  <TrendingUp className="w-3.5 h-3.5" />
                </div>
              ) : isDeposit ? (
                <div className="w-7 h-5 rounded-xs bg-sky-100 border border-sky-300 flex items-center justify-center text-sky-700 shadow-2xs">
                  <Landmark className="w-3.5 h-3.5" />
                </div>
              ) : (
                /* Mini gold EMV chip graphic */
                <div className="w-7 h-5 rounded-xs bg-amber-200/80 border border-amber-300/80 flex items-center justify-center p-0.5 shadow-2xs">
                  <div className="w-full h-full border border-amber-400/60 rounded-[1px] grid grid-cols-2 gap-0.5">
                    <div className="bg-amber-300/40"></div>
                    <div className="bg-amber-300/40"></div>
                  </div>
                </div>
              )}

              <Wifi className="w-3.5 h-3.5 text-zinc-400 rotate-90" />

              <span className={`text-[11px] font-extrabold uppercase tracking-wider ${
                isInvestment ? 'text-[#0E6A3B]' : isDeposit ? 'text-sky-700' : 'text-zinc-600'
              }`}>
                {isInvestment ? 'Cuenta de Valores' : isDeposit ? 'Depósito Plazo Fijo' : isCredit ? 'Tarjeta Crédito' : isSavings ? 'Ahorro' : 'Cuenta Corriente'}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                <ShieldCheck className="w-3 h-3 text-[#0E6A3B]" />
                Activa
              </span>
              <button
                onClick={() => onEditAccount(account)}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-zinc-400 hover:text-zinc-700 rounded-md hover:bg-zinc-100 cursor-pointer"
                title="Editar cuenta"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              {onDeleteAccount && (
                <button
                  onClick={() => {
                    if (window.confirm(`¿Seguro que deseas eliminar la cuenta "${account.accountName}"?`)) {
                      onDeleteAccount(account.id, account.accountName);
                    }
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-zinc-400 hover:text-rose-600 rounded-md hover:bg-rose-50 cursor-pointer"
                  title="Eliminar cuenta"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Account name and Bank name */}
          <div className="flex items-baseline justify-between gap-2">
            <h4 className="text-base font-bold text-zinc-950 leading-snug">
              {account.accountName}
            </h4>
          </div>
          <p className="text-[11px] font-bold text-zinc-500 mt-0.5">
            {account.bankName}
          </p>

          {/* Masked Card / Account digits & IBAN */}
          <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-zinc-100">
            <div className="flex items-center gap-2 text-xs font-mono text-zinc-500 font-semibold">
              <span className="tracking-widest">{account.accountNumberMasked}</span>
            </div>
            <button
              onClick={() => copyToClipboard(account.iban, account.id)}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-semibold text-zinc-700 hover:text-zinc-950 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200/90 rounded-md transition-colors cursor-pointer"
              title="Copiar IBAN o referencia"
            >
              {copiedId === account.id ? (
                <>
                  <Check className="w-3 h-3 text-[#0E6A3B]" />
                  <span className="text-[#0E6A3B] font-bold">Copiado</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3 text-zinc-400" />
                  <span>{isInvestment || isDeposit ? 'Ref' : 'IBAN'}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Balance and sync info */}
        <div className="mt-4 pt-3 border-t border-zinc-100 flex items-end justify-between">
          <div>
            <span className="text-[11px] font-medium text-zinc-400 block">
              {isInvestment ? 'Valor liquidativo' : isDeposit ? 'Capital depositado' : 'Saldo disponible'}
            </span>
            <span
              className={`text-xl sm:text-2xl font-black tracking-tight font-feature-settings-tnum block ${
                account.balance < 0 ? 'text-rose-600' : isDeposit ? 'text-sky-950' : 'text-zinc-950'
              }`}
            >
              {formatCurrency(account.balance)}
            </span>
            {account.balanceDate && (
              <span className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded-md bg-emerald-50/90 text-[10px] font-bold text-[#0E6A3B] border border-emerald-200/80">
                <Calendar className="w-2.5 h-2.5" />
                Saldo a: {formatDate(account.balanceDate)}
              </span>
            )}
          </div>

          <div className="text-right">
            <span className="text-[10px] text-zinc-400 block">
              Actualizado {formatRelativeTime(account.lastSynced)}
            </span>
            <span className="text-[11px] font-bold text-zinc-700">
              {isInvestment ? 'Cartera activa' : isDeposit ? 'Depósito vigente' : isCredit ? 'Disposición autorizada' : 'Fondos disponibles'}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div id="section-bank-accounts" className="space-y-6">
      
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-emerald-50/80 via-white to-emerald-50/40 p-4 sm:p-5 rounded-2xl border-2 border-[#0E6A3B]/45 shadow-xs ring-1 ring-emerald-950/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100/90 border border-emerald-300/80 flex items-center justify-center text-[#0E6A3B] shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-black text-zinc-950">Saldos por Entidad Bancaria</h3>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-[#0E6A3B] border border-emerald-300">
                {accounts.length} {accounts.length === 1 ? 'Cuenta' : 'Cuentas'}
              </span>
            </div>
            <p className="text-xs text-zinc-600 mt-0.5">
              Control consolidado de saldos, cuentas corrientes, depósitos y carteras
            </p>
          </div>
        </div>

        <button
          onClick={onOpenNewAccountModal}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-[#0E6A3B] hover:bg-[#0a522d] rounded-xl transition-all self-start sm:self-auto cursor-pointer shadow-xs active:scale-95"
        >
          <Plus className="w-3.5 h-3.5" />
          Añadir Cuenta
        </button>
      </div>

      {/* Empty State when 0 accounts */}
      {accounts.length === 0 && (
        <div className="bg-white border-2 border-dashed border-emerald-600/30 rounded-2xl p-8 sm:p-12 text-center space-y-4 shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 text-[#0E6A3B] flex items-center justify-center mx-auto shadow-2xs">
            <Building2 className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h4 className="font-black text-zinc-950 text-lg">¡Tu aplicación está limpia y lista para tus bancos!</h4>
            <p className="text-xs sm:text-sm text-zinc-600 max-w-md mx-auto leading-relaxed">
              No tienes ninguna cuenta registrada aún. Pulsa en <strong>Añadir Cuenta</strong> para registrar tu primera entidad (CaixaBank, ING, Sabadell, Openbank o cualquier otra), cuenta de ahorro, depósito o valores.
            </p>
          </div>
          <button
            onClick={onOpenNewAccountModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-[#0E6A3B] hover:bg-[#0a522d] rounded-xl shadow-xs cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Añadir Mi Primer Banco o Cuenta
          </button>
        </div>
      )}

      {/* DYNAMIC BANK GROUPS (Only banks that actually have accounts will show up!) */}
      {bankGroups.map((group) => {
        const isBBVA = group.bankId === 'bbva';
        const isSantander = group.bankId === 'santander';

        return (
          <div 
            key={group.bankId + group.bankName} 
            className="bg-white border-2 border-emerald-600/40 rounded-2xl shadow-sm ring-1 ring-emerald-950/5 overflow-hidden"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 border-b border-emerald-100/90 bg-gradient-to-r from-emerald-50/40 via-white to-zinc-50/40">
              <div className="flex items-center gap-3">
                <div 
                  className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-black text-sm tracking-wider shadow-xs"
                  style={{ backgroundColor: group.color }}
                >
                  {isBBVA ? 'BBVA' : isSantander ? 'SAN' : group.bankName.substring(0, 3).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-black text-zinc-950 text-base">{group.bankName}</h4>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                      {group.accounts.length} {group.accounts.length === 1 ? 'cuenta' : 'cuentas'}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-600 mt-0.5">
                    Posición global {group.bankName}: <span className="font-extrabold text-[#0E6A3B] font-feature-settings-tnum">{formatCurrency(group.total)}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                {/* Bank sync button only if BBVA or Santander */}
                {(isBBVA || isSantander) && (
                  <button
                    onClick={() => onSyncBank(isBBVA ? 'bbva' : 'santander')}
                    disabled={isSyncing}
                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold text-zinc-800 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-xl transition-colors cursor-pointer shadow-2xs"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>Sincronizar</span>
                  </button>
                )}

                {/* Botón Eliminar Banco */}
                {onDeleteBank && (
                  <button
                    type="button"
                    onClick={() => setBankToDelete(group)}
                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100/80 border border-rose-200/90 rounded-xl transition-colors cursor-pointer shadow-2xs"
                    title={`Eliminar entidad ${group.bankName} y todas sus cuentas asociadas`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Eliminar Banco</span>
                  </button>
                )}
              </div>
            </div>

            <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              {group.accounts.map(renderAccountCard)}
            </div>
          </div>
        );
      })}

      {/* Recuadro Cuentas de Valores (Inversión, Fondos y Acciones) resaltado con verde */}
      {investmentAccounts.length > 0 && (
        <div className="bg-white border-2 border-emerald-600/50 rounded-2xl shadow-sm ring-1 ring-emerald-950/5 overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 border-b border-emerald-100 bg-gradient-to-r from-emerald-50/70 via-white to-emerald-50/40">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-[#092B19] flex items-center justify-center text-emerald-400 font-black text-xs shadow-xs border border-emerald-800">
                <LineChart className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-black text-zinc-950 text-base">Cuentas de Valores e Inversión</h4>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-[#0E6A3B] border border-emerald-300">
                    Cartera Activa
                  </span>
                </div>
                <p className="text-xs text-zinc-600 mt-0.5">
                  Valor liquidativo consolidado: <span className="font-extrabold text-[#0E6A3B] font-feature-settings-tnum">{formatCurrency(investmentTotal)}</span>
                </p>
              </div>
            </div>

            <button
              onClick={onOpenNewAccountModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-[#0E6A3B] hover:bg-[#0a522d] rounded-xl transition-all self-start sm:self-auto cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Añadir Cartera de Valores
            </button>
          </div>

          <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
            {investmentAccounts.map(renderAccountCard)}
          </div>
        </div>
      )}

      {/* Recuadro Depósitos a Plazo Fijo */}
      {depositAccounts.length > 0 && (
        <div className="bg-white border-2 border-sky-600/50 rounded-2xl shadow-sm ring-1 ring-sky-950/5 overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 border-b border-sky-100 bg-gradient-to-r from-sky-50/70 via-white to-sky-50/40">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-sky-700 flex items-center justify-center text-white font-black text-xs shadow-xs border border-sky-800">
                <Landmark className="w-5 h-5 text-sky-100" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-black text-zinc-950 text-base">Depósitos a Plazo Fijo</h4>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-300">
                    Rendimiento Garantizado
                  </span>
                </div>
                <p className="text-xs text-zinc-600 mt-0.5">
                  Capital total en depósitos: <span className="font-extrabold text-sky-800 font-feature-settings-tnum">{formatCurrency(depositTotal)}</span>
                </p>
              </div>
            </div>

            <button
              onClick={onOpenNewAccountModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-sky-700 hover:bg-sky-800 rounded-xl transition-all self-start sm:self-auto cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Añadir Depósito
            </button>
          </div>

          <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
            {depositAccounts.map(renderAccountCard)}
          </div>
        </div>
      )}

      {/* Modal de confirmación para eliminar la Entidad Bancaria completa */}
      {bankToDelete && (
        <div 
          id="delete-bank-modal-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div 
            id="delete-bank-modal-content"
            className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-rose-200 animate-in zoom-in-95 duration-200"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-rose-100 border border-rose-200 text-rose-700 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-base sm:text-lg font-black text-zinc-950">
                    ¿Eliminar {bankToDelete.bankName}?
                  </h4>
                  <span className="text-xs text-rose-600 font-bold block mt-0.5">
                    Acción irreversible
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBankToDelete(null)}
                className="p-1.5 text-zinc-400 hover:text-zinc-700 rounded-lg hover:bg-zinc-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs text-zinc-600">
              <p className="leading-relaxed">
                Vas a eliminar por completo la entidad <strong>{bankToDelete.bankName}</strong> de tu aplicación. A continuación se detalla todo lo que será borrado:
              </p>

              <div className="bg-rose-50/70 border border-rose-200/90 rounded-xl p-3.5 space-y-3 text-zinc-700">
                <div className="flex items-start gap-2.5">
                  <div className="w-2 h-2 rounded-full bg-rose-500 mt-1 shrink-0" />
                  <div className="flex-1">
                    <span className="font-bold text-zinc-900 block">
                      {bankToDelete.accounts.length} {bankToDelete.accounts.length === 1 ? 'cuenta bancaria asociada' : 'cuentas bancarias asociadas'}:
                    </span>
                    <ul className="mt-1.5 space-y-1.5 text-[11px] text-zinc-600">
                      {bankToDelete.accounts.map((acc) => (
                        <li key={acc.id} className="flex items-center justify-between bg-white/70 px-2.5 py-1 rounded-lg border border-rose-100">
                          <span className="font-medium text-zinc-800">
                            • {acc.accountName} <span className="font-mono text-zinc-400">({acc.accountNumberMasked})</span>
                          </span>
                          <span className="font-bold text-zinc-900 font-feature-settings-tnum">{formatCurrency(acc.balance)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 pt-2.5 border-t border-rose-200/60">
                  <div className="w-2 h-2 rounded-full bg-rose-500 mt-1 shrink-0" />
                  <div className="flex-1">
                    <span className="font-bold text-zinc-900">
                      {bankTransactionsCount} {bankTransactionsCount === 1 ? 'movimiento del historial' : 'movimientos del historial'}
                    </span>
                    <p className="text-[11px] text-zinc-500 mt-0.5 leading-relaxed">
                      Todos los ingresos, gastos y transferencias vinculados a estas cuentas se eliminarán permanentemente.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 pt-2.5 border-t border-rose-200/60">
                  <div className="w-2 h-2 rounded-full bg-rose-500 mt-1 shrink-0" />
                  <div className="flex-1">
                    <span className="font-bold text-zinc-900">
                      Saldo consolidado: <span className="font-extrabold text-rose-700">{formatCurrency(bankToDelete.total)}</span>
                    </span>
                    <p className="text-[11px] text-zinc-500 mt-0.5 leading-relaxed">
                      Este importe se descontará automáticamente de tu balance global y patrimonio neto.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-100">
              <button
                type="button"
                onClick={() => setBankToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-zinc-700 hover:text-zinc-950 bg-zinc-100 hover:bg-zinc-200/80 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  const accountIds = bankToDelete.accounts.map((a) => a.id);
                  if (onDeleteBank) {
                    onDeleteBank(bankToDelete.bankId, bankToDelete.bankName, accountIds);
                  }
                  setBankToDelete(null);
                }}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:scale-95 rounded-xl transition-all shadow-xs cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Sí, eliminar {bankToDelete.bankName}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
