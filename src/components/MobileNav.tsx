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
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 px-3 py-2 shadow-lg">
      <div className="flex items-center justify-around max-w-md mx-auto">
        
        {/* Tab: Patrimonio */}
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center gap-1 p-1 min-w-[56px] transition-colors ${
            activeTab === 'dashboard' ? 'text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <PieChart className="w-5 h-5" />
          <span className="text-[10px]">Patrimonio</span>
        </button>

        {/* Tab: Bancos */}
        <button
          onClick={() => setActiveTab('accounts')}
          className={`flex flex-col items-center gap-1 p-1 min-w-[56px] transition-colors ${
            activeTab === 'accounts' ? 'text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building2 className="w-5 h-5" />
          <span className="text-[10px]">Bancos</span>
        </button>

        {/* Center Action: + Movimiento */}
        <button
          onClick={onOpenNewTransactionModal}
          className="w-11 h-11 -mt-5 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/30 hover:bg-blue-700 active:scale-95 transition-all"
          title="Añadir movimiento"
        >
          <Plus className="w-6 h-6" />
        </button>

        {/* Tab: Categorias */}
        <button
          onClick={() => setActiveTab('categories')}
          className={`flex flex-col items-center gap-1 p-1 min-w-[56px] transition-colors ${
            activeTab === 'categories' ? 'text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Tags className="w-5 h-5" />
          <span className="text-[10px]">Categorías</span>
        </button>

        {/* Tab: Movimientos */}
        <button
          onClick={() => setActiveTab('transactions')}
          className={`flex flex-col items-center gap-1 p-1 min-w-[56px] transition-colors ${
            activeTab === 'transactions' ? 'text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <ListOrdered className="w-5 h-5" />
          <span className="text-[10px]">Movimientos</span>
        </button>

      </div>
    </div>
  );
};
