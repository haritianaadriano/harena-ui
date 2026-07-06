/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { api, setDemoMode } from '../lib/api';
import { Wallet, KeyRound, Mail, User as UserIcon, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { Sex } from '../types';

interface AuthScreenProps {
  onAuthSuccess: () => void;
}

export default function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstname, setFirstname] = useState('');
  const [lastname, setLastname] = useState('');
  const [username, setUsername] = useState('');
  const [sex, setSex] = useState<Sex>('M');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);

  // Check backend health on mount
  React.useEffect(() => {
    api.ping().then(online => {
      setApiOnline(online);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isLogin) {
        await api.signin({ email, password });
      } else {
        await api.signup({
          firstname,
          lastname,
          username,
          password,
          email,
          sex,
        });
        // On signup success, automatically sign in
        await api.signin({ email, password });
      }
      onAuthSuccess();
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue lors de la connexion.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoMode = () => {
    setDemoMode(true);
    onAuthSuccess();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#020617] py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-md w-full space-y-8 bg-[#0b1329] p-8 rounded-3xl shadow-xl border border-slate-800/80 relative overflow-hidden animate-fade-in">
        
        {/* Background Accent line */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-cyan-500" />
        
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-cyan-950/40 rounded-2xl flex items-center justify-center text-cyan-400 mb-4 border border-cyan-900/30 shadow-md">
            <Wallet className="h-8 w-8 text-cyan-400" id="harena-logo-wallet" />
          </div>
          <h2 className="text-3xl font-extrabold font-sans tracking-tight text-white">
            harena
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Portefeuille intelligent &amp; Conseiller financier IA
          </p>
        </div>

        {/* Short intro card */}
        <div className="bg-cyan-950/30 p-4 rounded-2xl border border-cyan-500/15 text-slate-300 text-xs leading-relaxed space-y-1">
          <div className="flex items-center font-semibold gap-1 text-cyan-400">
            <Sparkles className="h-3 w-3" />
            <span>Pourquoi harena ?</span>
          </div>
          <p>
            harena analyse vos transactions, optimise vos budgets, vous propose des plans d'épargne d'urgence personnalisés et détecte les anomalies financières.
          </p>
        </div>

        {/* API Status indicator */}
        <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
          <span>Statut API:</span>
          {apiOnline === null ? (
            <span className="text-slate-500 animate-pulse">Vérification...</span>
          ) : apiOnline ? (
            <span className="flex items-center gap-1.5 text-cyan-400 font-semibold">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-ping inline-block" /> En ligne
            </span>
          ) : (
            <span className="text-amber-500 font-semibold flex items-center gap-1">
              Hors ligne (Mode Démo conseillé)
            </span>
          )}
        </div>

        {error && (
          <div className="p-3 bg-rose-950/50 text-rose-300 rounded-xl text-xs border border-rose-900/30">
            {error}
          </div>
        )}

        <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
          {!isLogin && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Prénom</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                    <UserIcon className="h-4 w-4" />
                  </span>
                  <input
                    type="text"
                    required
                    className="pl-9 pr-3 py-2 w-full border border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 bg-[#131c35] text-white placeholder-slate-500"
                    placeholder="Adriano"
                    value={firstname}
                    onChange={(e) => setFirstname(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Nom</label>
                <input
                  type="text"
                  required
                  className="px-3 py-2 w-full border border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 bg-[#131c35] text-white placeholder-slate-500"
                  placeholder="Hei"
                  value={lastname}
                  onChange={(e) => setLastname(e.target.value)}
                />
              </div>
            </div>
          )}

          {!isLogin && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Nom d'utilisateur</label>
                <input
                  type="text"
                  required
                  className="px-3 py-2 w-full border border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 bg-[#131c35] text-white placeholder-slate-500"
                  placeholder="adriano123"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Genre</label>
                <select
                  className="px-3 py-2 w-full border border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 bg-[#131c35] text-slate-200"
                  value={sex}
                  onChange={(e) => setSex(e.target.value as Sex)}
                >
                  <option value="M">Masculin</option>
                  <option value="F">Féminin</option>
                </select>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Adresse Email</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                <Mail className="h-4 w-4" />
              </span>
              <input
                type="email"
                required
                className="pl-9 pr-3 py-2 w-full border border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 bg-[#131c35] text-white placeholder-slate-500"
                placeholder="votre.email@exemple.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Mot de passe</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                <KeyRound className="h-4 w-4" />
              </span>
              <input
                type="password"
                required
                className="pl-9 pr-3 py-2 w-full border border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 bg-[#131c35] text-white placeholder-slate-500"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-cyan-500 hover:bg-cyan-600 text-[#020617] font-bold py-3 px-4 rounded-xl text-xs tracking-wide transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-cyan-500/25 disabled:opacity-50"
          >
            {loading ? (
              <span className="inline-block h-4 w-4 border-2 border-[#020617] border-t-transparent rounded-full animate-spin" />
            ) : isLogin ? (
              'Se connecter'
            ) : (
              "S'inscrire"
            )}
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        <div className="text-center text-xs">
          <button
            type="button"
            className="text-cyan-400 hover:text-cyan-300 font-medium cursor-pointer"
            onClick={() => setIsLogin(!isLogin)}
          >
            {isLogin ? "Pas de compte ? S'inscrire" : 'Déjà un compte ? Se connecter'}
          </button>
        </div>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-slate-800/80"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-[#0b1329] px-3 text-slate-500 font-bold tracking-wider">Ou explorez librement</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleDemoMode}
          className="w-full bg-[#131c35] hover:bg-[#1a2542] text-slate-300 font-semibold py-3 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm border border-slate-800/80"
        >
          <Sparkles className="h-4 w-4 text-cyan-400" />
          <span>Accéder au Mode Démo</span>
        </button>

        <div className="flex items-center justify-center gap-1.5 text-slate-500 text-[10px]">
          <ShieldCheck className="h-3 w-3 text-cyan-400" />
          <span>Connexion sécurisée par cryptage JWT</span>
        </div>

      </div>
    </div>
  );
}
