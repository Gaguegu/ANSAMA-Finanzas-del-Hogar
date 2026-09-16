import React, { useState } from 'react';
import { 
  Building2, 
  CreditCard, 
  PiggyBank, 
  Copy, 
  Check, 
  RefreshCw, 
  Plus, 
  ArrowUpRight,
  ExternalLink,
  ShieldCheck,
  Edit2
} from 'lucide-react';
import { BankAccount } from '../types';
import { formatCurrency, formatRelativeTime } from '../utils/storage';

interface BankAccountsListProps {
  accounts: BankAccount[];
  onSyncBank: (bankId: 'bbva' | 'santander') => void;
  onOpenNewAccountModal: () => void;
  onEditAccount: (account: BankAccount) => void;
  isSyncing: boolean;
}

export const BankAccountsList: React.FC<BankAccountsListProps> = ({
  accounts,
  onSyncBank,
  onOpenNewAccountModal,
  onEditAccount,
  isSyncing
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  // Group accounts by bank
  const bbvaAccounts = accounts.filter((a) => a.bankId === 'bbva');
  const santanderAccounts = accounts.filter((a) => a.bankId === 'santander');
  const otherAccounts = accounts.filter((a) => a.bankId !== 'bbva' && a.bankId !== 'santander');

  const bbvaTotal = bbvaAccounts.reduce((sum, a) => sum + a.balance, 0);
  const santanderTotal = santanderAccounts.reduce((sum, a) => sum + a.balance, 0);

  const renderAccountCard = (account: BankAccount) => {
    const isCredit = account.type === 'credit';
    const isSavings = account.type === 'savings';

    return (
      <div
        key={account.id}
        id={`account-card-${account.id}`}
        className="relative bg-white rounded-xl border border-slate-200 hover:border-slate-300 transition-all p-4 flex flex-col justify-between shadow-xs group"
      >
        <div>
          {/* Header row with badge and edit button */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <span 
                className="w-2.5 h-2.5 rounded-full" 
                style={{ backgroundColor: account.color }}
              />
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {isCredit ? 'Tarjeta Crédito' : isSavings ? 'Cuenta de Ahorro' : 'Cuenta Corriente'}
              </span>
            </div>

            <button
              onClick={() => onEditAccount(account)}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100"
              title="Editar cuenta"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Account name */}
          <h4 className="text-base font-bold text-slate-900 leading-snug">
            {account.accountName}
          </h4>

          {/* Masked IBAN with copy button */}
          <div className="flex items-center gap-1.5 mt-1.5 text-xs text-slate-500 font-mono">
            <span>{account.accountNumberMasked}</span>
            <button
              onClick={() => copyToClipboard(account.iban, account.id)}
              className="p-1 hover:text-slate-900 rounded transition-colors text-slate-400 hover:bg-slate-100"
              title="Copiar IBAN completo"
            >
              {copiedId === account.id ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* Balance and sync info */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-end justify-between">
          <div>
            <span className="text-[11px] text-slate-400 block">Saldo disponible</span>
            <span
              className={`text-lg sm:text-xl font-extrabold tracking-tight ${
                account.balance < 0 ? 'text-rose-600' : 'text-slate-900'
              }`}
            >
              {formatCurrency(account.balance)}
            </span>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-slate-400 block">
              {formatRelativeTime(account.lastSynced)}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
              <ShieldCheck className="w-3 h-3" />
              Conectado
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div id="section-bank-accounts" className="space-y-6">
      
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Saldos por Entidad Bancaria</h3>
          <p className="text-xs text-slate-500">
            Conexiones sincronizadas de forma segura mediante simulación Open Banking PSD2
          </p>
        </div>

        <button
          onClick={onOpenNewAccountModal}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          Añadir Cuenta Bancaria
        </button>
      </div>

      {/* BBVA Section */}
      <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#004481] flex items-center justify-center text-white font-black text-sm tracking-wider shadow-xs">
              BBVA
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-slate-900 text-base">Banco Bilbao Vizcaya Argentaria</h4>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-900">
                  PSD2 Live
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Total acumulado BBVA: <span className="font-bold text-slate-800">{formatCurrency(bbvaTotal)}</span>
              </p>
            </div>
          </div>

          <button
            onClick={() => onSyncBank('bbva')}
            disabled={isSyncing}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#004481] bg-white border border-[#004481]/30 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            Sincronizar BBVA
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {bbvaAccounts.map(renderAccountCard)}
        </div>
      </div>

      {/* Santander Section */}
      <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#EC0000] flex items-center justify-center text-white font-black text-xs tracking-wider shadow-xs">
              SAN
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-slate-900 text-base">Banco Santander S.A.</h4>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-red-100 text-red-900">
                  PSD2 Live
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Total acumulado Santander: <span className="font-bold text-slate-800">{formatCurrency(santanderTotal)}</span>
              </p>
            </div>
          </div>

          <button
            onClick={() => onSyncBank('santander')}
            disabled={isSyncing}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#EC0000] bg-white border border-[#EC0000]/30 hover:bg-red-50 rounded-lg transition-colors cursor-pointer self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            Sincronizar Santander
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {santanderAccounts.map(renderAccountCard)}
        </div>
      </div>

      {/* Other Accounts if present */}
      {otherAccounts.length > 0 && (
        <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 sm:p-5">
          <h4 className="font-bold text-slate-900 text-base mb-3">Otras Cuentas Bancarias</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {otherAccounts.map(renderAccountCard)}
          </div>
        </div>
      )}

    </div>
  );
};
