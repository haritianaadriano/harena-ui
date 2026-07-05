/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { AuthComponent } from "./components/auth/auth.component";
import { DashboardComponent } from "./components/dashboard/dashboard.component";
import { AnalyticsComponent } from "./components/analytics/analytics.component";
import { AiInsightsComponent } from "./components/ai-insights/ai-insights.component";
import { User, Wallet, WalletTransaction } from "../types";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [
    CommonModule,
    AuthComponent,
    DashboardComponent,
    AnalyticsComponent,
    AiInsightsComponent
  ],
  template: `
    <main class="min-h-screen bg-slate-50 text-slate-800">
      <!-- Unauthenticated View -->
      <app-auth *ngIf="!token" (loginSuccess)="handleLoginSuccess($event)"></app-auth>

      <!-- Authenticated Layout -->
      <div *ngIf="token" class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <!-- Modern App Navigation Header -->
        <header class="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 mb-8 border-b border-slate-200 gap-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-md shadow-indigo-600/10">
              <svg class="w-5 h-5 text-white stroke-[2.5]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path d="M3 10h18" />
              </svg>
            </div>
            <div>
              <h1 class="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                Harena
                <span class="text-[10px] bg-indigo-50 border border-indigo-100 text-indigo-600 font-mono font-bold uppercase px-1.5 py-0.5 rounded">
                  {{ currentUser?.username || "PORTFOLIO" }}
                </span>
              </h1>
              <p class="text-[11px] text-slate-400 font-semibold uppercase font-mono mt-0.5">
                Le Portefeuille Intelligent
              </p>
            </div>
          </div>

          <!-- Tab Selector Buttons -->
          <div class="flex items-center gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200 shrink-0 self-start sm:self-auto">
            <button
              (click)="setActiveTab('dashboard')"
              class="px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
              [ngClass]="{
                'bg-white text-slate-900 shadow-sm': activeTab === 'dashboard',
                'text-slate-500 hover:text-slate-900': activeTab !== 'dashboard'
              }"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="7" height="9" />
                <rect x="14" y="3" width="7" height="5" />
                <rect x="14" y="12" width="7" height="9" />
                <rect x="3" y="16" width="7" height="5" />
              </svg>
              <span>Accueil</span>
            </button>

            <button
              (click)="setActiveTab('analytics')"
              class="px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
              [ngClass]="{
                'bg-white text-slate-900 shadow-sm': activeTab === 'analytics',
                'text-slate-500 hover:text-slate-900': activeTab !== 'analytics'
              }"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
              </svg>
              <span>Analyses</span>
            </button>

            <button
              (click)="setActiveTab('ai')"
              class="px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
              [ngClass]="{
                'bg-white text-slate-900 shadow-sm': activeTab === 'ai',
                'text-slate-500 hover:text-slate-900': activeTab !== 'ai'
              }"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              <span>Conseils IA</span>
            </button>
          </div>

          <!-- User Quick-Bar & Logout -->
          <div class="flex items-center gap-3">
            <div class="bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5">
              <svg class="w-4 h-4 stroke-[2.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <span>{{ currentUser?.firstname || "Utilisateur" }}</span>
            </div>

            <button
              (click)="handleSignOut()"
              class="p-2.5 text-slate-500 hover:text-rose-600 bg-slate-100 hover:bg-rose-50 rounded-xl border border-slate-200 hover:border-rose-100 transition-all cursor-pointer"
              title="Se déconnecter"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
        </header>

        <!-- Dynamic View Sections -->
        <div>
          <!-- Tab 1: Dashboard component -->
          <app-dashboard
            *ngIf="activeTab === 'dashboard'"
            [token]="token"
            [userId]="userId"
            [selectedWallet]="selectedWallet"
            [wallets]="wallets"
            [refreshTrigger]="refreshTrigger"
            (walletSelected)="handleWalletSelect($event)"
            (analyzeTx)="handleAnalyzeTransaction($event)"
            (triggerRefresh)="triggerRefresh()"
          ></app-dashboard>

          <!-- Tab 2: Analytics component -->
          <app-analytics
            *ngIf="activeTab === 'analytics'"
            [selectedWallet]="selectedWallet"
            [transactions]="allTransactions"
          ></app-analytics>

          <!-- Tab 3: AI Recommendations -->
          <app-ai-insights
            *ngIf="activeTab === 'ai' || analyzingTransaction"
            [token]="token"
            [selectedWallet]="selectedWallet"
            [analyzingTransaction]="analyzingTransaction"
            (closeAnalysisModal)="handleCloseAnalysis()"
          ></app-ai-insights>
        </div>
      </div>
    </main>
  `,
  styles: []
})
export class AppComponent implements OnInit {
  token = localStorage.getItem("harena_token") || "";
  userId = localStorage.getItem("harena_uid") || "";
  currentUser: User | null = null;

  wallets: Wallet[] = [];
  selectedWallet: Wallet | null = null;
  analyzingTransaction: WalletTransaction | null = null;

  activeTab: "dashboard" | "analytics" | "ai" = "dashboard";
  refreshTrigger = 0;
  allTransactions: WalletTransaction[] = [];

  ngOnInit() {
    if (this.token) {
      this.verifySession();
    }
  }

  async verifySession() {
    try {
      const res = await fetch("/api/auth/whoami", {
        headers: { Authorization: `Bearer ${this.token}` }
      });
      if (res.ok) {
        const user = await res.json();
        this.currentUser = user;
        this.fetchWallets();
      } else {
        this.handleSignOut();
      }
    } catch (e) {
      console.error("Failed to verify session:", e);
    }
  }

  async fetchWallets() {
    if (!this.token || !this.userId) return;

    try {
      const res = await fetch(`/api/users/${this.userId}/wallets`, {
        headers: { Authorization: `Bearer ${this.token}` }
      });
      if (res.ok) {
        const list = await res.json();
        this.wallets = list;
        if (list.length > 0 && !this.selectedWallet) {
          this.selectedWallet = list[0];
        }
        this.fetchTransactions();
      }
    } catch (e) {
      console.error("Failed to load wallets:", e);
    }
  }

  async fetchTransactions() {
    if (!this.token || !this.userId || !this.selectedWallet) return;

    try {
      const res = await fetch(`/api/users/${this.userId}/wallets/${this.selectedWallet.id}/transactions`, {
        headers: { Authorization: `Bearer ${this.token}` }
      });
      if (res.ok) {
        this.allTransactions = await res.json();
      }
    } catch (e) {
      console.error("Failed to load transactions for analytics:", e);
    }
  }

  handleLoginSuccess(event: { token: string; userId: string }) {
    localStorage.setItem("harena_token", event.token);
    localStorage.setItem("harena_uid", event.userId);
    this.token = event.token;
    this.userId = event.userId;
    this.verifySession();
  }

  handleSignOut() {
    localStorage.removeItem("harena_token");
    localStorage.removeItem("harena_uid");
    this.token = "";
    this.userId = "";
    this.currentUser = null;
    this.wallets = [];
    this.selectedWallet = null;
    this.allTransactions = [];
    this.analyzingTransaction = null;
    this.activeTab = "dashboard";
  }

  handleWalletSelect(w: Wallet) {
    this.selectedWallet = w;
    this.fetchTransactions();
    this.triggerRefresh();
  }

  handleAnalyzeTransaction(tx: WalletTransaction) {
    this.analyzingTransaction = tx;
    this.activeTab = "ai";
  }

  handleCloseAnalysis() {
    this.analyzingTransaction = null;
  }

  triggerRefresh() {
    this.refreshTrigger++;
    this.fetchWallets();
  }
}
