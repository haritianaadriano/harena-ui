/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { api, formatCurrency } from '../lib/api';
import { User, Wallet, WalletBalanceSnapshot, WalletType } from '../types';
import { 
  Plus, Calendar, CreditCard, Sparkles, AlertCircle, 
  CheckCircle, ChevronRight, BarChart3, TrendingUp, Info
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer 
} from 'recharts';

interface WalletsViewProps {
  currentUser: User;
  selectedWallet: Wallet | null;
  setSelectedWallet: (wallet: Wallet | null) => void;
}

export default function WalletsView({ currentUser, selectedWallet, setSelectedWallet }: WalletsViewProps) {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [balances, setBalances] = useState<{ [walletId: string]: number }>({});
  const [history, setHistory] = useState<WalletBalanceSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New wallet form
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<WalletType>('PERSONAL');
  const [newCurrency, setNewCurrency] = useState('MGA');
  const [createError, setCreateError] = useState<string | null>(null);
  const [createLoading, setCreateLoading] = useState(false);

  const loadWallets = async () => {
    try {
      setLoading(true);
      const walletsData = await api.getWallets(currentUser.id);
      setWallets(walletsData);

      // Fetch current balance for each
      const balancePromises = walletsData.map(async (w) => {
        try {
          const snapshot = await api.getCurrentBalance(currentUser.id, w.id);
          return { walletId: w.id, balance: snapshot.balance };
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

      // Select first wallet if none selected
      if (walletsData.length > 0 && !selectedWallet) {
        setSelectedWallet(walletsData[0]);
      }
    } catch (err) {
      console.error('Error loading wallets', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWallets();
  }, [currentUser.id]);

  useEffect(() => {
    async function loadHistory() {
      if (!selectedWallet) return;
      try {
        setHistoryLoading(true);
        // Default to past 7 days range
        const toDate = new Date().toISOString();
        const fromDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const historyData = await api.getBalanceHistory(currentUser.id, selectedWallet.id, fromDate, toDate);
        setHistory(historyData);
      } catch (err) {
        console.error('Error loading balance history', err);
      } finally {
        setHistoryLoading(false);
      }
    }

    loadHistory();
  }, [selectedWallet, currentUser.id]);

  const handleCreateWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setCreateLoading(true);

    if (!newName.trim()) {
      setCreateError('Le nom du portefeuille est obligatoire.');
      setCreateLoading(false);
      return;
    }

    try {
      const created = await api.createWallet(currentUser.id, {
        name: newName,
        type: newType,
        currency: newCurrency,
      });
      setShowCreateModal(false);
      setNewName('');
      
      // Reload and auto select newly created wallet
      const walletsData = await api.getWallets(currentUser.id);
      setWallets(walletsData);
      setSelectedWallet(created);
      
      // Reload balance helper
      loadWallets();
    } catch (err: any) {
      setCreateError(err.message || 'Impossible de créer le portefeuille.');
    } finally {
      setCreateLoading(false);
    }
  };

  // Map Recharts data
  const chartData = Array.isArray(history) ? history.map(h => ({
    date: h.snapshot_datetime ? new Date(h.snapshot_datetime).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) : '',
    solde: h.balance || 0
  })) : [];

  // Card background styling based on wallet type
  const getCardStyle = (type: WalletType) => {
    switch (type) {
      case 'PERSONAL':
        return 'from-cyan-500 via-sky-600 to-indigo-800 text-white shadow-lg shadow-cyan-500/25';
      case 'SAVINGS':
        return 'from-indigo-600 via-blue-700 to-cyan-800 text-white shadow-lg shadow-blue-500/25';
      case 'BUSINESS':
        return 'from-[#1e293b] via-[#0f172a] to-[#020617] text-white border border-slate-800 shadow-lg shadow-slate-950/50';
      default:
        return 'from-slate-700 to-slate-900 text-white';
    }
  };

  return (
    <div className="space-y-6 font-sans">
      
      {/* Title Bar */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Gérer mes portefeuilles</h1>
          <p className="text-sm text-slate-400">Créez et suivez vos différents comptes personnels, d'épargne et professionnels.</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-cyan-500 hover:bg-cyan-600 text-[#020617] font-bold py-2.5 px-4 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-lg shadow-cyan-500/25 transition-all border border-cyan-500/30"
        >
          <Plus className="h-4 w-4" />
          <span>Nouveau compte</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left column: List of wallets */}
        <div className="space-y-4 lg:col-span-1">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-2 mb-2">Mes comptes actifs</h3>
          {loading ? (
            <div className="p-12 text-center bg-[#0b1329] rounded-3xl border border-slate-800/80 shadow-sm">
              <span className="h-6 w-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin inline-block" />
            </div>
          ) : wallets.length === 0 ? (
            <div className="p-8 text-center bg-[#0b1329] rounded-3xl border border-slate-800/80 shadow-sm space-y-3">
              <CreditCard className="h-8 w-8 text-slate-500 mx-auto" />
              <p className="text-slate-400 text-xs">Vous n'avez aucun compte. Créez-en un pour commencer !</p>
            </div>
          ) : (
            <div className="space-y-3">
              {wallets.map((w) => {
                const isSelected = selectedWallet?.id === w.id;
                const balance = balances[w.id] || 0;
                
                return (
                  <div
                    key={w.id}
                    onClick={() => setSelectedWallet(w)}
                    className={`p-5 rounded-2xl cursor-pointer transition-all border text-left relative overflow-hidden group ${
                      isSelected 
                        ? 'bg-[#131f3d] border-cyan-500 shadow-md ring-1 ring-cyan-500/25' 
                        : 'bg-[#0b1329] border-slate-800/80 hover:border-slate-700/85 hover:bg-[#131c35]/50'
                    }`}
                  >
                    {/* Visual accent bar inside selected */}
                    {isSelected && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-cyan-400" />
                    )}

                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        w.type === 'SAVINGS' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 
                        w.type === 'BUSINESS' ? 'bg-[#0e2d5c] text-cyan-300 border-cyan-500/20' : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                      }`}>
                        {w.type}
                      </span>
                      <span className="text-xs font-bold text-slate-400 font-mono">{w.currency}</span>
                    </div>

                    <h4 className="font-semibold text-slate-200 text-sm group-hover:text-white transition-colors">
                      {w.name}
                    </h4>

                    <div className="text-lg font-bold text-white tracking-tight mt-1 font-sans">
                      {formatCurrency(balance, w.currency)}
                    </div>

                    <div className="mt-4 flex items-center justify-between text-[10px] text-slate-500">
                      <span>Créé le {new Date(w.creation_datetime).toLocaleDateString('fr-FR')}</span>
                      {isSelected && <span className="text-cyan-400 font-bold flex items-center gap-0.5">Actif <ChevronRight className="h-3 w-3" /></span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right column: Wallet Details & Chart analytics */}
        <div className="lg:col-span-2 space-y-6">
          {selectedWallet ? (
            <>
              {/* Visual Bank Card Preview */}
              <div className={`p-6 rounded-3xl bg-gradient-to-r ${getCardStyle(selectedWallet.type)} shadow-xl relative overflow-hidden flex flex-col justify-between h-48 transition-all duration-300`}>
                {/* Visual Card Chip and Wave */}
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] font-semibold tracking-widest opacity-85 uppercase">
                      Harena Smart Wallet
                    </span>
                    <h3 className="text-lg font-bold tracking-tight">{selectedWallet.name}</h3>
                  </div>
                  {/* Mock Chip */}
                  <div className="h-8 w-11 bg-amber-400/80 rounded-lg border border-amber-300/40 relative overflow-hidden shadow-xs">
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-200/50 via-transparent to-amber-600/30" />
                    <div className="grid grid-cols-3 gap-0.5 h-full p-1 opacity-40">
                      <div className="border-r border-slate-900/10" />
                      <div className="border-r border-slate-900/10" />
                      <div />
                    </div>
                  </div>
                </div>

                <div className="space-y-1 mt-4">
                  <span className="text-xs opacity-75">Solde Actuel</span>
                  <div className="text-2xl font-bold tracking-tight font-sans">
                    {formatCurrency(balances[selectedWallet.id] || 0, selectedWallet.currency)}
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs mt-4 border-t border-white/10 pt-3">
                  <span className="font-mono tracking-widest text-[11px] opacity-90">
                    •••• •••• •••• {selectedWallet.id.slice(-4).toUpperCase()}
                  </span>
                  <span className="opacity-80">
                    {selectedWallet.type}
                  </span>
                </div>
              </div>

              {/* Balance History Trend Chart */}
              <div className="bg-[#0b1329] p-6 rounded-3xl border border-slate-800/80 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                      <BarChart3 className="h-4 w-4 text-cyan-400" />
                      <span>Évolution du solde (30 jours)</span>
                    </h3>
                    <p className="text-xs text-slate-400 font-sans">Courbe historique des soldes du compte.</p>
                  </div>
                  
                  <div className="text-right">
                    <span className="text-xs text-cyan-400 font-bold flex items-center justify-end gap-1 font-sans">
                      <TrendingUp className="h-3.5 w-3.5" />
                      <span>Analyse active</span>
                    </span>
                  </div>
                </div>

                {historyLoading ? (
                  <div className="h-64 flex flex-col items-center justify-center space-y-2">
                    <span className="h-8 w-8 border-3 border-cyan-500 border-t-transparent rounded-full animate-spin shadow-lg shadow-cyan-500/20" />
                    <span className="text-xs text-slate-400 font-sans">Chargement des données...</span>
                  </div>
                ) : chartData.length === 0 ? (
                  <div className="h-64 flex flex-col items-center justify-center text-center p-6 space-y-2 bg-[#131c35]/50 rounded-2xl border border-dashed border-slate-800">
                    <Info className="h-8 w-8 text-slate-500" />
                    <h4 className="font-semibold text-xs text-slate-400">Aucun historique disponible</h4>
                    <p className="text-[11px] text-slate-500 max-w-xs">Enregistrez des transactions pour générer l'analyse historique du compte.</p>
                  </div>
                ) : (
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                          tickFormatter={(val) => formatCurrency(val, selectedWallet.currency)} 
                        />
                        <Tooltip 
                          contentStyle={{ background: '#0b1329', border: '1px solid #1e293b', borderRadius: '12px', color: '#f8fafc', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.4)' }} 
                          labelStyle={{ color: '#94a3b8', fontWeight: 'bold' }}
                          formatter={(value) => [formatCurrency(Number(value), selectedWallet.currency), 'Solde']}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="solde" 
                          stroke="#06b6d4" 
                          strokeWidth={3} 
                          dot={{ r: 4, strokeWidth: 2, fill: '#0b1329', stroke: '#22d3ee' }} 
                          activeDot={{ r: 6 }} 
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center min-h-[300px] text-center bg-[#0b1329] rounded-3xl border border-slate-800/80 p-8 space-y-4 shadow-sm">
              <CreditCard className="h-12 w-12 text-slate-500" />
              <div className="space-y-1">
                <h3 className="font-bold text-slate-200 text-sm">Sélectionnez un portefeuille</h3>
                <p className="text-xs text-slate-400 max-w-sm">Choisissez l'un de vos portefeuilles sur la gauche pour afficher son historique et ses analyses intelligentes.</p>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Wallet Creation Modal Dialog */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs font-sans">
          <div className="bg-[#0b1329] rounded-3xl max-w-md w-full p-6 shadow-xl border border-slate-800/80 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-cyan-500 shadow-[0_0_12px_rgba(34,211,238,0.5)]" />
            
            <h3 className="text-lg font-bold text-white tracking-tight mb-1">
              Créer un portefeuille Harena
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Ajoutez un nouveau compte pour mieux organiser vos finances.
            </p>

            {createError && (
              <div className="p-3 bg-red-950/40 text-red-400 rounded-xl text-xs mb-4 border border-red-900/30">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateWallet} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nom du portefeuille
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Épargne Vacances, Compte Courant..."
                  className="px-3 py-2 w-full border border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 bg-[#131c35]/50 text-white placeholder-slate-500"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Type de compte
                  </label>
                  <select
                    className="px-3 py-2 w-full border border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 bg-[#131c35]/50 text-slate-200"
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as WalletType)}
                  >
                    <option value="PERSONAL" className="bg-[#0b1329] text-white">Personnel</option>
                    <option value="SAVINGS" className="bg-[#0b1329] text-white">Épargne</option>
                    <option value="BUSINESS" className="bg-[#0b1329] text-white">Business</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Devise principale
                  </label>
                  <select
                    className="px-3 py-2 w-full border border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 bg-[#131c35]/50 text-slate-200"
                    value={newCurrency}
                    onChange={(e) => setNewCurrency(e.target.value)}
                  >
                    <option value="MGA" className="bg-[#0b1329] text-white">Ariary (MGA)</option>
                    <option value="EUR" className="bg-[#0b1329] text-white">Euro (EUR)</option>
                    <option value="USD" className="bg-[#0b1329] text-white">Dollar (USD)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 border border-slate-800 hover:bg-[#131c35] text-slate-300 font-semibold py-2 px-4 rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="flex-1 bg-cyan-500 hover:bg-cyan-600 text-[#020617] font-extrabold py-2 px-4 rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-1 shadow-md disabled:opacity-50"
                >
                  {createLoading ? (
                    <span className="inline-block h-3.5 w-3.5 border-2 border-[#020617] border-t-transparent rounded-full animate-spin" />
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
