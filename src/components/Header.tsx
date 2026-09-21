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
  ListOrdered,
  Calendar,
  BarChart3,
  Coins,
  Lock
} from 'lucide-react';
import { formatRelativeTime } from '../utils/storage';
import { APP_VERSION } from '../version';

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
  autoUpdateCountdown?: number | null;
  isAutoUpdatePaused?: boolean;
  onPauseAutoUpdate?: () => void;
  onResumeAutoUpdate?: () => void;
  hasPassword?: boolean;
  onLockApp?: () => void;
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
  autoUpdateCountdown,
  isAutoUpdatePaused,
  onPauseAutoUpdate,
  onResumeAutoUpdate,
  hasPassword,
  onLockApp,
}) => {
  return (
    <header id="app-header" className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-zinc-200">
      {/* Update notification announcement banner if update is available */}
      {hasNewUpdate && (
        <div className="bg-[#092B19] text-white px-4 py-2.5 text-xs sm:text-sm border-b border-emerald-800 flex flex-wrap items-center justify-between gap-2 shadow-inner animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400"></span>
            </span>
            <span>
              <strong className="text-emerald-300">¡Nueva versión detectada!</strong>{' '}
              {autoUpdateCountdown !== null && autoUpdateCountdown > 0 ? (
                <>
                  Actualización automática en{' '}
                  <span className="font-extrabold text-white bg-emerald-800 px-1.5 py-0.5 rounded border border-emerald-600 font-feature-settings-tnum">
                    {autoUpdateCountdown}s
                  </span>
                  ...
                </>
              ) : (
                <>Aplicando la actualización en un instante...</>
              )}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {isAutoUpdatePaused ? (
              <button
                onClick={onResumeAutoUpdate}
                className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer"
              >
                Reanudar
              </button>
            ) : (
              <button
                onClick={onPauseAutoUpdate}
                className="px-2.5 py-1 bg-white/15 hover:bg-white/25 text-emerald-100 font-semibold rounded-lg text-xs transition-colors cursor-pointer"
                title="Pausar si estás trabajando en un formulario"
              >
                Pausar
              </button>
            )}
            <button
              onClick={onApplyUpdate}
              className="px-3 py-1 bg-emerald-400 hover:bg-emerald-300 text-[#092B19] font-black rounded-lg text-xs shadow-xs transition-colors cursor-pointer"
            >
              Actualizar Ahora
            </button>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* LÍNEA 1: Identidad con Logotipo, Círculo de Versión y Botones de Acción Centrados */}
        <div className="flex flex-col xl:flex-row items-center justify-between py-2.5 gap-3">
          
          {/* Lado Izquierdo: Logotipo ANSAMA + Círculo de Versión */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            {/* Logo & Identity dentro de un recuadro con bordes redondeados */}
            <div 
              id="brand-identity-box"
              className="flex items-center gap-2 sm:gap-3 bg-white/95 px-2.5 sm:px-3 py-1.5 rounded-2xl border-2 border-[#0E6A3B]/40 shadow-xs hover:border-[#0E6A3B]/70 transition-all ring-1 ring-emerald-950/5 shrink-0"
            >
              <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-white border border-emerald-200/80 flex items-center justify-center p-0.5 shadow-2xs overflow-hidden shrink-0">
                <img 
                  src="./logo.jpg" 
                  alt="Logo ANSAMA" 
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="flex flex-col justify-center select-none">
                {/* ANSAMA en fuente Algerian con colores alternados y en cursiva */}
                <div 
                  className="text-base sm:text-lg font-black italic tracking-wider leading-none select-none font-['Algerian','Cinzel_Decorative',serif]"
                  title="ANSAMA"
                >
                  <span className="text-[#0E6A3B]">A</span>
                  <span className="text-zinc-950">N</span>
                  <span className="text-[#0E6A3B]">S</span>
                  <span className="text-zinc-950">A</span>
                  <span className="text-[#0E6A3B]">M</span>
                  <span className="text-zinc-950">A</span>
                </div>
                
                {/* Finanzas del Hogar debajo en verde corporativo */}
                <span className="text-[10px] sm:text-[11px] font-extrabold text-[#0E6A3B] tracking-tight leading-tight mt-0.5 whitespace-nowrap">
                  Finanzas del Hogar
                </span>
              </div>
            </div>

            {/* Placa de Versión del Sistema con ancho y tamaño generoso para mostrar 2.5.3 completo */}
            <div 
              id="app-version-badge"
              title={`Versión actual del sistema: ${APP_VERSION}`}
              className="flex items-center justify-center h-9 sm:h-10 px-3 sm:px-3.5 rounded-2xl bg-[#092B19] border-2 border-emerald-400 text-white shadow-xs ring-2 ring-emerald-950/15 shrink-0 select-none cursor-default group transition-transform hover:scale-105"
            >
              <div className="flex flex-col items-center justify-center leading-none">
                <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-wider text-emerald-300">VERSIÓN</span>
                <span className="text-xs sm:text-sm font-black text-white font-mono mt-0.5">{APP_VERSION}</span>
              </div>
            </div>
          </div>

          {/* Centro de la Pantalla: Todos los Botones de Acción repartidos y centrados */}
          <div className="flex-1 flex items-center justify-center gap-2 sm:gap-2.5 flex-wrap w-full xl:w-auto">
            {/* 1. Botón Nuevo Movimiento */}
            <button
              id="btn-add-transaction"
              onClick={onOpenNewTransactionModal}
              title="Añadir nuevo gasto o ingreso"
              className="h-9 sm:h-10 px-3 sm:px-4 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-1.5 bg-[#0E6A3B] hover:bg-[#0a522d] text-white transition-all shadow-xs active:scale-95 cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span>Nuevo Movimiento</span>
            </button>

            {/* 2. Botón Sincronizar Bancos */}
            <button
              id="btn-sync-banks"
              onClick={onOpenSyncModal}
              disabled={isSyncing}
              title="Sincronización bancaria con PSD2"
              className="h-9 sm:h-10 px-3 sm:px-3.5 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 text-white transition-all shadow-xs active:scale-95 disabled:opacity-75 cursor-pointer shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${isSyncing ? 'animate-spin text-emerald-400' : 'text-zinc-300'}`} />
              <span>Sincronizar Bancos</span>
            </button>

            {/* 3. Botón Actualizar */}
            <button
              id="btn-update-app"
              onClick={onCheckUpdate}
              disabled={isCheckingUpdate}
              title={
                hasNewUpdate 
                  ? "¡Nueva actualización disponible! Pulsa para actualizar ahora" 
                  : "Comprobar y buscar actualizaciones"
              }
              className={`h-9 sm:h-10 px-3 sm:px-3.5 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-all shadow-xs active:scale-95 cursor-pointer shrink-0 ${
                hasNewUpdate 
                  ? 'bg-[#0E6A3B] text-white ring-2 ring-emerald-400 hover:bg-[#0a522d]'
                  : 'bg-white hover:bg-zinc-50 text-zinc-800 border border-zinc-200/90'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${isCheckingUpdate ? 'animate-spin text-emerald-600' : hasNewUpdate ? 'text-white animate-spin' : 'text-zinc-600'}`} />
              <span>
                {hasNewUpdate 
                  ? (autoUpdateCountdown !== null && autoUpdateCountdown > 0 ? `Actualizar (${autoUpdateCountdown}s)` : 'Actualizar ahora') 
                  : 'Actualizar'}
              </span>
              {hasNewUpdate && (
                <span className="flex h-2 w-2 relative -ml-0.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                </span>
              )}
            </button>

            {/* Divisor vertical */}
            <div className="h-6 w-px bg-zinc-200 hidden sm:block mx-0.5"></div>

            {/* Botón Instalar (si aplica) */}
            {!isInstalled && (
              <button
                id="btn-install-app"
                onClick={onOpenInstall}
                title="Instalar ANSAMA en tu PC (Acceso directo en Escritorio)"
                className="h-9 w-9 sm:h-10 sm:w-10 flex items-center justify-center rounded-xl text-zinc-500 hover:text-[#0E6A3B] hover:bg-emerald-50/80 border border-zinc-200/80 hover:border-emerald-300 transition-all cursor-pointer shrink-0"
              >
                <Download className="w-4 h-4" />
              </button>
            )}

            {/* Botón Ajustes */}
            <button
              id="btn-open-settings"
              onClick={onOpenSettingsModal}
              title="Ajustes, contraseña y copias de seguridad"
              className="h-9 w-9 sm:h-10 sm:w-10 flex items-center justify-center rounded-xl text-zinc-700 hover:text-zinc-950 hover:bg-zinc-100 border border-zinc-200 hover:border-zinc-300 transition-all cursor-pointer shrink-0 shadow-2xs"
            >
              <Settings className="w-4 h-4" />
            </button>

            {/* Botón Bloquear Pantalla (si tiene clave configurada) */}
            {hasPassword && onLockApp && (
              <button
                id="btn-lock-app"
                onClick={onLockApp}
                title="Bloquear pantalla de finanzas ahora"
                className="h-9 w-9 sm:h-10 sm:w-10 flex items-center justify-center rounded-xl text-rose-600 bg-rose-50/80 hover:bg-rose-100 border border-rose-200 hover:border-rose-300 transition-all cursor-pointer shrink-0 shadow-2xs"
              >
                <Lock className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Espacio balanceador a la derecha en pantallas grandes para garantizar centrado óptico exacto */}
          <div className="hidden xl:flex items-center justify-end w-[250px] shrink-0 pointer-events-none" aria-hidden="true" />

        </div>

        {/* LÍNEA 2: Barra de Navegación de Pestañas perfectamente centrada en la pantalla */}
        <div className="py-2 border-t border-zinc-100/90 flex items-center justify-center overflow-x-auto no-scrollbar">
          <nav 
            id="app-main-navigation" 
            className="flex items-center gap-1 bg-[#092B19] p-1 rounded-2xl border border-[#0E6A3B]/70 shadow-sm ring-1 ring-emerald-950/20 mx-auto"
          >
            <button
              id="nav-tab-dashboard"
              onClick={() => setActiveTab('dashboard')}
              className={`group flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'dashboard'
                  ? 'bg-white text-[#092B19] font-black shadow-xs ring-1 ring-white/40'
                  : 'text-emerald-100/85 hover:text-white hover:bg-white/10 font-bold'
              }`}
            >
              <PieChart className={`w-3.5 h-3.5 transition-colors ${activeTab === 'dashboard' ? 'text-[#0E6A3B]' : 'text-emerald-300/80 group-hover:text-emerald-200'}`} />
              <span>Patrimonio</span>
            </button>

            <button
              id="nav-tab-accounts"
              onClick={() => setActiveTab('accounts')}
              className={`group flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'accounts'
                  ? 'bg-white text-[#092B19] font-black shadow-xs ring-1 ring-white/40'
                  : 'text-emerald-100/85 hover:text-white hover:bg-white/10 font-bold'
              }`}
            >
              <Building2 className={`w-3.5 h-3.5 transition-colors ${activeTab === 'accounts' ? 'text-[#0E6A3B]' : 'text-emerald-300/80 group-hover:text-emerald-200'}`} />
              <span>Bancos</span>
            </button>

            <button
              id="nav-tab-categories"
              onClick={() => setActiveTab('categories')}
              className={`group flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'categories'
                  ? 'bg-white text-[#092B19] font-black shadow-xs ring-1 ring-white/40'
                  : 'text-emerald-100/85 hover:text-white hover:bg-white/10 font-bold'
              }`}
            >
              <TrendingUp className={`w-3.5 h-3.5 transition-colors ${activeTab === 'categories' ? 'text-[#0E6A3B]' : 'text-emerald-300/80 group-hover:text-emerald-200'}`} />
              <span>Gastos</span>
            </button>

            <button
              id="nav-tab-transactions"
              onClick={() => setActiveTab('transactions')}
              className={`group flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'transactions'
                  ? 'bg-white text-[#092B19] font-black shadow-xs ring-1 ring-white/40'
                  : 'text-emerald-100/85 hover:text-white hover:bg-white/10 font-bold'
              }`}
            >
              <ListOrdered className={`w-3.5 h-3.5 transition-colors ${activeTab === 'transactions' ? 'text-[#0E6A3B]' : 'text-emerald-300/80 group-hover:text-emerald-200'}`} />
              <span>Movimientos</span>
            </button>

            <button
              id="nav-tab-monthly"
              onClick={() => setActiveTab('monthly')}
              className={`group flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'monthly'
                  ? 'bg-white text-[#092B19] font-black shadow-xs ring-1 ring-white/40'
                  : 'text-emerald-100/85 hover:text-white hover:bg-white/10 font-bold'
              }`}
            >
              <Calendar className={`w-3.5 h-3.5 transition-colors ${activeTab === 'monthly' ? 'text-[#0E6A3B]' : 'text-emerald-300/80 group-hover:text-emerald-200'}`} />
              <span>Cierre Mensual</span>
            </button>

            <button
              id="nav-tab-yearly"
              onClick={() => setActiveTab('yearly')}
              className={`group flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'yearly'
                  ? 'bg-white text-[#092B19] font-black shadow-xs ring-1 ring-white/40'
                  : 'text-emerald-100/85 hover:text-white hover:bg-white/10 font-bold'
              }`}
            >
              <BarChart3 className={`w-3.5 h-3.5 transition-colors ${activeTab === 'yearly' ? 'text-[#0E6A3B]' : 'text-emerald-300/80 group-hover:text-emerald-200'}`} />
              <span>Cierre Anual</span>
            </button>

            <button
              id="nav-tab-yields"
              onClick={() => setActiveTab('yields')}
              className={`group flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'yields'
                  ? 'bg-white text-[#092B19] font-black shadow-xs ring-1 ring-white/40'
                  : 'text-emerald-100/85 hover:text-white hover:bg-white/10 font-bold'
              }`}
              title="Intereses Bancarios y Dividendos de Acciones (Bruto, Retención y Líquido)"
            >
              <Coins className={`w-3.5 h-3.5 transition-colors ${activeTab === 'yields' ? 'text-[#0E6A3B]' : 'text-emerald-300/80 group-hover:text-emerald-200'}`} />
              <span>Rendimientos</span>
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
};
