import React from 'react';
import { 
  PieChart, 
  Building2, 
  Tags, 
  ListOrdered, 
  Plus
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
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-zinc-200 px-3 py-1.5 shadow-lg">
      <div className="flex items-center justify-around max-w-md mx-auto">
        
        {/* Tab: Patrimonio */}
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl transition-all ${
            activeTab === 'dashboard' 
              ? 'text-[#0E6A3B] font-bold bg-emerald-50/80' 
              : 'text-zinc-500 hover:text-zinc-800'
          }`}
        >
          <PieChart className="w-4 h-4" />
          <span className="text-[10px]">Patrimonio</span>
        </button>

        {/* Tab: Bancos */}
        <button
          onClick={() => setActiveTab('accounts')}
          className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl transition-all ${
            activeTab === 'accounts' 
              ? 'text-[#0E6A3B] font-bold bg-emerald-50/80' 
              : 'text-zinc-500 hover:text-zinc-800'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span className="text-[10px]">Bancos</span>
        </button>

        {/* Center Action: + Movimiento */}
        <button
          onClick={onOpenNewTransactionModal}
          className="w-11 h-11 -mt-5 rounded-full bg-[#0E6A3B] text-white flex items-center justify-center shadow-md shadow-emerald-950/30 hover:bg-[#0a522d] active:scale-95 transition-all"
          title="Añadir movimiento"
        >
          <Plus className="w-5 h-5" />
        </button>

        {/* Tab: Categorias */}
        <button
          onClick={() => setActiveTab('categories')}
          className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl transition-all ${
            activeTab === 'categories' 
              ? 'text-[#0E6A3B] font-bold bg-emerald-50/80' 
              : 'text-zinc-500 hover:text-zinc-800'
          }`}
        >
          <Tags className="w-4 h-4" />
          <span className="text-[10px]">Gastos</span>
        </button>

        {/* Tab: Movimientos */}
        <button
          onClick={() => setActiveTab('transactions')}
          className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl transition-all ${
            activeTab === 'transactions' 
              ? 'text-[#0E6A3B] font-bold bg-emerald-50/80' 
              : 'text-zinc-500 hover:text-zinc-800'
          }`}
        >
          <ListOrdered className="w-4 h-4" />
          <span className="text-[10px]">Movimientos</span>
        </button>

      </div>
    </div>
  );
};
