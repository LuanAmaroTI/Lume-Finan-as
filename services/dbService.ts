
import { db } from './firebaseConfig';
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  setDoc,
  query,
  where
} from 'firebase/firestore';
import { Transaction, User } from '../types';

// Constants for LocalStorage
const STORAGE_KEYS = {
  CATEGORIES: 'lume_categories_local_v1',
  TRANSACTIONS: 'lume_transactions_local_v1',
  USERS: 'lume_users_list_v1'
};

const COLLECTIONS = {
  TRANSACTIONS: 'transactions',
  USERS: 'users',
  CATEGORIES: 'categories'
};

// State to track connection status
let isOfflineMode = false;

// Helpers for LocalStorage
const getLocal = <T>(key: string): T[] => {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
};

const setLocal = (key: string, data: any[]) => {
  localStorage.setItem(key, JSON.stringify(data));
};

// Export status checker for UI
export const isUsingOfflineMode = () => isOfflineMode;

// --- Transactions ---

export const getTransactions = async (userId: string): Promise<Transaction[]> => {
  if (isOfflineMode) {
    return getLocal<Transaction>(STORAGE_KEYS.TRANSACTIONS).filter(t => t.userId === userId);
  }

  try {
    const q = query(collection(db, COLLECTIONS.TRANSACTIONS), where("userId", "==", userId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Transaction));
  } catch (error: any) {
    if (error.code === 'permission-denied' || error.message?.includes('permission') || error.message?.includes('Missing or insufficient permissions')) {
      console.warn("Firestore permission denied. Switching to Offline Mode (LocalStorage).");
      isOfflineMode = true;
      return getLocal<Transaction>(STORAGE_KEYS.TRANSACTIONS).filter(t => t.userId === userId);
    }
    console.error("Error fetching transactions:", error);
    return [];
  }
};

export const saveTransaction = async (transaction: Omit<Transaction, 'id'>): Promise<string> => {
  if (isOfflineMode) {
    const newTx = { id: crypto.randomUUID(), ...transaction };
    const list = getLocal<Transaction>(STORAGE_KEYS.TRANSACTIONS);
    setLocal(STORAGE_KEYS.TRANSACTIONS, [newTx, ...list]);
    return newTx.id;
  }

  try {
    const docRef = await addDoc(collection(db, COLLECTIONS.TRANSACTIONS), transaction);
    return docRef.id;
  } catch (error: any) {
    if (error.code === 'permission-denied' || error.message?.includes('permission') || error.message?.includes('Missing or insufficient permissions')) {
      isOfflineMode = true;
      return saveTransaction(transaction); // Retry in offline mode
    }
    throw error;
  }
};

export const updateTransaction = async (id: string, data: Partial<Transaction>): Promise<void> => {
  if (isOfflineMode) {
    const list = getLocal<Transaction>(STORAGE_KEYS.TRANSACTIONS);
    const updated = list.map(t => t.id === id ? { ...t, ...data } : t);
    setLocal(STORAGE_KEYS.TRANSACTIONS, updated);
    return;
  }

  try {
    const docRef = doc(db, COLLECTIONS.TRANSACTIONS, id);
    await updateDoc(docRef, data);
  } catch (error: any) {
    if (error.code === 'permission-denied' || error.message?.includes('permission') || error.message?.includes('Missing or insufficient permissions')) {
      isOfflineMode = true;
      return updateTransaction(id, data);
    }
    throw error;
  }
};

export const deleteTransaction = async (id: string): Promise<void> => {
  if (isOfflineMode) {
    const list = getLocal<Transaction>(STORAGE_KEYS.TRANSACTIONS);
    setLocal(STORAGE_KEYS.TRANSACTIONS, list.filter(t => t.id !== id));
    return;
  }

  try {
    await deleteDoc(doc(db, COLLECTIONS.TRANSACTIONS, id));
  } catch (error: any) {
    if (error.code === 'permission-denied' || error.message?.includes('permission') || error.message?.includes('Missing or insufficient permissions')) {
      isOfflineMode = true;
      return deleteTransaction(id);
    }
    throw error;
  }
};

// --- Users ---

export const getUsers = async (): Promise<User[]> => {
  if (isOfflineMode) return getLocal<User>(STORAGE_KEYS.USERS);

  try {
    const querySnapshot = await getDocs(collection(db, COLLECTIONS.USERS));
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as User));
  } catch (error: any) {
    if (error.code === 'permission-denied' || error.message?.includes('permission') || error.message?.includes('Missing or insufficient permissions')) {
      console.warn("Firestore permission denied. Switching to Offline Mode (LocalStorage).");
      isOfflineMode = true;
      return getLocal<User>(STORAGE_KEYS.USERS);
    }
    console.error("Error fetching users:", error);
    return [];
  }
};

export const saveUser = async (user: User): Promise<void> => {
  if (isOfflineMode) {
    const list = getLocal<User>(STORAGE_KEYS.USERS);
    // Simple check to avoid complete duplicates if switching back and forth, though with local fallback rare
    if (!list.find(u => u.id === user.id)) {
        setLocal(STORAGE_KEYS.USERS, [...list, user]);
    }
    return;
  }

  try {
    const userRef = doc(db, COLLECTIONS.USERS, user.id);
    await setDoc(userRef, user);
  } catch (error: any) {
    if (error.code === 'permission-denied' || error.message?.includes('permission') || error.message?.includes('Missing or insufficient permissions')) {
      isOfflineMode = true;
      return saveUser(user);
    }
    throw error;
  }
};

export const updateUser = async (id: string, data: Partial<User>): Promise<void> => {
   if (isOfflineMode) {
    const list = getLocal<User>(STORAGE_KEYS.USERS);
    const updated = list.map(u => u.id === id ? { ...u, ...data } : u);
    setLocal(STORAGE_KEYS.USERS, updated);
    return;
  }

  try {
    const docRef = doc(db, COLLECTIONS.USERS, id);
    await updateDoc(docRef, data);
  } catch (error: any) {
     if (error.code === 'permission-denied' || error.message?.includes('permission') || error.message?.includes('Missing or insufficient permissions')) {
      isOfflineMode = true;
      return updateUser(id, data);
    }
    throw error;
  }
};

export const deleteUser = async (id: string): Promise<void> => {
   if (isOfflineMode) {
    const list = getLocal<User>(STORAGE_KEYS.USERS);
    setLocal(STORAGE_KEYS.USERS, list.filter(u => u.id !== id));
    return;
  }

  try {
    await deleteDoc(doc(db, COLLECTIONS.USERS, id));
  } catch (error: any) {
     if (error.code === 'permission-denied' || error.message?.includes('permission') || error.message?.includes('Missing or insufficient permissions')) {
      isOfflineMode = true;
      return deleteUser(id);
    }
    throw error;
  }
};

// --- Categories ---

export const getCategories = async (): Promise<string[]> => {
  if (isOfflineMode) {
      const cats = getLocal<{name: string}>(STORAGE_KEYS.CATEGORIES);
      return cats.map(c => c.name);
  }

  try {
    const querySnapshot = await getDocs(collection(db, COLLECTIONS.CATEGORIES));
    return querySnapshot.docs.map(doc => doc.data().name as string);
  } catch (error: any) {
     if (error.code === 'permission-denied' || error.message?.includes('permission') || error.message?.includes('Missing or insufficient permissions')) {
      isOfflineMode = true;
      const cats = getLocal<{name: string}>(STORAGE_KEYS.CATEGORIES);
      return cats.map(c => c.name);
    }
    console.error("Error fetching categories:", error);
    return [];
  }
};

export const addCategory = async (name: string): Promise<void> => {
   if (isOfflineMode) {
    const list = getLocal<{name: string}>(STORAGE_KEYS.CATEGORIES);
    setLocal(STORAGE_KEYS.CATEGORIES, [...list, {name}]);
    return;
  }

  try {
    await addDoc(collection(db, COLLECTIONS.CATEGORIES), { name });
  } catch (error: any) {
     if (error.code === 'permission-denied' || error.message?.includes('permission') || error.message?.includes('Missing or insufficient permissions')) {
      isOfflineMode = true;
      return addCategory(name);
    }
    throw error;
  }
};

export const removeCategory = async (name: string): Promise<void> => {
   if (isOfflineMode) {
    const list = getLocal<{name: string}>(STORAGE_KEYS.CATEGORIES);
    setLocal(STORAGE_KEYS.CATEGORIES, list.filter(c => c.name !== name));
    return;
  }

  try {
    const q = query(collection(db, COLLECTIONS.CATEGORIES), where("name", "==", name));
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach(async (d) => {
      await deleteDoc(doc(db, COLLECTIONS.CATEGORIES, d.id));
    });
  } catch (error: any) {
     if (error.code === 'permission-denied' || error.message?.includes('permission') || error.message?.includes('Missing or insufficient permissions')) {
      isOfflineMode = true;
      return removeCategory(name);
    }
    throw error;
  }
};
