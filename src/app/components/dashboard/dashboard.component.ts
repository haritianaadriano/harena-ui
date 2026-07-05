/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import {
  Wallet,
  WalletTransaction,
  TransactionCategory,
  Budget,
  Goal,
  WalletType,
  TransactionType,
  TransactionStatus,
  BudgetPeriod,
  GoalStatus
} from "../../../types";

@Component({
  selector: "app-dashboard",
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-8">
      <!-- Upper Status Notifications -->
      <div *ngIf="error" class="p-4 bg-rose-50 border border-rose-100 text-rose-600 text-xs rounded-xl flex items-center gap-2">
        <svg class="w-5 h-5 shrink-0 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <span>{{ error }}</span>
      </div>

      <!-- Wallet Selector & Overview Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Left: Wallets Selector -->
        <div class="bg-white border border-slate-200 p-6 rounded-2xl flex flex-col justify-between shadow-sm">
          <div>
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-xs font-mono font-bold text-indigo-600 tracking-wider uppercase">Sélectionner un Portefeuille</h3>
              <button
                (click)="toggleAddWallet()"
                class="p-1.5 text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all cursor-pointer"
                title="Créer un nouveau portefeuille"
              >
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>
            </div>

            <div class="space-y-2.5 max-h-[160px] overflow-y-auto pr-1">
              <div *ngIf="wallets.length === 0" class="text-xs text-slate-400 py-4 text-center">Aucun portefeuille disponible.</div>
              <button
                *ngFor="let w of wallets"
                (click)="selectWallet(w)"
                class="w-full text-left p-3 rounded-xl flex items-center justify-between transition-all border cursor-pointer"
                [ngClass]="{
                  'bg-indigo-50 border-indigo-200 text-indigo-700': selectedWallet?.id === w.id,
                  'bg-slate-50/50 hover:bg-slate-100/80 border-slate-200 text-slate-600': selectedWallet?.id !== w.id
                }"
              >
                <div class="flex items-center gap-2.5">
                  <div
                    class="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                    [ngClass]="{
                      'bg-indigo-600 text-white shadow-sm': selectedWallet?.id === w.id,
                      'bg-slate-200 text-slate-500': selectedWallet?.id !== w.id
                    }"
                  >
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <rect x="3" y="5" width="18" height="14" rx="2" />
                      <path d="M3 10h18" />
                    </svg>
                  </div>
                  <div>
                    <div class="text-xs font-bold tracking-tight leading-tight">{{ w.name }}</div>
                    <div class="text-[10px] font-mono text-slate-400 uppercase mt-0.5">{{ w.type }}</div>
                  </div>
                </div>
                <div *ngIf="selectedWallet?.id === w.id" class="w-2 h-2 rounded-full bg-indigo-600"></div>
              </button>
            </div>
          </div>

          <form *ngIf="showAddWallet" (ngSubmit)="handleCreateWallet()" class="mt-4 pt-4 border-t border-slate-100 space-y-3 animate-fade-in">
            <input
              type="text"
              required
              placeholder="Nom du portefeuille..."
              [(ngModel)]="walletName"
              name="walletName"
              class="w-full bg-slate-50 text-xs text-slate-800 px-3 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:outline-none focus:bg-white"
            />
            <div class="flex gap-2">
              <select
                [(ngModel)]="walletType"
                name="walletType"
                class="flex-1 bg-slate-50 text-xs text-slate-500 px-2.5 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:outline-none focus:bg-white"
              >
                <option [value]="WalletType.PERSONAL">PERSONNEL</option>
                <option [value]="WalletType.SAVINGS">ÉPARGNE</option>
                <option [value]="WalletType.BUSINESS">COMMERCIAL</option>
              </select>
              <button type="submit" class="bg-indigo-600 text-white text-xs font-semibold px-4 py-2 rounded-xl hover:bg-indigo-700 cursor-pointer shadow-sm">
                Créer
              </button>
            </div>
          </form>
        </div>

        <!-- Center: Live Real-time Balance Snapshot Card -->
        <div class="bg-gradient-to-br from-indigo-900 to-slate-900 border border-indigo-950 p-6 rounded-2xl flex flex-col justify-between relative overflow-hidden shadow-md">
          <div class="absolute top-[-10px] right-[-10px] w-32 h-32 bg-white/5 rounded-full blur-2xl"></div>
          <div>
            <div class="flex items-center justify-between mb-4">
              <div class="text-xs font-mono font-bold text-indigo-200 tracking-wider uppercase">Solde Disponible</div>
              <span class="text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono px-2.5 py-0.5 rounded-full uppercase tracking-wider font-bold">
                ● SYNC
              </span>
            </div>
            <div class="text-3xl font-bold text-white tracking-tight leading-tight font-sans my-2">
              {{ formatMGA(walletBalance) }}
            </div>
            <p class="text-[11px] text-indigo-200 font-mono">
              Portefeuille actif : <span class="text-white font-semibold">"{{ selectedWallet?.name || "Aucun" }}"</span>
            </p>
          </div>

          <div class="flex gap-2.5 mt-6">
            <button
              (click)="openAddTx()"
              [disabled]="!selectedWallet"
              class="flex-1 bg-white hover:bg-slate-100 text-slate-900 text-xs font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md disabled:opacity-50"
            >
              <svg class="w-4 h-4 stroke-[2.5] text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>Saisir une transaction</span>
            </button>
          </div>
        </div>

        <!-- Right: Quick Settings/Categories & System stats -->
        <div class="bg-white border border-slate-200 p-6 rounded-2xl flex flex-col justify-between shadow-sm">
          <div>
            <div class="flex items-center justify-between mb-3">
              <h3 class="text-xs font-mono font-bold text-indigo-600 tracking-wider uppercase">Catégories de Dépenses</h3>
              <button
                (click)="toggleAddCategory()"
                class="p-1.5 text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all cursor-pointer"
                title="Ajouter une catégorie"
              >
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>
            </div>

            <div class="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
              <div
                *ngFor="let c of categories"
                class="flex items-center justify-between text-xs p-1.5 hover:bg-slate-50 rounded-lg transition-colors border border-transparent hover:border-slate-100"
              >
                <div class="flex items-center gap-2">
                  <span class="w-2.5 h-2.5 rounded-full shrink-0" [style.background-color]="c.color || '#94a3b8'"></span>
                  <span class="text-slate-700 font-medium truncate max-w-[150px]">{{ c.name }}</span>
                </div>
                <button
                  *ngIf="!c.is_system"
                  (click)="handleDeleteCategory(c.id)"
                  class="text-slate-400 hover:text-rose-600 p-0.5 transition-colors cursor-pointer"
                >
                  <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <form *ngIf="showAddCategory" (ngSubmit)="handleCreateCategory()" class="mt-3 pt-3 border-t border-slate-100 space-y-2 animate-fade-in">
            <input
              type="text"
              required
              placeholder="Nom de la catégorie..."
              [(ngModel)]="newCatName"
              name="newCatName"
              class="w-full bg-slate-50 text-xs text-slate-800 px-3 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:outline-none focus:bg-white"
            />
            <div class="flex gap-2">
              <input
                type="color"
                [(ngModel)]="newCatColor"
                name="newCatColor"
                class="w-10 h-8 bg-transparent border-0 cursor-pointer p-0 shrink-0"
              />
              <button type="submit" class="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold py-1.5 rounded-xl cursor-pointer">
                Ajouter
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Popups & Drawers -->
      <div *ngIf="showAddTx" class="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div class="w-full max-w-lg bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl relative">
          <h2 class="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
            <svg class="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>Ajouter une Nouvelle Transaction</span>
          </h2>

          <form (ngSubmit)="handleAddTransaction()" class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-semibold text-slate-600 mb-1.5">Type de transaction</label>
                <select
                  [(ngModel)]="txType"
                  name="txType"
                  class="w-full bg-slate-50 text-xs text-slate-800 px-3 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:outline-none"
                >
                  <option [value]="TransactionType.EXPENSE">Dépense (EXPENSE)</option>
                  <option [value]="TransactionType.INCOME">Revenu (INCOME)</option>
                  <option [value]="TransactionType.TRANSFER">Transfert (TRANSFER)</option>
                  <option [value]="TransactionType.REFUND">Remboursement (REFUND)</option>
                  <option [value]="TransactionType.SUBSCRIPTION">Abonnement (SUBSCRIPTION)</option>
                </select>
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-600 mb-1.5">Catégorie</label>
                <select
                  [(ngModel)]="txCategory"
                  name="txCategory"
                  class="w-full bg-slate-50 text-xs text-slate-800 px-3 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="">Sélectionner une catégorie...</option>
                  <option *ngFor="let c of categories" [value]="c.id">
                    {{ c.name }}
                  </option>
                </select>
              </div>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1.5">Montant (Ariary - MGA)</label>
              <div class="relative">
                <div class="absolute left-3 top-2.5 text-xs text-indigo-600 font-bold">Ar</div>
                <input
                  type="number"
                  required
                  [(ngModel)]="txAmount"
                  name="txAmount"
                  placeholder="Ex: 25000"
                  class="w-full bg-slate-50 text-xs text-slate-900 pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:outline-none font-mono font-bold"
                />
              </div>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1.5">Description / Note</label>
              <input
                type="text"
                [(ngModel)]="txDescription"
                name="txDescription"
                placeholder="Ex: Achat de fournitures"
                class="w-full bg-slate-50 text-xs text-slate-800 px-3 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-semibold text-slate-600 mb-1.5 font-mono">Référence ID (Optionnel)</label>
                <input
                  type="text"
                  [(ngModel)]="txReference"
                  name="txReference"
                  placeholder="Ex: REF-9902"
                  class="w-full bg-slate-50 text-xs text-slate-800 px-3 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-600 mb-1.5">Canal / Source</label>
                <select
                  [(ngModel)]="txSource"
                  name="txSource"
                  class="w-full bg-slate-50 text-xs text-slate-800 px-3 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="Espèces">Espèces (Cash)</option>
                  <option value="Mobile Money">Mobile Money (Mvola/Airtel/Orange)</option>
                  <option value="Virement">Virement Bancaire</option>
                  <option value="Carte">Carte Bancaire</option>
                </select>
              </div>
            </div>

            <div class="flex gap-3 justify-end pt-4 border-t border-slate-100">
              <button
                type="button"
                (click)="closeAddTx()"
                class="bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold px-4 py-2.5 rounded-xl cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="submit"
                class="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl cursor-pointer shadow-sm shadow-indigo-500/10"
              >
                Enregistrer
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Main Bottom Section: Budgets, Saving Goals and Transaction list -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- Left Column: Budgets & Savings Goals Tracking -->
        <div class="lg:col-span-1 space-y-8">
          <!-- Categories Budget Manager -->
          <div class="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-xs font-mono font-bold text-indigo-600 tracking-wider uppercase">Budgets Mensuels</h3>
              <button
                (click)="toggleAddBudget()"
                class="text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 p-1.5 rounded-lg transition-all cursor-pointer"
                title="Fixer un budget"
              >
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>
            </div>

            <form *ngIf="showAddBudget" (ngSubmit)="handleAddBudget()" class="bg-slate-50 p-4 rounded-xl mb-4 border border-slate-200 space-y-3 animate-fade-in">
              <div>
                <label class="block text-[10px] font-mono text-slate-400 uppercase mb-1 font-bold">Catégorie</label>
                <select
                  [(ngModel)]="budgetCategory"
                  name="budgetCategory"
                  class="w-full bg-white text-xs text-slate-800 px-2.5 py-2 rounded-lg border border-slate-200 focus:border-indigo-500 focus:outline-none"
                >
                  <option *ngFor="let c of categories" [value]="c.id">
                    {{ c.name }}
                  </option>
                </select>
              </div>
              <div>
                <label class="block text-[10px] font-mono text-slate-400 uppercase mb-1 font-bold font-mono">Limite Mensuelle (MGA)</label>
                <input
                  type="number"
                  required
                  [(ngModel)]="budgetLimit"
                  name="budgetLimit"
                  class="w-full bg-white text-xs text-slate-800 px-2.5 py-2 rounded-lg border border-slate-200 focus:border-indigo-500 focus:outline-none"
                  placeholder="300000"
                />
              </div>
              <div class="flex gap-2">
                <select
                  [(ngModel)]="budgetPeriod"
                  name="budgetPeriod"
                  class="flex-1 bg-white text-xs text-slate-500 px-2.5 py-2 rounded-lg border border-slate-200 focus:border-indigo-500 focus:outline-none"
                >
                  <option [value]="BudgetPeriod.DAILY">JOURNALIER</option>
                  <option [value]="BudgetPeriod.WEEKLY">HEBDOMADAIRE</option>
                  <option [value]="BudgetPeriod.MONTHLY">MENSUEL</option>
                  <option [value]="BudgetPeriod.YEARLY">ANNUEL</option>
                </select>
                <button type="submit" class="bg-indigo-600 text-white text-xs font-bold px-4 py-2 rounded-lg cursor-pointer hover:bg-indigo-700">
                  Définir
                </button>
              </div>
            </form>

            <div class="space-y-4 max-h-[220px] overflow-y-auto pr-1">
              <div *ngIf="budgets.length === 0" class="text-center py-6 text-xs text-slate-400">Aucun plafond budgétaire configuré.</div>
              <div *ngFor="let b of budgets" class="space-y-1.5 p-3 bg-slate-50/50 rounded-xl border border-slate-200 relative group">
                <div class="flex items-center justify-between text-xs">
                  <div class="flex items-center gap-2">
                    <span class="w-2.5 h-2.5 rounded-full shrink-0" [style.background-color]="b.category.color"></span>
                    <span class="text-slate-800 font-bold truncate max-w-[120px]">{{ b.category.name }}</span>
                  </div>
                  <button
                    (click)="handleDeleteBudget(b.id)"
                    class="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600 transition-opacity p-0.5 cursor-pointer"
                  >
                    <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>

                <div class="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div
                    class="h-full rounded-full transition-all duration-500"
                    [ngClass]="{
                      'bg-rose-500': b.spent_amount > b.limit_amount,
                      'bg-indigo-600': b.spent_amount <= b.limit_amount
                    }"
                    [style.width.%]="getBudgetPercentage(b)"
                  ></div>
                </div>

                <div class="flex items-center justify-between text-[10px] font-mono">
                  <span class="text-slate-500">Dépensé : {{ formatMGA(b.spent_amount) }}</span>
                  <span [ngClass]="{ 'text-rose-600 font-bold': b.spent_amount > b.limit_amount, 'text-indigo-600 font-bold': b.spent_amount <= b.limit_amount }">
                    {{ getBudgetPercentage(b) }}% ({{ formatMGA(b.limit_amount) }})
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Saving Goals Trackers -->
          <div class="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-xs font-mono font-bold text-indigo-600 tracking-wider uppercase">Objectifs d'Épargne</h3>
              <button
                (click)="toggleAddGoal()"
                class="text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 p-1.5 rounded-lg transition-all cursor-pointer"
                title="Nouvel objectif"
              >
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>
            </div>

            <form *ngIf="showAddGoal" (ngSubmit)="handleAddGoal()" class="bg-slate-50 p-4 rounded-xl mb-4 border border-slate-200 space-y-3 animate-fade-in">
              <div>
                <label class="block text-[10px] font-mono text-slate-400 uppercase mb-1 font-bold">Nom du projet</label>
                <input
                  type="text"
                  required
                  [(ngModel)]="goalName"
                  name="goalName"
                  class="w-full bg-white text-xs text-slate-800 px-2.5 py-2 rounded-lg border border-slate-200 focus:border-indigo-500 focus:outline-none"
                  placeholder="Ex: Voyage ou achat matériel"
                />
              </div>
              <div class="grid grid-cols-2 gap-2">
                <div>
                  <label class="block text-[10px] font-mono text-slate-400 uppercase mb-1 font-bold">Montant cible</label>
                  <input
                    type="number"
                    required
                    [(ngModel)]="goalTarget"
                    name="goalTarget"
                    class="w-full bg-white text-xs text-slate-800 px-2.5 py-2 rounded-lg border border-slate-200 focus:border-indigo-500 focus:outline-none"
                    placeholder="1000000"
                  />
                </div>
                <div>
                  <label class="block text-[10px] font-mono text-slate-400 uppercase mb-1 font-bold">Déjà épargné</label>
                  <input
                    type="number"
                    [(ngModel)]="goalCurrent"
                    name="goalCurrent"
                    class="w-full bg-white text-xs text-slate-800 px-2.5 py-2 rounded-lg border border-slate-200 focus:border-indigo-500 focus:outline-none"
                    placeholder="100000"
                  />
                </div>
              </div>
              <div>
                <label class="block text-[10px] font-mono text-slate-400 uppercase mb-1 font-bold">Échéance</label>
                <input
                  type="date"
                  required
                  [(ngModel)]="goalDeadline"
                  name="goalDeadline"
                  class="w-full bg-white text-xs text-slate-500 px-2.5 py-2 rounded-lg border border-slate-200 focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <button type="submit" class="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2 rounded-lg cursor-pointer">
                Créer l'objectif
              </button>
            </form>

            <div class="space-y-4 max-h-[220px] overflow-y-auto pr-1">
              <div *ngIf="goals.length === 0" class="text-center py-6 text-xs text-slate-400">Aucun objectif d'épargne en cours.</div>
              <div *ngFor="let g of goals" class="space-y-1.5 p-3 bg-slate-50/50 rounded-xl border border-slate-200 relative group">
                <div class="flex items-center justify-between text-xs">
                  <div class="flex items-center gap-2">
                    <svg class="w-4 h-4 text-indigo-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="16" />
                      <line x1="8" y1="12" x2="16" y2="12" />
                    </svg>
                    <span class="text-slate-800 font-bold truncate max-w-[120px]">{{ g.name }}</span>
                  </div>
                  <button
                    (click)="handleDeleteGoal(g.id)"
                    class="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600 transition-opacity p-0.5 cursor-pointer"
                  >
                    <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>

                <div class="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div class="h-full bg-indigo-600 rounded-full transition-all duration-500" [style.width.%]="getGoalPercentage(g)"></div>
                </div>

                <div class="flex items-center justify-between text-[10px] font-mono text-slate-500">
                  <span>Épargné : {{ formatMGA(g.current_amount) }}</span>
                  <span class="text-indigo-600 font-bold">{{ getGoalPercentage(g) }}% ({{ formatMGA(g.target_amount) }})</span>
                </div>
                <div class="text-[9px] font-mono text-slate-400 flex items-center gap-1 font-bold">
                  <svg class="w-3 h-3 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  <span>Date limite : {{ formatDate(g.deadline) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Right Columns (2x): Real-time Transaction Reporting & Interactive List -->
        <div class="lg:col-span-2 bg-white border border-slate-200 p-6 rounded-2xl flex flex-col justify-between shadow-sm">
          <div>
            <div class="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h3 class="text-xs font-mono font-bold text-indigo-600 tracking-wider uppercase">Flux des Transactions</h3>
              <div class="flex items-center gap-2">
                <select
                  [(ngModel)]="filterType"
                  (change)="applyFilter()"
                  class="bg-slate-50 text-[10px] text-slate-600 px-2 py-1.5 rounded-lg border border-slate-200 focus:outline-none"
                >
                  <option value="">TOUTES</option>
                  <option [value]="TransactionType.INCOME">REVENUS (INCOME)</option>
                  <option [value]="TransactionType.EXPENSE">DÉPENSES (EXPENSE)</option>
                  <option [value]="TransactionType.TRANSFER">TRANSFERTS (TRANSFER)</option>
                </select>
                <button
                  (click)="onRefresh()"
                  class="p-1.5 text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all cursor-pointer"
                >
                  <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                  </svg>
                </button>
              </div>
            </div>

            <div class="overflow-x-auto">
              <table class="w-full text-xs text-left text-slate-600 border-collapse">
                <thead>
                  <tr class="border-b border-slate-200 text-slate-400 text-[10px] uppercase font-mono font-bold">
                    <th class="py-2.5">Date</th>
                    <th class="py-2.5">Référence</th>
                    <th className="py-2.5">Catégorie</th>
                    <th class="py-2.5">Description</th>
                    <th class="py-2.5 text-right">Montant</th>
                    <th class="py-2.5 text-center">IA Gemini</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  <tr *ngIf="filteredTransactions.length === 0">
                    <td colSpan="6" class="py-8 text-center text-slate-400">Aucune transaction enregistrée sous ce filtre.</td>
                  </tr>
                  <tr *ngFor="let tx of filteredTransactions" class="hover:bg-slate-50/80 transition-colors">
                    <td class="py-3 text-[11px] font-mono whitespace-nowrap text-slate-500">
                      {{ formatDate(tx.transaction_datetime) }}
                    </td>
                    <td class="py-3 font-mono text-[10px] text-slate-400 truncate max-w-[80px]" [title]="tx.reference">
                      {{ tx.reference || "N/A" }}
                    </td>
                    <td class="py-3">
                      <div class="flex items-center gap-1.5">
                        <span class="w-2 h-2 rounded-full shrink-0" [style.background-color]="tx.category?.color || '#94a3b8'"></span>
                        <span class="text-slate-700 font-bold truncate max-w-[100px]">{{ tx.category?.name }}</span>
                      </div>
                    </td>
                    <td class="py-3 text-slate-600 truncate max-w-[120px]" [title]="tx.description">
                      {{ tx.description }}
                    </td>
                    <td
                      class="py-3 text-right font-bold font-mono whitespace-nowrap"
                      [ngClass]="{
                        'text-emerald-600': tx.type === TransactionType.INCOME || tx.type === TransactionType.REFUND,
                        'text-rose-600': tx.type !== TransactionType.INCOME && tx.type !== TransactionType.REFUND
                      }"
                    >
                      {{ tx.type === TransactionType.INCOME || tx.type === TransactionType.REFUND ? "+" : "-" }}
                      {{ formatMGA(tx.amount) }}
                    </td>
                    <td class="py-3 text-center">
                      <button
                        (click)="analyzeTransaction(tx)"
                        class="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-100 text-[10px] font-bold px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 mx-auto cursor-pointer shadow-sm"
                      >
                        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                          <rect x="4" y="4" width="16" height="16" rx="2" />
                          <rect x="9" y="9" width="6" height="6" />
                          <line x1="9" y1="1" x2="9" y2="4" />
                          <line x1="15" y1="1" x2="15" y2="4" />
                          <line x1="9" y1="20" x2="9" y2="23" />
                          <line x1="15" y1="20" x2="15" y2="23" />
                          <line x1="20" y1="9" x2="23" y2="9" />
                          <line x1="20" y1="15" x2="23" y2="15" />
                          <line x1="1" y1="9" x2="4" y2="9" />
                          <line x1="1" y1="15" x2="4" y2="15" />
                        </svg>
                        <span>Analyser</span>
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class DashboardComponent implements OnChanges {
  @Input() token = "";
  @Input() userId = "";
  @Input() selectedWallet: Wallet | null = null;
  @Input() wallets: Wallet[] = [];
  @Input() refreshTrigger = 0;

  @Output() walletSelected = new EventEmitter<Wallet>();
  @Output() analyzeTx = new EventEmitter<WalletTransaction>();
  @Output() triggerRefresh = new EventEmitter<void>();

  transactions: WalletTransaction[] = [];
  categories: TransactionCategory[] = [];
  budgets: Budget[] = [];
  goals: Goal[] = [];
  filteredTransactions: WalletTransaction[] = [];

  walletBalance = 0;

  // Form toggles & fields
  showAddTx = false;
  txAmount = "";
  txType: TransactionType = TransactionType.EXPENSE;
  txCategory = "";
  txDescription = "";
  txReference = "";
  txSource = "Espèces";

  showAddWallet = false;
  walletName = "";
  walletType: WalletType = WalletType.PERSONAL;

  showAddBudget = false;
  budgetLimit = "";
  budgetCategory = "";
  budgetPeriod: BudgetPeriod = BudgetPeriod.MONTHLY;

  showAddGoal = false;
  goalName = "";
  goalTarget = "";
  goalCurrent = "";
  goalDeadline = "";

  showAddCategory = false;
  newCatName = "";
  newCatIcon = "Tag";
  newCatColor = "#4f46e5";

  filterType = "";
  error: string | null = null;
  loading = false;

  WalletType = WalletType;
  TransactionType = TransactionType;
  BudgetPeriod = BudgetPeriod;

  ngOnChanges(changes: SimpleChanges) {
    if ((changes['userId'] || changes['selectedWallet'] || changes['refreshTrigger']) && this.userId && this.selectedWallet) {
      this.fetchData();
    }
  }

  async fetchData() {
    if (!this.userId || !this.selectedWallet) return;
    this.loading = true;
    this.error = null;
    const headers = { Authorization: `Bearer ${this.token}` };

    try {
      // 1. Balance
      const balanceRes = await fetch(`/api/users/${this.userId}/wallets/${this.selectedWallet.id}/balance`, { headers });
      if (balanceRes.ok) {
        const balData = await balanceRes.json();
        this.walletBalance = balData.balance;
      }

      // 2. Transactions
      const txRes = await fetch(`/api/users/${this.userId}/wallets/${this.selectedWallet.id}/transactions`, { headers });
      if (txRes.ok) {
        this.transactions = await txRes.json();
        this.applyFilter();
      }

      // 3. Categories
      const catRes = await fetch(`/api/users/${this.userId}/categories`, { headers });
      if (catRes.ok) {
        this.categories = await catRes.json();
        if (this.categories.length > 0 && !this.txCategory) {
          this.txCategory = this.categories[0].id;
          this.budgetCategory = this.categories[0].id;
        }
      }

      // 4. Budgets
      const budgetRes = await fetch(`/api/users/${this.userId}/wallets/${this.selectedWallet.id}/budgets`, { headers });
      if (budgetRes.ok) {
        this.budgets = await budgetRes.json();
      }

      // 5. Goals
      const goalsRes = await fetch(`/api/users/${this.userId}/wallets/${this.selectedWallet.id}/goals`, { headers });
      if (goalsRes.ok) {
        this.goals = await goalsRes.json();
      }
    } catch (err: any) {
      this.error = "Erreur lors de la synchronisation : " + err.message;
    } finally {
      this.loading = false;
    }
  }

  applyFilter() {
    if (!this.filterType) {
      this.filteredTransactions = this.transactions;
    } else {
      this.filteredTransactions = this.transactions.filter((tx) => tx.type === this.filterType);
    }
  }

  onRefresh() {
    this.triggerRefresh.emit();
  }

  selectWallet(w: Wallet) {
    this.walletSelected.emit(w);
  }

  toggleAddWallet() {
    this.showAddWallet = !this.showAddWallet;
  }

  toggleAddCategory() {
    this.showAddCategory = !this.showAddCategory;
  }

  toggleAddBudget() {
    this.showAddBudget = !this.showAddBudget;
  }

  toggleAddGoal() {
    this.showAddGoal = !this.showAddGoal;
  }

  openAddTx() {
    this.showAddTx = true;
  }

  closeAddTx() {
    this.showAddTx = false;
  }

  async handleCreateWallet() {
    this.error = null;
    if (!this.walletName.trim()) {
      this.error = "Le nom du portefeuille est obligatoire.";
      return;
    }

    try {
      const res = await fetch(`/api/users/${this.userId}/wallets`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.token}`
        },
        body: JSON.stringify({
          name: this.walletName,
          type: this.walletType,
          currency: "MGA"
        })
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || "Échec de la création.");
      }

      this.walletName = "";
      this.showAddWallet = false;
      this.triggerRefresh.emit();
    } catch (err: any) {
      this.error = err.message;
    }
  }

  async handleCreateCategory() {
    this.error = null;
    if (!this.newCatName.trim()) {
      this.error = "Le nom de la catégorie est obligatoire.";
      return;
    }

    try {
      const res = await fetch(`/api/users/${this.userId}/categories`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.token}`
        },
        body: JSON.stringify([{
          name: this.newCatName,
          icon: this.newCatIcon,
          color: this.newCatColor
        }])
      });

      if (!res.ok) {
        throw new Error("Échec de la création de la catégorie.");
      }

      this.newCatName = "";
      this.showAddCategory = false;
      this.triggerRefresh.emit();
    } catch (err: any) {
      this.error = err.message;
    }
  }

  async handleDeleteCategory(catId: string) {
    this.error = null;
    try {
      const res = await fetch(`/api/users/${this.userId}/categories/${catId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${this.token}` }
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || "Impossible de supprimer cette catégorie.");
      }
      this.triggerRefresh.emit();
    } catch (err: any) {
      this.error = err.message;
    }
  }

  async handleAddTransaction() {
    this.error = null;
    const amountNum = parseFloat(this.txAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      this.error = "Veuillez saisir un montant valide.";
      return;
    }
    if (!this.txCategory) {
      this.error = "Le choix d'une catégorie est obligatoire.";
      return;
    }

    try {
      const res = await fetch(`/api/users/${this.userId}/wallets/${this.selectedWallet?.id}/transactions`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.token}`
        },
        body: JSON.stringify({
          category: this.txCategory,
          amount: amountNum,
          type: this.txType,
          status: TransactionStatus.COMPLETED,
          description: this.txDescription || "Action Portefeuille Harena",
          reference: this.txReference,
          source: this.txSource
        })
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || "Erreur de validation.");
      }

      this.txAmount = "";
      this.txDescription = "";
      this.txReference = "";
      this.txSource = "Espèces";
      this.showAddTx = false;
      this.triggerRefresh.emit();
    } catch (err: any) {
      this.error = err.message;
    }
  }

  async handleAddBudget() {
    this.error = null;
    const limitNum = parseFloat(this.budgetLimit);
    if (isNaN(limitNum) || limitNum <= 0) {
      this.error = "Veuillez saisir un plafond budgétaire valide.";
      return;
    }

    try {
      const res = await fetch(`/api/users/${this.userId}/budgets`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.token}`
        },
        body: JSON.stringify({
          wallet: this.selectedWallet?.id,
          category: this.budgetCategory,
          limit_amount: limitNum,
          period_type: this.budgetPeriod
        })
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || "Impossible de configurer le budget.");
      }

      this.budgetLimit = "";
      this.showAddBudget = false;
      this.triggerRefresh.emit();
    } catch (err: any) {
      this.error = err.message;
    }
  }

  async handleDeleteBudget(budgetId: string) {
    this.error = null;
    try {
      const res = await fetch(`/api/users/${this.userId}/budgets/${budgetId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${this.token}` }
      });
      if (res.ok) {
        this.triggerRefresh.emit();
      }
    } catch (err: any) {
      this.error = err.message;
    }
  }

  async handleAddGoal() {
    this.error = null;
    const targetNum = parseFloat(this.goalTarget);
    const currentNum = parseFloat(this.goalCurrent || "0");

    if (isNaN(targetNum) || targetNum <= 0) {
      this.error = "Veuillez saisir un montant cible valide.";
      return;
    }

    try {
      const res = await fetch(`/api/users/${this.userId}/wallets/${this.selectedWallet?.id}/goals`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.token}`
        },
        body: JSON.stringify({
          name: this.goalName,
          target_amount: targetNum,
          current_amount: currentNum,
          deadline: this.goalDeadline,
          status: GoalStatus.IN_PROGRESS
        })
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || "Échec d'enregistrement.");
      }

      this.goalName = "";
      this.goalTarget = "";
      this.goalCurrent = "";
      this.goalDeadline = "";
      this.showAddGoal = false;
      this.triggerRefresh.emit();
    } catch (err: any) {
      this.error = err.message;
    }
  }

  async handleDeleteGoal(goalId: string) {
    this.error = null;
    try {
      const res = await fetch(`/api/users/${this.userId}/goals/${goalId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${this.token}` }
      });
      if (res.ok) {
        this.triggerRefresh.emit();
      }
    } catch (err: any) {
      this.error = err.message;
    }
  }

  analyzeTransaction(tx: WalletTransaction) {
    this.analyzeTx.emit(tx);
  }

  getBudgetPercentage(b: Budget): number {
    return Math.min(100, Math.round((b.spent_amount / b.limit_amount) * 100));
  }

  getGoalPercentage(g: Goal): number {
    return Math.min(100, Math.round((g.current_amount / g.target_amount) * 100));
  }

  formatMGA(num: number): string {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "MGA",
      minimumFractionDigits: 0
    })
      .format(num)
      .replace("MGA", "Ar");
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  }
}
