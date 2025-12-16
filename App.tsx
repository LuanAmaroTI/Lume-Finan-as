
import React, { useState, useMemo, useEffect } from 'react';
import { 
  LayoutDashboard, 
  List, 
  Plus, 
  Wallet,
  Search,
  Filter,
  Trash2,
  Edit2,
  Lightbulb,
  Check,
  X as XIcon,
  ArrowDown,
  ArrowUp,
  User as UserIcon,
  Shield,
  Menu,
  Leaf,
  Loader2,
  LogOut,
  Users,
  AlertTriangle,
  ArrowLeft,
  Mail,
  Database,
  WifiOff,
  KeyRound,
  Copy
} from 'lucide-react';
import { Transaction, ViewState, User as UserType, BalanceSummary } from './types';
import { Button, Card, Input, Select } from './components/UIComponents';
import { TransactionForm } from './components/TransactionForm';
import { MonthlyHistoryChart, CategoryBarChart } from './components/Charts';
import * as dbService from './services/dbService';

// --- INITIAL STATE CONSTANTS ---
const DEFAULT_CATEGORIES = [
  'Moradia', 'Alimentação', 'Transporte', 'Saúde', 'Lazer', 'Salário', 'Investimentos', 'Outros'
];

// Session key kept in local storage for login persistence
const SESSION_KEY = 'lume_session_v1';

// Credenciais do Admin Padrão (Seed) - Used only if DB is empty
const DEFAULT_ADMIN: UserType = {
  id: 'admin-seed-01',
  name: 'Luan Amaro',
  email: 'luan.amaro.ti@gmail.com',
  password: 'UZZ3&a&&ItG',
  role: 'admin'
};

export default function App() {
  // --- STATE ---
  
  const [usersList, setUsersList] = useState<UserType[]>([]);
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [view, setView] = useState<ViewState>('login');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  // Login & Auth State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  
  // Forgot Password State
  const [isForgotPasswordMode, setIsForgotPasswordMode] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isResetLoading, setIsResetLoading] = useState(false);
  const [tempResetPassword, setTempResetPassword] = useState<string | null>(null);

  // Data State
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // Initial Data Load
  useEffect(() => {
    const loadData = async () => {
      setIsDataLoading(true);
      try {
        // Load users
        const users = await dbService.getUsers();
        
        // Check if we fell back to offline mode immediately after trying to fetch
        setIsOffline(dbService.isUsingOfflineMode());

        if (users.length === 0) {
           // Seed initial admin if DB is empty
           await dbService.saveUser(DEFAULT_ADMIN);
           setUsersList([DEFAULT_ADMIN]);
        } else {
           setUsersList(users);
        }

        // Transactions are now loaded per user in a separate useEffect

        // Load categories
        const cats = await dbService.getCategories();
        if (cats.length > 0) {
          // Merge defaults with DB categories to ensure defaults always exist
          const merged = Array.from(new Set([...DEFAULT_CATEGORIES, ...cats]));
          setCategories(merged);
        } else {
          // If no categories in DB, initialize defaults (optional, or just use local defaults)
          // For now, we keep local defaults as base.
        }

        // Check session
        const savedSession = localStorage.getItem(SESSION_KEY);
        if (savedSession) {
          const userSession = JSON.parse(savedSession);
          // Verify if user still exists in DB
          const validUser = users.find(u => u.id === userSession.id) || (users.length === 0 ? DEFAULT_ADMIN : null);
          if (validUser) {
            setCurrentUser(validUser);
            setView('dashboard');
          }
        }
      } catch (error) {
        console.error("Failed to load data", error);
        showToast("Erro ao conectar com o banco de dados. Tentando modo offline.", "error");
      } finally {
        setIsDataLoading(false);
        // Ensure status is updated at end of load
        setIsOffline(dbService.isUsingOfflineMode());
      }
    };

    loadData();
  }, []);

  // Fetch transactions when currentUser changes
  useEffect(() => {
    const fetchUserTransactions = async () => {
      if (currentUser?.id) {
        // Don't set global loading here to avoid flicker if just switching users or reloading, 
        // or simple enough to just load.
        try {
          const txs = await dbService.getTransactions(currentUser.id);
          setTransactions(txs);
        } catch (error) {
          console.error("Failed to load user transactions", error);
          showToast("Erro ao carregar transações.", "error");
        }
      } else {
        setTransactions([]);
      }
    };

    fetchUserTransactions();
  }, [currentUser?.id, isOffline]); // Reload if user changes or if we switch to offline mode

  useEffect(() => {
    if (currentUser) {
       localStorage.setItem(SESSION_KEY, JSON.stringify(currentUser));
    } else {
       localStorage.removeItem(SESSION_KEY);
    }
  }, [currentUser]);

  // Filters
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas');
  const [searchQuery, setSearchQuery] = useState('');
  const [reserveFilter, setReserveFilter] = useState<'monthly' | 'total'>('total');
  
  // Transaction Modal
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isCategoryInputVisible, setIsCategoryInputVisible] = useState(false);
  
  // User Management Modal
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserType | null>(null);
  const [userFormData, setUserFormData] = useState({ name: '', email: '', role: 'user', password: '' });

  // Profile Forms
  const [profileName, setProfileName] = useState('');
  const [passwordForm, setPasswordForm] = useState({ new: '', confirm: '' });

  // Toast System
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const showToast = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setToast({ message, type });
  };

  // --- LOGIC ---

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthLoading(true);

    try {
      // Refresh user list before login to ensure latest data
      const users = await dbService.getUsers();
      setUsersList(users);
      
      const foundUser = users.find(u => u.email === loginEmail && u.password === loginPassword);

      if (foundUser) {
        setCurrentUser(foundUser);
        setView('dashboard');
        showToast(`Bem-vindo, ${foundUser.name}!`, 'success');
      } else {
        showToast('E-mail ou senha incorretos.', 'error');
      }
    } catch (e) {
      showToast('Erro ao realizar login.', 'error');
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) {
      showToast('Por favor, digite seu e-mail.', 'warning');
      return;
    }
    
    setIsResetLoading(true);
    setTempResetPassword(null);

    try {
      // Re-fetch users to ensure we have latest data
      const latestUsers = await dbService.getUsers();
      setUsersList(latestUsers);
      
      const user = latestUsers.find(u => u.email === resetEmail);

      if (user) {
        // GENERATE TEMP PASSWORD
        const newTempPassword = Math.random().toString(36).slice(-8);
        
        // Update in DB
        await dbService.updateUser(user.id, { password: newTempPassword });
        
        // Update local state to reflect change immediately
        setUsersList(prev => prev.map(u => u.id === user.id ? { ...u, password: newTempPassword } : u));
        
        setTempResetPassword(newTempPassword);
        showToast('Senha redefinida com sucesso!', 'success');
      } else {
        showToast('Este e-mail não está cadastrado.', 'error');
      }
    } catch (error) {
      console.error(error);
      showToast('Erro ao tentar redefinir a senha.', 'error');
    } finally {
      setIsResetLoading(false);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setView('login');
    setLoginEmail('');
    setLoginPassword('');
    localStorage.removeItem(SESSION_KEY);
  };

  // --- Transactions Logic ---
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const [y, m] = t.date.split('-').map(Number);
      return t.description.toLowerCase().includes(searchQuery.toLowerCase()) &&
             (selectedCategory === 'Todas' || t.category === selectedCategory) &&
             (selectedMonth === -1 || (m - 1) === selectedMonth) &&
             (selectedYear === -1 || y === selectedYear);
    });
  }, [transactions, searchQuery, selectedCategory, selectedMonth, selectedYear]);

  const summary = useMemo<BalanceSummary>(() => {
    const income = filteredTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
    const expense = filteredTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
    const catIncome: Record<string, number> = {};
    const catExpense: Record<string, number> = {};
    filteredTransactions.forEach(t => {
      if (t.type === 'income') catIncome[t.category] = (catIncome[t.category] || 0) + t.amount;
      else catExpense[t.category] = (catExpense[t.category] || 0) + t.amount;
    });
    const maxInc = Object.entries(catIncome).sort((a, b) => b[1] - a[1])[0] || ['-', 0];
    const maxExp = Object.entries(catExpense).sort((a, b) => b[1] - a[1])[0] || ['-', 0];
    const uniqueMonths = new Set(filteredTransactions.map(t => t.date.slice(0, 7))).size || 1;
    return {
      totalIncome: income,
      totalExpense: expense,
      balance: income - expense,
      avgIncome: income / uniqueMonths,
      avgExpense: expense / uniqueMonths,
      maxCategoryIncome: { name: maxInc[0], value: maxInc[1] },
      maxCategoryExpense: { name: maxExp[0], value: maxExp[1] }
    };
  }, [filteredTransactions]);

  const reserveValue = useMemo(() => {
    const rawReserve = (summary.totalIncome * 0.3) - summary.totalExpense;
    return reserveFilter === 'monthly' && (new Set(filteredTransactions.map(t => t.date.slice(0, 7))).size > 1)
      ? rawReserve / (new Set(filteredTransactions.map(t => t.date.slice(0, 7))).size || 1)
      : rawReserve;
  }, [summary, reserveFilter, filteredTransactions]);

  const insights = useMemo(() => {
    const res = [];
    if (summary.totalExpense > summary.totalIncome) res.push('Atenção: Suas despesas excederam suas receitas neste período.');
    if (summary.balance < 0) res.push('Seu saldo está negativo. Tente reduzir gastos não essenciais.');
    if (summary.maxCategoryExpense.value > summary.totalIncome * 0.3) res.push(`A categoria ${summary.maxCategoryExpense.name} consome mais de 30% da sua renda.`);
    if (reserveValue < 0) res.push('Você não está conseguindo atingir a meta de 30% de reserva.');
    if (res.length === 0) res.push('Suas finanças estão saudáveis. Continue assim!');
    return res;
  }, [summary, reserveValue]);

  // --- ACTIONS ---

  const handleAddCategory = async () => {
    if (!newCategoryName.trim() || categories.includes(newCategoryName)) return;
    try {
      await dbService.addCategory(newCategoryName);
      setCategories([...categories, newCategoryName]);
      setNewCategoryName('');
      setIsCategoryInputVisible(false);
      showToast('Categoria adicionada!', 'success');
    } catch (e) {
      showToast('Erro ao salvar categoria.', 'error');
    }
  };

  const handleRemoveCategory = async (cat: string) => {
    try {
      await dbService.removeCategory(cat);
      setCategories(categories.filter(c => c !== cat));
      showToast('Categoria removida.', 'success');
    } catch (e) {
      showToast('Erro ao remover categoria.', 'error');
    }
  };

  const handleSaveTransaction = async (data: Omit<Transaction, 'id' | 'userId'>) => {
    if (!currentUser) return;
    try {
        if (editingTransaction) {
            await dbService.updateTransaction(editingTransaction.id, data);
            setTransactions(prev => prev.map(t => t.id === editingTransaction.id ? { ...t, ...data } : t));
            showToast('Transação atualizada!', 'success');
        } else {
            const newTxData = {
                userId: currentUser.id,
                ...data
            };
            const id = await dbService.saveTransaction(newTxData);
            setTransactions(prev => [{ id, ...newTxData }, ...prev]);
            showToast('Transação criada!', 'success');
        }
        setIsTransactionModalOpen(false);
    } catch (e) {
        showToast('Erro ao salvar transação.', 'error');
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta transação?')) {
        try {
            await dbService.deleteTransaction(id);
            setTransactions(prev => prev.filter(t => t.id !== id));
            showToast('Transação excluída.', 'success');
        } catch (e) {
            showToast('Erro ao excluir transação.', 'error');
        }
    }
  };

  // --- User Management Actions ---

  const openUserModal = (user: UserType | null = null) => {
    setEditingUser(user);
    setUserFormData(user ? { 
      name: user.name, 
      email: user.email, 
      role: user.role, 
      password: user.password || '' 
    } : { name: '', email: '', role: 'user', password: '' });
    setIsUserModalOpen(true);
  };

  const handleSaveUser = async () => {
    if (!userFormData.name || !userFormData.email || !userFormData.password) {
      showToast('Preencha todos os campos obrigatórios.', 'error');
      return;
    }
    
    try {
        if (editingUser) {
          // Update existing user
          const updatedUser = {
            name: userFormData.name,
            email: userFormData.email,
            role: userFormData.role as any,
            password: userFormData.password
          };
          await dbService.updateUser(editingUser.id, updatedUser);
          
          setUsersList(prev => prev.map(u => u.id === editingUser.id ? { ...u, ...updatedUser } : u));
          showToast('Usuário atualizado com sucesso!', 'success');
        } else {
          // Check if email already exists
          if (usersList.some(u => u.email === userFormData.email)) {
            showToast('Este e-mail já está cadastrado.', 'error');
            return;
          }

          // Create new user
          const newUser: UserType = {
            id: crypto.randomUUID(),
            name: userFormData.name,
            email: userFormData.email,
            role: userFormData.role as any,
            password: userFormData.password
          };
          
          await dbService.saveUser(newUser);
          setUsersList(prev => [...prev, newUser]);
          showToast('Usuário criado com sucesso!', 'success');
        }
        setIsUserModalOpen(false);
    } catch (e) {
        showToast('Erro ao salvar usuário.', 'error');
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (id === currentUser?.id) {
      showToast('Você não pode excluir seu próprio usuário.', 'warning');
      return;
    }
    if (window.confirm('Tem certeza que deseja excluir este usuário?')) {
        try {
          await dbService.deleteUser(id);
          setUsersList(prev => prev.filter(u => u.id !== id));
          showToast('Usuário excluído.', 'success');
        } catch (e) {
            showToast('Erro ao excluir usuário.', 'error');
        }
    }
  };

  const handleUpdateProfileInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim()) { showToast('Preencha o nome.', 'error'); return; }
    if (currentUser) {
        try {
            await dbService.updateUser(currentUser.id, { name: profileName });
            const updatedUser = { ...currentUser, name: profileName };
            setCurrentUser(updatedUser);
            setUsersList(prev => prev.map(u => u.id === currentUser.id ? updatedUser : u));
            showToast('Perfil atualizado!', 'success');
        } catch (e) {
            showToast('Erro ao atualizar perfil.', 'error');
        }
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.new !== passwordForm.confirm) {
        showToast('As senhas não conferem.', 'error');
        return;
    }
    if (currentUser) {
        try {
            await dbService.updateUser(currentUser.id, { password: passwordForm.new });
            const updatedUser = { ...currentUser, password: passwordForm.new };
            setCurrentUser(updatedUser);
            setUsersList(prev => prev.map(u => u.id === currentUser.id ? updatedUser : u));
            setPasswordForm({ new: '', confirm: '' });
            showToast('Senha atualizada com sucesso!', 'success');
        } catch (e) {
            showToast('Erro ao atualizar senha.', 'error');
        }
    }
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const cleanDate = dateStr.split('T')[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) {
       const [year, month, day] = cleanDate.split('-');
       return `${day}/${month}/${year}`;
    }
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };
  const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

  // --- RENDERERS ---

  const renderLogin = () => (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      <Card className="w-full max-w-md p-8 border-slate-800 bg-slate-900/50 backdrop-blur transition-all duration-300">
          <div className="animate-fade-in">
            <div className="text-center mb-8">
                <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
                    <Leaf className="text-emerald-500" size={32} />
                </div>
                <h1 className="text-3xl font-light text-white tracking-tight">Lume</h1>
                <p className="text-slate-400 mt-2 font-light">Gestão Financeira Inteligente</p>
                {isDataLoading && <div className="mt-2 flex items-center justify-center gap-2 text-xs text-indigo-400"><Loader2 className="animate-spin" size={12}/> Conectando ao Banco de Dados...</div>}
            </div>
            
            {!isForgotPasswordMode ? (
              <form onSubmit={handleLogin} className="space-y-4 animate-fade-in">
                  <Input 
                      label="E-mail" 
                      type="email" 
                      placeholder="seu@email.com" 
                      required 
                      value={loginEmail} 
                      onChange={(e) => setLoginEmail(e.target.value)} 
                  />
                  <div>
                      <Input 
                          label="Senha" 
                          type="password" 
                          placeholder="••••••••" 
                          required 
                          value={loginPassword} 
                          onChange={(e) => setLoginPassword(e.target.value)} 
                      />
                      <div className="flex justify-end mt-2">
                        <button 
                          type="button" 
                          onClick={() => { setIsForgotPasswordMode(true); setTempResetPassword(null); }}
                          className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                        >
                          Esqueci minha senha
                        </button>
                      </div>
                  </div>
                  <Button type="submit" className="w-full py-3 mt-4" disabled={isAuthLoading || isDataLoading}>
                      {isAuthLoading ? <Loader2 className="animate-spin" size={20} /> : 'Entrar'}
                  </Button>
              </form>
            ) : (
              <div className="animate-fade-in">
                 {!tempResetPassword ? (
                   <form onSubmit={handleForgotPassword} className="space-y-4">
                     <div className="text-center mb-6">
                        <h3 className="text-lg font-bold text-white mb-1">Recuperar Senha</h3>
                        <p className="text-xs text-slate-400">Digite seu e-mail para redefinir sua senha.</p>
                     </div>
                     <Input 
                          label="E-mail Cadastrado" 
                          type="email" 
                          placeholder="seu@email.com" 
                          required 
                          value={resetEmail} 
                          onChange={(e) => setResetEmail(e.target.value)} 
                          autoFocus
                     />
                     <Button type="submit" className="w-full py-3 mt-4" disabled={isResetLoading}>
                          {isResetLoading ? <Loader2 className="animate-spin" size={20} /> : <span className="flex items-center gap-2"><KeyRound size={16} /> Redefinir Senha</span>}
                     </Button>
                   </form>
                 ) : (
                   <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-6 text-center animate-fade-in">
                      <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-3 text-emerald-400">
                        <Check size={24} />
                      </div>
                      <h3 className="text-white font-bold mb-4">Senha Redefinida!</h3>
                      <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 flex items-center justify-between group cursor-pointer" onClick={() => { navigator.clipboard.writeText(tempResetPassword); showToast('Copiado!', 'success'); }}>
                        <code className="text-emerald-400 font-mono text-lg font-bold tracking-wider">{tempResetPassword}</code>
                        <Copy size={16} className="text-slate-500 group-hover:text-white transition-colors" />
                      </div>
                      <p className="text-[10px] text-slate-500 mt-2">Copie esta senha para entrar.</p>
                   </div>
                 )}
                 
                 <button 
                    type="button" 
                    onClick={() => { setIsForgotPasswordMode(false); setResetEmail(''); setTempResetPassword(null); }}
                    className="w-full py-2 text-sm text-slate-400 hover:text-white flex items-center justify-center gap-2 transition-colors mt-4"
                 >
                    <ArrowLeft size={14} /> Voltar para o Login
                 </button>
              </div>
            )}
            
            <p className="text-center text-xs text-slate-500 mt-6 flex items-center justify-center gap-1">
                {isOffline ? (
                  <span className="flex items-center gap-1 text-amber-500"><WifiOff size={10} /> Modo Offline (Local)</span>
                ) : (
                  <span className="flex items-center gap-1 text-emerald-500"><Database size={10} /> Google Cloud</span>
                )}
            </p>
          </div>
      </Card>
    </div>
  );

  const renderUsers = () => (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Gestão de Usuários</h2>
          <p className="text-slate-400 text-sm">Gerencie o acesso ao sistema</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Button onClick={() => openUserModal()} icon={<Plus size={18} />} className="w-full md:w-auto">Novo Usuário</Button>
        </div>
      </div>
      
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-950 text-slate-400 text-xs uppercase font-medium border-b border-slate-800">
              <tr>
                <th className="px-6 py-4">Nome</th>
                <th className="px-6 py-4">E-mail</th>
                <th className="px-6 py-4">Função</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {usersList.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                    Nenhum usuário encontrado.
                  </td>
                </tr>
              ) : (
                usersList.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-800/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 text-xs font-bold border border-slate-700">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <p className="text-sm font-medium text-white">{user.name}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-400">{user.email}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                        user.role === 'admin' 
                          ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' 
                          : 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}>
                        {user.role === 'admin' ? 'Administrador' : 'Usuário'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => openUserModal(user)} 
                          className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-indigo-400/10 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDeleteUser(user.id)} 
                          className={`p-1.5 rounded-lg transition-colors ${
                            user.id === currentUser?.id
                              ? 'text-slate-700 cursor-not-allowed'
                              : 'text-slate-400 hover:text-rose-400 hover:bg-rose-400/10'
                          }`}
                          title={user.id === currentUser?.id ? "Você não pode se excluir" : "Excluir"}
                          disabled={user.id === currentUser?.id}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );

  const renderDashboard = () => (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div><h2 className="text-2xl font-bold text-white">Painel</h2><p className="text-slate-400 text-sm">Visão geral das suas finanças</p></div>
        <div className="flex flex-wrap gap-0 bg-slate-900 rounded-lg border border-slate-800 items-center overflow-hidden">
           <div className="flex items-center px-3 py-2 border-r border-slate-800 hover:bg-slate-800/50 transition-colors">
              <Search size={14} className="text-slate-500 mr-2 shrink-0" />
              <input 
                 type="text" 
                 placeholder="Filtrar descrição..." 
                 value={searchQuery} 
                 onChange={(e) => setSearchQuery(e.target.value)} 
                 className="bg-transparent text-white text-sm focus:outline-none w-24 md:w-36 placeholder-slate-600"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="ml-1 text-slate-500 hover:text-white flex items-center justify-center">
                  <XIcon size={12} />
                </button>
              )}
           </div>
           <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="bg-transparent text-white text-sm px-3 py-2 focus:outline-none cursor-pointer hover:bg-slate-800 border-r border-slate-800"><option value="Todas">Todas</option>{categories.map(c => <option key={c} value={c}>{c}</option>)}</select>
           <select value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))} className="bg-transparent text-white text-sm px-3 py-2 focus:outline-none cursor-pointer hover:bg-slate-800 border-r border-slate-800"><option value="-1">Mês</option>{monthNames.map((m, i) => <option key={i} value={i}>{m}</option>)}</select>
           <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))} className="bg-transparent text-white text-sm px-3 py-2 focus:outline-none cursor-pointer hover:bg-slate-800"><option value="-1">Ano</option>{[2023, 2024, 2025].map(y => <option key={y} value={y}>{y}</option>)}</select>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-5 border-l-4 border-l-emerald-500"><p className="text-slate-400 text-xs font-medium uppercase">Total Entradas</p><h3 className="text-2xl font-bold text-white mt-1">{formatCurrency(summary.totalIncome)}</h3></Card>
        <Card className="p-5 border-l-4 border-l-rose-500"><p className="text-slate-400 text-xs font-medium uppercase">Total Saídas</p><h3 className="text-2xl font-bold text-white mt-1">{formatCurrency(summary.totalExpense)}</h3></Card>
        <Card className="p-5 border-l-4 border-l-indigo-500"><p className="text-slate-400 text-xs font-medium uppercase">Saldo Líquido</p><h3 className={`text-2xl font-bold mt-1 ${summary.balance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatCurrency(summary.balance)}</h3></Card>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-5 bg-slate-900/50"><div className="flex items-center gap-2 mb-2"><div className="p-1.5 rounded-full bg-emerald-500/10 text-emerald-500"><ArrowUp size={14}/></div><p className="text-slate-400 text-xs font-medium uppercase">Receita Média</p></div><h3 className="text-xl font-bold text-slate-200">{formatCurrency(summary.avgIncome)}</h3></Card>
        <Card className="p-5 bg-slate-900/50"><div className="flex items-center gap-2 mb-2"><div className="p-1.5 rounded-full bg-rose-500/10 text-rose-500"><ArrowDown size={14}/></div><p className="text-slate-400 text-xs font-medium uppercase">Gasto Médio</p></div><h3 className="text-xl font-bold text-slate-200">{formatCurrency(summary.avgExpense)}</h3></Card>
        <Card className="p-4 flex flex-col justify-center bg-slate-900/50"><div className="flex justify-between items-center mb-2"><span className="text-slate-400 text-xs">Maior Entrada</span><span className="text-emerald-400 text-xs font-bold">{formatCurrency(summary.maxCategoryIncome.value)}</span></div><p className="text-white text-sm font-medium truncate mb-2">{summary.maxCategoryIncome.name}</p><div className="h-px bg-slate-800 my-1" /><div className="flex justify-between items-center mt-1"><span className="text-slate-400 text-xs">Maior Saída</span><span className="text-rose-400 text-xs font-bold">{formatCurrency(summary.maxCategoryExpense.value)}</span></div><p className="text-white text-sm font-medium truncate">{summary.maxCategoryExpense.name}</p></Card>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6 lg:col-span-2"><div className="flex justify-between items-center mb-6"><h3 className="text-lg font-bold text-white">Evolução Financeira</h3><span className="text-xs text-slate-500">{selectedYear === -1 ? 'Todo o período' : selectedMonth === -1 ? `Ano de ${selectedYear}` : 'Período selecionado'}</span></div><MonthlyHistoryChart transactions={filteredTransactions} /></Card>
        <div className="space-y-6 lg:col-span-1"><Card className="p-6"><h3 className="text-lg font-bold text-white mb-4">Despesas por Categoria</h3><CategoryBarChart transactions={filteredTransactions} categoryType="expense" /></Card><Card className="p-6"><h3 className="text-lg font-bold text-white mb-4">Receitas por Categoria</h3><CategoryBarChart transactions={filteredTransactions} categoryType="income" /></Card></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6 border-amber-500/20 bg-gradient-to-br from-slate-900 to-amber-900/10"><div className="flex justify-between items-start mb-4"><div className="flex items-center gap-2"><div className="p-2 bg-amber-500/20 rounded-lg"><Wallet className="text-amber-400" size={20} /></div><h3 className="text-lg font-bold text-white">Reserva Recomendada</h3></div><div className="flex bg-slate-950 rounded-lg p-1 border border-slate-800"><button onClick={() => setReserveFilter('monthly')} className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${reserveFilter === 'monthly' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'}`}>Mensal</button><button onClick={() => setReserveFilter('total')} className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${reserveFilter === 'total' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'}`}>Total</button></div></div><div className="text-center py-4"><h2 className={`text-3xl font-bold ${reserveValue >= 0 ? 'text-white' : 'text-rose-400'}`}>{formatCurrency(reserveValue)}</h2><p className="text-slate-400 text-xs mt-2">{(selectedMonth === -1 || selectedYear === -1) ? 'Resultado acumulado do período selecionado' : (reserveFilter === 'monthly' ? 'Cálculo do Mês: (30% Receitas) - Despesas' : 'Acumulado: Cálculo Mensal + Saldo de Reserva Anterior')}</p></div></Card>
        <Card className="p-6 border-indigo-500/20"><div className="flex items-center gap-2 mb-4"><div className="p-2 bg-indigo-500/20 rounded-lg"><Lightbulb className="text-indigo-400" size={20} /></div><h3 className="text-lg font-bold text-white">Análises Inteligentes</h3></div><div className="space-y-3">{insights.map((insight, idx) => (<div key={idx} className="flex gap-3 items-start p-3 rounded-lg bg-slate-950/50 border border-slate-800/50"><span className="mt-0.5 block w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0"></span><p className="text-sm text-slate-300 leading-tight">{insight}</p></div>))}</div></Card>
      </div>
    </div>
  );

  const renderTransactions = () => (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h2 className="text-2xl font-bold text-white">Meus Registros</h2>
           <p className="text-slate-400 text-sm">Gerencie suas entradas e saídas</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-64"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} /><input type="text" placeholder="Buscar..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"/></div>
            <Button onClick={() => { setEditingTransaction(null); setIsTransactionModalOpen(true); }} icon={<Plus size={18} />} className="w-full md:w-auto">Novo</Button>
        </div>
      </div>
      <div className="flex flex-col gap-2"><div className="flex items-center gap-2"><Filter size={14} className="text-slate-400" /><span className="text-xs font-medium text-slate-300">Gerenciar Categorias:</span></div><div className="flex flex-wrap gap-2 items-center">{categories.map(cat => (<div key={cat} className="group flex items-center px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-300 hover:border-indigo-500 transition-colors"><span className="mr-1">{cat}</span><button type="button" onClick={(e) => { e.stopPropagation(); handleRemoveCategory(cat); }} className="p-1 text-slate-400 hover:text-white hover:bg-rose-500 rounded-full transition-all"><XIcon size={12} /></button></div>))}{isCategoryInputVisible ? (<div className="flex items-center gap-1 animate-fade-in"><input autoFocus className="px-3 py-1.5 bg-slate-950 border border-indigo-500 rounded-lg text-xs text-white focus:outline-none w-32" placeholder="Nova categoria" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()} /><button onClick={handleAddCategory} className="p-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"><Check size={12} /></button><button onClick={() => setIsCategoryInputVisible(false)} className="p-1.5 bg-slate-800 text-slate-400 rounded-md hover:text-white"><XIcon size={12} /></button></div>) : (<button onClick={() => setIsCategoryInputVisible(true)} className="px-3 py-1.5 border border-dashed border-slate-700 rounded-lg text-xs text-slate-500 hover:text-indigo-400 hover:border-indigo-500 transition-colors flex items-center gap-1"><Plus size={12} /> Adicionar</button>)}</div></div>
      <Card className="overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-left"><thead className="bg-slate-950 text-slate-400 text-xs uppercase font-medium border-b border-slate-800"><tr><th className="px-6 py-4">Descrição</th><th className="px-6 py-4">Categoria</th><th className="px-6 py-4">Data</th><th className="px-6 py-4">Valor</th><th className="px-6 py-4 text-right">Ações</th></tr></thead><tbody className="divide-y divide-slate-800">{filteredTransactions.length === 0 ? (<tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">{searchQuery ? 'Nenhum registro encontrado para sua busca.' : 'Nenhum registro encontrado. Adicione novos registros para visualizar aqui.'}</td></tr>) : (filteredTransactions.map((tx) => (<tr key={tx.id} className="hover:bg-slate-800/50 transition-colors group"><td className="px-6 py-4"><p className="text-sm font-medium text-white">{tx.description}</p></td><td className="px-6 py-4"><span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">{tx.category}</span></td><td className="px-6 py-4 text-sm text-slate-400">{formatDate(tx.date)}</td><td className={`px-6 py-4 text-sm font-bold ${tx.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>{tx.type === 'income' ? '+' : '-'} {formatCurrency(tx.amount)}</td><td className="px-6 py-4 text-right"><div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => { setEditingTransaction(tx); setIsTransactionModalOpen(true); }} className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-indigo-400/10 rounded-lg transition-colors"><Edit2 size={16} /></button><button onClick={() => handleDeleteTransaction(tx.id)} className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-400/10 rounded-lg transition-colors"><Trash2 size={16} /></button></div></td></tr>)))}</tbody></table></div></Card>
    </div>
  );

  const renderProfile = () => (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto pb-10">
      <div className="flex items-center gap-4"><div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 text-2xl font-bold border-2 border-slate-700">{currentUser?.name?.charAt(0).toUpperCase()}</div><div><h2 className="text-2xl font-bold text-white">Meu Perfil</h2><p className="text-slate-400 text-sm">{currentUser?.email}</p></div></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6"><div className="flex items-center gap-3 mb-6"><div className="p-2 bg-indigo-500/10 rounded-lg"><UserIcon className="text-indigo-400" size={20} /></div><h3 className="text-lg font-bold text-white">Dados Pessoais</h3></div><form onSubmit={handleUpdateProfileInfo} className="space-y-4"><Input label="Nome de Exibição" value={profileName || currentUser?.name || ''} onChange={(e) => setProfileName(e.target.value)} required /><Input label="E-mail" type="email" value={currentUser?.email} disabled className="opacity-50 cursor-not-allowed" /><div className="pt-2"><Button type="submit" className="w-full">Salvar Alterações</Button></div></form></Card>
        <Card className="p-6"><div className="flex items-center gap-3 mb-6"><div className="p-2 bg-emerald-500/10 rounded-lg"><Shield className="text-emerald-400" size={20} /></div><h3 className="text-lg font-bold text-white">Segurança</h3></div><form onSubmit={handleUpdatePassword} className="space-y-4"><Input label="Nova Senha" type="password" value={passwordForm.new} onChange={(e) => setPasswordForm(prev => ({...prev, new: e.target.value}))} required placeholder="••••••••" /><Input label="Confirmar Nova Senha" type="password" value={passwordForm.confirm} onChange={(e) => setPasswordForm(prev => ({...prev, confirm: e.target.value}))} required placeholder="••••••••" /><div className="pt-2"><Button variant="secondary" type="submit" className="w-full">Atualizar Senha</Button></div></form></Card>
      </div>
    </div>
  );

  // --- MAIN RENDER ---

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50">
        {toast && <div className={`fixed top-5 right-5 z-[100] px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-slide-in-right ${toast.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'} backdrop-blur-md`}><div><h4 className="font-bold text-sm text-white">{toast.type === 'success' ? 'Sucesso' : 'Erro'}</h4><p className="text-xs opacity-90">{toast.message}</p></div></div>}
        {renderLogin()}
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-50">
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-slate-900 border-b border-slate-800 p-4 flex justify-between items-center"><div className="flex items-center gap-2"><Leaf className="text-emerald-500" size={24} /><span className="font-bold text-lg tracking-tight">Lume</span></div><button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-slate-400">{isMobileMenuOpen ? <XIcon /> : <Menu />}</button></div>
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 border-r border-slate-800 transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:block ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6"><div className="flex items-center gap-3 mb-8"><div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center border border-emerald-500/20"><Leaf className="text-emerald-500" size={24} /></div><div><h1 className="font-bold text-xl tracking-tight text-white">Lume</h1><p className="text-xs text-slate-400">Financeiro Local</p></div></div>
          <nav className="space-y-1">
            <Button variant={view === 'dashboard' ? 'primary' : 'ghost'} className="w-full justify-start" icon={<LayoutDashboard size={20} />} onClick={() => { setView('dashboard'); setIsMobileMenuOpen(false); }}>Painel</Button>
            <Button variant={view === 'transactions' ? 'primary' : 'ghost'} className="w-full justify-start" icon={<List size={20} />} onClick={() => { setView('transactions'); setIsMobileMenuOpen(false); }}>Transações</Button>
            {currentUser?.role === 'admin' && (
              <Button variant={view === 'users' ? 'primary' : 'ghost'} className="w-full justify-start" icon={<Users size={20} />} onClick={() => { setView('users'); setIsMobileMenuOpen(false); }}>Usuários</Button>
            )}
            <Button variant={view === 'profile' ? 'primary' : 'ghost'} className="w-full justify-start" icon={<UserIcon size={20} />} onClick={() => { setView('profile'); setIsMobileMenuOpen(false); }}>Meu Perfil</Button>
          </nav>
        </div>
        <div className="absolute bottom-0 w-full p-6 border-t border-slate-800 bg-slate-900/50">
            <div className="flex items-center gap-3 mb-4"><div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold border border-indigo-500/30">{currentUser?.name?.charAt(0).toUpperCase()}</div><div className="overflow-hidden"><div className="flex items-center gap-2"><p className="text-sm font-medium text-white truncate">{currentUser?.name}</p></div><p className="text-xs text-slate-500 truncate flex items-center gap-1">{isOffline ? (<><WifiOff size={10} className="text-amber-500" /> Offline Mode</>) : (<><Database size={10} className="text-emerald-500" /> Google Cloud</>)}</p></div></div>
            <button onClick={handleLogout} className="w-full p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"><LogOut size={16}/> Sair</button>
        </div>
      </aside>
      {isMobileMenuOpen && <div className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm md:hidden" onClick={() => setIsMobileMenuOpen(false)} />}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto h-screen pt-20 md:pt-8 scroll-smooth no-scrollbar">
         {toast && <div className={`fixed top-5 right-5 z-[100] px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-slide-in-right ${toast.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'} backdrop-blur-md`}><div><h4 className="font-bold text-sm text-white">{toast.type === 'success' ? 'Sucesso' : 'Erro'}</h4><p className="text-xs opacity-90">{toast.message}</p></div></div>}
        <div className="max-w-7xl mx-auto">
          {view === 'dashboard' && renderDashboard()}
          {view === 'transactions' && renderTransactions()}
          {view === 'users' && currentUser.role === 'admin' && renderUsers()}
          {view === 'profile' && renderProfile()}
        </div>
      </main>
      <TransactionForm isOpen={isTransactionModalOpen} onClose={() => { setIsTransactionModalOpen(false); setEditingTransaction(null); }} onSubmit={handleSaveTransaction} initialData={editingTransaction} availableCategories={categories} />
      
      {/* User Modal */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
           <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
               <div className="flex justify-between items-center p-5 border-b border-slate-800">
                  <h2 className="text-lg font-bold text-white">{editingUser ? 'Editar Usuário' : 'Novo Usuário'}</h2>
                  <button onClick={() => setIsUserModalOpen(false)} className="text-slate-400 hover:text-white transition-colors"><XIcon size={24} /></button>
               </div>
               <div className="p-6 space-y-4">
                  <Input 
                    label="Nome Completo" 
                    placeholder="Ex: João Silva" 
                    value={userFormData.name} 
                    onChange={(e) => setUserFormData({...userFormData, name: e.target.value})} 
                    required 
                  />
                  <Input 
                    label="E-mail" 
                    type="email" 
                    placeholder="email@exemplo.com" 
                    value={userFormData.email} 
                    onChange={(e) => setUserFormData({...userFormData, email: e.target.value})} 
                    required 
                    // Se estiver editando, não permite mudar o email para simplificar a lógica de ID
                    disabled={!!editingUser}
                    className={!!editingUser ? 'opacity-50 cursor-not-allowed' : ''}
                  />
                  <Input 
                    label={editingUser ? "Nova Senha (opcional)" : "Senha Inicial"}
                    type="password" 
                    placeholder="••••••••" 
                    value={userFormData.password} 
                    onChange={(e) => setUserFormData({...userFormData, password: e.target.value})} 
                    required={!editingUser} 
                  />
                  
                  <Select 
                    label="Nível de Acesso" 
                    value={userFormData.role} 
                    onChange={(e) => setUserFormData({...userFormData, role: e.target.value as any})} 
                    options={[
                      { label: 'Usuário Comum', value: 'user' }, 
                      { label: 'Administrador', value: 'admin' }
                    ]} 
                  />
                  
                  <div className="pt-4 flex gap-3">
                    <Button variant="secondary" className="flex-1" onClick={() => setIsUserModalOpen(false)}>Cancelar</Button>
                    <Button className="flex-1" onClick={handleSaveUser}>{editingUser ? 'Salvar' : 'Criar Usuário'}</Button>
                  </div>
               </div>
           </div>
        </div>
      )}
    </div>
  );
}
