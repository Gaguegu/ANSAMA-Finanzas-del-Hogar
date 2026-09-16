import React, { useState } from 'react';
import { 
  Home, 
  ShoppingCart, 
  Zap, 
  Car, 
  Utensils, 
  HeartPulse, 
  Smartphone, 
  Tag, 
  Briefcase, 
  ArrowDownLeft, 
  TrendingUp, 
  PlusCircle,
  AlertCircle,
  PieChart as PieIcon
} from 'lucide-react';
import { TransactionCategory, Transaction } from '../types';
import { formatCurrency } from '../utils/storage';

interface ExpenseCategoriesChartProps {
  categories: TransactionCategory[];
  transactions: Transaction[];
}

export const ExpenseCategoriesChart: React.FC<ExpenseCategoriesChartProps> = ({
  categories,
  transactions
}) => {
  const [activeTab, setActiveTab] = useState<'expense' | 'income'>('expense');
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);

  // Filter transactions for the current month
  const currentMonth = new Date().toISOString().substring(0, 7);
  const monthTransactions = transactions.filter((t) => t.date.startsWith(currentMonth));

  // Compute category totals
  const targetCategories = categories.filter((c) => c.type === activeTab);
  
  const categoryStats = targetCategories.map((category) => {
    const totalAmount = monthTransactions
      .filter((t) => t.categoryId === category.id)
      .reduce((sum, t) => sum + t.amount, 0);

    const transactionCount = monthTransactions.filter((t) => t.categoryId === category.id).length;
    return {
      category,
      totalAmount,
      transactionCount,
      budget: category.monthlyBudget || 0
    };
  });

  const totalSum = categoryStats.reduce((sum, item) => sum + item.totalAmount, 0);

  // Calculate percentages and sort descending
  const sortedStats = categoryStats
    .map((item) => ({
      ...item,
      percentage: totalSum > 0 ? (item.totalAmount / totalSum) * 100 : 0
    }))
    .sort((a, b) => b.totalAmount - a.totalAmount);

  // SVG Donut Chart calculation
  const size = 220;
  const strokeWidth = 32;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  let accumulatedOffset = 0;

  // Map icon strings to Lucide components
  const renderCategoryIcon = (iconName: string, className: string = 'w-4 h-4') => {
    switch (iconName) {
      case 'Home': return <Home className={className} />;
      case 'ShoppingCart': return <ShoppingCart className={className} />;
      case 'Zap': return <Zap className={className} />;
      case 'Car': return <Car className={className} />;
      case 'Utensils': return <Utensils className={className} />;
      case 'HeartPulse': return <HeartPulse className={className} />;
      case 'Smartphone': return <Smartphone className={className} />;
      case 'Briefcase': return <Briefcase className={className} />;
      case 'ArrowDownLeft': return <ArrowDownLeft className={className} />;
      case 'TrendingUp': return <TrendingUp className={className} />;
      case 'PlusCircle': return <PlusCircle className={className} />;
      default: return <Tag className={className} />;
    }
  };

  return (
    <div id="section-categories-chart" className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 lg:p-7">
      
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5 mb-6">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Categorías y Presupuesto</h3>
          <p className="text-xs text-slate-500">Distribución de los importes del mes actual</p>
        </div>

        {/* Expense vs Income Toggle */}
        <div className="inline-flex p-1 bg-slate-100 rounded-xl">
          <button
            onClick={() => setActiveTab('expense')}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === 'expense'
                ? 'bg-rose-50 text-rose-700 border border-rose-200 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Gastos ({formatCurrency(totalSum > 0 && activeTab === 'expense' ? totalSum : 0)})
          </button>
          <button
            onClick={() => setActiveTab('income')}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === 'income'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Ingresos ({formatCurrency(totalSum > 0 && activeTab === 'income' ? totalSum : 0)})
          </button>
        </div>
      </div>

      {/* Main Content: Donut + List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        
        {/* Donut Chart Visualizer */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center">
          <div className="relative w-[220px] h-[220px]">
            <svg width={size} height={size} className="transform -rotate-90">
              {/* Background ring */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke="#f1f5f9"
                strokeWidth={strokeWidth}
                fill="none"
              />

              {/* Data rings */}
              {totalSum > 0 ? (
                sortedStats.map((item) => {
                  if (item.totalAmount <= 0) return null;
                  const strokeDasharray = `${(item.percentage / 100) * circumference} ${circumference}`;
                  const strokeDashoffset = -accumulatedOffset;
                  accumulatedOffset += (item.percentage / 100) * circumference;

                  const isHovered = hoveredCategory === item.category.id;

                  return (
                    <circle
                      key={item.category.id}
                      cx={size / 2}
                      cy={size / 2}
                      r={radius}
                      stroke={item.category.color}
                      strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                      strokeDasharray={strokeDasharray}
                      strokeDashoffset={strokeDashoffset}
                      fill="none"
                      className="transition-all duration-300 cursor-pointer"
                      onMouseEnter={() => setHoveredCategory(item.category.id)}
                      onMouseLeave={() => setHoveredCategory(null)}
                    />
                  );
                })
              ) : (
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  stroke="#cbd5e1"
                  strokeWidth={strokeWidth}
                  fill="none"
                  strokeDasharray="4 4"
                />
              )}
            </svg>

            {/* Central summary inside the donut */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 pointer-events-none">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                {activeTab === 'expense' ? 'Total Gastos' : 'Total Ingresos'}
              </span>
              <span className="text-xl font-black text-slate-900 leading-tight mt-0.5">
                {formatCurrency(totalSum)}
              </span>
              <span className="text-[10px] text-slate-500 mt-0.5">
                {monthTransactions.filter((t) => t.type === activeTab).length} movimientos
              </span>
            </div>
          </div>

          <p className="text-xs text-slate-400 text-center mt-3">
            Pasa el cursor sobre los segmentos para ver el desglose
          </p>
        </div>

        {/* Categories List with Progress Bar */}
        <div className="lg:col-span-7 space-y-3.5">
          {sortedStats.map((item) => {
            const hasBudget = activeTab === 'expense' && item.budget > 0;
            const budgetPercent = hasBudget ? (item.totalAmount / item.budget) * 100 : 0;
            const isOverBudget = hasBudget && item.totalAmount > item.budget;
            const isNearBudget = hasBudget && budgetPercent >= 80 && !isOverBudget;
            const isHovered = hoveredCategory === item.category.id;

            return (
              <div
                key={item.category.id}
                onMouseEnter={() => setHoveredCategory(item.category.id)}
                onMouseLeave={() => setHoveredCategory(null)}
                className={`p-3 rounded-xl border transition-all ${
                  isHovered 
                    ? 'border-blue-400 bg-blue-50/40 shadow-xs' 
                    : 'border-slate-100 bg-slate-50/50 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2.5">
                    <div 
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-white"
                      style={{ backgroundColor: item.category.color }}
                    >
                      {renderCategoryIcon(item.category.iconName, 'w-3.5 h-3.5')}
                    </div>
                    <div>
                      <span className="text-sm font-semibold text-slate-900 block">
                        {item.category.name}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {item.transactionCount} {item.transactionCount === 1 ? 'operación' : 'operaciones'}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-sm font-bold text-slate-900 block">
                      {formatCurrency(item.totalAmount)}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-500">
                      {item.percentage.toFixed(1)}% del total
                    </span>
                  </div>
                </div>

                {/* Monthly budget bar for expenses */}
                {hasBudget && (
                  <div className="mt-2 pt-2 border-t border-slate-200/60">
                    <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                      <span>Presupuesto mensual: {formatCurrency(item.budget)}</span>
                      <span className={isOverBudget ? 'text-rose-600 font-bold' : isNearBudget ? 'text-amber-600 font-bold' : 'text-slate-600'}>
                        {budgetPercent.toFixed(0)}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isOverBudget ? 'bg-rose-500' : isNearBudget ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, budgetPercent)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>

    </div>
  );
};
