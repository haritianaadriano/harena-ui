/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { api, formatCurrency } from '../lib/api';
import { User, Wallet, WalletTransaction, TransactionCategory, TransactionType, TransactionStatus, TransactionAnalysis } from '../types';
import { 
  Plus, Calendar, Filter, Sparkles, AlertTriangle, 
  CheckCircle2, XCircle, Clock, Info, ShieldCheck, 
  HelpCircle, ChevronRight, CornerDownRight, ArrowUpRight, ArrowDownLeft
} from 'lucide-react';

interface TransactionsViewProps {
  currentUser: User;
  selectedTx: WalletTransaction | null;
  setSelectedTx: (tx: WalletTransaction | null) => void;
}

export default function TransactionsView({ currentUser, selectedTx, setSelectedTx }: TransactionsViewProps) {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [selectedWallet, setSelectedWallet] = useState<Wallet | null>(null);
  const [categories, setCategories] = useState<TransactionCategory[]>([]);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterType, setFilterType] = useState<TransactionType | ''>('');
  const [filterStatus, setFilterStatus] = useState<TransactionStatus | ''>('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // AI analysis state for the selected transaction
  const [analysis, setAnalysis] = useState<TransactionAnalysis | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);

  // New Transaction Form State
  const [showAddModal, setShowAddModal] = useState(false);
  const [txAmount, setTxAmount] = useState('');
  const [txType, setTxType] = useState<TransactionType>('EXPENSE');
  const [txStatus, setTxStatus] = useState<TransactionStatus>('COMPLETED');
  const [txDescription, setTxDescription] = useState('');
  const [txCategoryId, setTxCategoryId] = useState('');
  const [txReference, setTxReference] = useState('');
  const [txSource, setTxSource] = useState('');
  const [txWalletId, setTxWalletId] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  // Load basic configurations
  useEffect(() => {
    async function initData() {
      try {
        setLoading(true);
        const walletsData = await api.getWallets(currentUser.id);
        setWallets(walletsData);
        if (walletsData.length > 0) {
          setSelectedWallet(walletsData[0]);
        }

        const categoriesData = await api.getCategories(currentUser.id);
        setCategories(categoriesData);
        if (categoriesData.length > 0) {
          setTxCategoryId(categoriesData[0].id);
        }
      } catch (err) {
        console.error('Error initiating transactions view data', err);
      } finally {
        setLoading(false);
      }
    }
    initData();
  }, [currentUser.id]);

  // Load transactions based on selected wallet & filters
  const loadTransactions = async () => {
    if (!selectedWallet) return;
    try {
      setLoading(true);
      const filters: any = {};
      if (filterType) filters.type = filterType;
      if (filterStatus) filters.status = filterStatus;
      if (fromDate) filters.from = new Date(fromDate).toISOString();
      if (toDate) filters.to = new Date(toDate).toISOString();

      const txs = await api.getTransactions(currentUser.id, selectedWallet.id, filters);
      setTransactions(txs);
    } catch (err) {
      console.error('Error fetching transactions', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, [selectedWallet, filterType, filterStatus, fromDate, toDate, currentUser.id]);

  // Load AI analysis when a transaction is selected
  useEffect(() => {
    async function loadAnalysis() {
      if (!selectedTx) {
        setAnalysis(null);
        return;
      }
      try {
        setAnalysisLoading(true);
        const analyses = await api.getTransactionAnalysis(selectedTx.id);
        if (analyses.length > 0) {
          setAnalysis(analyses[0]);
        } else {
          setAnalysis(null);
        }
      } catch (err) {
        console.error('Error fetching transaction analysis', err);
        setAnalysis(null);
      } finally {
        setAnalysisLoading(false);
      }
    }
    loadAnalysis();
  }, [selectedTx]);

  const handleCreateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormLoading(true);

    if (!selectedWallet) {
      setFormError('Aucun portefeuille sélectionné.');
      setFormLoading(false);
      return;
    }

    const amountNum = parseFloat(txAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setFormError('Veuillez entrer un montant valide supérieur à 0.');
      setFormLoading(false);
      return;
    }

    if (!txDescription.trim()) {
      setFormError('La description est obligatoire.');
      setFormLoading(false);
      return;
    }

    const matchedCategory = categories.find(c => c.id === txCategoryId);
    if (!matchedCategory) {
      setFormError('Veuillez sélectionner une catégorie valide.');
      setFormLoading(false);
      return;
    }

    try {
      const targetWalletId = txWalletId || selectedWallet.id;
      const newTx = await api.createTransaction(currentUser.id, targetWalletId, {
        amount: amountNum,
        type: txType,
        status: txStatus,
        description: txDescription,
        category: matchedCategory,
        reference: txReference || undefined,
        source: txSource || undefined,
        transaction_datetime: new Date().toISOString(),
      });

      // Clear form
      setTxAmount('');
      setTxDescription('');
      setTxReference('');
      setTxSource('');
      setShowAddModal(false);

      // Reload list and set as selected to see its AI analysis immediately!
      const targetWalletObj = wallets.find(w => w.id === targetWalletId);
      if (targetWalletObj && selectedWallet?.id !== targetWalletId) {
        setSelectedWallet(targetWalletObj);
      } else {
        loadTransactions();
      }
      setSelectedTx(newTx);
    } catch (err: any) {
      setFormError(err.message || 'Impossible d\'ajouter la transaction.');
    } finally {
      setFormLoading(false);
    }
  };

  const getStatusIcon = (status: TransactionStatus) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle2 className="h-4 w-4 text-cyan-400" />;
      case 'PENDING':
        return <Clock className="h-4 w-4 text-amber-500 animate-pulse" />;
      case 'FAILED':
        return <XCircle className="h-4 w-4 text-red-400" />;
      case 'CANCELLED':
        return <Info className="h-4 w-4 text-slate-500" />;
    }
  };

  const getStatusStyle = (status: TransactionStatus) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20';
      case 'PENDING':
        return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      case 'FAILED':
        return 'bg-red-500/10 text-red-400 border border-red-500/20';
      case 'CANCELLED':
        return 'bg-slate-800 text-slate-400 border border-slate-700';
    }
  };

  const getSentimentEmoji = (sentiment: string) => {
    switch (sentiment) {
      case 'HAPPY':
        return '😊';
      case 'CONCERNED':
        return '😟';
      case 'NEUTRAL':
      default:
        return '😐';
    }
  };

  return (
    <div className="space-y-6 font-sans">
      
      {/* Title Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Registre des transactions</h1>
          <p className="text-sm text-slate-400">Visualisez, filtrez vos dépenses et analysez-les intelligemment.</p>
        </div>
        <button
          onClick={() => {
            setTxWalletId(selectedWallet?.id || wallets[0]?.id || '');
            setShowAddModal(true);
          }}
          className="bg-cyan-500 hover:bg-cyan-600 text-[#020617] font-bold py-2.5 px-4 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-lg shadow-cyan-500/25 transition-all border border-cyan-500/30 self-start md:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Nouvelle transaction</span>
        </button>
      </div>

      {/* Selector & Filter Box */}
      <div className="bg-[#0b1329] p-5 rounded-3xl border border-slate-800/80 shadow-sm space-y-4">
        
        {/* Wallet Selector Row */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-800/60 pb-4">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mr-2">Compte ciblé :</span>
          {wallets.map((w) => (
            <button
              key={w.id}
              onClick={() => setSelectedWallet(w)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all border ${
                selectedWallet?.id === w.id
                  ? 'bg-cyan-500 text-[#020617] border-cyan-400 shadow-sm font-bold'
                  : 'bg-[#131c35] text-slate-300 hover:bg-[#1c294a] border-slate-800'
              }`}
            >
              {w.name}
            </button>
          ))}
        </div>

        {/* Filters Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Type</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as TransactionType | '')}
              className="px-2.5 py-1.5 w-full border border-slate-800 rounded-xl text-xs bg-[#131c35]/50 text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            >
              <option value="" className="bg-[#0b1329] text-white">Tous les types</option>
              <option value="EXPENSE" className="bg-[#0b1329] text-white">Dépenses</option>
              <option value="INCOME" className="bg-[#0b1329] text-white">Revenus</option>
              <option value="TRANSFER" className="bg-[#0b1329] text-white">Transferts</option>
              <option value="SUBSCRIPTION" className="bg-[#0b1329] text-white">Abonnements</option>
              <option value="REFUND" className="bg-[#0b1329] text-white">Remboursements</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Statut</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as TransactionStatus | '')}
              className="px-2.5 py-1.5 w-full border border-slate-800 rounded-xl text-xs bg-[#131c35]/50 text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            >
              <option value="" className="bg-[#0b1329] text-white">Tous les statuts</option>
              <option value="COMPLETED" className="bg-[#0b1329] text-white">Complété</option>
              <option value="PENDING" className="bg-[#0b1329] text-white">En attente</option>
              <option value="FAILED" className="bg-[#0b1329] text-white">Échoué</option>
              <option value="CANCELLED" className="bg-[#0b1329] text-white">Annulé</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Depuis le</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="px-2.5 py-1.5 w-full border border-slate-800 rounded-xl text-xs bg-[#131c35]/50 text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Jusqu'au</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="px-2.5 py-1.5 w-full border border-slate-800 rounded-xl text-xs bg-[#131c35]/50 text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
          </div>
        </div>

      </div>

      {/* Main Grid: Transactions list & Detail Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Ledger */}
        <div className="bg-[#0b1329] p-6 rounded-3xl border border-slate-800/80 shadow-sm lg:col-span-2 space-y-4">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest pl-1">Mouvements bancaires</h3>
          
          {loading ? (
            <div className="py-12 text-center">
              <span className="h-8 w-8 border-3 border-cyan-500 border-t-transparent rounded-full animate-spin inline-block shadow-lg shadow-cyan-500/25" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <div className="h-12 w-12 bg-[#131c35] text-slate-500 border border-slate-800 rounded-full flex items-center justify-center mx-auto">
                <Filter className="h-6 w-6" />
              </div>
              <h4 className="font-semibold text-xs text-slate-400">Aucune transaction trouvée</h4>
              <p className="text-[11px] text-slate-500 max-w-xs mx-auto">Essayez d'ajuster vos filtres de recherche ou sélectionnez un autre portefeuille.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800/60">
              {transactions.map((tx) => {
                const isExpense = tx.type === 'EXPENSE' || tx.type === 'SUBSCRIPTION';
                const isSelected = selectedTx?.id === tx.id;
                
                return (
                  <div
                    key={tx.id}
                    onClick={() => setSelectedTx(tx)}
                    className={`flex items-center justify-between py-3.5 px-3 rounded-2xl cursor-pointer transition-all border ${
                      isSelected 
                        ? 'bg-[#131f3d] border-cyan-500 shadow-xs' 
                        : 'border-transparent hover:bg-[#131c35]/40'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="h-9 w-9 rounded-xl flex items-center justify-center text-sm font-semibold shrink-0"
                        style={{ backgroundColor: `${tx.category.color}15`, color: tx.category.color }}
                      >
                        {isExpense ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-200 text-sm group-hover:text-white transition-colors">{tx.description}</h4>
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <span className="font-semibold" style={{ color: tx.category.color }}>{tx.category.name}</span>
                          <span>•</span>
                          <span className="font-mono">{new Date(tx.transaction_datetime).toLocaleDateString('fr-FR', {day: 'numeric', month: 'short'})}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right space-y-1">
                      <div className={`font-bold text-sm ${isExpense ? 'text-slate-300' : 'text-cyan-400 font-sans'}`}>
                        {isExpense ? '-' : '+'}{formatCurrency(tx.amount, tx.wallet.currency)}
                      </div>
                      <div className="flex items-center gap-1.5 justify-end">
                        {getStatusIcon(tx.status)}
                        <span className="text-[9px] text-slate-500 font-bold uppercase font-mono">{tx.type}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Side: AI Assistant & Detailed Transaction Analysis */}
        <div className="lg:col-span-1">
          {selectedTx ? (
            <div className="bg-[#0b1329] p-6 rounded-3xl border border-slate-800/80 shadow-sm space-y-6 sticky top-6">
              
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Détails de la transaction</span>
                <button 
                  onClick={() => setSelectedTx(null)}
                  className="text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
                >
                  Fermer
                </button>
              </div>

              {/* Transaction Receipt style */}
              <div className="space-y-4">
                <div className="text-center py-4 bg-[#131c35]/50 rounded-2xl border border-slate-800/60">
                  <div className="text-3xl font-extrabold text-white tracking-tight font-sans">
                    {(selectedTx.type === 'EXPENSE' || selectedTx.type === 'SUBSCRIPTION' ? '-' : '+')}{formatCurrency(selectedTx.amount, selectedTx.wallet.currency)}
                  </div>
                  <p className="text-xs text-slate-300 mt-1">{selectedTx.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-y-3 text-xs leading-relaxed">
                  <div>
                    <span className="text-slate-400 block">Date</span>
                    <span className="font-semibold text-slate-200">
                      {new Date(selectedTx.transaction_datetime).toLocaleString('fr-FR')}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Portefeuille</span>
                    <span className="font-semibold text-slate-200">{selectedTx.wallet.name}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Catégorie</span>
                    <span className="font-semibold" style={{ color: selectedTx.category.color }}>
                      {selectedTx.category.name}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Type</span>
                    <span className="font-semibold text-slate-200 uppercase">{selectedTx.type}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Source / Tiers</span>
                    <span className="font-semibold text-slate-200">{selectedTx.source || 'Harena Core'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">ID Référence</span>
                    <span className="font-mono text-slate-500 text-[10px] truncate block max-w-[120px]">{selectedTx.reference || 'Aucune'}</span>
                  </div>
                </div>
              </div>

              {/* AI Analysis Pane */}
              <div className="bg-cyan-500/5 p-5 rounded-2xl border border-cyan-500/15 space-y-4">
                <div className="flex items-center gap-1.5 text-cyan-400 font-bold text-xs">
                  <Sparkles className="h-4 w-4 animate-pulse text-cyan-400" />
                  <span>Analyse prédictive Smart IA</span>
                </div>

                {analysisLoading ? (
                  <div className="flex flex-col items-center justify-center py-4 space-y-1.5">
                    <span className="h-5 w-5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-[10px] text-slate-500">Calcul des scores en cours...</span>
                  </div>
                ) : analysis ? (
                  <div className="space-y-4 text-xs">
                    
                    {/* Anomaly Score Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between font-semibold text-slate-300">
                        <span className="text-slate-400 flex items-center gap-1">
                          Score d'anomalie
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                        </span>
                        <span className={`font-bold ${analysis.anomaly_score > 0.6 ? 'text-red-400' : analysis.anomaly_score > 0.3 ? 'text-amber-500' : 'text-cyan-400'}`}>
                          {Math.round(analysis.anomaly_score * 100)}%
                        </span>
                      </div>
                      <div className="w-full bg-[#131c35] rounded-full h-1.5 overflow-hidden">
                        <div 
                          className={`h-full ${analysis.anomaly_score > 0.6 ? 'bg-red-500' : analysis.anomaly_score > 0.3 ? 'bg-amber-500' : 'bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.3)]'}`}
                          style={{ width: `${analysis.anomaly_score * 100}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 leading-normal font-sans">
                        {analysis.anomaly_score > 0.6 
                          ? 'Dépense hautement inhabituelle ! Nous vous recommandons de vérifier si vous êtes à l\'origine de cette transaction.' 
                          : 'Cette dépense correspond parfaitement à vos habitudes de consommation historiques.'}
                      </p>
                    </div>

                    {/* Financial Health Score Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between font-semibold text-slate-300">
                        <span className="text-slate-400 flex items-center gap-1">
                          Santé financière
                          <ShieldCheck className="h-3.5 w-3.5 text-cyan-400" />
                        </span>
                        <span className="font-bold text-cyan-400">
                          {Math.round(analysis.financial_health_score * 100)}%
                        </span>
                      </div>
                      <div className="w-full bg-[#131c35] rounded-full h-1.5 overflow-hidden">
                        <div 
                          className="h-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.3)]"
                          style={{ width: `${analysis.financial_health_score * 100}%` }}
                        />
                      </div>
                    </div>

                    {/* Meta info tags */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800 text-[10px]">
                      <div className="bg-[#131c35] p-2.5 rounded-xl border border-slate-800/60 text-center">
                        <span className="text-slate-400 block uppercase tracking-wider mb-0.5 font-semibold">Sentiment</span>
                        <span className="font-bold text-slate-200 flex items-center justify-center gap-1">
                          <span>{getSentimentEmoji(analysis.sentiment)}</span>
                          <span>{analysis.sentiment}</span>
                        </span>
                      </div>
                      <div className="bg-[#131c35] p-2.5 rounded-xl border border-slate-800/60 text-center">
                        <span className="text-slate-400 block uppercase tracking-wider mb-0.5 font-semibold">Suggéré IA</span>
                        <span className="font-bold text-cyan-400 truncate block">{analysis.predicted_category}</span>
                      </div>
                    </div>

                  </div>
                ) : (
                  <div className="text-center py-4 space-y-1 bg-[#131c35]/50 rounded-xl border border-dashed border-slate-800">
                    <HelpCircle className="h-5 w-5 text-cyan-500/40 mx-auto" />
                    <p className="text-[10px] text-slate-400">Pas d'analyse disponible pour les anciennes transactions.</p>
                  </div>
                )}
              </div>

            </div>
          ) : (
            <div className="bg-[#0b1329] p-6 rounded-3xl border border-slate-800/80 shadow-sm text-center py-12 space-y-4">
              <Info className="h-10 w-10 text-slate-500 mx-auto" />
              <div className="space-y-1">
                <h3 className="font-bold text-slate-200 text-sm">Aucune transaction sélectionnée</h3>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">Sélectionnez une transaction dans la liste pour afficher ses détails et l'analyse intelligente prédictive d'anomalies de Harena.</p>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* New Transaction Creation Modal Dialog */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs font-sans">
          <div className="bg-[#0b1329] rounded-3xl max-w-md w-full p-6 shadow-xl border border-slate-800/80 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-cyan-500 shadow-[0_0_12px_rgba(34,211,238,0.5)]" />
            
            <h3 className="text-lg font-bold text-white tracking-tight mb-1">
              Ajouter un mouvement bancaire
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Enregistrez une nouvelle dépense, un revenu ou un virement sur votre compte.
            </p>

            {formError && (
              <div className="p-3 bg-red-950/40 text-red-400 rounded-xl text-xs mb-4 border border-red-900/30">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateTransaction} className="space-y-4">
              
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Portefeuille (Compte)</label>
                <select
                  className="px-3 py-2 w-full border border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 bg-[#131c35]/50 text-slate-200"
                  value={txWalletId}
                  onChange={(e) => setTxWalletId(e.target.value)}
                >
                  {wallets.map((w) => (
                    <option key={w.id} value={w.id} className="bg-[#0b1329] text-white">
                      {w.name} ({w.currency})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Montant</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="Ex: 45.50"
                    className="px-3 py-2 w-full border border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 bg-[#131c35]/50 text-white placeholder-slate-500"
                    value={txAmount}
                    onChange={(e) => setTxAmount(e.target.value)}
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Type d'opération</label>
                  <select
                    className="px-3 py-2 w-full border border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 bg-[#131c35]/50 text-slate-200"
                    value={txType}
                    onChange={(e) => setTxType(e.target.value as TransactionType)}
                  >
                    <option value="EXPENSE" className="bg-[#0b1329] text-white">Dépense (Débit)</option>
                    <option value="INCOME" className="bg-[#0b1329] text-white">Revenu (Crédit)</option>
                    <option value="TRANSFER" className="bg-[#0b1329] text-white">Transfert d'épargne</option>
                    <option value="SUBSCRIPTION" className="bg-[#0b1329] text-white">Abonnement récurrent</option>
                    <option value="REFUND" className="bg-[#0b1329] text-white">Remboursement</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Description</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Courses Carrefour, Abonnement Netflix, Salaire..."
                  className="px-3 py-2 w-full border border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 bg-[#131c35]/50 text-white placeholder-slate-500"
                  value={txDescription}
                  onChange={(e) => setTxDescription(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Catégorie</label>
                  <select
                    className="px-3 py-2 w-full border border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 bg-[#131c35]/50 text-slate-200"
                    value={txCategoryId}
                    onChange={(e) => setTxCategoryId(e.target.value)}
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id} className="bg-[#0b1329] text-white">{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Statut initial</label>
                  <select
                    className="px-3 py-2 w-full border border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 bg-[#131c35]/50 text-slate-200"
                    value={txStatus}
                    onChange={(e) => setTxStatus(e.target.value as TransactionStatus)}
                  >
                    <option value="COMPLETED" className="bg-[#0b1329] text-white">Complété (Réglé)</option>
                    <option value="PENDING" className="bg-[#0b1329] text-white">En attente (Débit futur)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Bénéficiaire / Tiers (Optionnel)</label>
                  <input
                    type="text"
                    placeholder="Ex: Auchan, Netflix, etc."
                    className="px-3 py-2 w-full border border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 bg-[#131c35]/50 text-white placeholder-slate-500"
                    value={txSource}
                    onChange={(e) => setTxSource(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1 font-mono">Référence (Optionnel)</label>
                  <input
                    type="text"
                    placeholder="Ex: REF-4924"
                    className="px-3 py-2 w-full border border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 bg-[#131c35]/50 text-white placeholder-slate-500"
                    value={txReference}
                    onChange={(e) => setTxReference(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 border border-slate-800 hover:bg-[#131c35] text-slate-300 font-semibold py-2 px-4 rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex-1 bg-cyan-500 hover:bg-cyan-600 text-[#020617] font-extrabold py-2 px-4 rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-1 shadow-md disabled:opacity-50"
                >
                  {formLoading ? (
                    <span className="inline-block h-3.5 w-3.5 border-2 border-[#020617] border-t-transparent rounded-full animate-spin" />
                  ) : (
                    'Ajouter'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
