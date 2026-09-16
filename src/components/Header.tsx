import React from 'react';
import { 
  RefreshCw, 
  Plus, 
  Settings, 
  Download,
  Sparkles,
  ArrowDownToLine,
  PieChart,
  Building2,
  TrendingUp,
  ListOrdered
} from 'lucide-react';
import { formatRelativeTime } from '../utils/storage';

interface HeaderProps {
  lastSync: string;
  isSyncing: boolean;
  onOpenSyncModal: () => void;
  onOpenNewTransactionModal: () => void;
  onOpenSettingsModal: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isInstalled: boolean;
  onOpenInstall: () => void;
  hasNewUpdate: boolean;
  isCheckingUpdate: boolean;
  onCheckUpdate: () => void;
  onApplyUpdate: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  lastSync,
  isSyncing,
  onOpenSyncModal,
  onOpenNewTransactionModal,
  onOpenSettingsModal,
  activeTab,
  setActiveTab,
  isInstalled,
  onOpenInstall,
  hasNewUpdate,
  isCheckingUpdate,
  onCheckUpdate,
  onApplyUpdate,
}) => {
  return (
    <header id="app-header" className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-zinc-200">
      {/* Update notification announcement banner if update is available */}
      {hasNewUpdate && (
        <div className="bg-emerald-900 text-white px-4 py-2 text-xs sm:text-sm border-b border-emerald-950 flex flex-wrap items-center justify-between gap-2 shadow-inner">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400"></span>
            </span>
            <span>
              <strong>¡Nuevas actualizaciones disponibles!</strong> Se aplicarán automáticamente en breve o puedes pulsar actualizar manualmente ahora.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onApplyUpdate}
              className="px-3 py-1 bg-white hover:bg-emerald-50 text-emerald-950 font-bold rounded-lg text-xs shadow-xs transition-colors cursor-pointer"
            >
              Actualizar Ahora
            </button>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3 sm:gap-4">
          
          {/* Logo & Identity */}
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 sm:h-12 sm:w-12 rounded-xl bg-white border border-zinc-200/80 flex items-center justify-center p-1 shadow-xs overflow-hidden shrink-0">
              <img 
                src="./logo.jpg" 
                alt="Logo ANSAMA" 
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="flex flex-col justify-center">
              {/* ANSAMA en fuente Algerian con colores alternados y en cursiva */}
              <div 
                className="text-lg sm:text-xl font-black italic tracking-wider leading-none select-none font-['Algerian','Cinzel_Decorative',serif]"
                title="ANSAMA"
              >
                <span className="text-[#0E6A3B]">A</span>
                <span className="text-zinc-950">N</span>
                <span className="text-[#0E6A3B]">S</span>
                <span className="text-zinc-950">A</span>
                <span className="text-[#0E6A3B]">M</span>
                <span className="text-zinc-950">A</span>
              </div>
              
              {/* Finanzas del Hogar debajo en verde elegante, sin texto de sincronizado debajo */}
              <span className="text-xs sm:text-[13px] font-bold text-[#0E6A3B] tracking-tight leading-tight mt-0.5">
                Finanzas del Hogar
              </span>
            </div>
          </div>

          {/* Desktop Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1 bg-zinc-100/90 p-1 rounded-xl border border-zinc-200/80">
            <button
              id="nav-tab-dashboard"
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === 'dashboard'
                   ? 'bg-white text-emerald-950 font-bold shadow-xs border border-zinc-200/90'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <PieChart className="w-3.5 h-3.5 text-zinc-500" />
              <span>Patrimonio</span>
            </button>
            <button
              id="nav-tab-accounts"
              onClick={() => setActiveTab('accounts')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === 'accounts'
                   ? 'bg-white text-emerald-950 font-bold shadow-xs border border-zinc-200/90'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <Building2 className="w-3.5 h-3.5 text-zinc-500" />
              <span>Bancos</span>
            </button>
            <button
              id="nav-tab-categories"
              onClick={() => setActiveTab('categories')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === 'categories'
                   ? 'bg-white text-emerald-950 font-bold shadow-xs border border-zinc-200/90'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5 text-zinc-500" />
              <span>Gastos e Ingresos</span>
            </button>
            <button
              id="nav-tab-transactions"
              onClick={() => setActiveTab('transactions')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === 'transactions'
                   ? 'bg-white text-emerald-950 font-bold shadow-xs border border-zinc-200/90'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <ListOrdered className="w-3.5 h-3.5 text-zinc-500" />
              <span>Movimientos</span>
            </button>
          </nav>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            {/* Botón Actualizar (con aviso de nuevas versiones y actualización manual) */}
            <button
              id="btn-update-app"
              onClick={onCheckUpdate}
              disabled={isCheckingUpdate}
              title={
                hasNewUpdate 
                  ? "¡Nueva actualización disponible! Pulsa para actualizar ahora" 
                  : "Comprobar y buscar actualizaciones"
              }
              className={`relative flex items-center gap-1 px-2 sm:px-2.5 py-1.5 sm:py-2 text-xs font-bold rounded-xl transition-all shadow-2xs active:scale-95 cursor-pointer ${
                hasNewUpdate 
                  ? 'bg-[#0E6A3B] text-white ring-2 ring-emerald-400 hover:bg-[#0a522d]'
                  : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border border-zinc-200'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isCheckingUpdate ? 'animate-spin text-emerald-600' : hasNewUpdate ? 'text-white animate-spin' : 'text-zinc-600'}`} />
              <span className="hidden lg:inline">
                {hasNewUpdate ? 'Actualizar ahora' : 'Actualizar'}
              </span>
              {hasNewUpdate && (
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                </span>
              )}
            </button>

            {/* Botón Instalar (SOLO visible en aplicación web; cuando se instala en el PC desaparece automáticamente) */}
            {!isInstalled && (
              <button
                id="btn-install-app"
                onClick={onOpenInstall}
                title="Instalar ANSAMA en tu PC o dispositivo"
                className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 sm:py-2 text-xs font-bold rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 transition-all shadow-2xs active:scale-95 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-[#0E6A3B]" />
                <span className="hidden sm:inline">Instalar</span>
              </button>
            )}

            <button
              id="btn-sync-banks"
              onClick={onOpenSyncModal}
              disabled={isSyncing}
              title="Sincronización bancaria simulada"
              className="relative flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white transition-all shadow-sm active:scale-95 disabled:opacity-75 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isSyncing ? 'animate-spin text-emerald-400' : 'text-zinc-300'}`} />
              <span className="hidden sm:inline">Sincronizar Bancos</span>
              <span className="sm:hidden">Sincronizar</span>
            </button>

            <button
              id="btn-add-transaction"
              onClick={onOpenNewTransactionModal}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-bold rounded-xl bg-[#0E6A3B] hover:bg-[#0a522d] text-white transition-all shadow-sm active:scale-95 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Nuevo Movimiento</span>
              <span className="sm:hidden">Nuevo</span>
            </button>

            <button
              id="btn-open-settings"
              onClick={onOpenSettingsModal}
              title="Ajustes y copias de seguridad"
              className="p-1.5 sm:p-2 rounded-xl text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100 transition-all cursor-pointer"
            >
              <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};
