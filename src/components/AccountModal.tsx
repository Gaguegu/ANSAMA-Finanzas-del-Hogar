import React, { useState, useEffect } from 'react';
import { X, Landmark, Trash2, AlertTriangle } from 'lucide-react';
import { BankAccount, BankId, AccountType } from '../types';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveAccount: (account: BankAccount) => void;
  onDeleteAccount?: (id: string) => void;
  accountToEdit?: BankAccount | null;
}

export const AccountModal: React.FC<AccountModalProps> = ({
  isOpen,
  onClose,
  onSaveAccount,
  onDeleteAccount,
  accountToEdit
}) => {
  const [bankId, setBankId] = useState<BankId>('bbva');
  const [customBankName, setCustomBankName] = useState('');
  const [accountName, setAccountName] = useState('');
  const [iban, setIban] = useState('');
  const [type, setType] = useState<AccountType>('checking');
  const [balanceStr, setBalanceStr] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    setShowDeleteConfirm(false);
    if (accountToEdit) {
      setBankId(accountToEdit.bankId);
      if (accountToEdit.bankId === 'other') {
        setCustomBankName(accountToEdit.bankName);
      } else {
        setCustomBankName('');
      }
      setAccountName(accountToEdit.accountName);
      setIban(accountToEdit.iban);
      setType(accountToEdit.type);
      setBalanceStr(accountToEdit.balance.toString());
    } else {
      setBankId('bbva');
      setCustomBankName('');
      setAccountName('');
      setIban('ES76 0182 ');
      setType('checking');
      setBalanceStr('1000.00');
    }
    setError(null);
  }, [accountToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsedBalance = parseFloat(balanceStr.replace(',', '.'));
    if (isNaN(parsedBalance)) {
      setError('Introduce un saldo numérico válido.');
      return;
    }

    if (!accountName.trim()) {
      setError('El nombre o descripción de la cuenta no puede estar vacío.');
      return;
    }

    if (bankId === 'other' && !customBankName.trim()) {
      setError('Por favor, indica el nombre de la entidad o banco.');
      return;
    }

    const bankNames: Record<BankId, string> = {
      bbva: 'BBVA',
      santander: 'Banco Santander',
      caixabank: 'CaixaBank',
      ing: 'ING Direct',
      sabadell: 'Banco Sabadell',
      bankinter: 'Bankinter',
      unicaja: 'Unicaja Banco',
      abanca: 'Abanca',
      openbank: 'Openbank',
      myinvestor: 'MyInvestor',
      traderepublic: 'Trade Republic',
      degiro: 'DeGiro',
      renta4: 'Renta 4 Banco',
      other: customBankName.trim() || 'Otra Entidad'
    };

    const bankColors: Record<BankId, string> = {
      bbva: '#004481',
      santander: '#EC0000',
      caixabank: '#007eae',
      ing: '#ff6200',
      sabadell: '#002B49',
      bankinter: '#FF6600',
      unicaja: '#00833E',
      abanca: '#0055A5',
      openbank: '#C8102E',
      myinvestor: '#1b365d',
      traderepublic: '#1a1a1a',
      degiro: '#0097c3',
      renta4: '#00549f',
      other: type === 'deposit' ? '#0284c7' : '#0E6A3B'
    };

    const bankName = bankId === 'other' ? (customBankName.trim() || 'Otra Entidad') : (bankNames[bankId] || 'Banco');
    const color = type === 'investment' 
      ? '#0E6A3B' 
      : type === 'deposit' 
        ? '#0284c7' 
        : (bankColors[bankId] || '#0E6A3B');
    
    // Masked IBAN / Account number
    const cleanIban = iban.trim();
    const last4 = cleanIban.replace(/\s+/g, '').slice(-4) || '0000';
    let masked = '';
    if (type === 'investment') {
      masked = `VAL •••• ${last4}`;
    } else if (type === 'deposit') {
      masked = `DEP •••• ${last4}`;
    } else if (cleanIban.length > 4) {
      masked = `${cleanIban.substring(0, 4)} •••• •••• ${last4}`;
    } else {
      masked = `CTA •••• ${last4}`;
    }

    const account: BankAccount = {
      id: accountToEdit ? accountToEdit.id : `acc-${bankId}-${Date.now()}`,
      bankId,
      bankName,
      accountName: accountName.trim(),
      iban: cleanIban,
      accountNumberMasked: masked,
      type,
      balance: parsedBalance,
      currency: 'EUR',
      lastSynced: new Date().toISOString(),
      color,
      textColor: '#ffffff',
      bgLight: bankId === 'bbva' 
        ? '#f0f5fa' 
        : bankId === 'santander' 
          ? '#fff5f5' 
          : type === 'deposit' 
            ? '#f0f9ff' 
            : '#f0fdf4',
      borderColor: color
    };

    onSaveAccount(account);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div 
        className="bg-white rounded-2xl border-2 border-emerald-600/40 shadow-xl max-w-md w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-emerald-100 bg-emerald-50/50">
          <div>
            <h3 className="text-base font-black text-zinc-950">
              {accountToEdit ? 'Editar Cuenta / Depósito / Valores' : 'Añadir Nueva Cuenta, Depósito o Cartera'}
            </h3>
            <p className="text-xs text-zinc-500">Corrientes, ahorro, depósitos a plazo fijo, valores y tarjetas</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 text-xs rounded-xl bg-rose-50 text-rose-700 border border-rose-200">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">Tipo de Producto</label>
              <select
                value={type}
                onChange={(e) => {
                  const newType = e.target.value as AccountType;
                  setType(newType);
                  if (newType === 'investment' && !accountName) {
                    setAccountName('Cartera de Fondos y Acciones');
                  } else if (newType === 'deposit' && !accountName) {
                    setAccountName('Depósito a Plazo Fijo');
                  }
                }}
                className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-50 border border-zinc-200 focus:bg-white text-zinc-900 font-bold cursor-pointer"
              >
                <option value="checking">Cuenta Corriente</option>
                <option value="savings">Cuenta de Ahorro</option>
                <option value="deposit">🏦 Depósito a Plazo Fijo</option>
                <option value="investment">📈 Cuenta de Valores</option>
                <option value="credit">Tarjeta de Crédito</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">Entidad o Bróker</label>
              <select
                value={bankId}
                onChange={(e) => {
                  const val = e.target.value as BankId;
                  setBankId(val);
                  if (val === 'bbva' && (!iban || iban.startsWith('ES91'))) setIban('ES76 0182 ');
                  if (val === 'santander' && (!iban || iban.startsWith('ES76'))) setIban('ES91 0049 ');
                  if (val === 'caixabank' && (!iban || iban.startsWith('ES76') || iban.startsWith('ES91'))) setIban('ES21 2100 ');
                  if (val === 'ing' && (!iban || iban.startsWith('ES76') || iban.startsWith('ES91'))) setIban('ES14 1465 ');
                }}
                className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-50 border border-zinc-200 focus:bg-white text-zinc-900 font-medium cursor-pointer"
              >
                <optgroup label="Banca Tradicional">
                  <option value="bbva">BBVA</option>
                  <option value="santander">Banco Santander</option>
                  <option value="caixabank">CaixaBank</option>
                  <option value="ing">ING</option>
                  <option value="sabadell">Banco Sabadell</option>
                  <option value="bankinter">Bankinter</option>
                  <option value="unicaja">Unicaja Banco</option>
                  <option value="abanca">Abanca</option>
                  <option value="openbank">Openbank</option>
                </optgroup>
                <optgroup label="Inversión / Brókers">
                  <option value="myinvestor">MyInvestor</option>
                  <option value="traderepublic">Trade Republic</option>
                  <option value="degiro">DeGiro</option>
                  <option value="renta4">Renta 4 Banco</option>
                </optgroup>
                <optgroup label="Otra Entidad">
                  <option value="other">✏️ Otra Entidad (Personalizada)...</option>
                </optgroup>
              </select>
            </div>
          </div>

          {/* Campo condicional para escribir el nombre de cualquier otro Banco o Entidad */}
          {bankId === 'other' && (
            <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 animate-in fade-in">
              <label className="block text-xs font-bold text-emerald-950 mb-1 flex items-center gap-1.5">
                <Landmark className="w-3.5 h-3.5 text-[#0E6A3B]" />
                Nombre de tu Entidad o Banco *
              </label>
              <input
                type="text"
                required
                placeholder="Ej: Renault Bank, Banco Facto, Pibank, Wizink, N26, Revolut, Kutxabank..."
                value={customBankName}
                onChange={(e) => setCustomBankName(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg bg-white border border-emerald-300 focus:border-[#0E6A3B] focus:ring-1 focus:ring-[#0E6A3B] text-zinc-900 font-semibold"
              />
              <p className="text-[11px] text-emerald-800 mt-1">
                Puedes escribir aquí cualquier banco, caja o plataforma de depósitos/inversión.
              </p>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-zinc-700 mb-1">Nombre Descriptivo</label>
            <input
              type="text"
              required
              placeholder={
                type === 'deposit'
                  ? 'Ej: Depósito 12 meses al 3.5% TAE, Depósito Facto 6 meses...'
                  : type === 'investment'
                    ? 'Ej: Cuenta Valores BBVA Trader, Fondo Indexado Vanguard...'
                    : 'Ej: Cuenta Nómina, Cuenta Ahorro Hogar...'
              }
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-50 border border-zinc-200 focus:bg-white text-zinc-900 font-medium"
            />
          </div>

          {/* Fila con Saldo y el ÚNICO campo para IBAN / Referencia */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">
                {type === 'investment' 
                  ? 'Valor Liquidativo Total (€)' 
                  : type === 'deposit'
                    ? 'Capital Depositado (€)'
                    : 'Saldo Actual (€)'}
              </label>
              <input
                type="text"
                required
                value={balanceStr}
                onChange={(e) => setBalanceStr(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 text-xs font-bold rounded-xl bg-zinc-50 border border-zinc-200 focus:bg-white text-zinc-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">
                {type === 'investment' 
                  ? 'Nº Cuenta / Ref. Cartera' 
                  : type === 'deposit'
                    ? 'Nº Depósito / IBAN' 
                    : 'Número IBAN'}
              </label>
              <input
                type="text"
                required
                value={iban}
                onChange={(e) => setIban(e.target.value)}
                placeholder={
                  type === 'investment' 
                    ? 'ESXX... o Ref. Cartera' 
                    : type === 'deposit'
                      ? 'ESXX... o Referencia'
                      : 'ESXX XXXX XXXX XXXX XXXX XXXX'
                }
                className="w-full px-3 py-2 text-xs font-mono rounded-xl bg-zinc-50 border border-zinc-200 focus:bg-white text-zinc-900"
              />
            </div>
          </div>

          {showDeleteConfirm ? (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs space-y-2 animate-in fade-in">
              <div className="flex items-center gap-2 text-rose-800 font-bold">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>¿Eliminar esta cuenta bancaria ({accountToEdit?.accountName})?</span>
              </div>
              <p className="text-[11px] text-rose-700">
                Se eliminará esta cuenta y dejará de mostrarse en tu panel. Esta acción no se puede deshacer.
              </p>
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-2.5 py-1 text-xs font-semibold text-zinc-600 hover:bg-white rounded-lg border border-zinc-200 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (accountToEdit && onDeleteAccount) {
                      onDeleteAccount(accountToEdit.id);
                      onClose();
                    }
                  }}
                  className="px-3 py-1 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs cursor-pointer flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  Sí, eliminar cuenta
                </button>
              </div>
            </div>
          ) : null}

          <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-100">
            {accountToEdit && onDeleteAccount && !showDeleteConfirm ? (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Eliminar Cuenta
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold text-white bg-[#0E6A3B] hover:bg-[#0a522d] rounded-xl shadow-xs cursor-pointer"
              >
                Guardar Cuenta
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
