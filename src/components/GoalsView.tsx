/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { api, formatCurrency } from '../lib/api';
import { User, Wallet, Goal, GoalStatus } from '../types';
import { 
  Plus, Calendar, Trash2, Sparkles, AlertCircle, 
  CheckCircle2, Target, Info, ChevronRight, HelpCircle, 
  TrendingUp, Award, Clock
} from 'lucide-react';

interface GoalsViewProps {
  currentUser: User;
}

export default function GoalsView({ currentUser }: GoalsViewProps) {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  // New Goal Form State
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedWalletId, setSelectedWalletId] = useState('');
  const [goalName, setGoalName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [deadline, setDeadline] = useState('');
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

      const goalsData = await api.getGoals(currentUser.id);
      setGoals(goalsData);
    } catch (err) {
      console.error('Error loading goals data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser.id]);

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormLoading(true);

    const targetNum = parseFloat(targetAmount);
    const currentNum = currentAmount ? parseFloat(currentAmount) : 0;

    if (isNaN(targetNum) || targetNum <= 0) {
      setFormError('Veuillez entrer un montant cible valide supérieur à 0.');
      setFormLoading(false);
      return;
    }

    if (isNaN(currentNum) || currentNum < 0) {
      setFormError('Le montant actuel épargné doit être supérieur ou égal à 0.');
      setFormLoading(false);
      return;
    }

    if (currentNum > targetNum) {
      setFormError('Le montant actuel ne peut pas dépasser le montant cible.');
      setFormLoading(false);
      return;
    }

    if (!goalName.trim()) {
      setFormError('Le nom de la cagnotte est requis.');
      setFormLoading(false);
      return;
    }

    if (!deadline) {
      setFormError('Veuillez spécifier une date limite.');
      setFormLoading(false);
      return;
    }

    try {
      await api.createGoal(currentUser.id, selectedWalletId, {
        name: goalName,
        target_amount: targetNum,
        current_amount: currentNum,
        deadline,
        status: currentNum >= targetNum ? 'COMPLETED' : 'IN_PROGRESS',
      });

      setGoalName('');
      setTargetAmount('');
      setCurrentAmount('');
      setDeadline('');
      setShowAddModal(false);
      loadData();
    } catch (err: any) {
      setFormError(err.message || 'Impossible de créer l\'objectif d\'épargne.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    if (!window.confirm('Voulez-vous vraiment supprimer cet objectif d\'épargne ?')) return;
    try {
      await api.deleteGoal(currentUser.id, goalId);
      loadData();
    } catch (err) {
      console.error('Error deleting goal', err);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      
      {/* Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Objectifs d'Épargne &amp; Cagnottes</h1>
          <p className="text-sm text-slate-500">Visualisez vos projets, suivez votre épargne et réalisez vos rêves sereinement.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 px-4 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-500/10 transition-all border border-emerald-500/30 self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Nouvel objectif</span>
        </button>
      </div>

      {loading ? (
        <div className="py-12 text-center">
          <span className="h-8 w-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin inline-block" />
        </div>
      ) : goals.length === 0 ? (
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-xs text-center max-w-lg mx-auto space-y-4">
          <div className="h-16 w-16 bg-slate-50 text-slate-400 border border-slate-100 rounded-2xl flex items-center justify-center mx-auto">
            <Target className="h-8 w-8 text-emerald-600" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-slate-800 text-sm">Aucune cagnotte d'épargne</h3>
            <p className="text-xs text-slate-500">Pour financer vos projets (voyages, immobilier, fond d'urgence), créez une cagnotte dédiée et affectez-y vos excédents.</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="text-xs font-semibold bg-emerald-50 text-emerald-600 px-4 py-2 rounded-xl border border-emerald-100 hover:bg-emerald-100 cursor-pointer transition-colors"
          >
            Créer ma première cagnotte
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {goals.map((g) => {
            const percentage = Math.min(100, (g.current_amount / g.target_amount) * 100);
            const isCompleted = g.current_amount >= g.target_amount || g.status === 'COMPLETED';
            const remaining = Math.max(0, g.target_amount - g.current_amount);
            const daysLeft = Math.ceil((new Date(g.deadline).getTime() - Date.now()) / (1000 * 3600 * 24));

            return (
              <div 
                key={g.id}
                className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs space-y-4 relative overflow-hidden group"
              >
                {/* Upper row: Title & Delete */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className={`h-10 w-10 rounded-xl flex items-center justify-center text-sm font-semibold shrink-0 border ${
                        isCompleted 
                          ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                          : 'bg-amber-50 text-amber-600 border-amber-100'
                      }`}
                    >
                      {isCompleted ? <Award className="h-5 w-5" /> : <Target className="h-5 w-5" />}
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800 text-sm">{g.name}</h3>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                        <span>Compte lié : {g.wallet.name}</span>
                        <span>•</span>
                        <span className="font-semibold flex items-center gap-1 font-mono text-slate-500">
                          <Calendar className="h-3 w-3 text-slate-400" />
                          {new Date(g.deadline).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteGoal(g.id)}
                    className="text-slate-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-100 cursor-pointer transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {/* Progress Indicators */}
                <div className="space-y-2">
                  <div className="flex justify-between items-baseline">
                    <div className="space-x-1">
                      <span className="text-xl font-bold text-slate-900 font-sans">
                        {formatCurrency(g.current_amount, g.wallet.currency)}
                      </span>
                      <span className="text-xs text-slate-500">épargnés</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-slate-400">Objectif : </span>
                      <span className="text-xs font-bold text-slate-700 font-sans">
                        {formatCurrency(g.target_amount, g.wallet.currency)}
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 ${
                        isCompleted ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>

                  {/* Warning Messages */}
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-slate-500 font-semibold font-mono">{Math.round(percentage)}% complété</span>
                    
                    {isCompleted ? (
                      <span className="text-emerald-600 font-bold flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                        <CheckCircle2 className="h-3 w-3" /> Objectif Atteint !
                      </span>
                    ) : daysLeft > 0 ? (
                      <span className="text-slate-600 font-semibold flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100 font-mono">
                        <Clock className="h-3 w-3 text-emerald-600" /> {daysLeft} jours restants
                      </span>
                    ) : (
                      <span className="text-rose-600 font-bold flex items-center gap-1 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100 font-mono">
                        <AlertCircle className="h-3 w-3 animate-pulse" /> Délai dépassé
                      </span>
                    )}
                  </div>
                </div>

                {/* Intelligent advice custom tip */}
                <div className="bg-emerald-500/5 p-3 rounded-2xl text-[11px] leading-normal text-slate-600 flex items-start gap-2 border border-emerald-500/15">
                  <Sparkles className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <p>
                    {isCompleted 
                      ? `Félicitations ! Votre cagnotte "${g.name}" est entièrement financée. Vous pouvez transférer ces fonds vers d'autres projets ou les conserver en épargne disponible.` 
                      : `Pour atteindre votre cible avant le ${new Date(g.deadline).toLocaleDateString('fr-FR')}, l'IA estime qu'il vous faut épargner environ ${formatCurrency(Math.ceil(remaining / (daysLeft > 0 ? daysLeft / 30 : 1)), g.wallet.currency)} par mois.`}
                  </p>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Add Goal Modal Dialog */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs font-sans">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-xl border border-slate-100 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-emerald-600" />
            
            <h3 className="text-lg font-bold text-slate-900 tracking-tight mb-1">
              Créer une cagnotte d'épargne
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Fixez un objectif financier clair et déterminez votre plan d'épargne.
            </p>

            {formError && (
              <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs mb-4 border border-red-100">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateGoal} className="space-y-4">
              
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

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Nom du projet / Cagnotte</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Voyage au Japon, Nouvel Ordinateur, Fond d'Urgence..."
                  className="px-3 py-2 w-full border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-slate-50/50 text-slate-800 placeholder-slate-400"
                  value={goalName}
                  onChange={(e) => setGoalName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Montant cible (Cible)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="Ex: 5000"
                    className="px-3 py-2 w-full border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-slate-50/50 text-slate-800 placeholder-slate-400"
                    value={targetAmount}
                    onChange={(e) => setTargetAmount(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Épargne de départ (Optionnel)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Ex: 500"
                    className="px-3 py-2 w-full border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-slate-50/50 text-slate-800 placeholder-slate-400"
                    value={currentAmount}
                    onChange={(e) => setCurrentAmount(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Date limite (Deadline)</label>
                <input
                  type="date"
                  required
                  className="px-3 py-2 w-full border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-slate-50/50 text-slate-800 placeholder-slate-400"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                />
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
