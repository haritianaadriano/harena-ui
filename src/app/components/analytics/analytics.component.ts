/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Component, Input, OnChanges, SimpleChanges } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Wallet, WalletTransaction, TransactionCategory, TransactionType } from "../../../types";

interface CategoryTotal {
  category: TransactionCategory;
  total: number;
  percentage: number;
}

interface MonthlyTrend {
  label: string;
  amount: number;
  x: number;
  y: number;
}

@Component({
  selector: "app-analytics",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-8 animate-fade-in">
      <!-- High-Level Financial Performance Metrics -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span class="text-xs font-mono font-bold text-indigo-600 tracking-wider uppercase">Revenus Globaux</span>
            <div class="text-2xl font-bold text-slate-900 mt-1 font-mono tracking-tight">{{ formatMGA(totalIncome) }}</div>
            <p class="text-[10px] text-slate-400 mt-1">Cumul total des entrées d'argent.</p>
          </div>
          <div class="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 shrink-0">
            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="19" x2="12" y2="5" />
              <polyline points="5 12 12 5 19 12" />
            </svg>
          </div>
        </div>

        <div class="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span class="text-xs font-mono font-bold text-indigo-600 tracking-wider uppercase">Dépenses Globales</span>
            <div class="text-2xl font-bold text-slate-900 mt-1 font-mono tracking-tight">{{ formatMGA(totalExpense) }}</div>
            <p class="text-[10px] text-slate-400 mt-1">Cumul total des sorties et abonnements.</p>
          </div>
          <div class="w-12 h-12 bg-rose-50 rounded-xl flex items-center justify-center text-rose-600 shrink-0">
            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <polyline points="19 12 12 19 5 12" />
            </svg>
          </div>
        </div>

        <div class="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span class="text-xs font-mono font-bold text-indigo-600 tracking-wider uppercase">Taux d'Épargne</span>
            <div class="text-2xl font-bold text-slate-900 mt-1 font-mono tracking-tight">{{ savingsRate }}%</div>
            <p class="text-[10px] text-slate-400 mt-1">Proportion des revenus mise de côté.</p>
          </div>
          <div class="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 shrink-0">
            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
        </div>
      </div>

      <!-- Bento-style Analytics Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <!-- 3-span column: Spending trend over time -->
        <div class="lg:col-span-3 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm flex flex-col justify-between">
          <div>
            <h3 class="text-sm font-bold text-slate-900 mb-1">Évolution Chronologique des Dépenses</h3>
            <p class="text-xs text-slate-400 mb-6">Répartition par tranches temporelles de vos sorties de fonds.</p>

            <!-- Custom Mathematical SVG Trend Area Chart -->
            <div class="relative w-full h-[240px] bg-slate-50/50 rounded-xl border border-slate-100 p-4">
              <div *ngIf="trendData.length === 0" class="absolute inset-0 flex items-center justify-center text-xs text-slate-400">
                Données insuffisantes pour tracer la courbe.
              </div>
              <svg *ngIf="trendData.length > 0" class="w-full h-full" viewBox="0 0 500 200" preserveAspectRatio="none">
                <defs>
                  <!-- Area gradient -->
                  <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#4f46e5" stop-opacity="0.25" />
                    <stop offset="100%" stop-color="#4f46e5" stop-opacity="0.0" />
                  </linearGradient>
                </defs>

                <!-- Grid lines -->
                <line x1="0" y1="50" x2="500" y2="50" stroke="#f1f5f9" stroke-width="1" />
                <line x1="0" y1="100" x2="500" y2="100" stroke="#f1f5f9" stroke-width="1" />
                <line x1="0" y1="150" x2="500" y2="150" stroke="#f1f5f9" stroke-width="1" />

                <!-- Trend Line path (Bezier interpolation or direct segments) -->
                <path [attr.d]="trendAreaPath" fill="url(#areaGradient)" />
                <path [attr.d]="trendLinePath" fill="none" stroke="#4f46e5" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />

                <!-- Trend Data points -->
                <circle *ngFor="let pt of trendData" [attr.cx]="pt.x" [attr.cy]="pt.y" r="4" fill="#ffffff" stroke="#4f46e5" stroke-width="2.5" />
              </svg>
            </div>

            <!-- Trend Labels -->
            <div class="flex justify-between items-center px-4 mt-3 text-[10px] font-mono text-slate-400 uppercase font-bold">
              <span *ngFor="let pt of trendData">{{ pt.label }}</span>
            </div>
          </div>
        </div>

        <!-- 2-span column: Spending distribution by category -->
        <div class="lg:col-span-2 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm flex flex-col justify-between">
          <div>
            <h3 class="text-sm font-bold text-slate-900 mb-1">Ventilation par Catégories</h3>
            <p class="text-xs text-slate-400 mb-6">Proportion des fonds consommés par poste de dépenses.</p>

            <div class="flex flex-col items-center justify-center">
              <!-- Custom Angular mathematical SVG donut chart -->
              <div class="relative w-44 h-44 mb-6">
                <svg class="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" fill="transparent" stroke="#f1f5f9" stroke-width="12" />
                  <circle
                    *ngFor="let cat of catTotals; let idx = index"
                    cx="50"
                    cy="50"
                    r="40"
                    fill="transparent"
                    [attr.stroke]="cat.category.color"
                    stroke-width="12"
                    [attr.stroke-dasharray]="getStrokeDashArray(cat.percentage)"
                    [attr.stroke-dashoffset]="getStrokeDashOffset(idx)"
                    stroke-linecap="round"
                    class="transition-all duration-700 ease-out"
                  />
                </svg>
                <div class="absolute inset-0 flex flex-col items-center justify-center">
                  <span class="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider">Total</span>
                  <span class="text-sm font-bold text-slate-800 font-mono mt-0.5">{{ formatMGA(totalExpense) }}</span>
                </div>
              </div>

              <!-- Legends -->
              <div class="w-full space-y-2.5 max-h-[160px] overflow-y-auto pr-1">
                <div *ngIf="catTotals.length === 0" class="text-center text-xs text-slate-400 py-4">
                  Aucune dépense enregistrée.
                </div>
                <div *ngFor="let cat of catTotals" class="flex items-center justify-between text-xs">
                  <div class="flex items-center gap-2">
                    <span class="w-3 h-3 rounded-full shrink-0" [style.background-color]="cat.category.color"></span>
                    <span class="text-slate-700 font-medium truncate max-w-[120px]">{{ cat.category.name }}</span>
                  </div>
                  <div class="text-right font-mono font-semibold">
                    <span class="text-slate-900">{{ formatMGA(cat.total) }}</span>
                    <span class="text-slate-400 ml-1.5 text-[10px]">({{ cat.percentage }}%)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class AnalyticsComponent implements OnChanges {
  @Input() selectedWallet: Wallet | null = null;
  @Input() transactions: WalletTransaction[] = [];

  totalIncome = 0;
  totalExpense = 0;
  savingsRate = 0;

  catTotals: CategoryTotal[] = [];
  trendData: MonthlyTrend[] = [];

  trendLinePath = "";
  trendAreaPath = "";

  ngOnChanges(changes: SimpleChanges) {
    if (changes['transactions']) {
      this.calculateMetrics();
    }
  }

  calculateMetrics() {
    this.totalIncome = 0;
    this.totalExpense = 0;

    const expenseMap = new Map<string, { category: TransactionCategory; total: number }>();

    // Temporal trend mapping (grouping by last 5 transactions or days)
    const timeline: { label: string; amount: number }[] = [];

    // Reverse transaction array to read chronological order
    const chronTx = [...this.transactions].reverse();

    for (const tx of chronTx) {
      if (tx.type === TransactionType.INCOME || tx.type === TransactionType.REFUND) {
        this.totalIncome += tx.amount;
      } else {
        this.totalExpense += tx.amount;

        // Group by category
        if (tx.category) {
          const catId = tx.category.id;
          const current = expenseMap.get(catId) || { category: tx.category, total: 0 };
          current.total += tx.amount;
          expenseMap.set(catId, current);
        }

        // Gather timeline trend (using short date format)
        const d = new Date(tx.transaction_datetime);
        const lbl = d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
        timeline.push({ label: lbl, amount: tx.amount });
      }
    }

    // Savings rate calculation
    if (this.totalIncome > 0) {
      const netSavings = this.totalIncome - this.totalExpense;
      this.savingsRate = Math.max(0, Math.round((netSavings / this.totalIncome) * 100));
    } else {
      this.savingsRate = 0;
    }

    // Category Breakdown Percentages
    const totals: CategoryTotal[] = [];
    expenseMap.forEach((val) => {
      const pct = this.totalExpense > 0 ? Math.round((val.total / this.totalExpense) * 100) : 0;
      totals.push({
        category: val.category,
        total: val.total,
        percentage: pct
      });
    });
    // Sort descending by total
    this.catTotals = totals.sort((a, b) => b.total - a.total);

    // Build timeline coords for SVG trend area chart (maximum 6 data points)
    const recentTrend = timeline.slice(-6);
    if (recentTrend.length > 0) {
      const maxVal = Math.max(...recentTrend.map((t) => t.amount), 1);
      const stepX = 500 / Math.max(recentTrend.length - 1, 1);

      this.trendData = recentTrend.map((t, idx) => {
        const x = idx * stepX;
        // SVG coordinates: (0,0) is top-left, so invert Y
        const y = 180 - (t.amount / maxVal) * 140; // max height scale 140px, keeping 20px padding top/bottom
        return {
          label: t.label,
          amount: t.amount,
          x,
          y
        };
      });

      // Construct SVG line & area path strings
      let linePath = "";
      let areaPath = "";

      this.trendData.forEach((pt, idx) => {
        if (idx === 0) {
          linePath = `M ${pt.x},${pt.y}`;
          areaPath = `M ${pt.x},180 L ${pt.x},${pt.y}`;
        } else {
          // Add a smooth Bezier control curve between points
          const prev = this.trendData[idx - 1];
          const cpX1 = prev.x + stepX / 2;
          const cpY1 = prev.y;
          const cpX2 = pt.x - stepX / 2;
          const cpY2 = pt.y;
          linePath += ` C ${cpX1},${cpY1} ${cpX2},${cpY2} ${pt.x},${pt.y}`;
          areaPath += ` C ${cpX1},${cpY1} ${cpX2},${cpY2} ${pt.x},${pt.y}`;
        }
      });

      if (this.trendData.length > 0) {
        const last = this.trendData[this.trendData.length - 1];
        areaPath += ` L ${last.x},180 Z`;
      }

      this.trendLinePath = linePath;
      this.trendAreaPath = areaPath;
    } else {
      this.trendData = [];
      this.trendLinePath = "";
      this.trendAreaPath = "";
    }
  }

  getStrokeDashArray(percentage: number): string {
    const val = (percentage / 100) * 251.2;
    return `${val} 251.2`;
  }

  getStrokeDashOffset(index: number): number {
    let offset = 0;
    for (let i = 0; i < index; i++) {
      offset -= (this.catTotals[i].percentage / 100) * 251.2;
    }
    return offset;
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
}
