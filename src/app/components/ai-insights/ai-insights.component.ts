/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Wallet, WalletTransaction, WalletRecommendation, TransactionAnalysis } from "../../../types";

@Component({
  selector: "app-ai-insights",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-6 animate-fade-in">
      <!-- Smart Recommendations Section -->
      <div class="bg-white border border-slate-200 p-6 rounded-2xl relative overflow-hidden shadow-sm">
        <div class="absolute top-[-20px] right-[-20px] w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl"></div>

        <div class="flex items-center justify-between mb-6">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100">
              <svg class="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </div>
            <div>
              <h3 class="text-sm font-sans font-bold text-slate-800">Conseils & Recommandations (AI Insights)</h3>
              <p class="text-[10px] text-slate-400 font-medium">Générés par l'IA Gemini selon votre historique financier</p>
            </div>
          </div>

          <button
            (click)="fetchRecommendations(true)"
            [disabled]="loadingRecs"
            class="p-1.5 text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all flex items-center gap-1 cursor-pointer text-[10px] font-mono font-bold"
          >
            <svg class="w-3.5 h-3.5" [class.animate-spin]="loadingRecs" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
            </svg>
            <span>ACTUALISER</span>
          </button>
        </div>

        <div *ngIf="loadingRecs" class="flex flex-col items-center justify-center py-12 space-y-3">
          <div class="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <p class="text-xs text-slate-400 font-mono">Calcul des indicateurs budgétaires par Gemini...</p>
        </div>

        <div *ngIf="!loadingRecs && recommendations.length === 0" class="text-center py-8 text-xs text-slate-400">
          Cliquez sur "Actualiser" pour générer les recommandations.
        </div>

        <div *ngIf="!loadingRecs && recommendations.length > 0" class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div
            *ngFor="let rec of recommendations"
            class="bg-slate-50/50 border border-slate-200 rounded-xl p-5 flex flex-col justify-between transition-all hover:border-indigo-200 hover:bg-slate-50"
          >
            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <span
                  class="text-[9px] font-mono font-bold px-2 py-0.5 rounded uppercase tracking-wider"
                  [ngClass]="{
                    'bg-rose-50 text-rose-600 border border-rose-100': rec.type === 'BUDGET_WARNING',
                    'bg-purple-50 text-purple-600 border border-purple-100': rec.type === 'INVESTMENT_IDEA',
                    'bg-emerald-50 text-emerald-600 border border-emerald-100': rec.type !== 'BUDGET_WARNING' && rec.type !== 'INVESTMENT_IDEA'
                  }"
                >
                  {{ rec.type === "BUDGET_WARNING" ? "Alerte Budget" : rec.type === "INVESTMENT_IDEA" ? "Idée d'Épargne" : "Info Santé" }}
                </span>
                <span class="text-[10px] text-slate-400 font-mono">Confiance : {{ Math.round(rec.confidence_score * 100) }}%</span>
              </div>

              <div>
                <h4 class="text-xs font-semibold text-slate-800">{{ rec.prompt }}</h4>
                <p class="text-[11px] text-slate-500 leading-relaxed mt-2">{{ rec.response }}</p>
              </div>
            </div>

            <div class="text-[9px] text-slate-400 font-mono mt-4 pt-3 border-t border-slate-100">
              Expire le : {{ formatDate(rec.expires_at) }}
            </div>
          </div>
        </div>
      </div>

      <!-- Transaction Analysis Modal/Popup -->
      <div *ngIf="analyzingTransaction" class="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
        <div class="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl relative">
          <!-- Close -->
          <button
            (click)="closeAnalysis()"
            class="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          <div class="flex items-center gap-2 mb-4">
            <svg class="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
              <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
              <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
            </svg>
            <h3 class="text-sm font-bold text-slate-900 font-sans">Analyse d'Anomalie Prédictive</h3>
          </div>

          <!-- Selected Transaction Details -->
          <div class="p-3 bg-slate-50 rounded-xl border border-slate-100 mb-5 font-mono text-xs text-slate-500 space-y-1">
            <div class="flex justify-between">
              <span>Montant :</span>
              <span class="text-slate-800 font-bold">{{ formatMGA(analyzingTransaction.amount) }}</span>
            </div>
            <div class="flex justify-between">
              <span>Description :</span>
              <span class="text-slate-700 truncate max-w-[200px]" [title]="analyzingTransaction.description">
                {{ analyzingTransaction.description }}
              </span>
            </div>
            <div class="flex justify-between">
              <span>Catégorie :</span>
              <span class="text-indigo-600 font-bold">{{ analyzingTransaction.category?.name }}</span>
            </div>
          </div>

          <div *ngIf="loadingAnalysis" class="flex flex-col items-center justify-center py-12 space-y-3">
            <div class="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <p class="text-xs text-slate-400 font-mono">Analyse statistique de la transaction...</p>
          </div>

          <div *ngIf="!loadingAnalysis && error" class="p-3 bg-rose-50 border border-rose-100 text-rose-600 text-xs rounded-xl">
            Erreur technique : {{ error }}
          </div>

          <div *ngIf="!loadingAnalysis && !error && analysis" class="space-y-5 animate-fade-in">
            <!-- Visual score bars -->
            <div class="grid grid-cols-2 gap-4">
              <!-- Financial health score -->
              <div class="bg-slate-50 p-4 rounded-xl border border-slate-100 text-center">
                <span class="text-[9px] font-mono uppercase text-slate-400 font-bold">Santé Financière</span>
                <div class="text-2xl font-bold font-mono text-indigo-600 mt-1">{{ analysis.financial_health_score }}/100</div>
                <div class="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div class="h-full bg-indigo-500 transition-all duration-500" [style.width.%]="analysis.financial_health_score"></div>
                </div>
              </div>

              <!-- Anomaly score -->
              <div class="bg-slate-50 p-4 rounded-xl border border-slate-100 text-center">
                <span class="text-[9px] font-mono uppercase text-slate-400 font-bold">Risque Anomalie</span>
                <div
                  class="text-[10px] font-mono font-bold mt-2 px-1.5 py-0.5 rounded inline-block uppercase border tracking-wide whitespace-nowrap overflow-hidden text-ellipsis max-w-full"
                  [ngClass]="getAnomalyLevel(analysis.anomaly_score).color"
                >
                  {{ getAnomalyLevel(analysis.anomaly_score).label }}
                </div>
                <div class="text-[9px] font-mono text-slate-400 mt-1">Score : {{ Math.round(analysis.anomaly_score * 100) }}%</div>
              </div>
            </div>

            <!-- Categories prediction -->
            <div class="space-y-1">
              <div class="text-[10px] font-mono uppercase text-slate-400 font-bold">Catégorie Prédite par l'IA</div>
              <div class="p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl flex items-center gap-2">
                <svg class="w-4 h-4 text-indigo-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <polygon points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                </svg>
                <span class="text-xs text-slate-700 font-medium">
                  Catégorie prédite : <strong class="text-indigo-600">{{ analysis.predicted_category || "Inconnue" }}</strong>
                </span>
              </div>
            </div>

            <!-- Sentiment assessment -->
            <div class="space-y-1">
              <div class="text-[10px] font-mono uppercase text-slate-400 font-bold">Verdict de l'Analyste Gemini</div>
              <div class="p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs text-slate-600 leading-relaxed font-sans first-letter:uppercase">
                Cette dépense présente un impact global <strong class="text-indigo-600 font-semibold">{{ analysis.sentiment || "neutre" }}</strong> sur la stabilité à long terme de votre compte. Associer rigoureusement les catégories améliore la précision des prédictions !
              </div>
            </div>

            <button
              (click)="closeAnalysis()"
              class="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2.5 rounded-xl transition-all cursor-pointer"
            >
              Compris
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class AiInsightsComponent implements OnChanges {
  @Input() token = "";
  @Input() selectedWallet: Wallet | null = null;
  @Input() analyzingTransaction: WalletTransaction | null = null;

  @Output() closeAnalysisModal = new EventEmitter<void>();

  recommendations: WalletRecommendation[] = [];
  analysis: TransactionAnalysis | null = null;

  loadingRecs = false;
  loadingAnalysis = false;
  error: string | null = null;

  ngOnChanges(changes: SimpleChanges) {
    if ((changes['selectedWallet'] || changes['token']) && this.selectedWallet) {
      this.fetchRecommendations();
    }

    if (changes['analyzingTransaction'] && this.analyzingTransaction) {
      this.fetchAnalysis();
    }
  }

  async fetchRecommendations(forceRefresh = false) {
    if (!this.selectedWallet) return;
    this.loadingRecs = true;
    this.error = null;

    try {
      const headers = { Authorization: `Bearer ${this.token}` };
      const url = `/api/wallets/${this.selectedWallet.id}/recommendations${forceRefresh ? "?refresh=true" : ""}`;
      const res = await fetch(url, { headers });

      if (!res.ok) throw new Error("Impossible de charger les analyses financières.");
      this.recommendations = await res.json();
    } catch (err: any) {
      this.error = err.message;
    } finally {
      this.loadingRecs = false;
    }
  }

  async fetchAnalysis() {
    if (!this.analyzingTransaction) {
      this.analysis = null;
      return;
    }

    this.loadingAnalysis = true;
    this.error = null;
    try {
      const res = await fetch(`/api/transactions/${this.analyzingTransaction.id}/analysis`, {
        headers: { Authorization: `Bearer ${this.token}` }
      });
      if (!res.ok) throw new Error("Impossible de charger l'analyse prédictive d'anomalie.");
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        this.analysis = data[0];
      } else {
        this.analysis = data;
      }
    } catch (err: any) {
      this.error = err.message;
    } finally {
      this.loadingAnalysis = false;
    }
  }

  closeAnalysis() {
    this.closeAnalysisModal.emit();
  }

  getAnomalyLevel(score: number) {
    if (score < 0.3) return { label: "Faible (Normal)", color: "text-emerald-600 bg-emerald-50 border-emerald-100" };
    if (score < 0.7) return { label: "Moyen (À surveiller)", color: "text-amber-600 bg-amber-50 border-amber-100" };
    return { label: "Élevé (Inhabituel)", color: "text-rose-600 bg-rose-50 border-rose-100" };
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
    return new Date(dateStr).toLocaleDateString("fr-FR");
  }
}
