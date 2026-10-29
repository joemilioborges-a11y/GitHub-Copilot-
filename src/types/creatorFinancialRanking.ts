/**
 * Tipos e Contratos para o Refinamento Analítico do Ranking Financeiro de Criadores
 * JOBS - Módulo Administrativo Financeiro
 */

export type IndicatorKey =
  | 'gross_sales'
  | 'platform_commission'
  | 'psp_fees'
  | 'refunds_adjustments'
  | 'net_accumulated'
  | 'pending_payment'
  | 'eligible_withdrawal'
  | 'total_paid'
  | 'sales_count'
  | 'avg_ticket'
  | 'growth_pct'
  | 'conversion_rate';

export type CurrencyUnit = 'BRL' | 'CREDITS';

export interface IndicatorAuditMetadata {
  indicatorKey: IndicatorKey;
  name: string;
  source: string;
  formula: string;
  periodLabel: string;
  periodRange: string;
  timezone: string; // Ex: 'America/Sao_Paulo (BRT - UTC-03:00)'
  currency: CurrencyUnit;
  financialStatus: 'liquidado' | 'pendente' | 'estornado' | 'misto' | 'indisponivel';
  financialStatusLabel: string;
  lastUpdated: string;
  limitations: string[];
  isAvailable: boolean;
  unavailableReason?: string;
}

export interface CreatorComparativePeriodData {
  periodLabel: string;
  grossSalesBrl: number;
  creatorShareBrl: number; // 70%
  platformFeeBrl: number; // 30%
  pspFeesBrl: number;
  refundsBrl: number;
  netEarningsBrl: number;
  transactionCount: number;
  hasSufficientHistory: boolean;
}

export interface CreatorEarningsComparativeSeries {
  creatorId: string;
  publicName: string;
  environment: 'sandbox' | 'production';
  currentPeriod: CreatorComparativePeriodData;
  priorPeriod: CreatorComparativePeriodData | null;
  deltaPct: number | null; // null if prior period has no data
  deltaAbsoluteBrl: number | null;
  creatorSplitRatio: number; // 0.70
  platformSplitRatio: number; // 0.30
  hasHistoryGap: boolean;
  disclaimer: string;
}
