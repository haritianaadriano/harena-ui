/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum WalletType {
  PERSONAL = "PERSONAL",
  SAVINGS = "SAVINGS",
  BUSINESS = "BUSINESS"
}

export enum TransactionType {
  INCOME = "INCOME",
  EXPENSE = "EXPENSE",
  TRANSFER = "TRANSFER",
  REFUND = "REFUND",
  SUBSCRIPTION = "SUBSCRIPTION"
}

export enum TransactionStatus {
  PENDING = "PENDING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
  CANCELLED = "CANCELLED"
}

export enum GoalStatus {
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED"
}

export enum BudgetPeriod {
  DAILY = "DAILY",
  WEEKLY = "WEEKLY",
  MONTHLY = "MONTHLY",
  YEARLY = "YEARLY"
}

export enum Sex {
  M = "M",
  F = "F"
}

export interface User {
  id: string;
  firstname: string;
  lastname: string;
  username: string;
  email: string;
  registered_datetime: string;
  sex: Sex;
}

export interface Wallet {
  id: string;
  user_id: string;
  name: string;
  currency: string; // MGA as primary currency
  type: WalletType;
  creation_datetime: string;
  updated_datetime: string;
}

export interface TransactionCategory {
  id: string;
  user_id: string;
  name: string;
  icon: string; // lucide icon name (e.g. "ShoppingBag", "TrendingUp", "Coffee", etc.)
  color: string; // hex code or tailwind color name
  is_system: boolean;
  creation_datetime: string;
}

export interface WalletTransaction {
  id: string;
  wallet: Wallet;
  category: TransactionCategory;
  amount: number;
  type: TransactionType;
  status: TransactionStatus;
  description: string;
  reference: string;
  source: string;
  transaction_datetime: string;
  creation_datetime: string;
  updated_datetime: string;
}

export interface WalletBalanceSnapshot {
  id: string;
  wallet: Wallet;
  balance: number;
  snapshot_datetime: string;
  creation_datetime: string;
}

export interface Budget {
  id: string;
  wallet: Wallet;
  category: TransactionCategory;
  limit_amount: number;
  spent_amount: number;
  is_reserved: boolean;
  period_type: BudgetPeriod;
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  creation_datetime: string;
}

export interface Goal {
  id: string;
  wallet: Wallet;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline: string; // YYYY-MM-DD
  status: GoalStatus;
  creation_datetime: string;
}

export interface WalletRecommendation {
  id: string;
  wallet_id: string;
  type: string;
  context: string;
  prompt: string;
  response: string;
  confidence_score: number;
  expires_at: string;
  creation_datetime: string;
}

export interface TransactionAnalysis {
  id: string;
  transaction_id: string;
  predicted_category: string;
  anomaly_score: number; // 0.0 - 1.0
  financial_health_score: number; // 0 - 100
  sentiment: string;
  creation_datetime: string;
}

export interface RefreshTokenResponse {
  token_type: string;
  access_token: string;
  access_expires_in: number;
  refresh_token: string;
}
