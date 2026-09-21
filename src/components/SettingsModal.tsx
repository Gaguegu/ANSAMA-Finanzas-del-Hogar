import React, { useRef, useState } from 'react';
import { 
  X, 
  Download, 
  Upload, 
  RotateCcw, 
  ShieldCheck, 
  HardDrive, 
  CheckCircle2, 
  AlertTriangle, 
  Trash2, 
  Eraser, 
  Sparkles,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  ShieldAlert,
  FileKey
} from 'lucide-react';
import { AppState } from '../types';
import { saveAppState, resetToDefaults, resetToZero } from '../utils/storage';
import { encryptData, decryptData, hashPassword } from '../utils/crypto';
import { APP_VERSION } from '../version';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  appState: AppState;
  onStateUpdated: (newState: AppState) => void;
  isInstalled?: boolean;
  onOpenInstall?: () => void;
  currentPassword?: string;
  onPasswordChanged?: (newPassword: string | null) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  appState,
  onStateUpdated,
  isInstalled,
  onOpenInstall,
  currentPassword,
  onPasswordChanged
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showConfirmZero, setShowConfirmZero] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState<string | null>(null);

  // Security / Password modal states
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [oldPasswordInput, setOldPasswordInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Decryption modal state for imported encrypted files
  const [pendingEncryptedContent, setPendingEncryptedContent] = useState<string | null>(null);
  const [importPasswordInput, setImportPasswordInput] = useState('');
  const [importPasswordError, setImportPasswordError] = useState<string | null>(null);
  const [isDecrypting, setIsDecrypting] = useState(false);

  // Backup format preference: encrypted (recommended) or standard json
  const [exportPasswordInput, setExportPasswordInput] = useState('');
  const [showExportPasswordModal, setShowExportPasswordModal] = useState(false);
  const [isEncryptingExport, setIsEncryptingExport] = useState(false);
  const [showExportPassword, setShowExportPassword] = useState(false);
  const [showImportPassword, setShowImportPassword] = useState(false);

  if (!isOpen) return null;

  // Format filename with exact date and time
  const getFormattedFilename = (isEncrypted: boolean) => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const year = now.getFullYear();
    const month = pad(now.getMonth() + 1);
    const day = pad(now.getDate());
    const hours = pad(now.getHours());
    const minutes = pad(now.getMinutes());
    const seconds = pad(now.getSeconds());

    const formattedTimestamp = `${year}-${month}-${day}_${hours}h${minutes}m${seconds}s`;
    return isEncrypted 
      ? `ANSAMA_Finanzas_Copia_CIFRADA_${formattedTimestamp}.ansama`
      : `ANSAMA_Finanzas_Copia_${formattedTimestamp}.json`;
  };

  // Trigger download of a string
  const triggerDownload = (content: string, filename: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", url);
    downloadAnchor.setAttribute("download", filename);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    URL.revokeObjectURL(url);

    setShowSuccessToast(`Copia generada: "${filename}"`);
    setTimeout(() => {
      setShowSuccessToast(null);
    }, 4000);
  };

  // Export Encrypted Backup (.ansama protected with password)
  const handleConfirmEncryptedExport = async () => {
    const pass = exportPasswordInput || currentPassword;
    if (!pass) {
      alert('Debes indicar una contraseña para proteger la copia de seguridad.');
      return;
    }

    setIsEncryptingExport(true);
    try {
      const plaintext = JSON.stringify(appState, null, 2);
      const encryptedPayload = await encryptData(plaintext, pass);
      const filename = getFormattedFilename(true);
      triggerDownload(encryptedPayload, filename, 'application/json');
      setShowExportPasswordModal(false);
      setExportPasswordInput('');
    } catch (err) {
      alert('Error al cifrar los datos.');
    } finally {
      setIsEncryptingExport(false);
    }
  };

  // Export Standard JSON backup
  const handleExportStandardData = () => {
    const filename = getFormattedFilename(false);
    const dataStr = JSON.stringify(appState, null, 2);
    triggerDownload(dataStr, filename, 'application/json');
  };

  // Handle file selection (handles both plain .json and encrypted .ansama / .json)
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      try {
        const parsed = JSON.parse(content);
        // Check if it is an encrypted ANSAMA payload
        if (parsed.app === 'ANSAMA_FINANZAS_PROTECTED' && parsed.ciphertext) {
          setPendingEncryptedContent(content);
          setImportPasswordInput(currentPassword || '');
          setImportPasswordError(null);
          return;
        }

        // Standard unencrypted JSON backup
        if (parsed.accounts && parsed.transactions && parsed.categories) {
          saveAppState(parsed);
          onStateUpdated(parsed);
          setShowSuccessToast('Copia de seguridad restaurada correctamente con éxito.');
          setTimeout(() => {
            setShowSuccessToast(null);
            onClose();
          }, 1400);
        } else {
          alert('El archivo no contiene una copia válida de ANSAMA Finanzas.');
        }
      } catch (err) {
        alert('Error al leer el archivo. Asegúrate de que no está dañado.');
      }
    };
    reader.readAsText(file);
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Confirm Decrypt of Imported File
  const handleConfirmDecryptImport = async () => {
    if (!pendingEncryptedContent || !importPasswordInput.trim()) {
      setImportPasswordError('Introduce la contraseña con la que se protegió la copia.');
      return;
    }

    setIsDecrypting(true);
    setImportPasswordError(null);

    try {
      const decryptedJsonStr = await decryptData(pendingEncryptedContent, importPasswordInput.trim());
      const parsed = JSON.parse(decryptedJsonStr);

      if (parsed.accounts && parsed.transactions && parsed.categories) {
        saveAppState(parsed);
        onStateUpdated(parsed);
        setPendingEncryptedContent(null);
        setImportPasswordInput('');
        setShowSuccessToast('¡Copia descifrada y restaurada correctamente con éxito!');
        setTimeout(() => {
          setShowSuccessToast(null);
          onClose();
        }, 1500);
      } else {
        setImportPasswordError('El contenido descifrado no tiene el formato esperado.');
      }
    } catch (err: any) {
      setImportPasswordError('Contraseña incorrecta. No se pudo descifrar la copia.');
    } finally {
      setIsDecrypting(false);
    }
  };

  // Password Management Handlers
  const handleSavePassword = async () => {
    setPasswordError(null);

    // If app already has a password, verify old password first
    if (appState.security?.hasPassword) {
      if (!oldPasswordInput) {
        setPasswordError('Debes introducir tu contraseña actual.');
        return;
      }
      const oldHash = await hashPassword(oldPasswordInput);
      if (oldHash !== appState.security.passwordHash) {
        setPasswordError('La contraseña actual no es correcta.');
        return;
      }
    }

    if (newPasswordInput.length < 4) {
      setPasswordError('La nueva contraseña debe tener al menos 4 caracteres.');
      return;
    }

    if (newPasswordInput !== confirmPasswordInput) {
      setPasswordError('Las dos contraseñas no coinciden.');
      return;
    }

    const newHash = await hashPassword(newPasswordInput);
    const updatedState: AppState = {
      ...appState,
      security: {
        ...appState.security,
        hasPassword: true,
        passwordHash: newHash,
      }
    };

    saveAppState(updatedState);
    onStateUpdated(updatedState);
    if (onPasswordChanged) onPasswordChanged(newPasswordInput);

    setIsChangingPassword(false);
    setOldPasswordInput('');
    setNewPasswordInput('');
    setConfirmPasswordInput('');
    setShowSuccessToast('¡Contraseña de acceso configurada y guardada!');
    setTimeout(() => setShowSuccessToast(null), 3000);
  };

  const handleRemovePassword = async () => {
    if (!oldPasswordInput) {
      setPasswordError('Introduce tu contraseña actual para poder retirarla.');
      return;
    }
    const oldHash = await hashPassword(oldPasswordInput);
    if (oldHash !== appState.security?.passwordHash) {
      setPasswordError('Contraseña actual incorrecta.');
      return;
    }

    if (!confirm('¿Seguro que quieres quitar la protección por contraseña de la aplicación?')) {
      return;
    }

    const updatedState: AppState = {
      ...appState,
      security: {
        ...appState.security,
        hasPassword: false,
        passwordHash: undefined
      }
    };

    saveAppState(updatedState);
    onStateUpdated(updatedState);
    if (onPasswordChanged) onPasswordChanged(null);

    setIsChangingPassword(false);
    setOldPasswordInput('');
    setNewPasswordInput('');
    setConfirmPasswordInput('');
    setShowSuccessToast('Protección por contraseña desactivada.');
    setTimeout(() => setShowSuccessToast(null), 3000);
  };

  // Reset to initial demo data
  const handleResetDefaults = () => {
    if (confirm('¿Estás seguro de que deseas restablecer todos los datos a la configuración inicial de fábrica (BBVA y Santander con datos de prueba)?')) {
      const defaultState = resetToDefaults();
      onStateUpdated(defaultState);
      setShowSuccessToast('Datos de prueba de BBVA y Santander restaurados.');
      setTimeout(() => {
        setShowSuccessToast(null);
        onClose();
      }, 1400);
    }
  };

  // Reset to 0 (all transactions removed, option to remove demo accounts or keep existing)
  const handleExecuteResetToZero = (clearMode: 'clearDemo' | 'keep' | 'clearAll' = 'clearDemo') => {
    const zeroState = resetToZero(appState, clearMode);
    onStateUpdated(zeroState);
    setShowConfirmZero(false);
    setShowSuccessToast(
      clearMode === 'clearDemo' || clearMode === 'clearAll'
        ? '¡Cuentas demo eliminadas y aplicación limpia! Lista para tus propios bancos.'
        : '¡Saldos puestos a 0,00 €! Cuentas conservadas.'
    );
    setTimeout(() => {
      setShowSuccessToast(null);
      onClose();
    }, 1600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div 
        className="bg-white rounded-2xl border border-zinc-200 shadow-2xl max-w-lg w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 bg-zinc-50/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#0E6A3B] flex items-center justify-center border border-emerald-200/60">
              <HardDrive className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-950">Ajustes y Guardado Local</h3>
              <p className="text-[11px] text-zinc-500">Gestión de base de datos y copias de seguridad</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          
          {/* Notification Toast */}
          {showSuccessToast && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-900 flex items-center gap-2.5 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-[#0E6A3B] shrink-0" />
              <span>{showSuccessToast}</span>
            </div>
          )}

          {/* Privacy & Storage info */}
          <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200/90 text-xs text-zinc-600 leading-relaxed">
            <div className="flex items-center gap-1.5 font-bold text-zinc-900 mb-1">
              <ShieldCheck className="w-4 h-4 text-[#0E6A3B]" />
              Privacidad y Guardado Local Activo
            </div>
            Todos los datos patrimoniales, saldos bancarios y movimientos se almacenan exclusivamente de manera local en tu navegador (LocalStorage). Ningún dato financiero viaja a servidores externos no autorizados.
          </div>

          {/* Security & Password Section */}
          <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 text-white space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <Lock className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Protección por Contraseña</h4>
                  <p className="text-[11px] text-zinc-400">
                    {appState.security?.hasPassword 
                      ? 'Bloqueo activo al abrir la app o pulsar el candado.' 
                      : 'Protege tu información confidencial con una clave.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {appState.security?.hasPassword ? (
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 text-[10px] font-extrabold tracking-wide border border-emerald-500/30 uppercase">
                    Protegida
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-400 text-[10px] font-bold tracking-wide border border-zinc-700 uppercase">
                    Desactivada
                  </span>
                )}
              </div>
            </div>

            {/* Password Configuration Box */}
            {isChangingPassword ? (
              <div className="p-3 bg-zinc-800/80 rounded-xl border border-zinc-700/80 space-y-3 mt-2">
                <div className="text-xs font-semibold text-zinc-300">
                  {appState.security?.hasPassword ? 'Cambiar o Quitar Contraseña' : 'Establecer Contraseña de Acceso'}
                </div>

                {passwordError && (
                  <div className="p-2 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-400 text-xs flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>{passwordError}</span>
                  </div>
                )}

                {appState.security?.hasPassword && (
                  <div>
                    <label className="block text-[10px] font-semibold text-zinc-400 uppercase mb-1">
                      Contraseña Actual
                    </label>
                    <input
                      type={showPasswords ? 'text' : 'password'}
                      value={oldPasswordInput}
                      onChange={(e) => setOldPasswordInput(e.target.value)}
                      placeholder="Introduce tu clave actual..."
                      className="w-full px-3 py-1.5 text-xs bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-semibold text-zinc-400 uppercase mb-1">
                    Nueva Contraseña
                  </label>
                  <input
                    type={showPasswords ? 'text' : 'password'}
                    value={newPasswordInput}
                    onChange={(e) => setNewPasswordInput(e.target.value)}
                    placeholder="Mínimo 4 caracteres..."
                    className="w-full px-3 py-1.5 text-xs bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-zinc-400 uppercase mb-1">
                    Confirmar Nueva Contraseña
                  </label>
                  <input
                    type={showPasswords ? 'text' : 'password'}
                    value={confirmPasswordInput}
                    onChange={(e) => setConfirmPasswordInput(e.target.value)}
                    placeholder="Repite la nueva contraseña..."
                    className="w-full px-3 py-1.5 text-xs bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => setShowPasswords(!showPasswords)}
                    className="text-[11px] text-zinc-400 hover:text-zinc-200 flex items-center gap-1 cursor-pointer"
                  >
                    {showPasswords ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    <span>{showPasswords ? 'Ocultar claves' : 'Ver claves'}</span>
                  </button>

                  <div className="flex items-center gap-2">
                    {appState.security?.hasPassword && (
                      <button
                        type="button"
                        onClick={handleRemovePassword}
                        className="px-2.5 py-1 text-[11px] font-semibold text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                      >
                        Quitar clave
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setIsChangingPassword(false);
                        setPasswordError(null);
                      }}
                      className="px-2.5 py-1 text-[11px] text-zinc-400 hover:bg-zinc-700 rounded-lg transition-colors cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleSavePassword}
                      className="px-3 py-1 text-[11px] font-bold bg-[#0E6A3B] hover:bg-[#0a522d] text-white rounded-lg transition-colors cursor-pointer"
                    >
                      Guardar Clave
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-zinc-400">
                  {appState.security?.hasPassword 
                    ? 'Tus datos financieros están seguros contra miradas ajenas.' 
                    : 'Recomendado para evitar accesos no autorizados en este dispositivo.'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsChangingPassword(true);
                    setPasswordError(null);
                  }}
                  className="px-3 py-1.5 text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg border border-zinc-700 transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
                >
                  <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
                  {appState.security?.hasPassword ? 'Gestionar Clave' : 'Activar Clave'}
                </button>
              </div>
            )}
          </div>

          {/* Backup Actions */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
              Copia de Seguridad Blindada con Contraseña
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Export Button: Cifrada */}
              <button
                onClick={() => {
                  if (appState.security?.hasPassword) {
                    setExportPasswordInput(currentPassword || '');
                  }
                  setShowExportPasswordModal(true);
                }}
                className="flex items-center justify-center gap-2 p-3 text-xs font-bold text-white bg-[#0E6A3B] hover:bg-[#0a522d] rounded-xl transition-all shadow-xs cursor-pointer active:scale-98"
              >
                <FileKey className="w-4 h-4 text-emerald-300" />
                Exportar Copia Cifrada (Recomendado)
              </button>

              {/* Import Button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-2 p-3 text-xs font-bold text-zinc-800 bg-white border border-zinc-200 hover:bg-zinc-50 rounded-xl transition-all shadow-2xs cursor-pointer active:scale-98"
              >
                <Upload className="w-4 h-4 text-[#0E6A3B]" />
                Importar / Restaurar Copia
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImportFile}
                accept=".json,.ansama"
                className="hidden"
              />
            </div>

            {/* Export Standard unencrypted option (small link) */}
            <div className="flex items-center justify-between pt-1 text-[11px] text-zinc-500">
              <span>¿Necesitas el formato JSON tradicional sin contraseña?</span>
              <button
                type="button"
                onClick={handleExportStandardData}
                className="text-zinc-700 hover:text-zinc-950 font-semibold underline cursor-pointer"
              >
                Descargar JSON simple
              </button>
            </div>
            
            <p className="text-[11px] text-zinc-500 leading-normal">
              💡 La copia protegida utiliza <strong>cifrado militar AES-GCM de 256 bits</strong> con la fecha y hora exacta. Nadie podrá abrirla ni en PC ni en la nube sin tu clave.
            </p>
          </div>

          {/* Modal prompt when exporting encrypted copy */}
          {showExportPasswordModal && (
            <div className="p-4 rounded-xl bg-zinc-900 border border-emerald-600/50 text-white space-y-3 animate-in fade-in">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                <FileKey className="w-4 h-4" />
                <span>Generar Copia de Seguridad Cifrada (.ansama)</span>
              </div>
              <p className="text-[11px] text-zinc-300 leading-relaxed">
                El archivo se blindará con cifrado criptográfico. Para restaurarlo en el futuro o en otro equipo, se te solicitará esta contraseña:
              </p>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-semibold text-zinc-400 uppercase">
                    Contraseña de Cifrado
                  </label>
                  {appState.security?.hasPassword && (
                    <span className="text-[10px] font-medium text-emerald-400">
                      Pre-rellenada con tu contraseña actual de entrada
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showExportPassword ? 'text' : 'password'}
                    value={exportPasswordInput}
                    onChange={(e) => setExportPasswordInput(e.target.value)}
                    placeholder="Escribe la contraseña para proteger el archivo..."
                    className="w-full pl-3 pr-10 py-2 text-xs bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowExportPassword(!showExportPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-1 rounded transition-colors cursor-pointer"
                    title={showExportPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                  >
                    {showExportPassword ? (
                      <EyeOff className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <p className="text-[10px] text-zinc-400 mt-1.5 leading-normal">
                  Puedes conservar tu contraseña habitual o cambiarla por otra específica para este archivo.
                </p>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowExportPasswordModal(false)}
                  className="px-3 py-1.5 text-xs text-zinc-400 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmEncryptedExport}
                  disabled={isEncryptingExport || !exportPasswordInput.trim()}
                  className="px-3 py-1.5 text-xs font-bold bg-[#0E6A3B] hover:bg-[#0a522d] text-white rounded-lg transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  {isEncryptingExport ? 'Cifrando...' : 'Descargar Archivo Protegido'}
                </button>
              </div>
            </div>
          )}

          {/* Modal prompt when importing encrypted copy */}
          {pendingEncryptedContent && (
            <div className="p-4 rounded-xl bg-zinc-900 border border-amber-500/50 text-white space-y-3 animate-in fade-in">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                <KeyRound className="w-4 h-4" />
                <span>Archivo Protegido con Contraseña</span>
              </div>
              <p className="text-[11px] text-zinc-300 leading-relaxed">
                Esta copia de seguridad contiene datos cifrados. Introduce la contraseña con la que fue generada para descifrarla y restaurar tus cuentas:
              </p>

              {importPasswordError && (
                <div className="p-2 bg-rose-500/20 border border-rose-500/40 rounded-lg text-rose-300 text-xs flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>{importPasswordError}</span>
                </div>
              )}

              <div className="relative">
                <input
                  type={showImportPassword ? 'text' : 'password'}
                  value={importPasswordInput}
                  onChange={(e) => {
                    setImportPasswordInput(e.target.value);
                    setImportPasswordError(null);
                  }}
                  placeholder="Contraseña del archivo..."
                  className="w-full pl-3 pr-10 py-2 text-xs bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowImportPassword(!showImportPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-1 rounded transition-colors cursor-pointer"
                  title={showImportPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                >
                  {showImportPassword ? (
                    <EyeOff className="w-4 h-4 text-amber-400" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setPendingEncryptedContent(null)}
                  className="px-3 py-1.5 text-xs text-zinc-400 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDecryptImport}
                  disabled={isDecrypting || !importPasswordInput.trim()}
                  className="px-3 py-1.5 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {isDecrypting ? 'Descifrando...' : 'Descifrar y Restaurar'}
                </button>
              </div>
            </div>
          )}

          {/* Start from Zero / Reset Section */}
          <div className="pt-4 border-t border-zinc-100 space-y-3">
            <h4 className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
              Inicialización y Restauración
            </h4>

            {/* Confirmation Box for Resetting to 0 */}
            {showConfirmZero ? (
              <div className="p-4 rounded-xl bg-amber-50/90 border border-amber-300 text-xs space-y-3 animate-in fade-in">
                <div className="flex items-start gap-2.5">
                  <div className="p-1.5 rounded-lg bg-amber-100 text-amber-900 shrink-0 mt-0.5">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="font-extrabold text-amber-950 text-sm">¿Cómo prefieres dejar la aplicación a 0?</h5>
                    <p className="text-amber-800 mt-1 leading-relaxed">
                      Se eliminarán todos los movimientos registrados ({appState.transactions.length} registros). Puedes elegir si deseas eliminar también las cuentas de demostración de BBVA y Santander si no trabajas con ellos:
                    </p>
                  </div>
                </div>

                <div className="space-y-2 pt-1">
                  {/* Option A: Remove demo accounts */}
                  <button
                    type="button"
                    onClick={() => handleExecuteResetToZero('clearDemo')}
                    className="w-full text-left p-3 rounded-xl bg-white border border-amber-300 hover:border-emerald-600 hover:bg-emerald-50/50 transition-all cursor-pointer group shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-zinc-950 text-xs group-hover:text-[#0E6A3B]">
                        1. Empezar limpio (Eliminar cuentas demo de BBVA y Santander)
                      </span>
                      <span className="text-[10px] uppercase font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                        Recomendado
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-500 mt-0.5">
                      Borra las cuentas preconfiguradas que no utilizas para que puedas añadir únicamente tus propios bancos.
                    </p>
                  </button>

                  {/* Option B: Keep accounts, set balances to 0 */}
                  <button
                    type="button"
                    onClick={() => handleExecuteResetToZero('keep')}
                    className="w-full text-left p-3 rounded-xl bg-white border border-zinc-200 hover:border-zinc-400 hover:bg-zinc-50 transition-all cursor-pointer group shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-zinc-950 text-xs">
                        2. Conservar cuentas y poner saldos a 0,00 €
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-500 mt-0.5">
                      Mantiene los nombres de las cuentas actuales y únicamente resetea sus saldos a cero.
                    </p>
                  </button>
                </div>

                <div className="flex items-center justify-end pt-2 border-t border-amber-200/80">
                  <button
                    type="button"
                    onClick={() => setShowConfirmZero(false)}
                    className="px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-white/80 rounded-lg border border-zinc-300 transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              /* Button: Dejar aplicación a 0 */
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200/90">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <Eraser className="w-4 h-4 text-[#0E6A3B]" />
                    <span className="text-xs font-bold text-zinc-950">Dejar la aplicación a 0 (Mis Datos Reales)</span>
                  </div>
                  <p className="text-[11px] text-zinc-600 leading-relaxed">
                    Borra todos los movimientos y restablece los saldos a 0,00 € para empezar a meter tus datos.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowConfirmZero(true)}
                  className="px-3 py-2 text-xs font-bold text-white bg-[#0E6A3B] hover:bg-[#0a522d] rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0 active:scale-95"
                >
                  <Eraser className="w-3.5 h-3.5" />
                  Dejar a 0
                </button>
              </div>
            )}

            {/* Restablecer datos iniciales de prueba */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/80">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-zinc-800 block">Restablecer datos de prueba</span>
                <span className="text-[11px] text-zinc-500">Recarga los saldos y movimientos iniciales de demostración de BBVA y Santander.</span>
              </div>
              <button
                type="button"
                onClick={handleResetDefaults}
                className="px-3 py-1.5 text-xs font-bold text-zinc-700 bg-white border border-zinc-200 hover:bg-zinc-100 rounded-lg shadow-2xs cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5 text-zinc-500" />
                Restablecer
              </button>
            </div>

            {/* Actualizaciones Automáticas */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200/80">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#0E6A3B]"></span>
                  </span>
                  <span className="text-xs font-bold text-emerald-950">Actualización Automática Activa</span>
                </div>
                <span className="text-[11px] text-emerald-800/90 block">
                  La app detecta y descarga automáticamente las nuevas versiones, avisándote en pantalla sin que tengas que hacer nada. Independientemente, puedes usar el botón «Actualizar» de la cabecera cuando lo desees.
                </span>
              </div>
              <span className="text-[10px] font-extrabold uppercase px-2 py-1 rounded bg-[#0E6A3B] text-white self-start sm:self-center tracking-wider shrink-0">
                Automático
              </span>
            </div>

            {/* Instalación de la aplicación en PC / Escritorio (discreta) */}
            {!isInstalled && onOpenInstall && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-zinc-50/90 border border-zinc-200/80">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-zinc-800 block">Instalar en este ordenador (PC)</span>
                  <span className="text-[11px] text-zinc-500">Crea un acceso directo en el Escritorio y barra de tareas para abrir ANSAMA directamente.</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenInstall();
                  }}
                  className="px-3 py-1.5 text-xs font-bold text-[#0E6A3B] bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg shadow-2xs cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
                >
                  <Download className="w-3.5 h-3.5 text-[#0E6A3B]" />
                  Instalar en PC
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-zinc-100">
            <div className="flex items-center gap-2">
              <div className="px-2.5 py-0.5 rounded-full bg-[#092B19] border border-emerald-400 text-white flex items-center justify-center text-[11px] font-black font-mono">
                v{APP_VERSION}
              </div>
              <span className="text-[11px] font-semibold text-zinc-500">ANSAMA Finanzas v{APP_VERSION}</span>
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 rounded-xl cursor-pointer"
            >
              Cerrar
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
