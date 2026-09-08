/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Sex = 'M' | 'F';

export type WalletType = 'PERSONAL' | 'SAVINGS' | 'BUSINESS';

export type TransactionType = 'INCOME' | 'EXPENSE' | 'TRANSFER' | 'REFUND' | 'SUBSCRIPTION';

export type TransactionStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export type Page = number;
export type PageSize = number;

export interface TransactionFilterParams {
  from?: string;
  to?: string;
  status?: TransactionStatus;
  type?: TransactionType;
  page?: Page;
  page_size?: PageSize;
}

export type GoalStatus = 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export type BudgetPeriod = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

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
  currency: string;
  type: WalletType;
  creation_datetime: string;
  updated_datetime: string;
}

export interface TransactionCategory {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  color: string;
  is_system: boolean;
  creation_datetime: string;
}

export interface WalletTransaction {
  id: string;
  wallet: Wallet;
  category: TransactionCategory | null;
  amount: number;
  type: TransactionType;
  status: TransactionStatus;
  description: string;
  reference?: string;
  source?: string;
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
  start_date: string;
  end_date: string;
  creation_datetime: string;
}

export interface Goal {
  id: string;
  wallet: Wallet;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline: string;
  status: GoalStatus;
  creation_datetime: string;
}

export interface TransactionAnalysis {
  id: string;
  transaction_id: string;
  predicted_category: string;
  anomaly_score: number;
  financial_health_score: number;
  sentiment: string;
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

export interface RefreshTokenResponse {
  token_type: string;
  issued_at?: string;
  expires_at?: string;
  access_expires_in: number;
  refresh_token?: string;
  access_token: string;
  id_token?: string;
}
