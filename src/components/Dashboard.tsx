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
  ShieldAlert, Activity, ArrowUpRight, ArrowDownLeft,
  BarChart3, Info, Calendar, Clock
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer 
} from 'recharts';

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
  const [globalHistory, setGlobalHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [chartMode, setChartMode] = useState<string>('all'); // 'all' or specific wallet ID
  const [activeRecIndex, setActiveRecIndex] = useState(0);
  const [generatingRec, setGeneratingRec] = useState(false);
  const [selectedRecType, setSelectedRecType] = useState('BUDGET_ANALYSIS');
  const [selectedRecWalletId, setSelectedRecWalletId] = useState<string>('');
  const [recsLoading, setRecsLoading] = useState(false);

  const handleGenerateManualRecommendation = async () => {
    if (!selectedRecWalletId) return;
    try {
      setGeneratingRec(true);
      const newRec = await api.launchRecommendation(currentUser.id, selectedRecWalletId, selectedRecType);
      if (newRec) {
        setRecommendations(prev => [newRec, ...prev]);
        setActiveRecIndex(0); // Show the new recommendation immediately
      }
    } catch (err) {
      console.error('Error generating custom recommendation', err);
    } finally {
      setGeneratingRec(false);
    }
  };

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true);
        // Load wallets
        const walletsData = await api.getWallets(currentUser.id);
        setWallets(walletsData);
        if (walletsData.length > 0 && !selectedRecWalletId) {
          setSelectedRecWalletId(walletsData[0].id);
        }

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
        }

        // Fetch budgets and goals
        const budgetsData = await api.getBudgets(currentUser.id);
        setBudgets(budgetsData);

        const goalsData = await api.getGoals(currentUser.id);
        setGoals(goalsData);

        // Fetch balance history for all wallets to calculate aggregate trend
        setHistoryLoading(true);
        const historyPromises = walletsData.map(async (w) => {
          try {
            const toDate = new Date().toISOString();
            const fromDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
            const historyData = await api.getBalanceHistory(currentUser.id, w.id, fromDate, toDate);
            return { walletId: w.id, walletName: w.name, currency: w.currency, history: historyData };
          } catch (_) {
            return { walletId: w.id, walletName: w.name, currency: w.currency, history: [] };
          }
        });
        const resolvedHistories = await Promise.all(historyPromises);

        // Group by snapshot date
        const dateMap: { [date: string]: { [walletId: string]: number } } = {};
        const datesSet = new Set<string>();

        resolvedHistories.forEach(wHist => {
          if (Array.isArray(wHist.history)) {
            wHist.history.forEach((snap: any) => {
              const dStr = snap.snapshot_datetime ? snap.snapshot_datetime.split('T')[0] : '';
              if (dStr) {
                datesSet.add(dStr);
                if (!dateMap[dStr]) dateMap[dStr] = {};
                dateMap[dStr][wHist.walletId] = snap.balance;
              }
            });
          }
        });

        const sortedDates = Array.from(datesSet).sort();

        // Create aggregate data
        const aggregated = sortedDates.map(d => {
          let totalMGA = 0;
          const details: { [walletId: string]: number } = {};

          resolvedHistories.forEach(wHist => {
            const bal = dateMap[d][wHist.walletId] ?? 0;
            details[wHist.walletId] = bal;

            const rate = wHist.currency === 'EUR' ? 5000 : wHist.currency === 'USD' ? 4600 : 1;
            totalMGA += bal * rate;
          });

          return {
            dateStr: d,
            date: new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
            totalMGA,
            ...details
          };
        });

        setGlobalHistory(aggregated);
        setHistoryLoading(false);

      } catch (err) {
        console.error('Error loading dashboard data', err);
        setHistoryLoading(false);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, [currentUser.id]);

  useEffect(() => {
    if (!selectedRecWalletId || !currentUser.id) return;

    async function fetchRecs() {
      try {
        setRecsLoading(true);
        let recs = await api.getRecommendations(currentUser.id, selectedRecWalletId);
        
        // Launch general recommendation if none exists
        const hasGeneral = recs.some(r => r.type === 'GENERAL');
        if (!hasGeneral) {
          try {
            const startRec = await api.launchRecommendation(currentUser.id, selectedRecWalletId, 'GENERAL');
            if (startRec) {
              recs = [startRec, ...recs];
            }
          } catch (err) {
            console.error('Error launching starting general recommendation', err);
          }
        }
        
        setRecommendations(recs);
        setActiveRecIndex(0);
      } catch (err) {
        console.error('Error loading recommendations', err);
      } finally {
        setRecsLoading(false);
      }
    }

    fetchRecs();
  }, [selectedRecWalletId, currentUser.id]);

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
        <span className="h-10 w-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin shadow-lg shadow-cyan-500/20" />
        <p className="text-slate-400 text-sm font-sans">Analyse de vos données financières Harena...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans">
      
      {/* Welcome & AI Highlight Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Bonjour, {currentUser.firstname} 👋
          </h1>
          <p className="text-sm text-slate-400">
            Voici un aperçu de la santé financière de votre portefeuille intelligent.
          </p>
        </div>
        
        {/* Real-time date display */}
        <div className="text-right text-xs text-slate-300 bg-[#0b1329] px-4 py-2 rounded-full border border-slate-800/80 self-start md:self-auto font-mono shadow-sm">
          Dernière synchro : {new Date().toLocaleDateString('fr-FR')} à {new Date().toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'})}
        </div>
      </div>

      {/* AI Advice & Recommendation Generator Block */}
      <div className="bg-gradient-to-r from-[#0d1c3a] via-[#090f24] to-[#04334a] text-white rounded-3xl p-6 shadow-lg shadow-cyan-500/5 border border-cyan-500/20 relative overflow-hidden animate-fade-in space-y-6">
        {/* Decorative Sparkle Background */}
        <div className="absolute right-0 bottom-0 top-0 w-1/3 opacity-10 bg-[radial-gradient(circle_at_center,rgba(0,240,255,0.25)_0%,transparent_70%)] pointer-events-none" />
        
        {/* Header: Title and Account Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-4 relative z-10">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 bg-cyan-500/15 rounded-lg flex items-center justify-center text-cyan-400">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-100">
              Conseils de l'IA Harena
            </h3>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400 font-medium">Compte ciblé :</span>
            <select
              value={selectedRecWalletId}
              onChange={(e) => {
                setSelectedRecWalletId(e.target.value);
                setActiveRecIndex(0);
              }}
              className="px-3 py-1 bg-[#070c1e] border border-slate-800/80 rounded-xl text-xs text-cyan-400 font-semibold focus:outline-none focus:ring-2 focus:ring-cyan-500/20 cursor-pointer font-sans shadow-inner hover:border-slate-700"
            >
              {wallets.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.currency})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Main Content Pane */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-10 items-start">
          
          {/* Left side: Active recommendation detail / Loading State */}
          <div className="lg:col-span-2 space-y-4">
            {recsLoading ? (
              <div className="flex flex-col items-center justify-center py-10 space-y-3 bg-[#070d1e]/30 rounded-2xl border border-slate-800/40">
                <span className="h-8 w-8 border-3 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs text-slate-400 font-sans">Analyse des opportunités financières...</p>
              </div>
            ) : recommendations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center space-y-2 bg-[#070d1e]/30 rounded-2xl border border-slate-800/40">
                <Info className="h-8 w-8 text-slate-500" />
                <h4 className="text-sm font-semibold text-slate-300">Aucun conseil généré</h4>
                <p className="text-xs text-slate-400 max-w-sm">
                  Utilisez le module à droite pour lancer une analyse personnalisée et obtenir des conseils financiers ciblés de l'IA.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {(() => {
                  const activeRec = recommendations[activeRecIndex];
                  if (!activeRec) return null;
                  
                  const dateObj = new Date(activeRec.creation_datetime || Date.now());
                  const formattedDate = dateObj.toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric'
                  }) + ' à ' + dateObj.toLocaleTimeString('fr-FR', {
                    hour: '2-digit',
                    minute: '2-digit'
                  });

                  return (
                    <div className="flex items-start gap-4">
                      <div className="h-10 w-10 bg-cyan-500/20 rounded-xl flex items-center justify-center text-cyan-400 shrink-0 border border-cyan-500/30 shadow-md shadow-cyan-500/10">
                        <Sparkles className="h-5 w-5 animate-pulse" />
                      </div>
                      <div className="space-y-2 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-cyan-400 flex items-center gap-1.5 uppercase tracking-wider">
                            Recommandation Smart Harena
                          </span>
                          <span className="text-[10px] bg-cyan-500/20 text-cyan-300 font-medium px-2 py-0.5 rounded-full border border-cyan-500/30 font-mono">
                            Confiance : {Math.round(activeRec.confidence_score * 100)}%
                          </span>
                        </div>
                        <h4 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                          <span className="px-2 py-0.5 text-[9px] bg-cyan-900/60 border border-cyan-500/25 rounded-md text-cyan-300 font-mono uppercase">
                            {activeRec.type}
                          </span>
                          <span>{activeRec.context}</span>
                        </h4>
                        <p className="text-xs text-slate-300 leading-relaxed font-sans">
                          {activeRec.response}
                        </p>
                        <div className="text-[10px] text-slate-400 font-medium font-mono pt-1">
                          Conseil généré le : {formattedDate}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Slider Dots Indicator if multiple */}
                {recommendations.length > 1 && (
                  <div className="flex items-center gap-1.5 pl-14">
                    {recommendations.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setActiveRecIndex(idx)}
                        className={`h-1.5 rounded-full transition-all duration-250 cursor-pointer ${
                          idx === activeRecIndex ? 'w-4 bg-cyan-400' : 'w-1.5 bg-slate-800'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right side: Custom recommendation generator */}
          <div className="bg-[#070d1e]/50 p-4 rounded-2xl border border-slate-800/80 space-y-3">
            <div>
              <h5 className="text-xs font-bold text-white flex items-center gap-1.5 font-sans">
                <Sparkles className="h-3.5 w-3.5 text-cyan-400 animate-pulse" />
                <span>Demander un conseil ciblé</span>
              </h5>
              <p className="text-[10px] text-slate-400">Générez instantanément des analyses IA sur-mesure.</p>
            </div>

            <div className="space-y-2.5">
              <div className="flex flex-col gap-1">
                <label className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold">Type d'analyse</label>
                <select
                  className="w-full px-3 py-1.5 bg-[#0b1329] border border-slate-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 text-slate-200 cursor-pointer font-sans"
                  value={selectedRecType}
                  onChange={(e) => setSelectedRecType(e.target.value)}
                >
                  <option value="BUDGET_ANALYSIS">Analyse de budget (BUDGET_ANALYSIS)</option>
                  <option value="SPENDING_ANALYSIS">Analyse de dépenses (SPENDING_ANALYSIS)</option>
                  <option value="SAVING_RECOMMENDATION">Conseil d'épargne (SAVING_RECOMMENDATION)</option>
                  <option value="GENERAL">Conseils généraux (GENERAL)</option>
                </select>
              </div>

              <button
                onClick={handleGenerateManualRecommendation}
                disabled={generatingRec || !selectedRecWalletId}
                className="w-full py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:from-slate-800 disabled:to-slate-900 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-cyan-500/10 transition-all cursor-pointer disabled:cursor-not-allowed disabled:text-slate-500 font-sans"
              >
                {generatingRec ? (
                  <>
                    <span className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Génération IA...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Générer l'analyse</span>
                  </>
                )}
              </button>
            </div>
          </div>

        </div>

        {/* Historique des Recommandations Table / List */}
        {recommendations.length > 0 && !recsLoading && (
          <div className="mt-6 pt-5 border-t border-slate-800/80 relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-4 w-4 text-cyan-400" />
              <h5 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-sans">
                Historique des recommandations de ce portefeuille ({recommendations.length})
              </h5>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
              {recommendations.map((rec, idx) => {
                const isSelected = idx === activeRecIndex;
                const dateObj = new Date(rec.creation_datetime || Date.now());
                const formattedDate = dateObj.toLocaleDateString('fr-FR', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric'
                }) + ' ' + dateObj.toLocaleTimeString('fr-FR', {
                  hour: '2-digit',
                  minute: '2-digit'
                });
                
                return (
                  <button
                    key={rec.id}
                    onClick={() => setActiveRecIndex(idx)}
                    className={`text-left p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                      isSelected 
                        ? 'bg-cyan-950/25 border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.1)]' 
                        : 'bg-[#080d1e]/50 border-slate-800/80 hover:border-slate-700 hover:bg-[#0c142b]/50'
                    }`}
                  >
                    <div className="space-y-1.5 w-full">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`px-2 py-0.5 text-[8px] font-mono font-bold rounded ${
                          rec.type === 'BUDGET_ANALYSIS' 
                            ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20' 
                            : rec.type === 'SPENDING_ANALYSIS' 
                            ? 'bg-purple-500/15 text-purple-400 border border-purple-500/20'
                            : rec.type === 'SAVING_RECOMMENDATION'
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                            : 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/20'
                        }`}>
                          {rec.type}
                        </span>
                        <span className="text-[9px] text-slate-400 flex items-center gap-1 font-mono font-medium">
                          <Calendar className="h-3 w-3 shrink-0" />
                          {formattedDate}
                        </span>
                      </div>
                      
                      <h6 className="font-bold text-xs text-slate-200 line-clamp-1">
                        {rec.context}
                      </h6>
                      
                      <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed font-sans">
                        {rec.response}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Grid: Balances & Core KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Wallet Balance Hero */}
        <div className="bg-[#0b1329] p-6 rounded-3xl border border-slate-800/80 shadow-sm flex flex-col justify-between relative overflow-hidden group hover:border-slate-700/80 transition-all duration-300">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Solde Total Estimé</span>
              <div className="h-8 w-8 rounded-lg bg-cyan-950/40 text-cyan-400 flex items-center justify-center border border-cyan-900/30 shadow-inner">
                <WalletIcon className="h-4 w-4" />
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-3xl font-bold text-white tracking-tight font-sans">
                {formatCurrency(estimatedTotalMGA, 'MGA')}
              </div>
              <p className="text-[10px] text-slate-400 font-mono flex gap-1.5 flex-wrap font-medium">
                {totalBalanceMGA > 0 && <span>{formatCurrency(totalBalanceMGA, 'MGA')}</span>}
                {totalBalanceEUR > 0 && <span>+ {formatCurrency(totalBalanceEUR, 'EUR')}</span>}
                {totalBalanceUSD > 0 && <span>+ {formatCurrency(totalBalanceUSD, 'USD')}</span>}
              </p>
            </div>
          </div>
          
          <div className="border-t border-slate-800/60 pt-4 mt-6 flex items-center justify-between">
            <button 
              onClick={() => setActiveTab('wallets')}
              className="text-cyan-400 hover:text-cyan-300 font-semibold text-xs flex items-center gap-1 cursor-pointer"
            >
              <span>Gérer les portefeuilles</span>
              <ChevronRight className="h-3 w-3" />
            </button>
            <span className="text-[10px] text-slate-500 font-medium font-mono">{wallets.length} Comptes</span>
          </div>
        </div>

        {/* Budget KPI Card */}
        <div className="bg-[#0b1329] p-6 rounded-3xl border border-slate-800/80 shadow-sm flex flex-col justify-between group hover:border-slate-700/80 transition-all duration-300">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Consommation Budgets</span>
              <div className="h-8 w-8 rounded-lg bg-cyan-950/40 text-cyan-400 flex items-center justify-center border border-cyan-900/30 shadow-inner">
                <PieChart className="h-4 w-4" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-white tracking-tight font-sans">
                {formatCurrency(totalBudgetSpent, 'MGA')}
              </div>
              <div className="space-y-1">
                <div className="w-full bg-[#131c35] rounded-full h-1.5 overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-500 ${
                      budgetRatio > 90 ? 'bg-red-500' : budgetRatio > 70 ? 'bg-amber-500' : 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.5)]'
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

          <div className="border-t border-slate-800/60 pt-4 mt-6 flex items-center justify-between">
            <button 
              onClick={() => setActiveTab('budgets')}
              className="text-cyan-400 hover:text-cyan-300 font-semibold text-xs flex items-center gap-1 cursor-pointer"
            >
              <span>Ajuster mes limites</span>
              <ChevronRight className="h-3 w-3" />
            </button>
            <span className="text-[10px] text-slate-500 font-medium font-mono">{budgets.length} Actifs</span>
          </div>
        </div>

        {/* Goals KPI Card */}
        <div className="bg-[#0b1329] p-6 rounded-3xl border border-slate-800/80 shadow-sm flex flex-col justify-between group hover:border-slate-700/80 transition-all duration-300">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Épargne Objectifs</span>
              <div className="h-8 w-8 rounded-lg bg-cyan-950/40 text-cyan-400 flex items-center justify-center border border-cyan-900/30 shadow-inner">
                <Activity className="h-4 w-4" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-white tracking-tight font-sans">
                {formatCurrency(
                  goals.reduce((sum, g) => {
                    const rate = g.wallet.currency === 'EUR' ? 5000 : g.wallet.currency === 'USD' ? 4600 : 1;
                    return sum + (g.current_amount * rate);
                  }, 0),
                  'MGA'
                )}
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-cyan-400 shrink-0" />
                <span className="text-xs text-slate-300 leading-none font-medium">
                  {goals.filter(g => g.status === 'COMPLETED').length} / {goals.length} Objectifs atteints
                </span>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-800/60 pt-4 mt-6 flex items-center justify-between">
            <button 
              onClick={() => setActiveTab('goals')}
              className="text-cyan-400 hover:text-cyan-300 font-semibold text-xs flex items-center gap-1 cursor-pointer"
            >
              <span>Voir mes cagnottes</span>
              <ChevronRight className="h-3 w-3" />
            </button>
            <span className="text-[10px] text-slate-500 font-medium font-mono">
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

      {/* Visual Balance History Chart */}
      <div className="bg-[#0b1329] p-6 rounded-3xl border border-slate-800/80 shadow-sm space-y-4 hover:border-slate-700/80 transition-all duration-300">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <BarChart3 className="h-4 w-4 text-cyan-400" />
              <span>Évolution des soldes</span>
            </h3>
            <p className="text-xs text-slate-400">Visualisez la tendance de vos avoirs et l'évolution globale de votre patrimoine.</p>
          </div>
          
          {/* Chart filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 shrink-0 font-medium hidden sm:inline">Portefeuille :</span>
            <select
              className="px-3 py-1.5 border border-slate-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 bg-[#131c35]/50 text-slate-200 cursor-pointer"
              value={chartMode}
              onChange={(e) => setChartMode(e.target.value)}
            >
              <option value="all" className="bg-[#0b1329] text-white">Patrimoine Global (MGA)</option>
              {wallets.map(w => (
                <option key={w.id} value={w.id} className="bg-[#0b1329] text-white">
                  {w.name} ({w.currency})
                </option>
              ))}
            </select>
          </div>
        </div>

        {historyLoading ? (
          <div className="h-64 flex flex-col items-center justify-center space-y-2">
            <span className="h-8 w-8 border-3 border-cyan-500 border-t-transparent rounded-full animate-spin shadow-lg shadow-cyan-500/20" />
            <span className="text-xs text-slate-400 font-sans">Chargement de l'historique...</span>
          </div>
        ) : globalHistory.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-6 space-y-2 bg-[#131c35]/50 rounded-2xl border border-dashed border-slate-800">
            <Info className="h-8 w-8 text-slate-500" />
            <h4 className="font-semibold text-xs text-slate-400">Aucun historique disponible</h4>
            <p className="text-[11px] text-slate-500 max-w-xs">Enregistrez des transactions pour générer l'analyse historique du compte.</p>
          </div>
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={globalHistory} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                <XAxis 
                  dataKey="date" 
                  stroke="#64748b" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false} 
                />
                <YAxis 
                  stroke="#64748b" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false} 
                  width={80}
                  tickFormatter={(val) => {
                    if (chartMode === 'all') {
                      return formatCurrency(val, 'MGA');
                    } else {
                      const selected = wallets.find(w => w.id === chartMode);
                      return formatCurrency(val, selected?.currency || 'MGA');
                    }
                  }} 
                />
                <Tooltip 
                  contentStyle={{ background: '#0b1329', border: '1px solid #1e293b', borderRadius: '12px', color: '#f8fafc', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.4)' }} 
                  labelStyle={{ color: '#94a3b8', fontWeight: 'bold' }}
                  formatter={(value) => {
                    if (chartMode === 'all') {
                      return [formatCurrency(Number(value), 'MGA'), 'Patrimoine Total'];
                    } else {
                      const selected = wallets.find(w => w.id === chartMode);
                      return [formatCurrency(Number(value), selected?.currency || 'MGA'), `Solde ${selected?.name}`];
                    }
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey={chartMode === 'all' ? 'totalMGA' : chartMode} 
                  stroke="#06b6d4" 
                  strokeWidth={3} 
                  fillOpacity={1}
                  fill="url(#colorBalance)"
                  dot={{ r: 4, strokeWidth: 2, fill: '#0b1329', stroke: '#22d3ee' }} 
                  activeDot={{ r: 6 }} 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Bottom Grid: Recent Transactions & Wallet List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Recent Transactions List */}
        <div className="bg-[#0b1329] p-6 rounded-3xl border border-slate-800/80 shadow-sm lg:col-span-2 space-y-4 hover:border-slate-700/80 transition-all duration-300">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white tracking-tight">Transactions récentes</h3>
            <button 
              onClick={() => setActiveTab('transactions')}
              className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer"
            >
              Tout voir
            </button>
          </div>

          {recentTransactions.length === 0 ? (
            <div className="text-center py-8 space-y-3">
              <div className="mx-auto h-12 w-12 bg-[#131c35] text-slate-400 border border-slate-800 rounded-full flex items-center justify-center">
                <Activity className="h-6 w-6" />
              </div>
              <p className="text-slate-400 text-xs">Aucune transaction enregistrée pour le moment.</p>
              <button 
                onClick={() => setActiveTab('transactions')}
                className="text-xs bg-cyan-950/40 text-cyan-400 font-semibold px-4 py-2 rounded-xl border border-cyan-800/30 hover:bg-cyan-900/30 transition-all cursor-pointer"
              >
                Ajouter une transaction
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-800/60">
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
                    className="flex items-center justify-between py-3.5 hover:bg-[#131c35]/40 px-2 rounded-2xl transition-all cursor-pointer group border border-transparent hover:border-slate-800"
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="h-10 w-10 rounded-xl flex items-center justify-center text-sm font-semibold shrink-0"
                        style={{ 
                          backgroundColor: tx.category ? `${tx.category.color}15` : '#94a3b815', 
                          color: tx.category ? tx.category.color : '#94a3b8' 
                        }}
                      >
                        {isExpense ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-200 text-sm group-hover:text-white transition-colors">
                          {tx.description}
                        </h4>
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <span className="font-semibold" style={{ color: tx.category ? tx.category.color : '#94a3b8' }}>
                            {tx.category ? tx.category.name : 'Sans catégorie'}
                          </span>
                          <span>•</span>
                          <span className="font-mono">{formattedDate}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right space-y-1">
                      <div className={`font-bold text-sm ${isExpense ? 'text-slate-300' : 'text-cyan-400 font-sans'}`}>
                        {isExpense ? '-' : '+'}{formatCurrency(tx.amount, tx.wallet.currency)}
                      </div>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                        tx.status === 'COMPLETED' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' : 
                        tx.status === 'PENDING' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'
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
        <div className="bg-[#0b1329] p-6 rounded-3xl border border-slate-800/80 shadow-sm space-y-4 hover:border-slate-700/80 transition-all duration-300">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white tracking-tight">Mes Comptes</h3>
            <button 
              onClick={() => setActiveTab('wallets')}
              className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 cursor-pointer"
            >
              Ajouter
            </button>
          </div>

          <div className="space-y-3">
            {wallets.map((w) => {
              const balance = balances[w.id] || 0;
              const isSavings = w.type === 'SAVINGS';

              return (
                <div 
                  key={w.id}
                  onClick={() => {
                    setSelectedWallet(w);
                    setActiveTab('wallets');
                  }}
                  className="p-4 bg-[#131c35]/50 rounded-2xl border border-slate-800/80 hover:border-cyan-500/30 hover:bg-[#131c35] transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      isSavings ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                    }`}>
                      {w.type}
                    </span>
                    <span className="text-xs text-slate-400 group-hover:text-cyan-400 transition-colors font-bold font-mono">
                      {w.currency}
                    </span>
                  </div>
                  <h4 className="font-semibold text-slate-200 text-sm">{w.name}</h4>
                  <div className="text-lg font-extrabold text-white tracking-tight mt-1 font-sans">
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
