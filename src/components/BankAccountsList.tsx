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
  ExternalLink,
  TrendingUp,
  LineChart,
  Landmark
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

  // Group accounts by bank and type
  const bbvaAccounts = accounts.filter((a) => a.bankId === 'bbva' && a.type !== 'investment' && a.type !== 'deposit');
  const santanderAccounts = accounts.filter((a) => a.bankId === 'santander' && a.type !== 'investment' && a.type !== 'deposit');
  const investmentAccounts = accounts.filter((a) => a.type === 'investment');
  const depositAccounts = accounts.filter((a) => a.type === 'deposit');
  const otherAccounts = accounts.filter((a) => a.bankId !== 'bbva' && a.bankId !== 'santander' && a.type !== 'investment' && a.type !== 'deposit');

  const bbvaTotal = bbvaAccounts.reduce((sum, a) => sum + a.balance, 0);
  const santanderTotal = santanderAccounts.reduce((sum, a) => sum + a.balance, 0);
  const investmentTotal = investmentAccounts.reduce((sum, a) => sum + a.balance, 0);
  const depositTotal = depositAccounts.reduce((sum, a) => sum + a.balance, 0);

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
          {/* Header row with card type, contactless icon, and edit button */}
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
              className={`text-xl sm:text-2xl font-black tracking-tight font-feature-settings-tnum ${
                account.balance < 0 ? 'text-rose-600' : isDeposit ? 'text-sky-950' : 'text-zinc-950'
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
              {isInvestment ? 'Cartera activa' : isDeposit ? 'Depósito vigente' : isCredit ? 'Disposición autorizada' : 'Fondos disponibles'}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div id="section-bank-accounts" className="space-y-6">
      
      {/* Section Header: Saldos por Entidad Bancaria resaltado en verde */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-emerald-50/80 via-white to-emerald-50/40 p-4 sm:p-5 rounded-2xl border-2 border-[#0E6A3B]/45 shadow-xs ring-1 ring-emerald-950/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100/90 border border-emerald-300/80 flex items-center justify-center text-[#0E6A3B] shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-black text-zinc-950">Saldos por Entidad Bancaria</h3>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-[#0E6A3B] border border-emerald-300">
                PSD2 Activo
              </span>
            </div>
            <p className="text-xs text-zinc-600 mt-0.5">
              Conexiones sincronizadas en tiempo real con PSD2 Open Banking
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

      {/* Recuadro Banco Bilbao Vizcaya Argentaria (BBVA) resaltado con verde */}
      <div className="bg-white border-2 border-emerald-600/40 rounded-2xl shadow-sm ring-1 ring-emerald-950/5 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 border-b border-emerald-100/90 bg-gradient-to-r from-emerald-50/50 via-white to-blue-50/30">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-[#004481] flex items-center justify-center text-white font-black text-sm tracking-wider shadow-xs">
              BBVA
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-black text-zinc-950 text-base">Banco Bilbao Vizcaya Argentaria</h4>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-blue-50 text-[#004481] border border-blue-200">
                  PSD2 Conectado
                </span>
              </div>
              <p className="text-xs text-zinc-600 mt-0.5">
                Posición global BBVA: <span className="font-extrabold text-[#0E6A3B] font-feature-settings-tnum">{formatCurrency(bbvaTotal)}</span>
              </p>
            </div>
          </div>

          <button
            onClick={() => onSyncBank('bbva')}
            disabled={isSyncing}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold text-[#004481] bg-blue-50 hover:bg-blue-100/80 border border-blue-200 rounded-xl transition-colors cursor-pointer self-start sm:self-auto shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            Sincronizar BBVA
          </button>
        </div>

        <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          {bbvaAccounts.map(renderAccountCard)}
        </div>
      </div>

      {/* Recuadro Banco Santander resaltado con verde */}
      <div className="bg-white border-2 border-emerald-600/40 rounded-2xl shadow-sm ring-1 ring-emerald-950/5 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 border-b border-emerald-100/90 bg-gradient-to-r from-emerald-50/50 via-white to-red-50/30">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-[#EC0000] flex items-center justify-center text-white font-black text-xs tracking-wider shadow-xs">
              SAN
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-black text-zinc-950 text-base">Banco Santander S.A.</h4>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-red-50 text-[#EC0000] border border-red-200">
                  PSD2 Conectado
                </span>
              </div>
              <p className="text-xs text-zinc-600 mt-0.5">
                Posición global Santander: <span className="font-extrabold text-[#0E6A3B] font-feature-settings-tnum">{formatCurrency(santanderTotal)}</span>
              </p>
            </div>
          </div>

          <button
            onClick={() => onSyncBank('santander')}
            disabled={isSyncing}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold text-[#EC0000] bg-red-50 hover:bg-red-100/80 border border-red-200 rounded-xl transition-colors cursor-pointer self-start sm:self-auto shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            Sincronizar Santander
          </button>
        </div>

        <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          {santanderAccounts.map(renderAccountCard)}
        </div>
      </div>

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

      {/* Otras Cuentas Bancarias si existen */}
      {otherAccounts.length > 0 && (
        <div className="bg-white border-2 border-emerald-600/40 rounded-2xl p-4 sm:p-5 shadow-sm ring-1 ring-emerald-950/5">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-black text-zinc-950 text-base">Otras Entidades y Cuentas</h4>
            <span className="text-xs text-zinc-500 font-medium">
              {otherAccounts.length} {otherAccounts.length === 1 ? 'cuenta registrada' : 'cuentas registradas'}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {otherAccounts.map(renderAccountCard)}
          </div>
        </div>
      )}

    </div>
  );
};
