import React from 'react';
import { 
  PieChart, 
  Building2, 
  Tags, 
  ListOrdered, 
  Plus,
  Calendar,
  BarChart3
} from 'lucide-react';

interface MobileNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenNewTransactionModal: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  activeTab,
  setActiveTab,
  onOpenNewTransactionModal
}) => {
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-zinc-200 px-2 py-1.5 shadow-lg">
      <div className="flex items-center justify-between max-w-md mx-auto">
        
        {/* Tab: Patrimonio */}
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl transition-all cursor-pointer ${
            activeTab === 'dashboard' 
              ? 'text-[#0E6A3B] font-black bg-emerald-50' 
              : 'text-zinc-500 hover:text-zinc-800'
          }`}
        >
          <PieChart className="w-4 h-4" />
          <span className="text-[10px]">Patrimonio</span>
        </button>

        {/* Tab: Bancos */}
        <button
          onClick={() => setActiveTab('accounts')}
          className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl transition-all cursor-pointer ${
            activeTab === 'accounts' 
              ? 'text-[#0E6A3B] font-black bg-emerald-50' 
              : 'text-zinc-500 hover:text-zinc-800'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span className="text-[10px]">Bancos</span>
        </button>

        {/* Center Action: + Movimiento */}
        <button
          onClick={onOpenNewTransactionModal}
          className="w-10 h-10 -mt-4 rounded-full bg-[#0E6A3B] text-white flex items-center justify-center shadow-md shadow-emerald-950/30 hover:bg-[#0a522d] active:scale-95 transition-all cursor-pointer"
          title="Añadir movimiento"
        >
          <Plus className="w-5 h-5" />
        </button>

        {/* Tab: Cierre Mes */}
        <button
          onClick={() => setActiveTab('monthly')}
          className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl transition-all cursor-pointer ${
            activeTab === 'monthly' 
              ? 'text-[#0E6A3B] font-black bg-emerald-50' 
              : 'text-zinc-500 hover:text-zinc-800'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span className="text-[10px]">Cierre Mes</span>
        </button>

        {/* Tab: Cierre Año */}
        <button
          onClick={() => setActiveTab('yearly')}
          className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl transition-all cursor-pointer ${
            activeTab === 'yearly' 
              ? 'text-[#0E6A3B] font-black bg-emerald-50' 
              : 'text-zinc-500 hover:text-zinc-800'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span className="text-[10px]">Cierre Año</span>
        </button>

      </div>
    </div>
  );
};
