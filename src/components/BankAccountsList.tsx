import React, { useState } from 'react';
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
  ExternalLink
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
    const isBBVA = account.bankId === 'bbva';
    const isSantander = account.bankId === 'santander';

    return (
      <div
        key={account.id}
        id={`account-card-${account.id}`}
        className="relative bg-white rounded-xl border border-zinc-200/90 hover:border-zinc-300 hover:shadow-sm transition-all p-4 sm:p-5 flex flex-col justify-between group overflow-hidden"
      >
        {/* Accent colored top strip */}
        <div 
          className="absolute top-0 left-0 right-0 h-1"
          style={{ backgroundColor: account.color }}
        />

        <div>
          {/* Header row with card type, contactless icon, and edit button */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              {/* Mini gold EMV chip graphic */}
              <div className="w-7 h-5 rounded-xs bg-amber-200/80 border border-amber-300/80 flex items-center justify-center p-0.5 shadow-2xs">
                <div className="w-full h-full border border-amber-400/60 rounded-[1px] grid grid-cols-2 gap-0.5">
                  <div className="bg-amber-300/40"></div>
                  <div className="bg-amber-300/40"></div>
                </div>
              </div>

              <Wifi className="w-3.5 h-3.5 text-zinc-400 rotate-90" />

              <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                {isCredit ? 'Tarjeta Crédito' : isSavings ? 'Ahorro' : 'Cuenta Corriente'}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                Live
              </span>
              <button
                onClick={() => onEditAccount(account)}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-zinc-400 hover:text-zinc-700 rounded-md hover:bg-zinc-100 cursor-pointer"
                title="Editar cuenta"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Account name */}
          <h4 className="text-base font-bold text-zinc-900 leading-snug">
            {account.accountName}
          </h4>

          {/* Masked Card / Account digits & IBAN */}
          <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-zinc-100">
            <div className="flex items-center gap-2 text-xs font-mono text-zinc-500">
              <span className="tracking-widest">{account.accountNumberMasked}</span>
            </div>
            <button
              onClick={() => copyToClipboard(account.iban, account.id)}
              className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium text-zinc-600 hover:text-zinc-950 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200/80 rounded transition-colors cursor-pointer"
              title="Copiar IBAN completo"
            >
              {copiedId === account.id ? (
                <>
                  <Check className="w-3 h-3 text-[#0E6A3B]" />
                  <span className="text-[#0E6A3B] font-semibold">Copiado</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3 text-zinc-400" />
                  <span>IBAN</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Balance and sync info */}
        <div className="mt-4 pt-3 border-t border-zinc-100 flex items-end justify-between">
          <div>
            <span className="text-[11px] font-medium text-zinc-400 block">Saldo disponible</span>
            <span
              className={`text-xl sm:text-2xl font-extrabold tracking-tight font-feature-settings-tnum ${
                account.balance < 0 ? 'text-rose-600' : 'text-zinc-900'
              }`}
            >
              {formatCurrency(account.balance)}
            </span>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-zinc-400 block">
              Actualizado {formatRelativeTime(account.lastSynced)}
            </span>
            <span className="text-[11px] font-bold text-zinc-700">
              {isCredit ? 'Disposición autorizada' : 'Fondos disponibles'}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div id="section-bank-accounts" className="space-y-6">
      
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-zinc-200/80 shadow-2xs">
        <div>
          <h3 className="text-base font-bold text-zinc-900">Saldos por Entidad Bancaria</h3>
          <p className="text-xs text-zinc-500">
            Conexiones sincronizadas en tiempo real con PSD2 Open Banking
          </p>
        </div>

        <button
          onClick={onOpenNewAccountModal}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-950 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors self-start sm:self-auto cursor-pointer shadow-2xs"
        >
          <Plus className="w-3.5 h-3.5 text-[#0E6A3B]" />
          Añadir Cuenta
        </button>
      </div>

      {/* BBVA Section */}
      <div className="bg-white border border-zinc-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3.5 border-b border-zinc-100">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-[#004481] flex items-center justify-center text-white font-black text-sm tracking-wider shadow-xs">
              BBVA
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-zinc-950 text-base">Banco Bilbao Vizcaya Argentaria</h4>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-blue-50 text-[#004481] border border-blue-200">
                  PSD2 Conectado
                </span>
              </div>
              <p className="text-xs text-zinc-500">
                Posición global BBVA: <span className="font-bold text-zinc-900 font-feature-settings-tnum">{formatCurrency(bbvaTotal)}</span>
              </p>
            </div>
          </div>

          <button
            onClick={() => onSyncBank('bbva')}
            disabled={isSyncing}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#004481] bg-blue-50/70 border border-blue-200 hover:bg-blue-100/80 rounded-lg transition-colors cursor-pointer self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            Sincronizar BBVA
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {bbvaAccounts.map(renderAccountCard)}
        </div>
      </div>

      {/* Santander Section */}
      <div className="bg-white border border-zinc-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3.5 border-b border-zinc-100">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-[#EC0000] flex items-center justify-center text-white font-black text-xs tracking-wider shadow-xs">
              SAN
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-zinc-950 text-base">Banco Santander S.A.</h4>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-red-50 text-[#EC0000] border border-red-200">
                  PSD2 Conectado
                </span>
              </div>
              <p className="text-xs text-zinc-500">
                Posición global Santander: <span className="font-bold text-zinc-900 font-feature-settings-tnum">{formatCurrency(santanderTotal)}</span>
              </p>
            </div>
          </div>

          <button
            onClick={() => onSyncBank('santander')}
            disabled={isSyncing}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#EC0000] bg-red-50/70 border border-red-200 hover:bg-red-100/80 rounded-lg transition-colors cursor-pointer self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            Sincronizar Santander
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {santanderAccounts.map(renderAccountCard)}
        </div>
      </div>

      {/* Other Accounts if present */}
      {otherAccounts.length > 0 && (
        <div className="bg-white border border-zinc-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs">
          <h4 className="font-bold text-zinc-950 text-base mb-3">Otras Cuentas Bancarias</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {otherAccounts.map(renderAccountCard)}
          </div>
        </div>
      )}

    </div>
  );
};
