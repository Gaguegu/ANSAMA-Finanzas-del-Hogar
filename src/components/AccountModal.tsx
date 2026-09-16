import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { BankAccount, BankId, AccountType } from '../types';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveAccount: (account: BankAccount) => void;
  accountToEdit?: BankAccount | null;
}

export const AccountModal: React.FC<AccountModalProps> = ({
  isOpen,
  onClose,
  onSaveAccount,
  accountToEdit
}) => {
  const [bankId, setBankId] = useState<BankId>('bbva');
  const [accountName, setAccountName] = useState('');
  const [iban, setIban] = useState('');
  const [type, setType] = useState<AccountType>('checking');
  const [balanceStr, setBalanceStr] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (accountToEdit) {
      setBankId(accountToEdit.bankId);
      setAccountName(accountToEdit.accountName);
      setIban(accountToEdit.iban);
      setType(accountToEdit.type);
      setBalanceStr(accountToEdit.balance.toString());
    } else {
      setBankId('bbva');
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
      setError('El nombre de la cuenta no puede estar vacío.');
      return;
    }

    const bankName = bankId === 'bbva' ? 'BBVA' : bankId === 'santander' ? 'Santander' : bankId === 'caixabank' ? 'CaixaBank' : 'ING Direct';
    const color = bankId === 'bbva' ? '#004481' : bankId === 'santander' ? '#EC0000' : '#007eae';
    
    // Masked IBAN
    const cleanIban = iban.trim();
    const last4 = cleanIban.replace(/\s+/g, '').slice(-4) || '0000';
    const masked = `${cleanIban.substring(0, 4)} •••• •••• ${last4}`;

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
      bgLight: bankId === 'bbva' ? '#f0f5fa' : '#fff5f5',
      borderColor: color
    };

    onSaveAccount(account);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div 
        className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-900">
            {accountToEdit ? 'Editar Cuenta Bancaria' : 'Añadir Nueva Cuenta Bancaria'}
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 text-xs rounded-xl bg-rose-50 text-rose-700 border border-rose-200">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Entidad Bancaria</label>
            <select
              value={bankId}
              onChange={(e) => {
                const val = e.target.value as BankId;
                setBankId(val);
                if (val === 'bbva' && (!iban || iban.startsWith('ES91'))) setIban('ES76 0182 ');
                if (val === 'santander' && (!iban || iban.startsWith('ES76'))) setIban('ES91 0049 ');
              }}
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:bg-white text-slate-900 font-medium"
            >
              <option value="bbva">BBVA (Banco Bilbao Vizcaya Argentaria)</option>
              <option value="santander">Banco Santander</option>
              <option value="caixabank">CaixaBank</option>
              <option value="ing">ING</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre de la Cuenta</label>
            <input
              type="text"
              required
              placeholder="Ej: Cuenta Nómina, Cuenta Ahorro, Tarjeta Aqua..."
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:bg-white text-slate-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Tipo de Cuenta</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as AccountType)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:bg-white text-slate-900 font-medium"
              >
                <option value="checking">Cuenta Corriente</option>
                <option value="savings">Cuenta de Ahorro</option>
                <option value="credit">Tarjeta de Crédito</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Saldo Actual (€)</label>
              <input
                type="text"
                required
                value={balanceStr}
                onChange={(e) => setBalanceStr(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 text-xs font-bold rounded-xl bg-slate-50 border border-slate-200 focus:bg-white text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Número IBAN</label>
            <input
              type="text"
              required
              value={iban}
              onChange={(e) => setIban(e.target.value)}
              placeholder="ESXX XXXX XXXX XXXX XXXX XXXX"
              className="w-full px-3 py-2 text-xs font-mono rounded-xl bg-slate-50 border border-slate-200 focus:bg-white text-slate-900"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm cursor-pointer"
            >
              Guardar Cuenta
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
