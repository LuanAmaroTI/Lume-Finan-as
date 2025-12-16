
export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  userId: string;
  description: string;
  amount: number;
  type: TransactionType;
  category: string;
  date: string;
}

export interface BalanceSummary {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  avgIncome: number;
  avgExpense: number;
  maxCategoryIncome: { name: string; value: number };
  maxCategoryExpense: { name: string; value: number };
}

export type ViewState = 'login' | 'dashboard' | 'transactions' | 'profile' | 'users';

export type UserRole = 'admin' | 'user';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  password?: string;
}
