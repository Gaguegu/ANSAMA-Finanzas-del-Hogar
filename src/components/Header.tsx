import React from 'react';
import { 
  RefreshCw, 
  Plus, 
  Settings, 
  ShieldCheck, 
  Smartphone,
  Laptop
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
}

export const Header: React.FC<HeaderProps> = ({
  lastSync,
  isSyncing,
  onOpenSyncModal,
  onOpenNewTransactionModal,
  onOpenSettingsModal,
  activeTab,
  setActiveTab
}) => {
  return (
    <header id="app-header" className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-zinc-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Logo & Identity */}
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-white border border-emerald-100 flex items-center justify-center p-0.5 shadow-sm overflow-hidden shrink-0">
              <img 
                src="./logo.jpg" 
                alt="Logo ANSAMA" 
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black tracking-tight text-zinc-950">ANSAMA</span>
                <span className="inline-block text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300">
                  Finanzas del Hogar
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                <span>Sincronizado: {formatRelativeTime(lastSync)}</span>
              </div>
            </div>
          </div>

          {/* Desktop Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1 bg-zinc-100 p-1 rounded-xl border border-zinc-200/60">
            <button
              id="nav-tab-dashboard"
              onClick={() => setActiveTab('dashboard')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-white text-emerald-950 font-bold shadow-xs border border-zinc-200/80'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Patrimonio
            </button>
            <button
              id="nav-tab-accounts"
              onClick={() => setActiveTab('accounts')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'accounts'
                  ? 'bg-white text-emerald-950 font-bold shadow-xs border border-zinc-200/80'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Bancos (BBVA / Santander)
            </button>
            <button
              id="nav-tab-categories"
              onClick={() => setActiveTab('categories')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'categories'
                  ? 'bg-white text-emerald-950 font-bold shadow-xs border border-zinc-200/80'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Gastos e Ingresos
            </button>
            <button
              id="nav-tab-transactions"
              onClick={() => setActiveTab('transactions')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'transactions'
                  ? 'bg-white text-emerald-950 font-bold shadow-xs border border-zinc-200/80'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Movimientos
            </button>
          </nav>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              id="btn-sync-banks"
              onClick={onOpenSyncModal}
              disabled={isSyncing}
              title="Sincronización bancaria simulada"
              className="relative flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white transition-all shadow-sm active:scale-95 disabled:opacity-75 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-emerald-400' : 'text-zinc-300'}`} />
              <span className="hidden sm:inline">Sincronizar Bancos</span>
              <span className="sm:hidden">Sincronizar</span>
            </button>

            <button
              id="btn-add-transaction"
              onClick={onOpenNewTransactionModal}
              className="flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-bold rounded-xl bg-[#0E6A3B] hover:bg-[#0a522d] text-white transition-all shadow-sm active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Nuevo Movimiento</span>
              <span className="sm:hidden">Nuevo</span>
            </button>

            <button
              id="btn-open-settings"
              onClick={onOpenSettingsModal}
              title="Ajustes y copias de seguridad"
              className="p-2 rounded-xl text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100 transition-all cursor-pointer"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};
