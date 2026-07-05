/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Component, EventEmitter, Output, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Sex } from "../../../types";

@Component({
  selector: "app-auth",
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div id="auth_container" className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-12 relative overflow-hidden">
      <!-- Decorative Orbs -->
      <div class="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div class="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div class="w-full max-w-md bg-white border border-slate-200/80 rounded-2xl p-8 shadow-xl relative z-10">
        <div class="flex flex-col items-center mb-8">
          <div class="w-16 h-16 bg-gradient-to-tr from-indigo-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20 mb-3">
            <!-- Wallet Icon SVG -->
            <svg class="w-8 h-8 text-white stroke-[2.5]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <path d="M3 10h18" />
            </svg>
          </div>
          <h1 class="text-3xl font-bold font-sans tracking-tight text-slate-900 flex items-center gap-1.5">
            harena<span class="text-indigo-600 font-mono text-sm uppercase px-1.5 py-0.5 bg-indigo-50 rounded tracking-wider border border-indigo-100">MGA</span>
          </h1>
          <p class="text-xs text-slate-500 mt-2 text-center max-w-xs">
            Le portefeuille intelligent de suivi financier au quotidien et d'analyse en temps réel.
          </p>
        </div>

        <div *ngIf="error" class="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl flex items-start gap-2">
          <!-- Shield Icon SVG -->
          <svg class="w-4 h-4 mt-0.5 shrink-0 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <span>{{ error }}</span>
        </div>

        <form (ngSubmit)="isSignUp ? handleSignUp() : handleSignIn()" class="space-y-4">
          <div *ngIf="isSignUp" class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1.5">Prénom</label>
              <div class="relative">
                <svg class="absolute left-3 top-2.5 w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <input
                  type="text"
                  required
                  [(ngModel)]="firstname"
                  name="firstname"
                  class="w-full bg-slate-50 text-sm text-slate-900 pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:bg-white focus:outline-none transition-all"
                  placeholder="Jean"
                />
              </div>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1.5">Nom</label>
              <input
                type="text"
                required
                [(ngModel)]="lastname"
                name="lastname"
                class="w-full bg-slate-50 text-sm text-slate-900 px-3 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:bg-white focus:outline-none transition-all"
                placeholder="Rakoto"
              />
            </div>
          </div>

          <div *ngIf="isSignUp" class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1.5 font-mono">Pseudo</label>
              <input
                type="text"
                required
                [(ngModel)]="username"
                name="username"
                class="w-full bg-slate-50 text-sm text-slate-900 px-3 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:bg-white focus:outline-none transition-all font-mono"
                placeholder="jean123"
              />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1.5">Genre</label>
              <select
                [(ngModel)]="sex"
                name="sex"
                class="w-full bg-slate-50 text-sm text-slate-900 px-3 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:bg-white focus:outline-none transition-all"
              >
                <option [value]="Sex.M">Homme</option>
                <option [value]="Sex.F">Femme</option>
              </select>
            </div>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1.5">Adresse E-mail</label>
            <div class="relative">
              <svg class="absolute left-3 top-2.5 w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              <input
                type="email"
                required
                [(ngModel)]="email"
                name="email"
                class="w-full bg-slate-50 text-sm text-slate-900 pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:bg-white focus:outline-none transition-all"
                placeholder="adresse@mail.com"
              />
            </div>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1.5">Mot de passe</label>
            <div class="relative">
              <svg class="absolute left-3 top-2.5 w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <input
                type="password"
                required
                [(ngModel)]="password"
                name="password"
                class="w-full bg-slate-50 text-sm text-slate-900 pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:bg-white focus:outline-none transition-all"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            [disabled]="loading"
            class="w-full bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-semibold text-sm py-3 rounded-xl transition-all shadow-md shadow-indigo-500/10 flex items-center justify-center gap-2 mt-4 cursor-pointer"
          >
            <span *ngIf="loading" class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            <ng-container *ngIf="!loading">
              <span>{{ isSignUp ? "Créer mon compte" : "Se connecter" }}</span>
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </ng-container>
          </button>
        </form>

        <div class="relative my-6">
          <div class="absolute inset-0 flex items-center">
            <div class="w-full border-t border-slate-200"></div>
          </div>
          <div class="relative flex justify-center text-xs uppercase">
            <span class="bg-white px-2.5 text-slate-400 font-bold">Ou bien</span>
          </div>
        </div>

        <!-- Demo Quick login -->
        <button
          (click)="handleDemoAccess()"
          [disabled]="loading"
          class="w-full bg-indigo-50 hover:bg-indigo-100/80 border border-indigo-100 text-indigo-600 font-semibold text-xs py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer mb-6"
        >
          <svg class="w-4 h-4 text-indigo-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
          <span>Accès Démo Instantané</span>
        </button>

        <div class="text-center">
          <button
            (click)="toggleMode()"
            class="text-xs text-slate-500 hover:text-slate-800 transition-colors cursor-pointer font-medium"
          >
            {{ isSignUp ? "Déjà membre ? Connectez-vous" : "Pas encore de compte ? S'inscrire" }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class AuthComponent {
  @Output() loginSuccess = new EventEmitter<{ token: string; userId: string }>();

  isSignUp = false;
  email = "";
  password = "";
  firstname = "";
  lastname = "";
  username = "";
  sex: Sex = Sex.M;
  error: string | null = null;
  loading = false;

  Sex = Sex;

  toggleMode() {
    this.isSignUp = !this.isSignUp;
    this.error = null;
  }

  validateForm(): boolean {
    if (!this.email || !this.password) {
      this.error = "Veuillez renseigner votre e-mail et votre mot de passe.";
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.email)) {
      this.error = "Le format de l'adresse e-mail est invalide.";
      return false;
    }
    if (this.password.length < 5) {
      this.error = "Le mot de passe doit comporter au moins 5 caractères.";
      return false;
    }
    if (this.isSignUp && (!this.firstname || !this.lastname || !this.username)) {
      this.error = "Veuillez remplir tous les champs d'inscription.";
      return false;
    }
    return true;
  }

  async handleSignIn() {
    this.error = null;
    if (!this.validateForm()) return;

    this.loading = true;
    try {
      const res = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: this.email, password: this.password })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Échec de l'authentification. Veuillez vérifier vos identifiants.");
      }

      const userId = atob(data.access_token);
      this.loginSuccess.emit({ token: data.access_token, userId });
    } catch (err: any) {
      this.error = err.message;
    } finally {
      this.loading = false;
    }
  }

  async handleSignUp() {
    this.error = null;
    if (!this.validateForm()) return;

    this.loading = true;
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstname: this.firstname,
          lastname: this.lastname,
          username: this.username,
          password: this.password,
          email: this.email,
          sex: this.sex
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Échec de l'inscription. L'adresse e-mail est peut-être déjà utilisée.");
      }

      // Automatically sign in after signup
      const signInRes = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: this.email, password: this.password })
      });
      const signInData = await signInRes.json();
      if (signInRes.ok) {
        const userId = atob(signInData.access_token);
        this.loginSuccess.emit({ token: signInData.access_token, userId });
      } else {
        this.isSignUp = false;
        this.error = "Inscription réussie ! Veuillez vous connecter avec vos identifiants.";
      }
    } catch (err: any) {
      this.error = err.message;
    } finally {
      this.loading = false;
    }
  }

  async handleDemoAccess() {
    this.loading = true;
    this.error = null;
    try {
      const res = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "user@example.com",
          password: "pass123"
        })
      });
      const data = await res.json();
      if (res.ok) {
        const userId = atob(data.access_token);
        this.loginSuccess.emit({ token: data.access_token, userId });
      } else {
        throw new Error("Impossible d'accéder au compte de démonstration.");
      }
    } catch (err: any) {
      this.error = "Échec de la connexion démo : " + err.message;
    } finally {
      this.loading = false;
    }
  }
}
