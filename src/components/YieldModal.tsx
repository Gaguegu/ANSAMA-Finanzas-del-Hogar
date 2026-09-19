import React, { useState, useEffect } from 'react';
import { 
  X, 
  Percent, 
  Coins, 
  Building2, 
  Calendar, 
  TrendingUp, 
  Check, 
  HelpCircle,
  FileText,
  Layers,
  ArrowRight
} from 'lucide-react';
import { BankAccount, YieldRecord, YieldType, Transaction } from '../types';
import { formatCurrency } from '../utils/storage';

interface YieldModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: BankAccount[];
  onSaveYield: (yieldRecord: YieldRecord, syncWithTransactions: boolean) => void;
  initialYield?: YieldRecord | null;
}

export const YieldModal: React.FC<YieldModalProps> = ({
  isOpen,
  onClose,
  accounts,
  onSaveYield,
  initialYield
}) => {
  const [type, setType] = useState<YieldType>('interest');
  const [accountId, setAccountId] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  
  // Amounts
  const [grossAmountStr, setGrossAmountStr] = useState<string>('');
  const [taxRatePercent, setTaxRatePercent] = useState<number>(19); // Default 19% Spanish IRPF
  const [withholdingTaxStr, setWithholdingTaxStr] = useState<string>('');
  const [netAmountStr, setNetAmountStr] = useState<string>('');
  
  // Stock dividend specific fields
  const [isinOrTicker, setIsinOrTicker] = useState<string>('');
  const [sharesCountStr, setSharesCountStr] = useState<string>('');
  const [grossPerShareStr, setGrossPerShareStr] = useState<string>('');
  
  // Sync with bank account balance / transactions
  const [syncWithTransactions, setSyncWithTransactions] = useState<boolean>(true);
  const [notes, setNotes] = useState<string>('');
  const [isNeedsReview, setIsNeedsReview] = useState<boolean>(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (isOpen) {
      if (initialYield) {
        setType(initialYield.type);
        setAccountId(initialYield.accountId);
        setTitle(initialYield.title);
        setDate(initialYield.date);
        setGrossAmountStr(initialYield.grossAmount.toString());
        setTaxRatePercent(initialYield.taxRatePercent);
        setWithholdingTaxStr(initialYield.withholdingTax.toString());
        setNetAmountStr(initialYield.netAmount.toString());
        setIsinOrTicker(initialYield.isinOrTicker || '');
        setSharesCountStr(initialYield.sharesCount ? initialYield.sharesCount.toString() : '');
        setGrossPerShareStr(initialYield.grossPerShare ? initialYield.grossPerShare.toString() : '');
        setNotes(initialYield.notes || '');
        setSyncWithTransactions(!!initialYield.transactionId);
        setIsNeedsReview(initialYield.status === 'needs_review');
      } else {
        // Defaults for new entry
        setType('interest');
        setAccountId(accounts.length > 0 ? accounts[0].id : '');
        setTitle('');
        setDate(new Date().toISOString().split('T')[0]);
        setGrossAmountStr('');
        setTaxRatePercent(19);
        setWithholdingTaxStr('');
        setNetAmountStr('');
        setIsinOrTicker('');
        setSharesCountStr('');
        setGrossPerShareStr('');
        setNotes('');
        setSyncWithTransactions(true);
        setIsNeedsReview(false);
      }
      setErrors({});
    }
  }, [isOpen, initialYield, accounts]);

  if (!isOpen) return null;

  // Handle Gross amount change and auto calculate withholding & net
  const handleGrossChange = (valStr: string) => {
    setGrossAmountStr(valStr);
    const parsed = parseFloat(valStr.replace(',', '.'));
    if (!isNaN(parsed) && parsed > 0) {
      const withholding = Math.round(parsed * (taxRatePercent / 100) * 100) / 100;
      const net = Math.round((parsed - withholding) * 100) / 100;
      setWithholdingTaxStr(withholding.toFixed(2));
      setNetAmountStr(net.toFixed(2));
    }
  };

  // Handle Tax Rate % change
  const handleTaxRateChange = (rate: number) => {
    setTaxRatePercent(rate);
    const parsedGross = parseFloat(grossAmountStr.replace(',', '.'));
    if (!isNaN(parsedGross) && parsedGross > 0) {
      const withholding = Math.round(parsedGross * (rate / 100) * 100) / 100;
      const net = Math.round((parsedGross - withholding) * 100) / 100;
      setWithholdingTaxStr(withholding.toFixed(2));
      setNetAmountStr(net.toFixed(2));
    }
  };

  // Handle manual Withholding change (e.g. slight roundings by the bank)
  const handleWithholdingChange = (valStr: string) => {
    setWithholdingTaxStr(valStr);
    const parsedGross = parseFloat(grossAmountStr.replace(',', '.'));
    const parsedWithholding = parseFloat(valStr.replace(',', '.'));
    if (!isNaN(parsedGross) && !isNaN(parsedWithholding)) {
      const net = Math.max(0, Math.round((parsedGross - parsedWithholding) * 100) / 100);
      setNetAmountStr(net.toFixed(2));
    }
  };

  // Handle shares calculation for dividends
  const handleSharesOrPriceChange = (sharesVal: string, perShareVal: string) => {
    setSharesCountStr(sharesVal);
    setGrossPerShareStr(perShareVal);
    const shares = parseFloat(sharesVal.replace(',', '.'));
    const perShare = parseFloat(perShareVal.replace(',', '.'));
    if (!isNaN(shares) && !isNaN(perShare) && shares > 0 && perShare > 0) {
      const calculatedGross = Math.round(shares * perShare * 100) / 100;
      setGrossAmountStr(calculatedGross.toFixed(2));
      const withholding = Math.round(calculatedGross * (taxRatePercent / 100) * 100) / 100;
      const net = Math.round((calculatedGross - withholding) * 100) / 100;
      setWithholdingTaxStr(withholding.toFixed(2));
      setNetAmountStr(net.toFixed(2));
    }
  };

  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    if (!title.trim()) {
      newErrors.title = 'Indica el concepto o entidad emisora';
    }
    if (!accountId) {
      newErrors.accountId = 'Selecciona la cuenta bancaria o broker';
    }
    const gross = parseFloat(grossAmountStr.replace(',', '.'));
    if (isNaN(gross) || gross <= 0) {
      newErrors.gross = 'Introduce un importe bruto válido mayor que 0';
    }
    const withholding = parseFloat(withholdingTaxStr.replace(',', '.'));
    if (isNaN(withholding) || withholding < 0) {
      newErrors.withholding = 'Retención inválida';
    }
    const net = parseFloat(netAmountStr.replace(',', '.'));
    if (isNaN(net) || net <= 0) {
      newErrors.net = 'El importe líquido debe ser mayor que 0';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const gross = parseFloat(grossAmountStr.replace(',', '.'));
    const withholding = parseFloat(withholdingTaxStr.replace(',', '.'));
    const net = parseFloat(netAmountStr.replace(',', '.'));
    const shares = sharesCountStr ? parseFloat(sharesCountStr.replace(',', '.')) : undefined;
    const perShare = grossPerShareStr ? parseFloat(grossPerShareStr.replace(',', '.')) : undefined;

    const record: YieldRecord = {
      id: initialYield ? initialYield.id : `yd-${Date.now()}`,
      type,
      accountId,
      date,
      title: title.trim(),
      grossAmount: gross,
      taxRatePercent,
      withholdingTax: withholding,
      netAmount: net,
      sharesCount: shares,
      grossPerShare: perShare,
      isinOrTicker: isinOrTicker.trim() ? isinOrTicker.trim().toUpperCase() : undefined,
      notes: notes.trim() || undefined,
      transactionId: initialYield?.transactionId,
      status: isNeedsReview ? 'needs_review' : 'verified',
      autoDetected: initialYield?.autoDetected
    };

    onSaveYield(record, syncWithTransactions);
    onClose();
  };

  const selectedAccount = accounts.find((a) => a.id === accountId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl shadow-2xl max-w-xl w-full border border-zinc-200 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 bg-zinc-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-[#0E6A3B] flex items-center justify-center font-bold shadow-2xs">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-950">
                {initialYield ? 'Editar Rendimiento' : 'Registrar Interés o Dividendo'}
              </h3>
              <p className="text-xs text-zinc-500">
                Cálculo de Bruto, Retención fiscal IRPF y Líquido neto
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-5 flex-1">
          
          {/* Selector de Tipo: Interés Bancario vs Dividendo de Acciones */}
          <div>
            <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-2">
              Tipo de Rendimiento
            </label>
            <div className="grid grid-cols-2 gap-2.5 p-1 bg-zinc-100 rounded-2xl">
              <button
                type="button"
                onClick={() => {
                  setType('interest');
                  if (!title || title.startsWith('Dividendo')) {
                    setTitle('Intereses Cuenta Remunerada');
                  }
                }}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  type === 'interest'
                    ? 'bg-white text-[#0E6A3B] shadow-xs ring-1 ring-black/5'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                <Building2 className="w-4 h-4 text-[#0E6A3B]" />
                <span>Interés Bancario</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setType('dividend');
                  if (!title || title.startsWith('Interes')) {
                    setTitle('Dividendo Acciones');
                  }
                }}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  type === 'dividend'
                    ? 'bg-white text-emerald-800 shadow-xs ring-1 ring-black/5'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <span>Dividendo de Acciones</span>
              </button>
            </div>
          </div>

          {/* Banco o Broker de Abono */}
          <div>
            <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1.5">
              Cuenta / Banco Receptor <span className="text-red-500">*</span>
            </label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 bg-white text-sm font-medium text-zinc-900 focus:outline-hidden focus:ring-2 focus:ring-[#0E6A3B] focus:border-transparent transition-all"
            >
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.bankName} - {acc.accountName} ({acc.accountNumberMasked}) [{formatCurrency(acc.balance)}]
                </option>
              ))}
            </select>
            {errors.accountId && <p className="text-red-600 text-xs mt-1">{errors.accountId}</p>}
          </div>

          {/* Concepto / Título & Fecha */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1.5">
                {type === 'interest' ? 'Concepto / Depósito' : 'Empresa / Título'} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={type === 'interest' ? 'Ej. Intereses Cuenta Ahorro Santander' : 'Ej. Dividendo Iberdrola S.A.'}
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 text-sm font-medium text-zinc-900 focus:outline-hidden focus:ring-2 focus:ring-[#0E6A3B] transition-all"
              />
              {errors.title && <p className="text-red-600 text-xs mt-1">{errors.title}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1.5">
                Fecha de Abono
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-zinc-300 text-sm font-medium text-zinc-900 focus:outline-hidden focus:ring-2 focus:ring-[#0E6A3B] transition-all"
              />
            </div>
          </div>

          {/* Campos adicionales para dividendos (Ticker, Acciones, Bruto por acción) */}
          {type === 'dividend' && (
            <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#092B19]">
                <Layers className="w-3.5 h-3.5 text-[#0E6A3B]" />
                <span>Detalle de las Acciones (Opcional)</span>
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-600 mb-1">
                    Ticker / ISIN
                  </label>
                  <input
                    type="text"
                    value={isinOrTicker}
                    onChange={(e) => setIsinOrTicker(e.target.value.toUpperCase())}
                    placeholder="Ej. IBE.MC"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-300 text-xs font-semibold uppercase bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-zinc-600 mb-1">
                    Nº Acciones
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={sharesCountStr}
                    onChange={(e) => handleSharesOrPriceChange(e.target.value, grossPerShareStr)}
                    placeholder="Ej. 600"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-300 text-xs font-medium bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-zinc-600 mb-1">
                    Bruto / Acción (€)
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    value={grossPerShareStr}
                    onChange={(e) => handleSharesOrPriceChange(sharesCountStr, e.target.value)}
                    placeholder="Ej. 0.40"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-300 text-xs font-medium bg-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Bloque Fiscal: Bruto, % Retención, Retención practicada y Líquido */}
          <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-1.5">
                <Percent className="w-3.5 h-3.5 text-[#0E6A3B]" />
                Desglose Fiscal (Hacienda & Liquidación)
              </span>
              <span className="text-[11px] text-zinc-500 font-medium">
                Cálculo instantáneo
              </span>
            </div>

            {/* Quick Tax Rate Buttons */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-zinc-700">
                  Porcentaje de Retención Fiscal
                </label>
                <span className="text-xs font-bold text-[#0E6A3B]">{taxRatePercent}%</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: '19% (IRPF España)', val: 19 },
                  { label: '15% (USA W-8BEN)', val: 15 },
                  { label: '21% (Tramos altos)', val: 21 },
                  { label: '0% (Exento / Sin retención)', val: 0 }
                ].map((item) => (
                  <button
                    key={item.val}
                    type="button"
                    onClick={() => handleTaxRateChange(item.val)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      taxRatePercent === item.val
                        ? 'bg-[#0E6A3B] text-white shadow-2xs'
                        : 'bg-white text-zinc-700 border border-zinc-200 hover:bg-zinc-100'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 3 Inputs Grid: Bruto, Retención, Líquido */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Bruto */}
              <div>
                <label className="block text-xs font-bold text-zinc-800 mb-1">
                  Importe Bruto (€) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    value={grossAmountStr}
                    onChange={(e) => handleGrossChange(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-3 pr-7 py-2 rounded-xl border border-zinc-300 font-bold text-sm text-zinc-900 bg-white focus:ring-2 focus:ring-[#0E6A3B] focus:outline-hidden"
                  />
                  <span className="absolute right-2.5 top-2.5 text-xs text-zinc-400 font-bold">€</span>
                </div>
                {errors.gross && <p className="text-red-600 text-[11px] mt-1">{errors.gross}</p>}
              </div>

              {/* Retención */}
              <div>
                <label className="block text-xs font-bold text-amber-900 mb-1">
                  Retención ({taxRatePercent}%) (€)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    value={withholdingTaxStr}
                    onChange={(e) => handleWithholdingChange(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-3 pr-7 py-2 rounded-xl border border-amber-200 font-bold text-sm text-amber-900 bg-amber-50/50 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                  />
                  <span className="absolute right-2.5 top-2.5 text-xs text-amber-600 font-bold">€</span>
                </div>
                {errors.withholding && <p className="text-red-600 text-[11px] mt-1">{errors.withholding}</p>}
              </div>

              {/* Líquido */}
              <div>
                <label className="block text-xs font-bold text-emerald-950 mb-1">
                  Líquido Neto (€) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    value={netAmountStr}
                    onChange={(e) => setNetAmountStr(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-3 pr-7 py-2 rounded-xl border border-emerald-300 font-black text-sm text-[#0E6A3B] bg-emerald-50/70 focus:ring-2 focus:ring-[#0E6A3B] focus:outline-hidden"
                  />
                  <span className="absolute right-2.5 top-2.5 text-xs text-[#0E6A3B] font-bold">€</span>
                </div>
                {errors.net && <p className="text-red-600 text-[11px] mt-1">{errors.net}</p>}
              </div>
            </div>

            {/* Visual Formula Display */}
            {grossAmountStr && !isNaN(parseFloat(grossAmountStr)) && (
              <div className="p-2.5 rounded-xl bg-white border border-zinc-200/90 flex items-center justify-between text-xs font-semibold text-zinc-700">
                <span className="text-zinc-900">
                  Bruto: {formatCurrency(parseFloat(grossAmountStr) || 0)}
                </span>
                <span className="text-amber-800">
                  - Retención: {formatCurrency(parseFloat(withholdingTaxStr) || 0)}
                </span>
                <span className="text-[#0E6A3B] font-black">
                  = Líquido: {formatCurrency(parseFloat(netAmountStr) || 0)}
                </span>
              </div>
            )}
          </div>

          {/* Conmutador: Sincronizar con cuenta bancaria */}
          <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200">
            <input
              type="checkbox"
              id="sync-transaction-toggle"
              checked={syncWithTransactions}
              onChange={(e) => setSyncWithTransactions(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded text-[#0E6A3B] focus:ring-[#0E6A3B] border-zinc-300 cursor-pointer"
            />
            <label htmlFor="sync-transaction-toggle" className="text-xs text-zinc-700 cursor-pointer select-none">
              <span className="font-bold text-zinc-900 block">
                Reflejar abono líquido en la cuenta bancaria seleccionada
              </span>
              <span className="text-zinc-500 text-[11px]">
                Añade o actualiza el movimiento bancario por el importe líquido ({formatCurrency(parseFloat(netAmountStr) || 0)}) para mantener cuadrado el saldo disponible.
              </span>
            </label>
          </div>

          {/* Check de comprobación (Pendiente vs Comprobado con justificante) */}
          <div className={`flex items-start gap-3 p-3.5 rounded-2xl border transition-all ${
            isNeedsReview 
              ? 'bg-amber-50/70 border-amber-200 text-amber-950' 
              : 'bg-emerald-50/50 border-emerald-200 text-emerald-950'
          }`}>
            <input
              type="checkbox"
              id="needs-review-toggle"
              checked={isNeedsReview}
              onChange={(e) => setIsNeedsReview(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded text-amber-600 focus:ring-amber-500 border-amber-300 cursor-pointer"
            />
            <label htmlFor="needs-review-toggle" className="text-xs cursor-pointer select-none">
              <span className="font-bold block">
                {isNeedsReview ? '⚠️ Marcar como pendiente de comprobación con justificante' : '✅ Cobro comprobado y verificado con el banco'}
              </span>
              <span className="text-[11px] opacity-80">
                {isNeedsReview 
                  ? 'El check está activado: indica que este cobro aún no se ha cotejado con el extracto o justificante bancario. Desactívalo una vez revisado.' 
                  : 'El check está desactivado: indica que los importes (bruto, retención y líquido) ya han sido revisados y están correctamente cuadrados.'}
              </span>
            </label>
          </div>

          {/* Notas */}
          <div>
            <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1">
              Notas u Observaciones (Opcional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej. Liquidación periódica o datos del certificado de retenciones"
              className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-xs text-zinc-900 focus:outline-hidden focus:ring-2 focus:ring-[#0E6A3B]"
            />
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-zinc-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-zinc-300 text-xs font-bold text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-[#0E6A3B] hover:bg-[#0a522d] text-white text-xs font-bold shadow-xs hover:shadow transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>{initialYield ? 'Guardar Cambios' : 'Registrar Rendimiento'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
