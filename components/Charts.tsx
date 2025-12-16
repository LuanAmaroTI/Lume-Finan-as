
import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line, Legend
} from 'recharts';
import { Transaction } from '../types';

interface ChartProps {
  transactions: Transaction[];
  type?: 'income' | 'expense' | 'both';
}

const COLORS = {
  income: '#10b981', // emerald-500
  expense: '#ef4444', // red-500
  grid: '#1e293b', // slate-800
  text: '#94a3b8'  // slate-400
};

// --- Monthly Evolution (Line Chart) ---
export const MonthlyHistoryChart: React.FC<ChartProps> = ({ transactions }) => {
  const data = React.useMemo(() => {
    // If no transactions, provide at least the current month as a placeholder to avoid empty chart crashes or ugly states
    if (transactions.length === 0) {
       const today = new Date();
       const label = today.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
       return [{ name: label, Entradas: 0, Saídas: 0 }];
    }

    // 1. Identify all unique year-months from the data provided (which is already filtered)
    const uniqueMonths = new Set<string>();
    transactions.forEach(t => {
       // Format: YYYY-MM
       uniqueMonths.add(t.date.slice(0, 7));
    });

    // 2. Sort them chronologically
    const sortedMonths = Array.from(uniqueMonths).sort();

    // 3. Map to Chart Data
    return sortedMonths.map(monthKey => {
       const [year, month] = monthKey.split('-');
       // Create a label like "Jan 24" or just "Jan" depending on range, but keeping it simple for now
       const dateObj = new Date(parseInt(year), parseInt(month) - 1, 1);
       const label = dateObj.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });

       const monthTrans = transactions.filter(t => t.date.startsWith(monthKey));
       const income = monthTrans.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
       const expense = monthTrans.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);

       return {
         name: label,
         Entradas: income,
         Saídas: expense
       };
    });
  }, [transactions]);

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} vertical={false} />
          <XAxis 
            dataKey="name" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 12, fill: COLORS.text }} 
            dy={10}
            minTickGap={20}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 12, fill: COLORS.text }} 
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#0f172a', 
              borderColor: '#1e293b', 
              color: '#f8fafc',
              borderRadius: '8px'
            }}
            itemStyle={{ fontSize: '12px' }}
          />
          <Legend wrapperStyle={{ paddingTop: '20px' }} />
          <Line 
            type="monotone" 
            dataKey="Entradas" 
            stroke={COLORS.income} 
            strokeWidth={2} 
            dot={{ r: 4, fill: COLORS.income }} 
            activeDot={{ r: 6 }} 
          />
          <Line 
            type="monotone" 
            dataKey="Saídas" 
            stroke={COLORS.expense} 
            strokeWidth={2} 
            dot={{ r: 4, fill: COLORS.expense }} 
            activeDot={{ r: 6 }} 
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

// --- Category Breakdown (Bar Chart) ---
export const CategoryBarChart: React.FC<ChartProps & { categoryType: 'income' | 'expense' }> = ({ transactions, categoryType }) => {
  const data = React.useMemo(() => {
    const filtered = transactions.filter(t => t.type === categoryType);
    const byCategory = filtered.reduce((acc: Record<string, number>, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(byCategory)
      .map(([name, value]) => ({ name, value: Number(value) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 7); // Top 7 categories
  }, [transactions, categoryType]);

  if (data.length === 0) {
    return (
      <div className="h-72 flex flex-col items-center justify-center text-slate-500 bg-slate-900/50 rounded-lg">
        <p>Sem dados de {categoryType === 'income' ? 'receita' : 'despesa'} para exibir.</p>
      </div>
    );
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart layout="vertical" data={data} margin={{ top: 0, right: 30, left: 20, bottom: 0 }}>
           <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} horizontal={false} />
          <XAxis type="number" hide />
          <YAxis 
            dataKey="name" 
            type="category" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 12, fill: COLORS.text }} 
            width={100}
          />
          <Tooltip 
            cursor={{ fill: '#1e293b', opacity: 0.4 }}
            contentStyle={{ 
              backgroundColor: '#0f172a', 
              borderColor: '#1e293b', 
              color: '#f8fafc',
              borderRadius: '8px'
            }}
            formatter={(value: number) => [`R$ ${value.toFixed(2)}`, 'Valor']}
          />
          <Bar 
            dataKey="value" 
            fill={categoryType === 'income' ? COLORS.income : COLORS.expense} 
            radius={[0, 4, 4, 0]} 
            barSize={20}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
