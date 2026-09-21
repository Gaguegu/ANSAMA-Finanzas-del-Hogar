import React, { useState, useRef, useId } from 'react';
import { 
  X, 
  UploadCloud, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle, 
  Building2, 
  ArrowDownLeft, 
  ArrowUpRight,
  Info,
  Check,
  RotateCcw,
  Sparkles,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { BankAccount, TransactionCategory, Transaction } from '../types';
import { 
  parseStatementFile, 
  extractRowsWithMapping,
  ParseResult, 
  ParsedStatementRow,
  StatementColumnMapping 
} from '../utils/statementParser';
import { formatCurrency } from '../utils/storage';

interface ImportStatementModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: BankAccount[];
  categories: TransactionCategory[];
  existingTransactions: Transaction[];
  initialAccountId?: string;
  onImport: (
    transactions: Array<Omit<Transaction, 'id'>>,
    accountId: string,
    updateBalance: boolean
  ) => void;
}

export const ImportStatementModal: React.FC<ImportStatementModalProps> = ({
  isOpen,
  onClose,
  accounts,
  categories,
  existingTransactions,
  initialAccountId,
  onImport
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [currentMapping, setCurrentMapping] = useState<StatementColumnMapping | null>(null);
  const [showColumnConfig, setShowColumnConfig] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string>(initialAccountId || '');
  const [updateBalance, setUpdateBalance] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [rows, setRows] = useState<ParsedStatementRow[]>([]);
  
  const fileInputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mantener sincronizado si initialAccountId cambia al abrir
  React.useEffect(() => {
    if (initialAccountId) {
      setSelectedAccountId(initialAccountId);
    }
  }, [initialAccountId, isOpen]);

  if (!isOpen) return null;

  // Iniciar con la cuenta preseleccionada o sugerida o primera disponible
  const activeAccountId = selectedAccountId || initialAccountId || (accounts.length > 0 ? accounts[0].id : '');

  const handleProcessFile = async (selectedFile: File) => {
    setErrorMsg(null);
    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const result = parseStatementFile(
        arrayBuffer,
        selectedFile.name,
        categories,
        accounts,
        existingTransactions
      );

      setFile(selectedFile);
      setParseResult(result);
      setCurrentMapping(result.suggestedMapping);
      setRows(result.rows);

      if (result.rows.length === 0) {
        setShowColumnConfig(true);
        setErrorMsg('No se detectaron movimientos automáticamente. Revisa y selecciona las columnas correspondientes abajo.');
      } else {
        setShowColumnConfig(false);
      }

      if (result.suggestedAccountId) {
        setSelectedAccountId(result.suggestedAccountId);
      } else if (accounts.length > 0 && !selectedAccountId) {
        setSelectedAccountId(accounts[0].id);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err?.message || 'Error al leer el archivo. Comprueba que sea un archivo Excel (.xlsx, .xls) o CSV válido.');
    }
  };

  const handleUpdateMapping = (newMapping: StatementColumnMapping) => {
    setCurrentMapping(newMapping);
    if (!parseResult) return;

    const newRows = extractRowsWithMapping(
      parseResult.rawData,
      parseResult.headers,
      parseResult.headerRowIndex,
      newMapping,
      categories,
      existingTransactions
    );

    setRows(newRows);
    if (newRows.length > 0) {
      setErrorMsg(null);
    } else {
      setErrorMsg('No se encontraron importes válidos con las columnas seleccionadas.');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleProcessFile(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handleToggleRow = (id: string) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, selected: !r.selected } : r));
  };

  const handleSelectAll = (select: boolean) => {
    setRows(prev => prev.map(r => ({ ...r, selected: select })));
  };

  const handleCategoryChange = (rowId: string, newCatId: string) => {
    setRows(prev => prev.map(r => r.id === rowId ? { ...r, suggestedCategoryId: newCatId } : r));
  };

  const handleTitleChange = (rowId: string, newTitle: string) => {
    setRows(prev => prev.map(r => r.id === rowId ? { ...r, title: newTitle } : r));
  };

  const selectedCount = rows.filter(r => r.selected).length;
  const duplicateCount = rows.filter(r => r.isDuplicate).length;

  const handleConfirmImport = () => {
    if (!activeAccountId) {
      setErrorMsg('Debes seleccionar la cuenta bancaria de destino.');
      return;
    }

    const selectedRows = rows.filter(r => r.selected);
    if (selectedRows.length === 0) {
      setErrorMsg('Selecciona al menos un movimiento para importar.');
      return;
    }

    const transactionsToImport: Array<Omit<Transaction, 'id'>> = selectedRows.map(r => ({
      accountId: activeAccountId,
      date: r.date,
      title: r.title,
      amount: r.amount,
      type: r.type,
      categoryId: r.suggestedCategoryId,
      note: `Importado desde extracto ${file?.name || 'bancario'}`,
      isSimulated: false
    }));

    onImport(transactionsToImport, activeAccountId, updateBalance);
    handleReset();
    onClose();
  };

  const handleReset = () => {
    setFile(null);
    setParseResult(null);
    setCurrentMapping(null);
    setShowColumnConfig(false);
    setRows([]);
    setErrorMsg(null);
  };

  const selectedAccount = accounts.find(a => a.id === activeAccountId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/65 backdrop-blur-xs animate-in fade-in">
      <div 
        className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 bg-zinc-50/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#0E6A3B] flex items-center justify-center text-white shadow-xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-zinc-900">
                Importar Extracto Bancario Real
              </h3>
              <p className="text-[11px] text-zinc-500 font-medium">
                Compatible con BBVA, Santander, CaixaBank, ING, Sabadell y todos los bancos (.xlsx, .xls, .csv)
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

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          
          {errorMsg && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* PASO 1: Subir Archivo (cuando no hay archivo cargado) */}
          {!parseResult && (
            <div className="space-y-4">
              <div 
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-3 ${
                  isDragging 
                    ? 'border-[#0E6A3B] bg-emerald-50/70 scale-[0.99]' 
                    : 'border-zinc-300 hover:border-emerald-600 hover:bg-emerald-50/20 bg-zinc-50/50'
                }`}
              >
                <div className="w-14 h-14 rounded-2xl bg-emerald-100/70 text-[#0E6A3B] flex items-center justify-center shadow-xs">
                  <UploadCloud className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-sm sm:text-base font-black text-zinc-900">
                    Arrastra aquí tu extracto de banco o haz clic para examinar
                  </h4>
                  <p className="text-xs text-zinc-500 mt-1">
                    Formatos compatibles: <strong>Excel (.xlsx, .xls)</strong> y archivos <strong>CSV</strong>
                  </p>
                </div>
                <button
                  type="button"
                  className="mt-2 px-4 py-2 text-xs font-bold bg-[#0E6A3B] hover:bg-[#0a522d] text-white rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  Seleccionar archivo desde el PC
                </button>
                <input 
                  id={fileInputId}
                  ref={fileInputRef}
                  type="file" 
                  accept=".xlsx,.xls,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                  onChange={handleFileChange}
                  className="hidden" 
                />
              </div>

              {/* Guía rápida de descarga según banco */}
              <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200/90 text-xs text-zinc-600 space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-zinc-800">
                  <Info className="w-4 h-4 text-[#0E6A3B]" />
                  ¿Cómo descargar el extracto desde tu banca online?
                </div>
                <p className="leading-relaxed">
                  Entra a tu banco (<strong>BBVA, Santander, CaixaBank, ING, Openbank, Sabadell, Bankinter, MyInvestor, etc.</strong>), dirígete a <em>Cuentas &gt; Movimientos</em> y pulsa en <strong>«Descargar»</strong> o <strong>«Exportar a Excel / CSV»</strong>.
                </p>
                <div className="flex items-center gap-2 text-[11px] text-emerald-800 font-semibold pt-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  La lectura se procesa 100% en tu navegador de forma privada y segura.
                </div>
              </div>
            </div>
          )}

          {/* PASO 2: Vista Previa y Configuración de Importación */}
          {parseResult && (
            <div className="space-y-4">
              
              {/* Barra superior de configuración de la cuenta */}
              <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200/90 grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-zinc-800">
                      Cuenta bancaria de destino:
                    </label>
                    {parseResult.suggestedAccountId === activeAccountId && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full">
                        <Sparkles className="w-3 h-3 text-[#0E6A3B]" />
                        Banco detectado automáticamente
                      </span>
                    )}
                  </div>
                  <select
                    value={activeAccountId}
                    onChange={(e) => setSelectedAccountId(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-bold text-zinc-900 bg-white border border-zinc-300 rounded-xl focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600"
                  >
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id}>
                        {acc.bankName} - {acc.accountName} ({acc.accountNumberMasked}) - Saldo: {formatCurrency(acc.balance)}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-zinc-500 mt-1">
                    Puedes cambiar de cuenta si deseas asignar estos movimientos a otra entidad.
                  </p>
                </div>

                <div className="flex flex-col justify-center">
                  <label className="flex items-start gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={updateBalance}
                      onChange={(e) => setUpdateBalance(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded text-[#0E6A3B] focus:ring-emerald-500 cursor-pointer"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-zinc-900 block">Actualizar saldo de la cuenta con los movimientos</span>
                      <span className="text-[11px] text-zinc-500">
                        {updateBalance 
                          ? 'El saldo actual sumará/restará los movimientos importados.' 
                          : 'Mantendrá el saldo actual intacto (recomendado si ya lo tienes al día).'}
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Estadísticas de detección y botón de configuración de columnas */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-[#0E6A3B]" />
                  <span className="font-bold text-emerald-950">{parseResult.fileName}</span>
                  <span className="text-emerald-800">
                    ({rows.length} detectados, <strong>{selectedCount} seleccionados</strong>)
                  </span>
                </div>

                {duplicateCount > 0 && (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                    {duplicateCount} posibles duplicados desmarcados
                  </span>
                )}

                <div className="flex items-center gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={() => setShowColumnConfig(prev => !prev)}
                    className="text-[11px] font-bold text-emerald-900 bg-emerald-100/80 hover:bg-emerald-200/80 border border-emerald-300 px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <SlidersHorizontal className="w-3 h-3 text-[#0E6A3B]" />
                    <span>Ajustar columnas</span>
                    {showColumnConfig ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>

                  <span className="text-zinc-300">|</span>

                  <button
                    type="button"
                    onClick={() => handleSelectAll(true)}
                    className="text-[11px] font-bold text-[#0E6A3B] hover:underline px-1.5 py-0.5"
                  >
                    Todos
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectAll(false)}
                    className="text-[11px] font-bold text-zinc-600 hover:underline px-1.5 py-0.5"
                  >
                    Ninguno
                  </button>
                  <span className="text-zinc-300">|</span>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="text-[11px] font-bold text-zinc-600 hover:text-zinc-900 px-1.5 py-0.5 flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Cambiar archivo
                  </button>
                </div>
              </div>

              {/* Panel de Configuración Manual de Columnas (desplegable) */}
              {showColumnConfig && currentMapping && (
                <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-3 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-bold text-zinc-900 flex items-center gap-1.5">
                      <SlidersHorizontal className="w-3.5 h-3.5 text-[#0E6A3B]" />
                      Configuración de columnas del extracto
                    </h5>
                    <span className="text-[11px] text-zinc-500">
                      Hoja: <strong>{parseResult.sheetName}</strong> (Fila cabecera #{parseResult.headerRowIndex + 1})
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Columna Fecha */}
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-700 mb-1">
                        Columna de Fecha:
                      </label>
                      <select
                        value={currentMapping.dateCol}
                        onChange={(e) => handleUpdateMapping({ ...currentMapping, dateCol: e.target.value })}
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-zinc-300 rounded-lg font-medium text-zinc-800 focus:ring-1 focus:ring-emerald-500"
                      >
                        {parseResult.headers.map((h, i) => (
                          <option key={i} value={h}>{h}</option>
                        ))}
                      </select>
                    </div>

                    {/* Columna Concepto */}
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-700 mb-1">
                        Columna de Concepto / Título:
                      </label>
                      <select
                        value={currentMapping.titleCol}
                        onChange={(e) => handleUpdateMapping({ ...currentMapping, titleCol: e.target.value })}
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-zinc-300 rounded-lg font-medium text-zinc-800 focus:ring-1 focus:ring-emerald-500"
                      >
                        {parseResult.headers.map((h, i) => (
                          <option key={i} value={h}>{h}</option>
                        ))}
                      </select>
                    </div>

                    {/* Columna Importe */}
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-700 mb-1">
                        Columna de Importe:
                      </label>
                      <select
                        value={currentMapping.amountCol}
                        onChange={(e) => handleUpdateMapping({ ...currentMapping, amountCol: e.target.value })}
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-zinc-300 rounded-lg font-medium text-zinc-800 focus:ring-1 focus:ring-emerald-500"
                      >
                        {parseResult.headers.map((h, i) => (
                          <option key={i} value={h}>{h}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <p className="text-[11px] text-zinc-500">
                    Cambiar las columnas recalculará los movimientos en tiempo real.
                  </p>
                </div>
              )}

              {/* Tabla con scroll de movimientos detectados */}
              <div className="border border-zinc-200 rounded-2xl overflow-hidden shadow-2xs bg-white max-h-[380px] overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-zinc-50 border-b border-zinc-200 sticky top-0 z-10 text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                    <tr>
                      <th className="p-3 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={selectedCount === rows.length && rows.length > 0}
                          onChange={(e) => handleSelectAll(e.target.checked)}
                          className="w-4 h-4 rounded text-[#0E6A3B] cursor-pointer"
                        />
                      </th>
                      <th className="p-3 w-28">Fecha</th>
                      <th className="p-3">Concepto</th>
                      <th className="p-3 w-44">Categoría sugerida</th>
                      <th className="p-3 w-32 text-right">Importe</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {rows.map((r) => {
                      const isIncome = r.type === 'income';
                      return (
                        <tr 
                          key={r.id} 
                          className={`hover:bg-zinc-50/80 transition-colors ${
                            !r.selected ? 'opacity-40 bg-zinc-50/40' : ''
                          }`}
                        >
                          <td className="p-3 text-center">
                            <input
                              type="checkbox"
                              checked={r.selected}
                              onChange={() => handleToggleRow(r.id)}
                              className="w-4 h-4 rounded text-[#0E6A3B] cursor-pointer"
                            />
                          </td>
                          <td className="p-3 font-mono font-medium text-zinc-700 whitespace-nowrap">
                            {r.date}
                          </td>
                          <td className="p-3">
                            <input
                              type="text"
                              value={r.title}
                              onChange={(e) => handleTitleChange(r.id, e.target.value)}
                              className="w-full px-2 py-1 text-xs rounded border border-transparent hover:border-zinc-300 focus:border-emerald-500 focus:bg-white text-zinc-900 font-medium"
                            />
                            {r.isDuplicate && (
                              <span className="text-[10px] font-bold text-amber-600 block mt-0.5">
                                Posible duplicado ya registrado
                              </span>
                            )}
                          </td>
                          <td className="p-3">
                            <select
                              value={r.suggestedCategoryId}
                              onChange={(e) => handleCategoryChange(r.id, e.target.value)}
                              className="w-full px-2 py-1 text-xs rounded border border-zinc-200 bg-zinc-50 focus:bg-white focus:ring-1 focus:ring-emerald-500 text-zinc-800 font-medium cursor-pointer"
                            >
                              {categories.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.type === 'income' ? '🟢' : '🔴'} {c.name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="p-3 text-right font-mono font-bold whitespace-nowrap">
                            <span className={isIncome ? 'text-emerald-700' : 'text-zinc-900'}>
                              {isIncome ? `+${formatCurrency(r.amount)}` : `-${formatCurrency(r.amount)}`}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-zinc-200 bg-zinc-50/80 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-200/60 rounded-xl transition-colors cursor-pointer"
          >
            Cancelar
          </button>

          {parseResult && (
            <button
              type="button"
              onClick={handleConfirmImport}
              disabled={selectedCount === 0}
              className="px-5 py-2.5 text-xs font-bold text-white bg-[#0E6A3B] hover:bg-[#0a522d] rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Check className="w-4 h-4" />
              Importar {selectedCount} Movimientos Reales
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

