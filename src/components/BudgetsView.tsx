/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { api, formatCurrency } from '../lib/api';
import { User, Wallet, Budget, TransactionCategory, BudgetPeriod } from '../types';
import { 
  Plus, Calendar, Trash2, Sparkles, AlertTriangle, 
  CheckCircle2, PiggyBank, Info, ChevronRight, HelpCircle
} from 'lucide-react';

interface BudgetsViewProps {
  currentUser: User;
}

export default function BudgetsView({ currentUser }: BudgetsViewProps) {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [categories, setCategories] = useState<TransactionCategory[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);

  // New Budget Form State
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedWalletId, setSelectedWalletId] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [limitAmount, setLimitAmount] = useState('');
  const [periodType, setPeriodType] = useState<BudgetPeriod>('MONTHLY');
  const [isReserved, setIsReserved] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const walletsData = await api.getWallets(currentUser.id);
      setWallets(walletsData);
      if (walletsData.length > 0) {
        setSelectedWalletId(walletsData[0].id);
      }

      const categoriesData = await api.getCategories(currentUser.id);
      setCategories(categoriesData);
      if (categoriesData.length > 0) {
        setSelectedCategoryId(categoriesData[0].id);
      }

      const budgetsData = await api.getBudgets(currentUser.id);
      setBudgets(budgetsData);
    } catch (err) {
      console.error('Error loading budget data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser.id]);

  const handleCreateBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormLoading(true);

    const limitNum = parseFloat(limitAmount);
    if (isNaN(limitNum) || limitNum <= 0) {
      setFormError('Veuillez entrer une limite budgétaire valide supérieure à 0.');
      setFormLoading(false);
      return;
    }

    const wallet = wallets.find(w => w.id === selectedWalletId);
    const category = categories.find(c => c.id === selectedCategoryId);

    if (!wallet || !category) {
      setFormError('Veuillez sélectionner un portefeuille et une catégorie valides.');
      setFormLoading(false);
      return;
    }

    try {
      await api.updateBudget(currentUser.id, {
        wallet,
        category,
        limit_amount: limitNum,
        period_type: periodType,
        is_reserved: isReserved,
      });

      setLimitAmount('');
      setShowAddModal(false);
      loadData(); // reload budgets
    } catch (err: any) {
      setFormError(err.message || 'Impossible d\'ajouter ou d\'ajuster le budget.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteBudget = async (budgetId: string) => {
    if (!window.confirm('Voulez-vous vraiment supprimer ce budget ?')) return;
    try {
      await api.deleteBudget(currentUser.id, budgetId);
      loadData(); // reload budgets
    } catch (err) {
      console.error('Error deleting budget', err);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      
      {/* Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Planificateur de budgets</h1>
          <p className="text-sm text-slate-500">Fixez des limites par catégorie pour maîtriser et optimiser vos dépenses mensuelles.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 px-4 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-500/10 transition-all border border-emerald-500/30 self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Fixer un budget</span>
        </button>
      </div>

      {loading ? (
        <div className="py-12 text-center">
          <span className="h-8 w-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin inline-block" />
        </div>
      ) : budgets.length === 0 ? (
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-xs text-center max-w-lg mx-auto space-y-4">
          <div className="h-16 w-16 bg-slate-50 text-slate-400 border border-slate-100 rounded-2xl flex items-center justify-center mx-auto">
            <PiggyBank className="h-8 w-8 text-emerald-600" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-slate-800 text-sm">Aucun budget configuré</h3>
            <p className="text-xs text-slate-500">Pour garder le contrôle sur vos dépenses, vous pouvez configurer une limite maximale mensuelle ou hebdomadaire pour vos catégories de dépenses.</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="text-xs font-semibold bg-emerald-50 text-emerald-600 px-4 py-2 rounded-xl border border-emerald-100 hover:bg-emerald-100 cursor-pointer transition-colors"
          >
            Créer mon premier budget
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {budgets.map((b) => {
            const percentage = Math.min(100, (b.spent_amount / b.limit_amount) * 100);
            const isBreached = b.spent_amount > b.limit_amount;
            const isWarning = b.spent_amount > b.limit_amount * 0.75 && !isBreached;

            return (
              <div 
                key={b.id}
                className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs space-y-4 relative overflow-hidden group"
              >
                {/* Upper row: Category & Delete */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className="h-10 w-10 rounded-xl flex items-center justify-center text-sm font-semibold shrink-0"
                      style={{ backgroundColor: `${b.category.color}15`, color: b.category.color }}
                    >
                      <PiggyBank className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800 text-sm">{b.category.name}</h3>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                        <span className="font-bold uppercase tracking-wider bg-slate-50 text-slate-500 border border-slate-100 px-1.5 py-0.5 rounded-md text-[9px] font-mono">
                          {b.period_type}
                        </span>
                        <span>•</span>
                        <span>Compte : {b.wallet.name}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteBudget(b.id)}
                    className="text-slate-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-100 cursor-pointer transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {/* Progress Indicators */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-baseline">
                    <div className="space-x-1">
                      <span className="text-lg font-bold text-slate-900 font-sans">
                        {formatCurrency(b.spent_amount, b.wallet.currency)}
                      </span>
                      <span className="text-xs text-slate-500">dépensés</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-slate-400">Limite : </span>
                      <span className="text-xs font-bold text-slate-700 font-sans">
                        {formatCurrency(b.limit_amount, b.wallet.currency)}
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 ${
                        isBreached ? 'bg-red-500 animate-pulse' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>

                  {/* Warning Messages */}
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-slate-400 font-semibold font-mono">{Math.round(percentage)}% atteint</span>
                    
                    {isBreached ? (
                      <span className="text-red-600 font-bold flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" /> Budget dépassé
                      </span>
                    ) : isWarning ? (
                      <span className="text-amber-600 font-bold flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" /> Limite presque atteinte
                      </span>
                    ) : (
                      <span className="text-emerald-600 font-bold flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Budget respecté
                      </span>
                    )}
                  </div>
                </div>

                {/* Intelligent AI advice custom tip for this category */}
                <div className="bg-emerald-500/5 p-3 rounded-2xl text-[11px] leading-normal text-slate-600 flex items-start gap-2 border border-emerald-500/15">
                  <Sparkles className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <p>
                    {isBreached 
                      ? `L'analyse préconise de réduire de ${formatCurrency(b.spent_amount - b.limit_amount, b.wallet.currency)} les dépenses de cette catégorie pour équilibrer votre balance d'ici la fin de la période.` 
                      : `Excellent contrôle de vos dépenses ! Continuez à planifier vos achats pour épargner un surplus estimé à ${formatCurrency(b.limit_amount - b.spent_amount, b.wallet.currency)}.`}
                  </p>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Add Budget Modal Dialog */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs font-sans">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-xl border border-slate-100 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-emerald-600" />
            
            <h3 className="text-lg font-bold text-slate-900 tracking-tight mb-1">
              Fixer une limite de budget
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Limitez les dépenses sur une catégorie pour atteindre vos objectifs financiers.
            </p>

            {formError && (
              <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs mb-4 border border-red-100">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateBudget} className="space-y-4">
              
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Portefeuille associé</label>
                <select
                  className="px-3 py-2 w-full border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-slate-50/50 text-slate-700"
                  value={selectedWalletId}
                  onChange={(e) => setSelectedWalletId(e.target.value)}
                >
                  {wallets.map((w) => (
                    <option key={w.id} value={w.id}>{w.name} ({w.currency})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Catégorie cible</label>
                  <select
                    className="px-3 py-2 w-full border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-slate-50/50 text-slate-700"
                    value={selectedCategoryId}
                    onChange={(e) => setSelectedCategoryId(e.target.value)}
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1 font-mono">Périodicité</label>
                  <select
                    className="px-3 py-2 w-full border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-slate-50/50 text-slate-700"
                    value={periodType}
                    onChange={(e) => setPeriodType(e.target.value as BudgetPeriod)}
                  >
                    <option value="DAILY">Journalier</option>
                    <option value="WEEKLY">Hebdomadaire</option>
                    <option value="MONTHLY">Mensuel</option>
                    <option value="YEARLY">Annuel</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Limite budgétaire maximale (Montant)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="Ex: 300"
                  className="px-3 py-2 w-full border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-slate-50/50 text-slate-800 placeholder-slate-400"
                  value={limitAmount}
                  onChange={(e) => setLimitAmount(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-2 py-1">
                <input
                  type="checkbox"
                  id="isReserved"
                  className="rounded border-slate-200 bg-slate-50 text-emerald-600 focus:ring-emerald-500 focus:ring-offset-white"
                  checked={isReserved}
                  onChange={(e) => setIsReserved(e.target.checked)}
                />
                <label htmlFor="isReserved" className="text-xs text-slate-500 font-medium select-none cursor-pointer">
                  Geler ce montant (le réserver uniquement pour ce budget)
                </label>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold py-2 px-4 rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-4 rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-1 shadow-sm disabled:opacity-50"
                >
                  {formLoading ? (
                    <span className="inline-block h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    'Confirmer'
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
