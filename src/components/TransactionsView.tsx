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
  HelpCircle, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  CornerDownRight, ArrowUpRight, ArrowDownLeft,
  Pencil, Check, RotateCcw
} from 'lucide-react';
import * as Icons from 'lucide-react';

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

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [totalCount, setTotalCount] = useState<number>(0);

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

  // Edit Transaction State
  const [editingTx, setEditingTx] = useState<WalletTransaction | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editAmount, setEditAmount] = useState('');
  const [editType, setEditType] = useState<TransactionType>('EXPENSE');
  const [editStatus, setEditStatus] = useState<TransactionStatus>('COMPLETED');
  const [editDescription, setEditDescription] = useState('');
  const [editCategoryId, setEditCategoryId] = useState('');
  const [editReference, setEditReference] = useState('');
  const [editSource, setEditSource] = useState('');
  const [editWalletId, setEditWalletId] = useState('');
  const [editFormError, setEditFormError] = useState<string | null>(null);
  const [editFormLoading, setEditFormLoading] = useState(false);
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);

  const handleOpenEditModal = (tx: WalletTransaction) => {
    setEditingTx(tx);
    setEditAmount(tx.amount.toString());
    setEditType(tx.type);
    setEditStatus(tx.status);
    setEditDescription(tx.description);
    setEditCategoryId(tx.category?.id || (categories[0]?.id || ''));
    setEditReference(tx.reference || '');
    setEditSource(tx.source || '');
    setEditWalletId(tx.wallet.id);
    setEditFormError(null);
    setShowEditModal(true);
  };

  const handleQuickStatusChange = async (tx: WalletTransaction, newStatus: TransactionStatus, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      setStatusUpdatingId(tx.id);
      const updatedTx = await api.updateTransaction(currentUser.id, tx.wallet.id, {
        id: tx.id,
        wallet: tx.wallet,
        category: tx.category,
        amount: tx.amount,
        type: tx.type,
        status: newStatus,
        description: tx.description,
        reference: tx.reference,
        source: tx.source,
      });

      // Update in transactions list
      setTransactions(prev => prev.map(item => item.id === tx.id ? updatedTx : item));

      // Update selectedTx if it's the currently selected one
      if (selectedTx?.id === tx.id) {
        setSelectedTx(updatedTx);
      }
    } catch (err) {
      console.error('Error updating transaction status', err);
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const handleSaveEditTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTx) return;

    setEditFormError(null);
    setEditFormLoading(true);

    const amountNum = parseFloat(editAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setEditFormError('Veuillez entrer un montant valide supérieur à 0.');
      setEditFormLoading(false);
      return;
    }

    if (!editDescription.trim()) {
      setEditFormError('La description est obligatoire.');
      setEditFormLoading(false);
      return;
    }

    const matchedCategory = categories.find(c => c.id === editCategoryId) || null;
    const targetWalletObj = wallets.find(w => w.id === editWalletId) || editingTx.wallet;

    try {
      const updatedTx = await api.updateTransaction(currentUser.id, targetWalletObj.id, {
        id: editingTx.id,
        wallet: targetWalletObj,
        amount: amountNum,
        type: editType,
        status: editStatus,
        description: editDescription.trim(),
        category: matchedCategory,
        reference: editReference.trim() || undefined,
        source: editSource.trim() || undefined,
      });

      // Update local state list
      setTransactions(prev => prev.map(t => t.id === editingTx.id ? updatedTx : t));
      
      // Update selectedTx if editing the current selected transaction
      if (selectedTx?.id === editingTx.id) {
        setSelectedTx(updatedTx);
      }

      setShowEditModal(false);
      setEditingTx(null);
    } catch (err: any) {
      setEditFormError(err.message || 'Impossible de modifier la transaction.');
    } finally {
      setEditFormLoading(false);
    }
  };

  // Category Modal & Form States
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('Tag');
  const [newCatColor, setNewCatColor] = useState('#3B82F6');
  const [catFormLoading, setCatFormLoading] = useState(false);
  const [catFormError, setCatFormError] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] = useState<TransactionCategory | null>(null);

  // Helper component to render any dynamic Lucide icon safely
  const CategoryIcon = ({ iconName, className = "h-4 w-4" }: { iconName: string; className?: string }) => {
    const IconComponent = (Icons as any)[iconName] || Icons.HelpCircle;
    return <IconComponent className={className} />;
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) {
      setCatFormError('Le nom de la catégorie est obligatoire.');
      return;
    }
    try {
      setCatFormLoading(true);
      setCatFormError(null);
      await api.createCategory(currentUser.id, [{
        id: editingCategory ? editingCategory.id : (null as any),
        user_id: currentUser.id,
        name: newCatName.trim(),
        icon: newCatIcon,
        color: newCatColor,
        is_system: editingCategory ? editingCategory.is_system : false,
        creation_datetime: editingCategory ? editingCategory.creation_datetime : new Date().toISOString(),
      }]);
      // Reload categories list
      const categoriesData = await api.getCategories(currentUser.id);
      setCategories(categoriesData);
      
      // Reset form states
      setNewCatName('');
      setEditingCategory(null);
      setNewCatIcon('Tag');
      setNewCatColor('#3B82F6');
    } catch (err: any) {
      setCatFormError(err.message || 'Impossible de sauvegarder la catégorie.');
    } finally {
      setCatFormLoading(false);
    }
  };

  const startEditCategory = (cat: TransactionCategory) => {
    setEditingCategory(cat);
    setNewCatName(cat.name);
    setNewCatIcon(cat.icon);
    setNewCatColor(cat.color);
    setCatFormError(null);
  };

  const cancelEditCategory = () => {
    setEditingCategory(null);
    setNewCatName('');
    setNewCatIcon('Tag');
    setNewCatColor('#3B82F6');
    setCatFormError(null);
  };

  const handleDeleteCategory = async (catId: string) => {
    try {
      setCatFormLoading(true);
      setCatFormError(null);
      await api.deleteCategory(currentUser.id, catId);
      const categoriesData = await api.getCategories(currentUser.id);
      setCategories(categoriesData);
      // Adjust selected category id in transaction form if deleted category was currently selected
      if (txCategoryId === catId && categoriesData.length > 0) {
        setTxCategoryId(categoriesData[0].id);
      }
    } catch (err: any) {
      setCatFormError(err.message || 'Impossible de supprimer cette catégorie.');
    } finally {
      setCatFormLoading(false);
    }
  };

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

  // Load transactions based on selected wallet & filters with pagination
  const loadTransactions = async () => {
    if (!selectedWallet) return;
    try {
      setLoading(true);
      const baseFilters: any = {};
      if (filterType) baseFilters.type = filterType;
      if (filterStatus) baseFilters.status = filterStatus;
      if (fromDate) baseFilters.from = new Date(`${fromDate}T00:00:00.000Z`).toISOString();
      if (toDate) baseFilters.to = new Date(`${toDate}T23:59:59.999Z`).toISOString();

      const [count, txs] = await Promise.all([
        api.getTransactionCount(currentUser.id, selectedWallet.id, baseFilters),
        api.getTransactions(currentUser.id, selectedWallet.id, {
          ...baseFilters,
          page: currentPage,
          page_size: pageSize
        })
      ]);

      setTotalCount(count);
      setTransactions(txs);
    } catch (err) {
      console.error('Error fetching transactions', err);
    } finally {
      setLoading(false);
    }
  };

  // Reset page to 1 when wallet or filters or pageSize change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedWallet?.id, filterType, filterStatus, fromDate, toDate, pageSize]);

  // Reload transactions when wallet, filters, page or user change
  useEffect(() => {
    loadTransactions();
  }, [selectedWallet?.id, filterType, filterStatus, fromDate, toDate, currentPage, pageSize, currentUser.id]);

  const handleResetFilters = () => {
    setFilterType('');
    setFilterStatus('');
    setFromDate('');
    setToDate('');
    setCurrentPage(1);
  };

  const hasActiveFilters = Boolean(filterType || filterStatus || fromDate || toDate);

  // Safety hook to auto-select the first category if txCategoryId is empty/invalid
  useEffect(() => {
    if (categories.length > 0 && txCategoryId !== '') {
      const isValid = categories.some(c => c.id === txCategoryId);
      if (!isValid) {
        setTxCategoryId(categories[0].id);
      }
    }
  }, [categories, txCategoryId]);

  // Load AI analysis when a transaction is selected
  useEffect(() => {
    async function loadAnalysis() {
      if (!selectedTx) {
        setAnalysis(null);
        return;
      }
      try {
        setAnalysisLoading(true);
        const res = await api.getTransactionAnalysis(currentUser.id, selectedTx.id);
        if (res) {
          if (Array.isArray(res)) {
            setAnalysis(res[0] || null);
          } else {
            setAnalysis(res);
          }
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
  }, [selectedTx, currentUser.id]);

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

    const matchedCategory = categories.find(c => c.id === txCategoryId) || null;

    try {
      const targetWalletId = txWalletId || selectedWallet.id;
      const targetWalletObj = wallets.find(w => w.id === targetWalletId) || selectedWallet;
      const newTx = await api.createTransaction(currentUser.id, targetWalletId, {
        amount: amountNum,
        type: txType,
        status: txStatus,
        description: txDescription,
        category: matchedCategory,
        wallet: targetWalletObj,
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
        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          <button
            onClick={() => {
              setCatFormError(null);
              setNewCatName('');
              setEditingCategory(null);
              setNewCatIcon('Tag');
              setNewCatColor('#3B82F6');
              setShowCategoryModal(true);
            }}
            className="border border-slate-800 hover:bg-[#131c35] text-slate-300 font-semibold py-2.5 px-4 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition-all hover:text-white"
          >
            <Icons.Tag className="h-4 w-4 text-slate-400" />
            <span>Gérer les catégories</span>
          </button>
          <button
            onClick={() => {
              setTxWalletId(selectedWallet?.id || wallets[0]?.id || '');
              setTxCategoryId('');
              setShowAddModal(true);
            }}
            className="bg-cyan-500 hover:bg-cyan-600 text-[#020617] font-bold py-2.5 px-4 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-lg shadow-cyan-500/25 transition-all border border-cyan-500/30"
          >
            <Plus className="h-4 w-4" />
            <span>Nouvelle transaction</span>
          </button>
        </div>
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
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Depuis le (From)</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="px-2.5 py-1.5 w-full border border-slate-800 rounded-xl text-xs bg-[#131c35]/50 text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Jusqu'au (To)</label>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer transition-colors"
                  title="Réinitialiser les filtres"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Effacer</span>
                </button>
              )}
            </div>
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/60 pb-3">
            <div className="flex items-center gap-2.5">
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-widest pl-1">Mouvements bancaires</h3>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                {totalCount} transaction{totalCount > 1 ? 's' : ''}
              </span>
            </div>

            {/* Page Size Selector */}
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <label htmlFor="tx-page-size" className="text-[11px] text-slate-400 whitespace-nowrap">Afficher :</label>
              <select
                id="tx-page-size"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2.5 py-1 bg-[#131c35] border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500 cursor-pointer"
              >
                <option value={5} className="bg-[#0b1329] text-white">5 par page</option>
                <option value={10} className="bg-[#0b1329] text-white">10 par page</option>
                <option value={20} className="bg-[#0b1329] text-white">20 par page</option>
                <option value={50} className="bg-[#0b1329] text-white">50 par page</option>
              </select>
            </div>
          </div>
          
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
              {hasActiveFilters && (
                <button
                  onClick={handleResetFilters}
                  className="px-3 py-1.5 text-xs bg-cyan-500/15 text-cyan-300 hover:bg-cyan-500/25 border border-cyan-500/30 rounded-xl font-medium cursor-pointer transition-all inline-flex items-center gap-1.5"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Réinitialiser les filtres</span>
                </button>
              )}
            </div>
          ) : (
            <>
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
                          style={{ 
                            backgroundColor: tx.category ? `${tx.category.color}15` : '#94a3b815', 
                            color: tx.category ? tx.category.color : '#94a3b8' 
                          }}
                        >
                          <CategoryIcon iconName={tx.category ? tx.category.icon : 'Tag'} className="h-4 w-4" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-slate-200 text-sm group-hover:text-white transition-colors">{tx.description}</h4>
                          <div className="flex items-center gap-2 text-xs text-slate-400">
                            <span className="font-semibold" style={{ color: tx.category ? tx.category.color : '#94a3b8' }}>
                              {tx.category ? tx.category.name : 'Sans catégorie'}
                            </span>
                            <span>•</span>
                            <span className="font-mono">{new Date(tx.transaction_datetime).toLocaleDateString('fr-FR', {day: 'numeric', month: 'short'})}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right space-y-1 shrink-0">
                        <div className={`font-bold text-sm ${isExpense ? 'text-slate-300' : 'text-cyan-400 font-sans'}`}>
                          {isExpense ? '-' : '+'}{formatCurrency(tx.amount, tx.wallet.currency)}
                        </div>
                        <div className="flex items-center gap-1.5 justify-end">
                          {tx.status === 'PENDING' ? (
                            <button
                              onClick={(e) => handleQuickStatusChange(tx, 'COMPLETED', e)}
                              title="Cliquer pour passer en Complété"
                              className="px-2 py-0.5 bg-amber-500/20 text-amber-300 hover:bg-cyan-500/20 hover:text-cyan-300 border border-amber-500/30 hover:border-cyan-500/40 rounded-md text-[9px] font-bold uppercase font-mono flex items-center gap-1 transition-all cursor-pointer group/btn shadow-xs"
                            >
                              <Clock className="h-3 w-3 text-amber-400 group-hover/btn:hidden animate-pulse" />
                              <CheckCircle2 className="h-3 w-3 text-cyan-400 hidden group-hover/btn:block" />
                              <span>En attente → Compléter</span>
                            </button>
                          ) : (
                            <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase font-mono flex items-center gap-1 ${getStatusStyle(tx.status)}`}>
                              {getStatusIcon(tx.status)}
                              <span>{tx.status}</span>
                            </span>
                          )}

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTx(tx);
                              handleOpenEditModal(tx);
                            }}
                            title="Éditer la transaction"
                            className="p-1 text-slate-400 hover:text-cyan-400 hover:bg-slate-800/80 rounded-lg transition-all cursor-pointer"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination Bar */}
              {totalCount > 0 && (() => {
                const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
                const startItem = (currentPage - 1) * pageSize + 1;
                const endItem = Math.min(totalCount, currentPage * pageSize);

                const getPages = () => {
                  const pages: (number | string)[] = [];
                  if (totalPages <= 7) {
                    for (let i = 1; i <= totalPages; i++) pages.push(i);
                  } else {
                    if (currentPage <= 4) {
                      pages.push(1, 2, 3, 4, 5, '...', totalPages);
                    } else if (currentPage >= totalPages - 3) {
                      pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
                    } else {
                      pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
                    }
                  }
                  return pages;
                };

                const pages = getPages();

                return (
                  <div className="pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                    <div className="text-slate-400 text-xs">
                      Affichage de <span className="font-semibold text-slate-200">{startItem}</span> à <span className="font-semibold text-slate-200">{endItem}</span> sur <span className="font-semibold text-cyan-400">{totalCount}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* First Page */}
                      <button
                        id="btn-page-first"
                        onClick={() => setCurrentPage(1)}
                        disabled={currentPage === 1 || loading}
                        title="Première page"
                        className="p-1.5 rounded-lg border border-slate-800 bg-[#131c35] text-slate-400 hover:text-white hover:bg-[#1c294a] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all"
                      >
                        <ChevronsLeft className="h-4 w-4" />
                      </button>

                      {/* Prev Page */}
                      <button
                        id="btn-page-prev"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1 || loading}
                        title="Page précédente"
                        className="p-1.5 rounded-lg border border-slate-800 bg-[#131c35] text-slate-400 hover:text-white hover:bg-[#1c294a] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>

                      {/* Page Numbers */}
                      <div className="flex items-center gap-1 mx-1">
                        {pages.map((p, idx) => {
                          if (p === '...') {
                            return (
                              <span key={`ellipsis-${idx}`} className="px-1.5 text-slate-500 font-mono text-xs">
                                ...
                              </span>
                            );
                          }
                          const pageNum = Number(p);
                          const isActive = pageNum === currentPage;
                          return (
                            <button
                              key={`page-${pageNum}`}
                              id={`btn-page-${pageNum}`}
                              onClick={() => setCurrentPage(pageNum)}
                              disabled={loading}
                              className={`min-w-[28px] h-7 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                                isActive
                                  ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-bold shadow-xs shadow-cyan-500/30'
                                  : 'border-slate-800 bg-[#131c35] text-slate-300 hover:bg-[#1c294a] hover:text-white'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                      </div>

                      {/* Next Page */}
                      <button
                        id="btn-page-next"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage >= totalPages || loading}
                        title="Page suivante"
                        className="p-1.5 rounded-lg border border-slate-800 bg-[#131c35] text-slate-400 hover:text-white hover:bg-[#1c294a] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>

                      {/* Last Page */}
                      <button
                        id="btn-page-last"
                        onClick={() => setCurrentPage(totalPages)}
                        disabled={currentPage >= totalPages || loading}
                        title="Dernière page"
                        className="p-1.5 rounded-lg border border-slate-800 bg-[#131c35] text-slate-400 hover:text-white hover:bg-[#1c294a] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all"
                      >
                        <ChevronsRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })()}
            </>
          )}
        </div>

        {/* Right Side: AI Assistant & Detailed Transaction Analysis */}
        <div className="lg:col-span-1">
          {selectedTx ? (
            <div className="bg-[#0b1329] p-6 rounded-3xl border border-slate-800/80 shadow-sm space-y-6 sticky top-6">
              
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Détails de la transaction</span>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleOpenEditModal(selectedTx)}
                    className="px-2.5 py-1 bg-cyan-500/15 text-cyan-400 hover:bg-cyan-500/25 border border-cyan-500/30 rounded-xl text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all shadow-xs"
                  >
                    <Pencil className="h-3 w-3" />
                    <span>Éditer</span>
                  </button>
                  <button 
                    onClick={() => setSelectedTx(null)}
                    className="text-xs font-semibold text-slate-400 hover:text-white cursor-pointer px-1 py-1"
                  >
                    Fermer
                  </button>
                </div>
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
                    <span className="font-semibold flex items-center gap-1.5" style={{ color: selectedTx.category ? selectedTx.category.color : '#94a3b8' }}>
                      <CategoryIcon iconName={selectedTx.category ? selectedTx.category.icon : 'Tag'} className="h-3.5 w-3.5" />
                      <span>{selectedTx.category ? selectedTx.category.name : 'Sans catégorie'}</span>
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

                {/* Quick Status Action Switcher */}
                <div className="bg-[#131c35]/40 p-3.5 rounded-2xl border border-slate-800/80 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <span>Statut :</span>
                      <span className={`px-2 py-0.5 text-[10px] rounded-md font-mono ${getStatusStyle(selectedTx.status)}`}>
                        {selectedTx.status}
                      </span>
                    </span>
                    {statusUpdatingId === selectedTx.id && (
                      <span className="h-3.5 w-3.5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-1.5 pt-1">
                    <button
                      onClick={() => handleQuickStatusChange(selectedTx, 'COMPLETED')}
                      disabled={selectedTx.status === 'COMPLETED' || statusUpdatingId === selectedTx.id}
                      className={`py-1.5 px-2 rounded-xl text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        selectedTx.status === 'COMPLETED'
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 opacity-90'
                          : 'bg-[#0b1329] text-slate-300 hover:text-white hover:bg-cyan-950/40 border border-slate-800'
                      }`}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 text-cyan-400" />
                      <span>Complété</span>
                    </button>

                    <button
                      onClick={() => handleQuickStatusChange(selectedTx, 'PENDING')}
                      disabled={selectedTx.status === 'PENDING' || statusUpdatingId === selectedTx.id}
                      className={`py-1.5 px-2 rounded-xl text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        selectedTx.status === 'PENDING'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 opacity-90'
                          : 'bg-[#0b1329] text-slate-300 hover:text-white hover:bg-amber-950/40 border border-slate-800'
                      }`}
                    >
                      <Clock className="h-3.5 w-3.5 text-amber-400" />
                      <span>En attente</span>
                    </button>

                    <button
                      onClick={() => handleQuickStatusChange(selectedTx, 'CANCELLED')}
                      disabled={selectedTx.status === 'CANCELLED' || statusUpdatingId === selectedTx.id}
                      className={`py-1.5 px-2 rounded-xl text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        selectedTx.status === 'CANCELLED'
                          ? 'bg-slate-700/40 text-slate-200 border border-slate-600 opacity-90'
                          : 'bg-[#0b1329] text-slate-300 hover:text-white hover:bg-slate-800/60 border border-slate-800'
                      }`}
                    >
                      <Info className="h-3.5 w-3.5 text-slate-400" />
                      <span>Annulé</span>
                    </button>

                    <button
                      onClick={() => handleQuickStatusChange(selectedTx, 'FAILED')}
                      disabled={selectedTx.status === 'FAILED' || statusUpdatingId === selectedTx.id}
                      className={`py-1.5 px-2 rounded-xl text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        selectedTx.status === 'FAILED'
                          ? 'bg-red-500/20 text-red-300 border border-red-500/40 opacity-90'
                          : 'bg-[#0b1329] text-slate-300 hover:text-white hover:bg-red-950/40 border border-slate-800'
                      }`}
                    >
                      <XCircle className="h-3.5 w-3.5 text-red-400" />
                      <span>Échoué</span>
                    </button>
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
                    <option value="" className="bg-[#0b1329] text-slate-400">Aucune catégorie (Optionnel)</option>
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

      {/* Category Management Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs font-sans">
          <div className="bg-[#0b1329] border border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icons.Tag className="h-5 w-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white">Gérer les catégories</h3>
              </div>
              <button
                onClick={() => setShowCategoryModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800/50 transition-colors"
              >
                <Icons.X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-6 md:space-y-0 md:grid md:grid-cols-2 md:gap-6 max-h-[70vh]">
              
              {/* Left Side: Current Categories list */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Catégories existantes</h4>
                
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {categories.map((c) => (
                    <div 
                      key={c.id} 
                      className="flex items-center justify-between p-2.5 rounded-xl bg-[#131c35]/30 border border-slate-800/60 animate-fade-in"
                    >
                      <div className="flex items-center gap-2.5">
                        <div 
                          className="h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold"
                          style={{ backgroundColor: `${c.color}20`, color: c.color }}
                        >
                          <CategoryIcon iconName={c.icon} className="h-4 w-4" />
                        </div>
                        <span className="text-sm font-semibold text-slate-200">{c.name}</span>
                      </div>

                      {c.is_system ? (
                        <span className="text-[9px] bg-slate-800 text-slate-400 font-bold px-2 py-0.5 rounded-md uppercase">
                          Système
                        </span>
                      ) : (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => startEditCategory(c)}
                            disabled={catFormLoading}
                            className="text-slate-500 hover:text-cyan-400 p-1.5 rounded-lg hover:bg-cyan-500/10 transition-colors cursor-pointer"
                            title="Modifier la catégorie"
                            type="button"
                          >
                            <Icons.Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(c.id)}
                            disabled={catFormLoading}
                            className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer"
                            title="Supprimer la catégorie"
                            type="button"
                          >
                            <Icons.Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Side: Create or edit category */}
              <div className="space-y-3 border-t md:border-t-0 md:border-l border-slate-800 pt-6 md:pt-0 md:pl-6">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-sans">
                  {editingCategory ? 'Modifier la catégorie' : 'Nouvelle catégorie'}
                </h4>
                
                <form onSubmit={handleCreateCategory} className="space-y-4">
                  {catFormError && (
                    <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-400 flex items-center gap-1.5">
                      <Icons.AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                      <span>{catFormError}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Nom</label>
                    <input
                      type="text"
                      placeholder="Ex: Loisirs, Café, Cadeaux..."
                      className="px-3 py-2 w-full border border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 bg-[#131c35]/50 text-white placeholder-slate-500"
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Couleur</label>
                    <div className="grid grid-cols-5 gap-1.5">
                      {[
                        '#10B981', '#06B6D4', '#3B82F6', '#6366F1', '#8B5CF6', 
                        '#EC4899', '#F43F5E', '#F97316', '#F59E0B', '#64748B'
                      ].map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setNewCatColor(color)}
                          className="h-7 rounded-lg relative cursor-pointer border border-transparent hover:scale-105 transition-transform"
                          style={{ backgroundColor: color }}
                        >
                          {newCatColor === color && (
                            <span className="absolute inset-0 flex items-center justify-center text-white">
                              <Icons.Check className="h-4 w-4 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]" />
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Icône</label>
                    <div className="grid grid-cols-7 gap-1.5 max-h-24 overflow-y-auto p-1 border border-slate-800 bg-[#131c35]/30 rounded-xl">
                      {[
                        'Tag', 'ShoppingBag', 'Coffee', 'Car', 'Utensils', 'Gift', 'Heart', 
                        'Sparkles', 'Trophy', 'Plane', 'Laptop', 'Briefcase', 'Home', 'DollarSign',
                        'Flame', 'BookOpen', 'User', 'Wallet', 'Compass', 'Tv', 'Gamepad'
                      ].map((iconName) => (
                        <button
                          key={iconName}
                          type="button"
                          onClick={() => setNewCatIcon(iconName)}
                          className={`h-7 flex items-center justify-center rounded-lg border text-slate-400 hover:text-white transition-all cursor-pointer ${
                            newCatIcon === iconName 
                              ? 'border-cyan-500 bg-[#131c35] text-cyan-400' 
                              : 'border-transparent bg-transparent hover:bg-slate-800/30'
                          }`}
                        >
                          <CategoryIcon iconName={iconName} className="h-4 w-4" />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {editingCategory && (
                      <button
                        type="button"
                        onClick={cancelEditCategory}
                        className="flex-1 border border-slate-800 hover:bg-[#131c35] text-slate-300 font-semibold py-2.5 px-4 rounded-xl text-xs transition-colors cursor-pointer"
                      >
                        Annuler
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={catFormLoading}
                      className="flex-1 bg-cyan-500 hover:bg-cyan-600 text-[#020617] font-extrabold py-2.5 px-4 rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-1 shadow-md disabled:opacity-50"
                    >
                      {catFormLoading ? (
                        <span className="inline-block h-3.5 w-3.5 border-2 border-[#020617] border-t-transparent rounded-full animate-spin" />
                      ) : (
                        editingCategory ? 'Enregistrer' : 'Créer la catégorie'
                      )}
                    </button>
                  </div>
                </form>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* Edit Transaction Modal */}
      {showEditModal && editingTx && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-[#0b1329] rounded-3xl max-w-lg w-full border border-slate-800 shadow-2xl p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center">
                  <Pencil className="h-4 w-4" />
                </div>
                <h3 className="text-lg font-bold text-white tracking-tight">Modifier la transaction</h3>
              </div>
              <button 
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-white text-xs font-semibold px-2 py-1 cursor-pointer"
              >
                Fermer
              </button>
            </div>

            <form onSubmit={handleSaveEditTransaction} className="space-y-4">
              {editFormError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-400 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{editFormError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Portefeuille</label>
                  <select
                    className="px-3 py-2 w-full border border-slate-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 bg-[#131c35]/50 text-white cursor-pointer"
                    value={editWalletId}
                    onChange={(e) => setEditWalletId(e.target.value)}
                  >
                    {wallets.map(w => (
                      <option key={w.id} value={w.id} className="bg-[#0b1329] text-white">
                        {w.name} ({w.currency})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Montant</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0.00"
                    className="px-3 py-2 w-full border border-slate-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 bg-[#131c35]/50 text-white font-mono"
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Description / Intitulé</label>
                <input
                  type="text"
                  placeholder="Ex: Achat fournitures, Virement..."
                  className="px-3 py-2 w-full border border-slate-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 bg-[#131c35]/50 text-white"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Type d'opération</label>
                  <select
                    className="px-3 py-2 w-full border border-slate-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 bg-[#131c35]/50 text-white cursor-pointer"
                    value={editType}
                    onChange={(e) => setEditType(e.target.value as TransactionType)}
                  >
                    <option value="EXPENSE" className="bg-[#0b1329]">Dépense (EXPENSE)</option>
                    <option value="INCOME" className="bg-[#0b1329]">Revenu (INCOME)</option>
                    <option value="TRANSFER" className="bg-[#0b1329]">Virement (TRANSFER)</option>
                    <option value="SUBSCRIPTION" className="bg-[#0b1329]">Abonnement (SUBSCRIPTION)</option>
                    <option value="REFUND" className="bg-[#0b1329]">Remboursement (REFUND)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Statut</label>
                  <select
                    className="px-3 py-2 w-full border border-slate-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 bg-[#131c35]/50 text-white cursor-pointer font-mono"
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as TransactionStatus)}
                  >
                    <option value="COMPLETED" className="bg-[#0b1329] text-cyan-400">Complété (COMPLETED)</option>
                    <option value="PENDING" className="bg-[#0b1329] text-amber-400">En attente (PENDING)</option>
                    <option value="CANCELLED" className="bg-[#0b1329] text-slate-400">Annulé (CANCELLED)</option>
                    <option value="FAILED" className="bg-[#0b1329] text-red-400">Échoué (FAILED)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Catégorie</label>
                <select
                  className="px-3 py-2 w-full border border-slate-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 bg-[#131c35]/50 text-white cursor-pointer"
                  value={editCategoryId}
                  onChange={(e) => setEditCategoryId(e.target.value)}
                >
                  {categories.map(c => (
                    <option key={c.id} value={c.id} className="bg-[#0b1329]">
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Source / Tiers</label>
                  <input
                    type="text"
                    placeholder="Ex: Orange Money, BNI..."
                    className="px-3 py-2 w-full border border-slate-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 bg-[#131c35]/50 text-white"
                    value={editSource}
                    onChange={(e) => setEditSource(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Référence</label>
                  <input
                    type="text"
                    placeholder="Ex: REF-99201"
                    className="px-3 py-2 w-full border border-slate-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 bg-[#131c35]/50 text-white font-mono"
                    value={editReference}
                    onChange={(e) => setEditReference(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 border border-slate-800 hover:bg-[#131c35] text-slate-300 font-semibold py-2.5 px-4 rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={editFormLoading}
                  className="flex-1 bg-cyan-500 hover:bg-cyan-600 text-[#020617] font-extrabold py-2.5 px-4 rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 disabled:opacity-50"
                >
                  {editFormLoading ? (
                    <span className="h-4 w-4 border-2 border-[#020617] border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      <span>Enregistrer les modifications</span>
                    </>
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
