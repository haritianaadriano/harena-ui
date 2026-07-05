/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { api, formatCurrency } from '../lib/api';
import { User, Wallet, WalletTransaction, WalletRecommendation, Budget, Goal } from '../types';
import { 
  Sparkles, Wallet as WalletIcon, TrendingUp, TrendingDown, 
  AlertTriangle, CheckCircle, ChevronRight, PieChart, 
  ShieldAlert, Activity, ArrowUpRight, ArrowDownLeft
} from 'lucide-react';

interface DashboardProps {
  currentUser: User;
  setActiveTab: (tab: string) => void;
  setSelectedWallet: (wallet: Wallet) => void;
  setSelectedTx: (tx: WalletTransaction) => void;
}

export default function Dashboard({ currentUser, setActiveTab, setSelectedWallet, setSelectedTx }: DashboardProps) {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [balances, setBalances] = useState<{ [walletId: string]: number }>({});
  const [recentTransactions, setRecentTransactions] = useState<WalletTransaction[]>([]);
  const [recommendations, setRecommendations] = useState<WalletRecommendation[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeRecIndex, setActiveRecIndex] = useState(0);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true);
        // Load wallets
        const walletsData = await api.getWallets(currentUser.id);
        setWallets(walletsData);

        // Fetch balances for all wallets
        const balancePromises = walletsData.map(async (w) => {
          try {
            const balSnapshot = await api.getCurrentBalance(currentUser.id, w.id);
            return { walletId: w.id, balance: balSnapshot.balance };
          } catch (_) {
            return { walletId: w.id, balance: 0 };
          }
        });
        const resolvedBalances = await Promise.all(balancePromises);
        const balanceMap: { [walletId: string]: number } = {};
        resolvedBalances.forEach(item => {
          balanceMap[item.walletId] = item.balance;
        });
        setBalances(balanceMap);

        // Fetch transactions for the main wallet
        if (walletsData.length > 0) {
          const mainWallet = walletsData[0];
          const txs = await api.getTransactions(currentUser.id, mainWallet.id);
          setRecentTransactions(txs.slice(0, 4));

          // Fetch active recommendations
          const recs = await api.getRecommendations(mainWallet.id);
          setRecommendations(recs);
        }

        // Fetch budgets and goals
        const budgetsData = await api.getBudgets(currentUser.id);
        setBudgets(budgetsData);

        const goalsData = await api.getGoals(currentUser.id);
        setGoals(goalsData);

      } catch (err) {
        console.error('Error loading dashboard data', err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, [currentUser.id]);

  // Calculate stats
  const totalBalanceMGA = wallets
    .filter(w => w.currency === 'MGA')
    .reduce((sum, w) => sum + (balances[w.id] || 0), 0);

  const totalBalanceEUR = wallets
    .filter(w => w.currency === 'EUR')
    .reduce((sum, w) => sum + (balances[w.id] || 0), 0);

  const totalBalanceUSD = wallets
    .filter(w => w.currency === 'USD')
    .reduce((sum, w) => sum + (balances[w.id] || 0), 0);

  // Quick total estimation for showcase in MGA
  const estimatedTotalMGA = totalBalanceMGA + (totalBalanceEUR * 5000) + (totalBalanceUSD * 4600);

  // Sum budgets based on their respective wallet currency translated to MGA for global overview
  const totalBudgetSpent = budgets.reduce((sum, b) => {
    const rate = b.wallet.currency === 'EUR' ? 5000 : b.wallet.currency === 'USD' ? 4600 : 1;
    return sum + (b.spent_amount * rate);
  }, 0);

  const totalBudgetLimit = budgets.reduce((sum, b) => {
    const rate = b.wallet.currency === 'EUR' ? 5000 : b.wallet.currency === 'USD' ? 4600 : 1;
    return sum + (b.limit_amount * rate);
  }, 0);

  const budgetRatio = totalBudgetLimit > 0 ? (totalBudgetSpent / totalBudgetLimit) * 100 : 0;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <span className="h-10 w-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 text-sm font-sans">Analyse de vos données financières Harena...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans">
      
      {/* Welcome & AI Highlight Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Bonjour, {currentUser.firstname} 👋
          </h1>
          <p className="text-sm text-slate-500">
            Voici un aperçu de la santé financière de votre portefeuille intelligent.
          </p>
        </div>
        
        {/* Real-time date display */}
        <div className="text-right text-xs text-slate-500 bg-white px-4 py-2 rounded-full border border-slate-100 self-start md:self-auto font-mono shadow-xs">
          Dernière synchro : {new Date().toLocaleDateString('fr-FR')} à {new Date().toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'})}
        </div>
      </div>

      {/* AI Advice Banner */}
      {recommendations.length > 0 && (
        <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-900 text-white rounded-3xl p-6 shadow-md border border-emerald-500/10 relative overflow-hidden">
          {/* Decorative Sparkle Background */}
          <div className="absolute right-0 bottom-0 top-0 w-1/3 opacity-10 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.2)_0%,transparent_70%)] pointer-events-none" />
          
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 bg-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400 shrink-0 border border-emerald-500/30">
              <Sparkles className="h-5 w-5 animate-pulse" />
            </div>
            <div className="space-y-2 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  Recommandation Smart Harena
                </span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-medium px-2 py-0.5 rounded-full border border-emerald-500/30 font-mono">
                  Score de confiance : {Math.round(recommendations[activeRecIndex].confidence_score * 100)}%
                </span>
              </div>
              <h4 className="font-semibold text-sm text-slate-200">
                {recommendations[activeRecIndex].context}
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                {recommendations[activeRecIndex].response}
              </p>
              
              {/* Slider Dots if multiple */}
              {recommendations.length > 1 && (
                <div className="flex items-center gap-1.5 pt-2">
                  {recommendations.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveRecIndex(idx)}
                      className={`h-1.5 rounded-full transition-all duration-250 cursor-pointer ${
                        idx === activeRecIndex ? 'w-4 bg-emerald-400' : 'w-1.5 bg-slate-800'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Grid: Balances & Core KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Wallet Balance Hero */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs flex flex-col justify-between relative overflow-hidden group hover:border-slate-200 hover:shadow-sm transition-all duration-300">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Solde Total Estimé</span>
              <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                <WalletIcon className="h-4 w-4" />
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-3xl font-bold text-slate-900 tracking-tight font-sans">
                {formatCurrency(estimatedTotalMGA, 'MGA')}
              </div>
              <p className="text-[10px] text-slate-400 font-mono flex gap-1.5 flex-wrap font-medium">
                {totalBalanceMGA > 0 && <span>{formatCurrency(totalBalanceMGA, 'MGA')}</span>}
                {totalBalanceEUR > 0 && <span>+ {formatCurrency(totalBalanceEUR, 'EUR')}</span>}
                {totalBalanceUSD > 0 && <span>+ {formatCurrency(totalBalanceUSD, 'USD')}</span>}
              </p>
            </div>
          </div>
          
          <div className="border-t border-slate-100 pt-4 mt-6 flex items-center justify-between">
            <button 
              onClick={() => setActiveTab('wallets')}
              className="text-emerald-600 hover:text-emerald-700 font-semibold text-xs flex items-center gap-1 cursor-pointer"
            >
              <span>Gérer les portefeuilles</span>
              <ChevronRight className="h-3 w-3" />
            </button>
            <span className="text-[10px] text-slate-400 font-medium font-mono">{wallets.length} Comptes</span>
          </div>
        </div>

        {/* Budget KPI Card */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs flex flex-col justify-between group hover:border-slate-200 hover:shadow-sm transition-all duration-300">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Consommation Budgets</span>
              <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                <PieChart className="h-4 w-4" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-slate-900 tracking-tight font-sans">
                {formatCurrency(totalBudgetSpent, 'MGA')}
              </div>
              <div className="space-y-1">
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-500 ${
                      budgetRatio > 90 ? 'bg-red-500' : budgetRatio > 70 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`} 
                    style={{ width: `${Math.min(100, budgetRatio)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 font-semibold font-mono">
                  <span>{Math.round(budgetRatio)}% consommé</span>
                  <span>Limite : {formatCurrency(totalBudgetLimit, 'MGA')}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4 mt-6 flex items-center justify-between">
            <button 
              onClick={() => setActiveTab('budgets')}
              className="text-emerald-600 hover:text-emerald-700 font-semibold text-xs flex items-center gap-1 cursor-pointer"
            >
              <span>Ajuster mes limites</span>
              <ChevronRight className="h-3 w-3" />
            </button>
            <span className="text-[10px] text-slate-400 font-medium font-mono">{budgets.length} Actifs</span>
          </div>
        </div>

        {/* Goals KPI Card */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs flex flex-col justify-between group hover:border-slate-200 hover:shadow-sm transition-all duration-300">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Épargne Objectifs</span>
              <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                <Activity className="h-4 w-4" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-slate-900 tracking-tight font-sans">
                {formatCurrency(
                  goals.reduce((sum, g) => {
                    const rate = g.wallet.currency === 'EUR' ? 5000 : g.wallet.currency === 'USD' ? 4600 : 1;
                    return sum + (g.current_amount * rate);
                  }, 0),
                  'MGA'
                )}
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                <span className="text-xs text-slate-500 leading-none font-medium">
                  {goals.filter(g => g.status === 'COMPLETED').length} / {goals.length} Objectifs atteints
                </span>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4 mt-6 flex items-center justify-between">
            <button 
              onClick={() => setActiveTab('goals')}
              className="text-emerald-600 hover:text-emerald-700 font-semibold text-xs flex items-center gap-1 cursor-pointer"
            >
              <span>Voir mes cagnottes</span>
              <ChevronRight className="h-3 w-3" />
            </button>
            <span className="text-[10px] text-slate-400 font-medium font-mono">
              Total Cible : {formatCurrency(
                goals.reduce((sum, g) => {
                  const rate = g.wallet.currency === 'EUR' ? 5000 : g.wallet.currency === 'USD' ? 4600 : 1;
                  return sum + (g.target_amount * rate);
                }, 0),
                'MGA'
              )}
            </span>
          </div>
        </div>

      </div>

      {/* Bottom Grid: Recent Transactions & Wallet List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Recent Transactions List */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs lg:col-span-2 space-y-4 hover:border-slate-200 hover:shadow-sm transition-all duration-300">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">Transactions récentes</h3>
            <button 
              onClick={() => setActiveTab('transactions')}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors cursor-pointer"
            >
              Tout voir
            </button>
          </div>

          {recentTransactions.length === 0 ? (
            <div className="text-center py-8 space-y-3">
              <div className="mx-auto h-12 w-12 bg-slate-50 text-slate-400 border border-slate-100 rounded-full flex items-center justify-center">
                <Activity className="h-6 w-6" />
              </div>
              <p className="text-slate-400 text-xs">Aucune transaction enregistrée pour le moment.</p>
              <button 
                onClick={() => setActiveTab('transactions')}
                className="text-xs bg-emerald-50 text-emerald-600 font-semibold px-4 py-2 rounded-xl border border-emerald-100 hover:bg-emerald-100 transition-all cursor-pointer"
              >
                Ajouter une transaction
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentTransactions.map((tx) => {
                const isExpense = tx.type === 'EXPENSE' || tx.type === 'SUBSCRIPTION';
                const formattedDate = new Date(tx.transaction_datetime).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'short',
                });

                return (
                  <div 
                    key={tx.id} 
                    onClick={() => {
                      setSelectedTx(tx);
                      setActiveTab('transactions');
                    }}
                    className="flex items-center justify-between py-3.5 hover:bg-slate-50/50 px-2 rounded-2xl transition-all cursor-pointer group border border-transparent hover:border-slate-100"
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="h-10 w-10 rounded-xl flex items-center justify-center text-sm font-semibold shrink-0"
                        style={{ backgroundColor: `${tx.category.color}15`, color: tx.category.color }}
                      >
                        {isExpense ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-800 text-sm group-hover:text-slate-900 transition-colors">
                          {tx.description}
                        </h4>
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <span className="font-semibold" style={{ color: tx.category.color }}>
                            {tx.category.name}
                          </span>
                          <span>•</span>
                          <span className="font-mono">{formattedDate}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right space-y-1">
                      <div className={`font-bold text-sm ${isExpense ? 'text-slate-700' : 'text-emerald-600 font-sans'}`}>
                        {isExpense ? '-' : '+'}{formatCurrency(tx.amount, tx.wallet.currency)}
                      </div>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                        tx.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 
                        tx.status === 'PENDING' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'
                      }`}>
                        {tx.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Wallets list */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs space-y-4 hover:border-slate-200 hover:shadow-sm transition-all duration-300">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">Mes Comptes</h3>
            <button 
              onClick={() => setActiveTab('wallets')}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 cursor-pointer"
            >
              Ajouter
            </button>
          </div>

          <div className="space-y-3">
            {wallets.map((w) => {
              const balance = balances[w.id] || 0;
              const isSavings = w.type === 'SAVINGS';
              const isBusiness = w.type === 'BUSINESS';

              return (
                <div 
                  key={w.id}
                  onClick={() => {
                    setSelectedWallet(w);
                    setActiveTab('wallets');
                  }}
                  className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100 hover:border-emerald-100 hover:bg-slate-50 transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      isSavings ? 'bg-amber-500/10 text-amber-600 border-amber-500/15' : 
                      isBusiness ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/15' : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/15'
                    }`}>
                      {w.type}
                    </span>
                    <span className="text-xs text-slate-400 group-hover:text-emerald-600 transition-colors font-bold font-mono">
                      {w.currency}
                    </span>
                  </div>
                  <h4 className="font-semibold text-slate-800 text-sm">{w.name}</h4>
                  <div className="text-lg font-extrabold text-slate-900 tracking-tight mt-1 font-sans">
                    {formatCurrency(balance, w.currency)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

    </div>
  );
}
