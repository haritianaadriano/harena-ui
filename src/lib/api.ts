/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  User,
  Wallet,
  TransactionCategory,
  WalletTransaction,
  WalletBalanceSnapshot,
  Budget,
  Goal,
  TransactionAnalysis,
  WalletRecommendation,
  Sex,
  WalletType,
  TransactionType,
  TransactionStatus,
  BudgetPeriod,
  GoalStatus
} from '../types';

export function formatCurrency(amount: number, currency: string): string {
  if (currency === 'MGA' || currency === 'ARIARY') {
    return `${Math.round(amount).toLocaleString('fr-FR')} Ar`;
  }
  try {
    return amount.toLocaleString('fr-FR', { style: 'currency', currency });
  } catch (_) {
    return `${amount.toLocaleString('fr-FR')} ${currency}`;
  }
}

const API_BASE_URL = 'https://harena-api-ji5b.onrender.com';

// Local storage keys
const TOKEN_KEY = 'harena_token';
const USER_KEY = 'harena_user';
const DEMO_MODE_KEY = 'harena_demo_mode';

// Helper to determine if we are in demo mode
export function isDemoMode(): boolean {
  return localStorage.getItem(DEMO_MODE_KEY) === 'true';
}

export function setDemoMode(active: boolean) {
  localStorage.setItem(DEMO_MODE_KEY, active ? 'true' : 'false');
  if (active) {
    // Set a mock user
    localStorage.setItem(USER_KEY, JSON.stringify(mockUser));
    localStorage.setItem(TOKEN_KEY, 'demo-token-12345');
  } else {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getCurrentUser(): User | null {
  const userStr = localStorage.getItem(USER_KEY);
  if (!userStr) return null;
  try {
    return JSON.parse(userStr) as User;
  } catch (e) {
    return null;
  }
}

export function setCurrentUser(user: User) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(DEMO_MODE_KEY);
}

// Global promise to deduplicate concurrent token refreshes
let refreshTokenPromise: Promise<any> | null = null;

// Custom request wrapper to handle Authorization, CORS, and Demo Fallbacks
async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  if (isDemoMode()) {
    return handleDemoRequest<T>(path, options);
  }

  const token = getToken();
  const headers = new Headers(options.headers || {});
  
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: 'include', // Support cross-origin secure HttpOnly cookies for refresh tokens
  });

  if (!response.ok) {
    // If we receive a 401 (Unauthorized) or 403 (Forbidden) and we are not already trying to refresh the token,
    // let's try to automatically call `/auth/refresh` to get a new access token and retry.
    if ((response.status === 401 || response.status === 403) && path !== '/auth/refresh') {
      try {
        if (!refreshTokenPromise) {
          refreshTokenPromise = api.refreshToken()
            .then(res => {
              if (res && res.access_token) {
                setToken(res.access_token);
              }
              return res;
            })
            .finally(() => {
              refreshTokenPromise = null;
            });
        }

        const refreshRes = await refreshTokenPromise;
        if (refreshRes && refreshRes.access_token) {
          // Retry the original request with the newly acquired token
          const retryHeaders = new Headers(options.headers || {});
          retryHeaders.set('Authorization', `Bearer ${refreshRes.access_token}`);
          if (!retryHeaders.has('Content-Type') && !(options.body instanceof FormData)) {
            retryHeaders.set('Content-Type', 'application/json');
          }

          const retryResponse = await fetch(`${API_BASE_URL}${path}`, {
            ...options,
            headers: retryHeaders,
            credentials: 'include',
          });

          if (retryResponse.ok) {
            if (retryResponse.status === 204) {
              return {} as T;
            }
            return retryResponse.json() as Promise<T>;
          }
        }
      } catch (refreshErr) {
        // If refreshing the token fails, logout to clear state and refresh page
        logout();
        if (typeof window !== 'undefined') {
          window.location.reload();
        }
        throw refreshErr;
      }
    }

    let errorMessage = 'Une erreur est survenue';
    try {
      const errBody = await response.json();
      errorMessage = errBody.message || errorMessage;
    } catch (_) {
      errorMessage = `Erreur serveur (${response.status})`;
    }
    throw new Error(errorMessage);
  }

  // Handle empty responses
  if (response.status === 204) {
    return {} as T;
  }

  return response.json() as Promise<T>;
}

// Real API methods
export const api = {
  async ping(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/ping`);
      return response.ok;
    } catch (_) {
      return false;
    }
  },

  async signin(dto: any): Promise<{ access_token: string; user: User }> {
    if (isDemoMode()) {
      return { access_token: 'demo-token-12345', user: mockUser };
    }
    const response = await request<{ access_token: string }>('/auth/signin', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
    setToken(response.access_token);
    
    // Retrieve logged in user info
    const user = await this.whoami();
    setCurrentUser(user);
    return { access_token: response.access_token, user };
  },

  async signup(dto: any): Promise<User> {
    if (isDemoMode()) {
      return mockUser;
    }
    const response = await request<User[]>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
    // Return the first user in the returned list
    return Array.isArray(response) ? response[0] : (response as any);
  },

  async whoami(): Promise<User> {
    if (isDemoMode()) {
      return mockUser;
    }
    return request<User>('/auth/whoami');
  },

  async getUserById(id: string): Promise<User> {
    if (isDemoMode()) {
      return mockUser;
    }
    return request<User>(`/users/${id}`);
  },

  async refreshToken(): Promise<{ access_token: string; token_type: string; access_expires_in: number }> {
    if (isDemoMode()) {
      return { access_token: 'demo-token-12345', token_type: 'Bearer', access_expires_in: 900 };
    }
    return request<any>('/auth/refresh', {
      method: 'POST',
    });
  },

  // Wallets
  async getWallets(userId: string): Promise<Wallet[]> {
    const res = await request<Wallet[]>(`/users/${userId}/wallets`);
    return Array.isArray(res) ? res : [];
  },

  async createWallet(userId: string, wallet: Partial<Wallet>): Promise<Wallet> {
    return request<Wallet>(`/users/${userId}/wallets`, {
      method: 'PUT',
      body: JSON.stringify({
        id: wallet.id || null,
        user_id: userId,
        name: wallet.name,
        currency: wallet.currency,
        type: wallet.type,
        creation_datetime: wallet.creation_datetime || new Date().toISOString(),
        updated_datetime: wallet.updated_datetime || new Date().toISOString(),
      }),
    });
  },

  async getWalletById(userId: string, walletId: string): Promise<Wallet> {
    return request<Wallet>(`/users/${userId}/wallets/${walletId}`);
  },

  async getCurrentBalance(userId: string, walletId: string): Promise<WalletBalanceSnapshot> {
    return request<WalletBalanceSnapshot>(`/users/${userId}/wallets/${walletId}/balance`);
  },

  async getBalanceHistory(
    userId: string,
    walletId: string,
    from?: string,
    to?: string
  ): Promise<WalletBalanceSnapshot[]> {
    const params = new URLSearchParams();
    if (from) params.append('from', from);
    if (to) params.append('to', to);
    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await request<any>(`/users/${userId}/wallets/${walletId}/balance/history${query}`);
    if (Array.isArray(res)) return res;
    if (res && typeof res === 'object') {
      if (Array.isArray(res.snapshots)) return res.snapshots;
      if (Array.isArray(res.history)) return res.history;
      if (Array.isArray(res.data)) return res.data;
    }
    return [];
  },

  // Transactions
  async getTransactions(
    userId: string,
    walletId: string,
    filters?: { from?: string; to?: string; status?: TransactionStatus; type?: TransactionType }
  ): Promise<WalletTransaction[]> {
    const params = new URLSearchParams();
    if (filters?.from) params.append('from', filters.from);
    if (filters?.to) params.append('to', filters.to);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.type) params.append('type', filters.type);
    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await request<WalletTransaction[]>(`/users/${userId}/wallets/${walletId}/transactions${query}`);
    return Array.isArray(res) ? res : [];
  },

  async createTransaction(
    userId: string,
    walletId: string,
    transaction: Partial<WalletTransaction>
  ): Promise<WalletTransaction> {
    return request<WalletTransaction>(`/users/${userId}/wallets/${walletId}/transactions`, {
      method: 'PUT',
      body: JSON.stringify({
        id: transaction.id || null,
        wallet: transaction.wallet || { id: walletId },
        category: transaction.category,
        amount: Number(transaction.amount) || 0,
        type: transaction.type || 'EXPENSE',
        status: transaction.status || 'COMPLETED',
        description: transaction.description || '',
        reference: transaction.reference || '',
        source: transaction.source || '',
        transaction_datetime: transaction.transaction_datetime || new Date().toISOString(),
        creation_datetime: transaction.creation_datetime || new Date().toISOString(),
        updated_datetime: transaction.updated_datetime || new Date().toISOString(),
      }),
    });
  },

  async getTransactionById(userId: string, transactionId: string): Promise<WalletTransaction> {
    return request<WalletTransaction>(`/users/${userId}/transactions/${transactionId}`);
  },

  // Categories
  async getCategories(userId: string, name?: string): Promise<TransactionCategory[]> {
    const query = name ? `?name=${encodeURIComponent(name)}` : '';
    const res = await request<TransactionCategory[]>(`/users/${userId}/categories${query}`);
    return Array.isArray(res) ? res : [];
  },

  async createCategory(userId: string, categories: Partial<TransactionCategory>[]): Promise<TransactionCategory[]> {
    return request<TransactionCategory[]>(`/users/${userId}/categories`, {
      method: 'PUT',
      body: JSON.stringify(categories.map(c => ({
        id: c.id || null,
        user_id: c.user_id || userId,
        name: c.name,
        icon: c.icon,
        color: c.color,
        is_system: c.is_system ?? false,
        creation_datetime: c.creation_datetime || new Date().toISOString(),
      }))),
    });
  },

  async deleteCategory(userId: string, categoryId: string): Promise<TransactionCategory> {
    return request<TransactionCategory>(`/users/${userId}/categories/${categoryId}`, {
      method: 'DELETE',
    });
  },

  // Budgets
  async getBudgets(
    userId: string,
    filters?: { budget_period?: BudgetPeriod; page?: number; page_size?: number }
  ): Promise<Budget[]> {
    const params = new URLSearchParams();
    if (filters?.budget_period) params.append('budget_period', filters.budget_period);
    if (filters?.page) params.append('page', String(filters.page));
    if (filters?.page_size) params.append('page_size', String(filters.page_size));
    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await request<Budget[]>(`/users/${userId}/budgets${query}`);
    return Array.isArray(res) ? res : [];
  },

  async getBudgetsByWallet(userId: string, walletId: string): Promise<Budget[]> {
    const res = await request<Budget[]>(`/users/${userId}/wallets/${walletId}/budgets`);
    return Array.isArray(res) ? res : [];
  },

  async updateBudget(userId: string, budget: Partial<Budget>): Promise<Budget> {
    return request<Budget>(`/users/${userId}/budgets`, {
      method: 'PUT',
      body: JSON.stringify({
        id: budget.id || null,
        wallet: budget.wallet,
        category: budget.category,
        limit_amount: Number(budget.limit_amount) || 0,
        spent_amount: Number(budget.spent_amount) || 0,
        is_reserved: budget.is_reserved ?? false,
        period_type: budget.period_type || 'MONTHLY',
        start_date: budget.start_date || new Date().toISOString().split('T')[0],
        end_date: budget.end_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        creation_datetime: budget.creation_datetime || new Date().toISOString(),
      }),
    });
  },

  async deleteBudget(userId: string, budgetId: string): Promise<Budget> {
    return request<Budget>(`/users/${userId}/budgets/${budgetId}`, {
      method: 'DELETE',
    });
  },

  async getBudgetById(userId: string, budgetId: string): Promise<Budget> {
    if (isDemoMode()) {
      const budget = demoBudgets.find(b => b.id === budgetId);
      if (!budget) throw new Error('Budget introuvable');
      return budget;
    }
    return request<Budget>(`/users/${userId}/budgets/${budgetId}`);
  },

  // Goals
  async getGoals(userId: string, status?: GoalStatus): Promise<Goal[]> {
    const query = status ? `?status=${status}` : '';
    const res = await request<Goal[]>(`/users/${userId}/goals${query}`);
    return Array.isArray(res) ? res : [];
  },

  async getGoalsByWallet(userId: string, walletId: string, status?: GoalStatus): Promise<Goal[]> {
    const query = status ? `?status=${status}` : '';
    const res = await request<Goal[]>(`/users/${userId}/wallets/${walletId}/goals${query}`);
    return Array.isArray(res) ? res : [];
  },

  async createGoal(userId: string, walletId: string, goal: Partial<Goal>): Promise<Goal> {
    return request<Goal>(`/users/${userId}/wallets/${walletId}/goals`, {
      method: 'PUT',
      body: JSON.stringify({
        id: goal.id || null,
        wallet: goal.wallet || { id: walletId },
        name: goal.name || 'Objectif',
        target_amount: Number(goal.target_amount) || 0,
        current_amount: Number(goal.current_amount) || 0,
        deadline: goal.deadline || new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: goal.status || 'IN_PROGRESS',
        creation_datetime: goal.creation_datetime || new Date().toISOString(),
      }),
    });
  },

  async deleteGoal(userId: string, goalId: string): Promise<Goal> {
    return request<Goal>(`/users/${userId}/goals/${goalId}`, {
      method: 'DELETE',
    });
  },

  async getGoalById(userId: string, goalId: string): Promise<Goal> {
    if (isDemoMode()) {
      const goal = demoGoals.find(g => g.id === goalId);
      if (!goal) throw new Error('Objectif introuvable');
      return goal;
    }
    return request<Goal>(`/users/${userId}/goals/${goalId}`);
  },

  // AI Insights
  async getTransactionAnalysis(
    userId: string,
    transactionId: string,
    page: number = 1,
    pageSize: number = 10
  ): Promise<TransactionAnalysis | TransactionAnalysis[] | null> {
    if (isDemoMode()) {
      return mockTransactionAnalyses.filter(a => a.transaction_id === transactionId);
    }
    const res = await request<TransactionAnalysis | TransactionAnalysis[]>(`/users/${userId}/transactions/${transactionId}/analysis?page=${page}&page_size=${pageSize}`);
    return res;
  },

  async getRecommendations(
    userId: string,
    walletId: string,
    page: number = 1,
    pageSize: number = 10
  ): Promise<WalletRecommendation[]> {
    if (isDemoMode()) {
      return mockRecommendations.filter(r => r.wallet_id === walletId);
    }
    const res = await request<WalletRecommendation[]>(`/users/${userId}/wallets/${walletId}/recommendations?page=${page}&page_size=${pageSize}`);
    return Array.isArray(res) ? res : [];
  },

  async launchRecommendation(
    userId: string,
    walletId: string,
    recommendationType: string
  ): Promise<WalletRecommendation | null> {
    if (isDemoMode()) {
      const responses: { [key: string]: string } = {
        'GENERAL': "Voici vos conseils généraux pour ce portefeuille : optimisez vos abonnements non utilisés, réduisez vos dépenses de restauration de 10% et visez une épargne automatique de 150 000 Ar par mois.",
        'BUDGET_ANALYSIS': "Analyse budgétaire : Votre budget de divertissement est consommé à 85% alors que nous ne sommes qu'à la moitié du mois. Nous vous suggérons de geler les dépenses non essentielles sur cette catégorie pour les 10 prochains jours.",
        'SPENDING_ANALYSIS': "Analyse des dépenses : Vos dépenses dans la catégorie 'Alimentation & Courses' ont augmenté de 18% par rapport au mois dernier. Privilégiez les achats en gros pour réduire la facture.",
        'SAVING_RECOMMENDATION': "Conseil Épargne : Vous pouvez économiser jusqu'à 300 000 Ar par mois en remplaçant deux sorties hebdomadaires par des activités gratuites. Ce montant placé sur votre compte d'épargne accélérera votre projet de 3 mois."
      };
      const contextMap: { [key: string]: string } = {
        'GENERAL': 'Recommandation globale de santé financière',
        'BUDGET_ANALYSIS': 'Analyse des enveloppes budgétaires',
        'SPENDING_ANALYSIS': 'Analyse comportementale des dépenses',
        'SAVING_RECOMMENDATION': 'Stratégie de maximisation de l\'épargne'
      };
      const promptMap: { [key: string]: string } = {
        'GENERAL': 'Générer une recommandation générale pour mon compte',
        'BUDGET_ANALYSIS': 'Analyser mon budget et ses limites actuelles',
        'SPENDING_ANALYSIS': 'Analyser mes habitudes de dépenses récentes',
        'SAVING_RECOMMENDATION': 'Me proposer un plan d\'épargne personnalisé'
      };

      const newRec: WalletRecommendation = {
        id: `rec-${Date.now()}`,
        wallet_id: walletId,
        type: recommendationType,
        context: contextMap[recommendationType] || 'Conseil personnalisé',
        prompt: promptMap[recommendationType] || `Générer une recommandation de type ${recommendationType}`,
        response: responses[recommendationType] || "Recommandation en cours d'analyse par l'intelligence artificielle Harena.",
        confidence_score: 0.85 + Math.random() * 0.15,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        creation_datetime: new Date().toISOString()
      };
      mockRecommendations.unshift(newRec);
      return newRec;
    }
    const res = await request<WalletRecommendation>(`/users/${userId}/wallets/${walletId}/recommendations?recommendation_type=${encodeURIComponent(recommendationType)}`, {
      method: 'PUT'
    });
    return res;
  }
};

// ==========================================
// DEMO / FALLBACK DATA STORE
// ==========================================

const mockUser: User = {
  id: 'usr-demo-123',
  firstname: 'John',
  lastname: 'Doe',
  username: 'johndoe',
  email: 'john.doe@example.com',
  registered_datetime: '2026-01-14T10:00:00Z',
  sex: 'M',
};

const mockWallets: Wallet[] = [
  {
    id: 'w-1',
    user_id: 'usr-demo-123',
    name: 'Portefeuille Courant',
    currency: 'MGA',
    type: 'PERSONAL',
    creation_datetime: '2026-01-14T10:15:00Z',
    updated_datetime: '2026-07-05T10:00:00Z',
  },
  {
    id: 'w-2',
    user_id: 'usr-demo-123',
    name: 'Compte d\'Épargne Projets',
    currency: 'MGA',
    type: 'SAVINGS',
    creation_datetime: '2026-01-15T12:00:00Z',
    updated_datetime: '2026-07-05T10:00:00Z',
  },
  {
    id: 'w-3',
    user_id: 'usr-demo-123',
    name: 'Harena Business',
    currency: 'MGA',
    type: 'BUSINESS',
    creation_datetime: '2026-02-01T08:00:00Z',
    updated_datetime: '2026-07-05T10:00:00Z',
  },
];

const mockCategories: TransactionCategory[] = [
  { id: 'cat-sys-1', user_id: 'system', name: 'Alimentation & Courses', icon: 'ShoppingBag', color: '#EF4444', is_system: true, creation_datetime: '2026-01-01T00:00:00Z' },
  { id: 'cat-sys-2', user_id: 'system', name: 'Transport & Carburant', icon: 'Car', color: '#F59E0B', is_system: true, creation_datetime: '2026-01-01T00:00:00Z' },
  { id: 'cat-sys-3', user_id: 'system', name: 'Loisirs & Divertissement', icon: 'Film', color: '#3B82F6', is_system: true, creation_datetime: '2026-01-01T00:00:00Z' },
  { id: 'cat-sys-4', user_id: 'system', name: 'Salaire & Revenus', icon: 'DollarSign', color: '#10B981', is_system: true, creation_datetime: '2026-01-01T00:00:00Z' },
  { id: 'cat-sys-5', user_id: 'system', name: 'Abonnements & Logiciels', icon: 'CreditCard', color: '#8B5CF6', is_system: true, creation_datetime: '2026-01-01T00:00:00Z' },
  { id: 'cat-sys-6', user_id: 'system', name: 'Logement & Factures', icon: 'Home', color: '#6B7280', is_system: true, creation_datetime: '2026-01-01T00:00:00Z' },
];

const mockTransactions: WalletTransaction[] = [
  {
    id: 'tx-1',
    wallet: mockWallets[0],
    category: mockCategories[3],
    amount: 570000,
    type: 'INCOME',
    status: 'COMPLETED',
    description: 'Revenus Freelance',
    reference: 'SAL-2026-06',
    source: 'Mission Freelance',
    transaction_datetime: '2026-06-30T09:00:00Z',
    creation_datetime: '2026-06-30T09:00:00Z',
    updated_datetime: '2026-06-30T09:00:00Z',
  },
  {
    id: 'tx-2',
    wallet: mockWallets[0],
    category: mockCategories[0],
    amount: 712500,
    type: 'EXPENSE',
    status: 'COMPLETED',
    description: 'Courses hebdomadaires Supermarché',
    reference: 'SUP-49294',
    source: 'Carrefour Paris',
    transaction_datetime: '2026-07-01T17:30:00Z',
    creation_datetime: '2026-07-01T17:30:00Z',
    updated_datetime: '2026-07-01T17:30:00Z',
  },
  {
    id: 'tx-3',
    wallet: mockWallets[0],
    category: mockCategories[4],
    amount: 80000,
    type: 'SUBSCRIPTION',
    status: 'COMPLETED',
    description: 'Abonnement Netflix Premium',
    reference: 'NETFLIX-JUL-26',
    source: 'Netflix NV',
    transaction_datetime: '2026-07-02T02:00:00Z',
    creation_datetime: '2026-07-02T02:00:00Z',
    updated_datetime: '2026-07-02T02:00:00Z',
  },
  {
    id: 'tx-4',
    wallet: mockWallets[0],
    category: mockCategories[1],
    amount: 175000,
    type: 'EXPENSE',
    status: 'COMPLETED',
    description: 'Recharge carte Navigo',
    reference: 'NAV-9204',
    source: 'RATP Paris',
    transaction_datetime: '2026-07-03T08:15:00Z',
    creation_datetime: '2026-07-03T08:15:00Z',
    updated_datetime: '2026-07-03T08:15:00Z',
  },
  {
    id: 'tx-5',
    wallet: mockWallets[0],
    category: mockCategories[2],
    amount: 425000,
    type: 'EXPENSE',
    status: 'COMPLETED',
    description: 'Restaurant entre amis',
    reference: 'REST-0932',
    source: 'Le Petit Bistrot',
    transaction_datetime: '2026-07-04T20:30:00Z',
    creation_datetime: '2026-07-04T20:30:00Z',
    updated_datetime: '2026-07-04T20:30:00Z',
  },
  {
    id: 'tx-6',
    wallet: mockWallets[0],
    category: mockCategories[0],
    amount: 64000,
    type: 'EXPENSE',
    status: 'PENDING',
    description: 'Boulangerie déjeuner',
    reference: 'BOUL-83',
    source: 'Boulangerie Artisanale',
    transaction_datetime: '2026-07-05T08:45:00Z',
    creation_datetime: '2026-07-05T08:45:00Z',
    updated_datetime: '2026-07-05T08:45:00Z',
  },
  {
    id: 'tx-7',
    wallet: mockWallets[1],
    category: mockCategories[3],
    amount: 2500000,
    type: 'TRANSFER',
    status: 'COMPLETED',
    description: 'Épargne automatique mensuelle',
    reference: 'TRF-EP-01',
    source: 'Portefeuille Courant',
    transaction_datetime: '2026-07-01T00:05:00Z',
    creation_datetime: '2026-07-01T00:05:00Z',
    updated_datetime: '2026-07-01T00:05:00Z',
  },
];

const mockBudgets: Budget[] = [
  {
    id: 'b-1',
    wallet: mockWallets[0],
    category: mockCategories[0],
    limit_amount: 2500000,
    spent_amount: 776500,
    is_reserved: false,
    period_type: 'MONTHLY',
    start_date: '2026-07-01',
    end_date: '2026-07-31',
    creation_datetime: '2026-07-01T00:00:00Z',
  },
  {
    id: 'b-2',
    wallet: mockWallets[0],
    category: mockCategories[2],
    limit_amount: 1000000,
    spent_amount: 425000,
    is_reserved: false,
    period_type: 'MONTHLY',
    start_date: '2026-07-01',
    end_date: '2026-07-31',
    creation_datetime: '2026-07-01T00:00:00Z',
  },
  {
    id: 'b-3',
    wallet: mockWallets[0],
    category: mockCategories[1],
    limit_amount: 750000,
    spent_amount: 175000,
    is_reserved: false,
    period_type: 'MONTHLY',
    start_date: '2026-07-01',
    end_date: '2026-07-31',
    creation_datetime: '2026-07-01T00:00:00Z',
  }
];

const mockGoals: Goal[] = [
  {
    id: 'g-1',
    wallet: mockWallets[1],
    name: 'Fonds d\'urgence 6 mois',
    target_amount: 50000000,
    current_amount: 22500000,
    deadline: '2026-12-31',
    status: 'IN_PROGRESS',
    creation_datetime: '2026-01-15T12:00:00Z',
  },
  {
    id: 'g-2',
    wallet: mockWallets[1],
    name: 'Voyage au Japon',
    target_amount: 15000000,
    current_amount: 6000000,
    deadline: '2026-09-30',
    status: 'IN_PROGRESS',
    creation_datetime: '2026-03-10T15:00:00Z',
  }
];

const mockTransactionAnalyses: TransactionAnalysis[] = [
  {
    id: 'an-1',
    transaction_id: 'tx-2',
    predicted_category: 'Alimentation & Courses',
    anomaly_score: 0.12,
    financial_health_score: 0.85,
    sentiment: 'NEUTRAL',
    creation_datetime: '2026-07-01T17:35:00Z',
  },
  {
    id: 'an-2',
    transaction_id: 'tx-5',
    predicted_category: 'Loisirs & Divertissement',
    anomaly_score: 0.45, // Slightly higher because restaurant spending is less regular
    financial_health_score: 0.72,
    sentiment: 'HAPPY',
    creation_datetime: '2026-07-04T20:35:00Z',
  }
];

const mockRecommendations: WalletRecommendation[] = [
  {
    id: 'rec-1',
    wallet_id: 'w-1',
    type: 'SAVINGS_ADVICE',
    context: 'Analyse des dépenses de loisirs',
    prompt: 'Optimisation du budget loisirs',
    response: 'Vous avez dépensé 425 000 Ar en loisirs cette semaine, soit 42% de votre budget mensuel loisirs. Pour atteindre votre objectif d\'épargne "Voyage au Japon", essayez de limiter les dépenses de divertissement à 150 000 Ar la semaine prochaine.',
    confidence_score: 0.92,
    expires_at: '2026-07-12T10:00:00Z',
    creation_datetime: '2026-07-05T09:00:00Z',
  },
  {
    id: 'rec-2',
    wallet_id: 'w-1',
    type: 'BUDGET_WARNING',
    context: 'Catégorie Alimentation',
    prompt: 'Alerte dépassement alimentation',
    response: 'Vos dépenses d\'alimentation progressent plus vite que d\'habitude ce mois-ci (+12% par rapport à juin). Nous vous conseillons de planifier vos repas pour optimiser vos courses et rester sous votre limite de 2 500 000 Ar.',
    confidence_score: 0.88,
    expires_at: '2026-07-10T10:00:00Z',
    creation_datetime: '2026-07-05T09:30:00Z',
  }
];

// In-Memory mutable database for Demo Mode
let demoWallets = [...mockWallets];
let demoTransactions = [...mockTransactions];
let demoCategories = [...mockCategories];
let demoBudgets = [...mockBudgets];
let demoGoals = [...mockGoals];

function handleDemoRequest<T>(path: string, options: RequestInit): T {
  // Parsing parameters and pathways
  const parts = path.split('/').filter(Boolean); // e.g. ["users", "usr-id", "wallets"]

  // POST /auth/signin
  if (path === '/auth/signin') {
    return { access_token: 'demo-token-12345', user: mockUser } as unknown as T;
  }
  // POST /auth/signup
  if (path === '/auth/signup') {
    return [mockUser] as unknown as T;
  }
  // GET /auth/whoami
  if (path === '/auth/whoami') {
    return mockUser as unknown as T;
  }
  // POST /auth/refresh
  if (path === '/auth/refresh') {
    return { access_token: 'demo-token-12345', token_type: 'Bearer', access_expires_in: 900 } as unknown as T;
  }
  // GET /users/{id}
  if (parts[0] === 'users' && parts.length === 2) {
    return mockUser as unknown as T;
  }

  // GET /users/{user_id}/wallets
  if (parts[0] === 'users' && parts[2] === 'wallets' && parts.length === 3) {
    if (options.method === 'PUT') {
      const body = JSON.parse(options.body as string);
      const newWallet: Wallet = {
        id: `w-${Date.now()}`,
        user_id: parts[1],
        name: body.name || 'Nouveau Portefeuille',
        currency: body.currency || 'MGA',
        type: body.type || 'PERSONAL',
        creation_datetime: new Date().toISOString(),
        updated_datetime: new Date().toISOString()
      };
      demoWallets.push(newWallet);
      return newWallet as unknown as T;
    }
    return demoWallets as unknown as T;
  }

  // GET /users/{user_id}/wallets/{wallet_id}
  if (parts[0] === 'users' && parts[2] === 'wallets' && parts.length === 4) {
    const wallet = demoWallets.find(w => w.id === parts[3]);
    if (!wallet) throw new Error('Portefeuille introuvable');
    return wallet as unknown as T;
  }

  // GET /users/{user_id}/wallets/{wallet_id}/balance
  if (parts[0] === 'users' && parts[2] === 'wallets' && parts[4] === 'balance' && parts.length === 5) {
    const wallet = demoWallets.find(w => w.id === parts[3]);
    if (!wallet) throw new Error('Portefeuille introuvable');
    // Calculate sum of transactions
    const walletTxs = demoTransactions.filter(t => t.wallet.id === parts[3] && t.status === 'COMPLETED');
    const balance = walletTxs.reduce((sum, tx) => {
      if (tx.type === 'INCOME' || tx.type === 'REFUND') return sum + tx.amount;
      if (tx.type === 'EXPENSE' || tx.type === 'SUBSCRIPTION') return sum - tx.amount;
      if (tx.type === 'TRANSFER') {
        // If it's a transfer and this is the source wallet, deduct. If it's destination, add.
        // For simplicity in demo, let's treat transfer out of personal as expense and into savings as income
        return wallet.type === 'SAVINGS' ? sum + tx.amount : sum - tx.amount;
      }
      return sum;
    }, wallet.type === 'SAVINGS' ? 4500000 : 1800000); // base initial balance for demo
    
    return {
      id: `bal-${Date.now()}`,
      wallet,
      balance,
      snapshot_datetime: new Date().toISOString(),
      creation_datetime: new Date().toISOString()
    } as unknown as T;
  }

  // GET /users/{user_id}/wallets/{wallet_id}/balance/history
  if (parts[0] === 'users' && parts[2] === 'wallets' && parts[4] === 'balance' && parts[5] === 'history') {
    const wallet = demoWallets.find(w => w.id === parts[3]);
    if (!wallet) throw new Error('Portefeuille introuvable');
    // Generate some mock historical data points for the graph
    const dates = ['2026-06-29', '2026-06-30', '2026-07-01', '2026-07-02', '2026-07-03', '2026-07-04', '2026-07-05'];
    let baseBal = wallet.type === 'SAVINGS' ? 22000000 : 1500000;
    return dates.map((d, index) => {
      baseBal += index * (wallet.type === 'SAVINGS' ? 500000 : -50000);
      return {
        id: `bal-hist-${index}`,
        wallet,
        balance: baseBal,
        snapshot_datetime: `${d}T12:00:00Z`,
        creation_datetime: `${d}T12:00:00Z`
      };
    }) as unknown as T;
  }

  // GET/PUT /users/{user_id}/wallets/{wallet_id}/transactions
  if (parts[0] === 'users' && parts[2] === 'wallets' && parts[4] === 'transactions') {
    const walletId = parts[3];
    const wallet = demoWallets.find(w => w.id === walletId);
    if (!wallet) throw new Error('Portefeuille introuvable');

    if (options.method === 'PUT') {
      const body = JSON.parse(options.body as string);
      let category = null;
      if (body.category && body.category.id) {
        category = demoCategories.find(c => c.id === body.category.id) || null;
      }
      const newTx: WalletTransaction = {
        id: `tx-${Date.now()}`,
        wallet,
        category,
        amount: Number(body.amount) || 0,
        type: body.type || 'EXPENSE',
        status: body.status || 'COMPLETED',
        description: body.description || 'Sans description',
        reference: body.reference || `REF-${Math.floor(Math.random() * 10000)}`,
        source: body.source || 'Harena Direct',
        transaction_datetime: body.transaction_datetime || new Date().toISOString(),
        creation_datetime: new Date().toISOString(),
        updated_datetime: new Date().toISOString()
      };
      demoTransactions.unshift(newTx); // Add to beginning

      // Dynamically update spent_amount in budget if matches category
      if (category) {
        const matchedBudget = demoBudgets.find(b => b.category.id === category.id && b.wallet.id === walletId);
        if (matchedBudget && newTx.type === 'EXPENSE') {
          matchedBudget.spent_amount += newTx.amount;
        }
      }

      // Generate mock transaction analysis immediately for this transaction
      const randomAnomaly = Math.random() < 0.15 ? 0.85 : 0.05; // 15% chance of high anomaly
      const healthScore = Math.max(0.1, 1 - (newTx.amount / 1000));
      const mockAnalysis: TransactionAnalysis = {
        id: `an-${Date.now()}`,
        transaction_id: newTx.id,
        predicted_category: category ? category.name : 'Sans catégorie',
        anomaly_score: Number(randomAnomaly.toFixed(2)),
        financial_health_score: Number(healthScore.toFixed(2)),
        sentiment: newTx.type === 'INCOME' ? 'HAPPY' : (newTx.amount > 100 ? 'CONCERNED' : 'NEUTRAL'),
        creation_datetime: new Date().toISOString()
      };
      mockTransactionAnalyses.push(mockAnalysis);

      return newTx as unknown as T;
    }

    return demoTransactions.filter(t => t.wallet.id === walletId) as unknown as T;
  }

  // GET /users/{user_id}/categories
  if (parts[0] === 'users' && parts[2] === 'categories' && parts.length === 3) {
    if (options.method === 'PUT') {
      const body = JSON.parse(options.body as string);
      const created: TransactionCategory[] = [];
      const items = Array.isArray(body) ? body : [body];
      for (const item of items) {
        if (item.id) {
          const idx = demoCategories.findIndex(c => c.id === item.id);
          if (idx >= 0) {
            demoCategories[idx] = {
              ...demoCategories[idx],
              name: item.name || demoCategories[idx].name,
              icon: item.icon || demoCategories[idx].icon,
              color: item.color || demoCategories[idx].color,
            };
            created.push(demoCategories[idx]);
          }
        } else {
          const newCat: TransactionCategory = {
            id: `cat-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            user_id: parts[1],
            name: item.name || 'Nouvelle Catégorie',
            icon: item.icon || 'HelpCircle',
            color: item.color || '#3B82F6',
            is_system: false,
            creation_datetime: new Date().toISOString()
          };
          demoCategories.push(newCat);
          created.push(newCat);
        }
      }
      return created as unknown as T;
    }
    return demoCategories as unknown as T;
  }

  // DELETE /users/{user_id}/categories/{category_id}
  if (parts[0] === 'users' && parts[2] === 'categories' && parts.length === 4) {
    const catId = parts[3];
    const cat = demoCategories.find(c => c.id === catId);
    demoCategories = demoCategories.filter(c => c.id !== catId);
    return cat as unknown as T;
  }

  // GET/PUT /users/{user_id}/budgets
  if (parts[0] === 'users' && parts[2] === 'budgets' && parts.length === 3) {
    if (options.method === 'PUT') {
      const body = JSON.parse(options.body as string);
      const catId = body.category?.id || demoCategories[0].id;
      const category = demoCategories.find(c => c.id === catId) || demoCategories[0];
      const walletId = body.wallet?.id || demoWallets[0].id;
      const wallet = demoWallets.find(w => w.id === walletId) || demoWallets[0];

      // Check if exists
      const existingIndex = demoBudgets.findIndex(b => b.category.id === catId && b.wallet.id === walletId);
      if (existingIndex >= 0) {
        demoBudgets[existingIndex] = {
          ...demoBudgets[existingIndex],
          limit_amount: Number(body.limit_amount) || demoBudgets[existingIndex].limit_amount,
          is_reserved: body.is_reserved ?? demoBudgets[existingIndex].is_reserved,
          period_type: body.period_type || demoBudgets[existingIndex].period_type,
        };
        return demoBudgets[existingIndex] as unknown as T;
      }

      const newBudget: Budget = {
        id: `b-${Date.now()}`,
        wallet,
        category,
        limit_amount: Number(body.limit_amount) || 1000000,
        spent_amount: 0,
        is_reserved: body.is_reserved || false,
        period_type: body.period_type || 'MONTHLY',
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        creation_datetime: new Date().toISOString()
      };
      demoBudgets.push(newBudget);
      return newBudget as unknown as T;
    }
    return demoBudgets as unknown as T;
  }

  // GET or DELETE /users/{user_id}/budgets/{budget_id}
  if (parts[0] === 'users' && parts[2] === 'budgets' && parts.length === 4) {
    const bId = parts[3];
    if (options.method === 'DELETE') {
      const budget = demoBudgets.find(b => b.id === bId);
      demoBudgets = demoBudgets.filter(b => b.id !== bId);
      return budget as unknown as T;
    }
    const budget = demoBudgets.find(b => b.id === bId);
    if (!budget) throw new Error('Budget introuvable');
    return budget as unknown as T;
  }

  // GET /users/{user_id}/wallets/{wallet_id}/budgets
  if (parts[0] === 'users' && parts[2] === 'wallets' && parts[4] === 'budgets') {
    return demoBudgets.filter(b => b.wallet.id === parts[3]) as unknown as T;
  }

  // GET /users/{user_id}/goals
  if (parts[0] === 'users' && parts[2] === 'goals' && parts.length === 3) {
    return demoGoals as unknown as T;
  }

  // GET/PUT /users/{user_id}/wallets/{wallet_id}/goals
  if (parts[0] === 'users' && parts[2] === 'wallets' && parts[4] === 'goals') {
    const walletId = parts[3];
    const wallet = demoWallets.find(w => w.id === walletId) || demoWallets[0];

    if (options.method === 'PUT') {
      const body = JSON.parse(options.body as string);
      const newGoal: Goal = {
        id: `g-${Date.now()}`,
        wallet,
        name: body.name || 'Nouvel objectif d\'épargne',
        target_amount: Number(body.target_amount) || 5000000,
        current_amount: Number(body.current_amount) || 0,
        deadline: body.deadline || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: body.status || 'IN_PROGRESS',
        creation_datetime: new Date().toISOString()
      };
      demoGoals.push(newGoal);
      return newGoal as unknown as T;
    }
    return demoGoals.filter(g => g.wallet.id === walletId) as unknown as T;
  }

  // GET or DELETE /users/{user_id}/goals/{goal_id}
  if (parts[0] === 'users' && parts[2] === 'goals' && parts.length === 4) {
    const gId = parts[3];
    if (options.method === 'DELETE') {
      const goal = demoGoals.find(g => g.id === gId);
      demoGoals = demoGoals.filter(g => g.id !== gId);
      return goal as unknown as T;
    }
    const goal = demoGoals.find(g => g.id === gId);
    if (!goal) throw new Error('Objectif introuvable');
    return goal as unknown as T;
  }

  // GET or PUT /users/{user_id}/wallets/{wallet_id}/recommendations
  if (parts[0] === 'users' && parts[2] === 'wallets' && parts[4] === 'recommendations') {
    const walletId = parts[3];
    if (options.method === 'PUT') {
      // Find the recommendation type from path query string or fallback
      let recType = 'GENERAL';
      const qIdx = path.indexOf('?');
      if (qIdx !== -1) {
        const queryStr = path.substring(qIdx + 1);
        const params = new URLSearchParams(queryStr);
        recType = params.get('recommendation_type') || 'GENERAL';
      }

      const responses: { [key: string]: string } = {
        'GENERAL': "Voici vos conseils généraux pour ce portefeuille : optimisez vos abonnements non utilisés, réduisez vos dépenses de restauration de 10% et visez une épargne automatique de 150 000 Ar par mois.",
        'BUDGET_ANALYSIS': "Analyse budgétaire : Votre budget de divertissement est consommé à 85% alors que nous ne sommes qu'à la moitié du mois. Nous vous suggérons de geler les dépenses non essentielles sur cette catégorie pour les 10 prochains jours.",
        'SPENDING_ANALYSIS': "Analyse des dépenses : Vos dépenses dans la catégorie 'Alimentation & Courses' ont augmenté de 18% par rapport au mois dernier. Privilégiez les achats en gros pour réduire la facture.",
        'SAVING_RECOMMENDATION': "Conseil Épargne : Vous pouvez économiser jusqu'à 300 000 Ar par mois en remplaçant deux sorties hebdomadaires par des activités gratuites. Ce montant placé sur votre compte d'épargne accélérera votre projet de 3 mois."
      };
      const contextMap: { [key: string]: string } = {
        'GENERAL': 'Recommandation globale de santé financière',
        'BUDGET_ANALYSIS': 'Analyse des enveloppes budgétaires',
        'SPENDING_ANALYSIS': 'Analyse comportementale des dépenses',
        'SAVING_RECOMMENDATION': 'Stratégie de maximisation de l\'épargne'
      };
      const promptMap: { [key: string]: string } = {
        'GENERAL': 'Générer une recommandation générale pour mon compte',
        'BUDGET_ANALYSIS': 'Analyser mon budget et ses limites actuelles',
        'SPENDING_ANALYSIS': 'Analyser mes habitudes de dépenses récentes',
        'SAVING_RECOMMENDATION': 'Me proposer un plan d\'épargne personnalisé'
      };

      const newRec: WalletRecommendation = {
        id: `rec-${Date.now()}`,
        wallet_id: walletId,
        type: recType,
        context: contextMap[recType] || 'Conseil personnalisé',
        prompt: promptMap[recType] || `Générer une recommandation de type ${recType}`,
        response: responses[recType] || "Recommandation en cours d'analyse par l'intelligence artificielle Harena.",
        confidence_score: 0.85 + Math.random() * 0.15,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        creation_datetime: new Date().toISOString()
      };
      mockRecommendations.unshift(newRec);
      return newRec as unknown as T;
    }
    return mockRecommendations.filter(r => r.wallet_id === walletId) as unknown as T;
  }

  // Fallback default
  return {} as unknown as T;
}
