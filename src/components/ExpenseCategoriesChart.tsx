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
    <div id="section-categories-chart" className="bg-white rounded-2xl border border-zinc-200/90 shadow-2xs p-5 sm:p-6 lg:p-7">
      
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-100 pb-5 mb-6">
        <div>
          <h3 className="text-base font-bold text-zinc-950">Distribución de Gastos e Ingresos</h3>
          <p className="text-xs text-zinc-500">Consumo presupuestario del mes corriente</p>
        </div>

        {/* Expense vs Income Toggle */}
        <div className="inline-flex p-1 bg-zinc-100 rounded-xl border border-zinc-200/60">
          <button
            onClick={() => setActiveTab('expense')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === 'expense'
                ? 'bg-white text-zinc-950 shadow-xs border border-zinc-200/80'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            Gastos ({formatCurrency(totalSum > 0 && activeTab === 'expense' ? totalSum : 0)})
          </button>
          <button
            onClick={() => setActiveTab('income')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === 'income'
                ? 'bg-white text-emerald-950 shadow-xs border border-zinc-200/80'
                : 'text-zinc-600 hover:text-zinc-900'
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
                stroke="#f4f4f5"
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
                  stroke="#e4e4e7"
                  strokeWidth={strokeWidth}
                  fill="none"
                  strokeDasharray="4 4"
                />
              )}
            </svg>

            {/* Central summary inside the donut */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 pointer-events-none">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                {activeTab === 'expense' ? 'Total Gastos' : 'Total Ingresos'}
              </span>
              <span className="text-xl font-extrabold text-zinc-950 leading-tight mt-0.5 font-feature-settings-tnum">
                {formatCurrency(totalSum)}
              </span>
              <span className="text-[10px] text-zinc-500 mt-0.5 font-medium">
                {monthTransactions.filter((t) => t.type === activeTab).length} movimientos
              </span>
            </div>
          </div>

          <p className="text-[11px] text-zinc-400 text-center mt-3 font-medium">
            Toca o pasa el cursor sobre cada segmento para ver detalles
          </p>
        </div>

        {/* Categories List with Progress Bar */}
        <div className="lg:col-span-7 space-y-3">
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
                className={`p-3 sm:p-3.5 rounded-xl border transition-all ${
                  isHovered 
                    ? 'border-emerald-400 bg-emerald-50/30 shadow-xs' 
                    : 'border-zinc-200/80 bg-white hover:border-zinc-300'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2.5">
                    <div 
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-2xs"
                      style={{ backgroundColor: item.category.color }}
                    >
                      {renderCategoryIcon(item.category.iconName, 'w-4 h-4')}
                    </div>
                    <div>
                      <span className="text-sm font-bold text-zinc-900 block">
                        {item.category.name}
                      </span>
                      <span className="text-[11px] text-zinc-400">
                        {item.transactionCount} {item.transactionCount === 1 ? 'operación' : 'operaciones'}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-sm font-bold text-zinc-950 block font-feature-settings-tnum">
                      {formatCurrency(item.totalAmount)}
                    </span>
                    <span className="text-[11px] font-semibold text-zinc-500">
                      {item.percentage.toFixed(1)}% del total
                    </span>
                  </div>
                </div>

                {/* Monthly budget bar for expenses */}
                {hasBudget && (
                  <div className="mt-2.5 pt-2 border-t border-zinc-100">
                    <div className="flex items-center justify-between text-[11px] text-zinc-500 mb-1">
                      <span>Presupuesto mensual: <strong className="text-zinc-700">{formatCurrency(item.budget)}</strong></span>
                      <span className={`font-bold ${isOverBudget ? 'text-rose-600' : isNearBudget ? 'text-amber-600' : 'text-[#0E6A3B]'}`}>
                        {budgetPercent.toFixed(0)}%
                      </span>
                    </div>
                    <div className="w-full bg-zinc-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isOverBudget ? 'bg-rose-500' : isNearBudget ? 'bg-amber-500' : 'bg-[#0E6A3B]'
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
