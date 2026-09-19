import React, { useState } from 'react';
import { Lock, KeyRound, Eye, EyeOff, ShieldCheck, AlertCircle } from 'lucide-react';
import { hashPassword } from '../utils/crypto';

interface LockScreenProps {
  storedPasswordHash: string;
  onUnlock: (passwordUsed: string) => void;
  onForgotOrRestore: () => void;
}

export const LockScreen: React.FC<LockScreenProps> = ({
  storedPasswordHash,
  onUnlock,
  onForgotOrRestore,
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('Por favor, introduce tu contraseña.');
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      const hashedInput = await hashPassword(password);
      if (hashedInput === storedPasswordHash) {
        onUnlock(password);
      } else {
        setError('Contraseña incorrecta. Inténtalo de nuevo.');
      }
    } catch {
      setError('Error al verificar la contraseña.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950 flex flex-col items-center justify-center p-4 selection:bg-[#0E6A3B] selection:text-white">
      {/* Background aesthetic glow */}
      <div className="absolute w-96 h-96 bg-[#0E6A3B]/10 rounded-full blur-3xl pointer-events-none -top-20 -left-20" />
      <div className="absolute w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -bottom-20 -right-20" />

      <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl text-center">
        {/* Shield / Logo */}
        <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-[#0E6A3B]/20 border border-[#0E6A3B]/40 flex items-center justify-center text-[#0E6A3B] shadow-inner">
          <Lock className="w-8 h-8 text-emerald-400" />
        </div>

        <h1 className="text-2xl font-bold text-white tracking-tight">
          ANSAMA Finanzas
        </h1>
        <p className="text-sm text-zinc-400 mt-1 mb-6">
          Aplicación protegida. Introduce tu contraseña para acceder a tus cuentas.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative text-left">
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 ml-1">
              Contraseña de Acceso
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                <KeyRound className="w-5 h-5" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                }}
                placeholder="Escribe tu contraseña..."
                autoFocus
                className="w-full pl-11 pr-11 py-3 bg-zinc-800/80 border border-zinc-700/80 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#0E6A3B] focus:border-transparent text-sm transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-400 hover:text-zinc-200 transition-colors"
                title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400 text-left animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isVerifying}
            className="w-full py-3 px-4 bg-[#0E6A3B] hover:bg-[#0a522d] text-white font-semibold rounded-xl text-sm shadow-lg shadow-emerald-950/40 hover:shadow-emerald-900/50 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <ShieldCheck className="w-4 h-4" />
            {isVerifying ? 'Verificando...' : 'Desbloquear Finanzas'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-zinc-800 flex flex-col gap-2 text-xs text-zinc-500">
          <span>¿Has olvidado la clave o vienes de otro equipo?</span>
          <button
            type="button"
            onClick={onForgotOrRestore}
            className="text-emerald-400 hover:text-emerald-300 font-medium hover:underline transition-all cursor-pointer"
          >
            Restaurar desde Copia de Seguridad Cifrada
          </button>
        </div>
      </div>
    </div>
  );
};
