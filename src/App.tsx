/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { getCurrentUser, logout, formatCurrency } from './lib/api';
import { User, Wallet, WalletTransaction } from './types';
import AuthScreen from './components/AuthScreen';
import Dashboard from './components/Dashboard';
import WalletsView from './components/WalletsView';
import TransactionsView from './components/TransactionsView';
import BudgetsView from './components/BudgetsView';
import GoalsView from './components/GoalsView';
import { 
  LayoutDashboard, Wallet as WalletIcon, ArrowDownUp, 
  PieChart, Target, LogOut, User as UserIcon, Menu, X, Wallet2, Sparkles
} from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedWallet, setSelectedWallet] = useState<Wallet | null>(null);
  const [selectedTx, setSelectedTx] = useState<WalletTransaction | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Initialize auth
  useEffect(() => {
    const user = getCurrentUser();
    if (user) {
      setCurrentUser(user);
    }
  }, []);

  const handleAuthSuccess = () => {
    const user = getCurrentUser();
    if (user) {
      setCurrentUser(user);
      setActiveTab('dashboard');
    }
  };

  const handleLogout = () => {
    logout();
    setCurrentUser(null);
  };

  if (!currentUser) {
    return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
  }

  // Navigation Items
  const navItems = [
    { id: 'dashboard', label: 'Tableau de Bord', icon: LayoutDashboard },
    { id: 'wallets', label: 'Mes Comptes', icon: WalletIcon },
    { id: 'transactions', label: 'Transactions', icon: ArrowDownUp },
    { id: 'budgets', label: 'Budgets', icon: PieChart },
    { id: 'goals', label: 'Cagnottes', icon: Target },
  ];

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 flex flex-col md:flex-row font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      
      {/* Mobile Top Header */}
      <header className="md:hidden bg-[#0b1329] border-b border-slate-800/80 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 bg-cyan-500 rounded-xl flex items-center justify-center text-[#020617] shadow-lg shadow-cyan-500/20">
            <Wallet2 className="h-5 w-5" />
          </div>
          <span className="font-bold text-lg text-white tracking-tight flex items-center gap-1.5">
            harena
            <span className="text-[10px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/25 font-bold px-2 py-0.5 rounded-full uppercase">
              MGA
            </span>
          </span>
        </div>
        <button 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="text-slate-400 p-1.5 hover:bg-[#131c35] rounded-xl cursor-pointer"
        >
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </header>

      {/* Sidebar Navigation */}
      <aside className={`
        fixed inset-y-0 left-0 w-64 bg-[#0b1329] border-r border-slate-800/80 flex flex-col justify-between z-30 transition-transform duration-300 md:translate-x-0 md:static md:h-screen shrink-0
        ${mobileMenuOpen ? 'translate-x-0 pt-16 md:pt-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="px-5 py-6 space-y-6">
          {/* Logo Brand */}
          <div className="hidden md:flex items-center gap-2.5">
            <div className="h-10 w-10 bg-cyan-500 rounded-2xl flex items-center justify-center text-[#020617] shadow-lg shadow-cyan-500/30">
              <Wallet2 className="h-6 w-6" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-xl text-white tracking-tight flex items-center gap-1.5 leading-none">
                harena
                <span className="text-[9px] bg-cyan-950 text-cyan-400 border border-cyan-800/30 font-bold px-1.5 py-0.5 rounded-md uppercase">
                  MGA
                </span>
              </span>
              <span className="text-[10px] text-slate-400 mt-1 font-medium">Portefeuille Intelligent</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5 pt-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleTabChange(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all cursor-pointer ${
                    isActive 
                      ? 'bg-[#131f3d] text-cyan-400 shadow-md border border-cyan-500/20' 
                      : 'text-slate-400 hover:text-slate-100 hover:bg-[#131c35]'
                  }`}
                >
                  <Icon className={`h-5 w-5 ${isActive ? 'text-cyan-400' : 'text-slate-400 group-hover:text-slate-200'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* User Profile Widget */}
        <div className="p-5 border-t border-slate-800/80 bg-[#090f20]">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-2xl bg-cyan-950/50 flex items-center justify-center text-cyan-400 border border-cyan-800/30">
              <UserIcon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-slate-200 text-sm truncate leading-none">
                {currentUser.firstname} {currentUser.lastname}
              </h4>
              <span className="text-xs text-slate-400 truncate block mt-1 font-mono">
                @{currentUser.username}
              </span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold text-rose-400 hover:text-white border border-rose-950/40 hover:bg-rose-600 hover:border-rose-600 transition-all cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            <span>Se déconnecter</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 md:h-screen md:overflow-y-auto px-4 py-6 md:p-8 space-y-6">
        {activeTab === 'dashboard' && (
          <Dashboard 
            currentUser={currentUser} 
            setActiveTab={setActiveTab}
            setSelectedWallet={setSelectedWallet}
            setSelectedTx={setSelectedTx}
          />
        )}
        {activeTab === 'wallets' && (
          <WalletsView 
            currentUser={currentUser}
            selectedWallet={selectedWallet}
            setSelectedWallet={setSelectedWallet}
          />
        )}
        {activeTab === 'transactions' && (
          <TransactionsView 
            currentUser={currentUser}
            selectedTx={selectedTx}
            setSelectedTx={setSelectedTx}
          />
        )}
        {activeTab === 'budgets' && (
          <BudgetsView currentUser={currentUser} />
        )}
        {activeTab === 'goals' && (
          <GoalsView currentUser={currentUser} />
        )}
      </main>

    </div>
  );
}
