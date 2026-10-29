/**
 * Serviço de Metadados Analíticos e Séries Comparativas do Ranking Financeiro de Criadores
 * JOBS - Sistema Financeiro e Livro-Razão Contábil
 * 
 * Este serviço é estritamente de leitura (read-only) e NUNCA altera o livro-razão.
 */

import { financialLedger, LedgerEntry } from './ledgerService';
import { CreatorRankingItem } from '../types';
import {
  IndicatorKey,
  IndicatorAuditMetadata,
  CreatorEarningsComparativeSeries,
  CreatorComparativePeriodData,
} from '../types/creatorFinancialRanking';

export class CreatorRankingAnalyticalService {
  private static instance: CreatorRankingAnalyticalService;

  private constructor() {}

  public static getInstance(): CreatorRankingAnalyticalService {
    if (!CreatorRankingAnalyticalService.instance) {
      CreatorRankingAnalyticalService.instance = new CreatorRankingAnalyticalService();
    }
    return CreatorRankingAnalyticalService.instance;
  }

  /**
   * Retorna os metadados contábeis e de auditoria para um indicador financeiro
   */
  public getIndicatorAuditMetadata(
    indicatorKey: IndicatorKey,
    environment: 'sandbox' | 'production',
    period: string
  ): IndicatorAuditMetadata {
    const timezone = 'America/Sao_Paulo (BRT - UTC-03:00)';
    const now = new Date();
    const lastUpdatedFormatted = now.toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      dateStyle: 'short',
      timeStyle: 'medium',
    });

    if (environment === 'production') {
      return {
        indicatorKey,
        name: this.getIndicatorDisplayName(indicatorKey),
        source: 'financialLedger (Ambiente Produção)',
        formula: this.getIndicatorFormula(indicatorKey),
        periodLabel: this.getPeriodDisplayName(period),
        periodRange: 'Nenhum registro ativo em produção',
        timezone,
        currency: 'BRL',
        financialStatus: 'indisponivel',
        financialStatusLabel: 'Indisponível (Sem integração bancária ativa)',
        lastUpdated: lastUpdatedFormatted,
        limitations: [
          'Integração financeira real com PSP/Bacen não está conectada neste ambiente.',
          'Nenhum dado é inventado, estimado ou simulado para produção.',
          'Métricas históricas reais indisponíveis até a homologação bancária.',
        ],
        isAvailable: false,
        unavailableReason: 'Integração bancária e credenciais PSP de produção ausentes.',
      };
    }

    // Ambiente Sandbox
    const periodRange = this.calculatePeriodDateRange(period);
    const commonLimitations = [
      'Split contábil oficial da plataforma: 70% Líquido Criador / 30% Taxa JOBS.',
      'Valores em Moeda Corrente (BRL) são segregados e não equivalem a Créditos Virtuais.',
      'Janela de compensação operacional padrão: D+14 para liquidação de saques.',
    ];

    switch (indicatorKey) {
      case 'gross_sales':
        return {
          indicatorKey,
          name: 'Ganhos Brutos Confirmados (Vendas Brutas)',
          source: 'financialLedger · Lançamentos de Venda e Desbloqueio de Mídia (CRÉDITO)',
          formula: '∑ (Valor Bruto de Desbloqueios VIP + Assinaturas + Gorjetas pagas em BRL)',
          periodLabel: this.getPeriodDisplayName(period),
          periodRange,
          timezone,
          currency: 'BRL',
          financialStatus: 'liquidado',
          financialStatusLabel: 'Lançamentos Confirmados no Ledger',
          lastUpdated: lastUpdatedFormatted,
          limitations: [
            ...commonLimitations,
            'Não inclui tentativas de compra pendentes no gateway antes da confirmação do webhook.',
          ],
          isAvailable: true,
        };

      case 'platform_commission':
        return {
          indicatorKey,
          name: 'Comissão da Plataforma JOBS (30%)',
          source: 'financialLedger · Conta de Receita Operacional JOBS',
          formula: 'Ganhos Brutos × 0,30 (Split Contábil Contratual de 30%)',
          periodLabel: this.getPeriodDisplayName(period),
          periodRange,
          timezone,
          currency: 'BRL',
          financialStatus: 'liquidado',
          financialStatusLabel: 'Retenção Contábil Efetivada',
          lastUpdated: lastUpdatedFormatted,
          limitations: [
            ...commonLimitations,
            'Taxa retida na fonte no momento exato do desbloqueio/pagamento.',
          ],
          isAvailable: true,
        };

      case 'psp_fees':
        return {
          indicatorKey,
          name: 'Taxas Operacionais de Processamento (PSP)',
          source: 'financialLedger · Custos de Intermediação e Antifraude',
          formula: '∑ (Taxas Gateway Pix / Cartão atribuíveis à transação)',
          periodLabel: this.getPeriodDisplayName(period),
          periodRange,
          timezone,
          currency: 'BRL',
          financialStatus: 'liquidado',
          financialStatusLabel: 'Debitado pelo Provedor de Pagamentos',
          lastUpdated: lastUpdatedFormatted,
          limitations: [
            ...commonLimitations,
            'Valores absorvidos ou repassados estritamente conforme termos vigentes.',
          ],
          isAvailable: true,
        };

      case 'refunds_adjustments':
        return {
          indicatorKey,
          name: 'Estornos e Ajustes Compensatórios',
          source: 'financialLedger · Lançamentos de Chargeback e Estorno Administrativo',
          formula: '∑ (Estornos Contábeis + Cancelamentos com Lançamento Compensatório na Data do Evento)',
          periodLabel: this.getPeriodDisplayName(period),
          periodRange,
          timezone,
          currency: 'BRL',
          financialStatus: 'estornado',
          financialStatusLabel: 'Estornos Processados',
          lastUpdated: lastUpdatedFormatted,
          limitations: [
            ...commonLimitations,
            'Preservação histórica: estornos não alteram lançamentos passados, registram débito compensatório no evento.',
          ],
          isAvailable: true,
        };

      case 'net_accumulated':
        return {
          indicatorKey,
          name: 'Ganhos Líquidos do Criador (70%)',
          source: 'financialLedger · Conta de Passivo Exigível do Criador',
          formula: 'Ganhos Brutos × 0,70 - Taxas PSP Atribuídas - Estornos e Ajustes',
          periodLabel: this.getPeriodDisplayName(period),
          periodRange,
          timezone,
          currency: 'BRL',
          financialStatus: 'misto',
          financialStatusLabel: 'Saldo Líquido Registrado (70%)',
          lastUpdated: lastUpdatedFormatted,
          limitations: [
            ...commonLimitations,
            'Composto pela soma de valores pendentes de carência (D+14) e saldo já elegível para saque.',
          ],
          isAvailable: true,
        };

      case 'pending_payment':
        return {
          indicatorKey,
          name: 'Valores Pendentes de Liberação (Carência D+14)',
          source: 'financialLedger · Lançamentos em Quarentena Antifraude',
          formula: '∑ (Ganhos Líquidos com data de transação < 14 dias corridos da data atual)',
          periodLabel: this.getPeriodDisplayName(period),
          periodRange,
          timezone,
          currency: 'BRL',
          financialStatus: 'pendente',
          financialStatusLabel: 'Em Quarentena Regulatória (D+14)',
          lastUpdated: lastUpdatedFormatted,
          limitations: [
            ...commonLimitations,
            'Proteção contra chargebacks e contestações de cartão durante o prazo de arrependimento e garantia.',
          ],
          isAvailable: true,
        };

      case 'eligible_withdrawal':
        return {
          indicatorKey,
          name: 'Saldo Elegível para Saque Imediato',
          source: 'financialLedger · Saldo Disponível Consolidado do Criador',
          formula: 'Ganhos Líquidos Liquidados (> D+14) - Saques Solicitados - Bloqueios Cautelares',
          periodLabel: this.getPeriodDisplayName(period),
          periodRange,
          timezone,
          currency: 'BRL',
          financialStatus: 'liquidado',
          financialStatusLabel: 'Disponível para Resgate',
          lastUpdated: lastUpdatedFormatted,
          limitations: [
            ...commonLimitations,
            'Sujeito a limite mínimo de saque (R$ 50,00) e chave Pix titular validada via KYC 18+.',
          ],
          isAvailable: true,
        };

      case 'total_paid':
        return {
          indicatorKey,
          name: 'Valores Já Pagos e Transferidos',
          source: 'financialLedger · Registro de Payouts Liquidados via Pix/TED',
          formula: '∑ (Ordens de Saque com Status LIQUIDADO e Comprovante Bancário Registrado)',
          periodLabel: this.getPeriodDisplayName(period),
          periodRange,
          timezone,
          currency: 'BRL',
          financialStatus: 'liquidado',
          financialStatusLabel: 'Efetivamente Transferido',
          lastUpdated: lastUpdatedFormatted,
          limitations: [
            ...commonLimitations,
            'Não contabiliza ordens em processamento bancário ou em lote agendado até a confirmação de liquidação.',
          ],
          isAvailable: true,
        };

      case 'sales_count':
        return {
          indicatorKey,
          name: 'Quantidade de Vendas e Desbloqueios',
          source: 'monetizationService · Registro de Transações de Mídia e Gorjetas',
          formula: 'Contagem total de eventos de compra concluídos no período selecionado',
          periodLabel: this.getPeriodDisplayName(period),
          periodRange,
          timezone,
          currency: 'BRL',
          financialStatus: 'liquidado',
          financialStatusLabel: 'Operações Concluídas',
          lastUpdated: lastUpdatedFormatted,
          limitations: [
            'Inclui desbloqueios diretos e gorjetas avulsas.',
          ],
          isAvailable: true,
        };

      case 'avg_ticket':
        return {
          indicatorKey,
          name: 'Ticket Médio de Vendas',
          source: 'monetizationService · Razão de Vendas',
          formula: 'Ganhos Brutos Confirmados ÷ Quantidade de Vendas no Período',
          periodLabel: this.getPeriodDisplayName(period),
          periodRange,
          timezone,
          currency: 'BRL',
          financialStatus: 'liquidado',
          financialStatusLabel: 'Média Aritmética',
          lastUpdated: lastUpdatedFormatted,
          limitations: [
            'Se a quantidade de vendas for zero, o ticket médio é exibido como R$ 0,00 sem divisão por zero.',
          ],
          isAvailable: true,
        };

      case 'growth_pct':
        return {
          indicatorKey,
          name: 'Taxa de Crescimento Periódico (%)',
          source: 'monetizationService · Comparativo Temporal',
          formula: '((Ganhos Período Atual - Ganhos Período Anterior) ÷ Ganhos Período Anterior) × 100',
          periodLabel: this.getPeriodDisplayName(period),
          periodRange,
          timezone,
          currency: 'BRL',
          financialStatus: 'misto',
          financialStatusLabel: 'Variação Percentual',
          lastUpdated: lastUpdatedFormatted,
          limitations: [
            'Exige histórico prévio com movimentação comprovada. Sem dados no período anterior, retorna nulo.',
          ],
          isAvailable: true,
        };

      case 'conversion_rate':
        return {
          indicatorKey,
          name: 'Taxa de Conversão de Espectadores em Compradores',
          source: 'monetizationService · Registro de Audiência e Desbloqueio',
          formula: '(Compradores Únicos ÷ Total de Visualizações de Perfil / Mídia) × 100',
          periodLabel: this.getPeriodDisplayName(period),
          periodRange,
          timezone,
          currency: 'BRL',
          financialStatus: 'misto',
          financialStatusLabel: 'Índice de Conversão',
          lastUpdated: lastUpdatedFormatted,
          limitations: [
            'Compradores únicos desduplicados por ID de conta.',
          ],
          isAvailable: true,
        };

      default:
        return {
          indicatorKey,
          name: this.getIndicatorDisplayName(indicatorKey),
          source: 'financialLedger',
          formula: 'Fórmula contábil padrão',
          periodLabel: this.getPeriodDisplayName(period),
          periodRange,
          timezone,
          currency: 'BRL',
          financialStatus: 'misto',
          financialStatusLabel: 'Consolidado',
          lastUpdated: lastUpdatedFormatted,
          limitations: commonLimitations,
          isAvailable: true,
        };
    }
  }

  /**
   * Retorna os dados para renderização do gráfico de barras comparativo do criador
   */
  public getCreatorComparativeSeries(
    creator: CreatorRankingItem,
    environment: 'sandbox' | 'production',
    period: string
  ): CreatorEarningsComparativeSeries {
    const creatorSplitRatio = 0.70;
    const platformSplitRatio = 0.30;

    if (environment === 'production') {
      return {
        creatorId: creator.creatorId,
        publicName: creator.publicName,
        environment: 'production',
        currentPeriod: {
          periodLabel: this.getPeriodDisplayName(period),
          grossSalesBrl: 0,
          creatorShareBrl: 0,
          platformFeeBrl: 0,
          pspFeesBrl: 0,
          refundsBrl: 0,
          netEarningsBrl: 0,
          transactionCount: 0,
          hasSufficientHistory: false,
        },
        priorPeriod: null,
        deltaPct: null,
        deltaAbsoluteBrl: null,
        creatorSplitRatio,
        platformSplitRatio,
        hasHistoryGap: true,
        disclaimer: 'Informação indisponível: ambiente de produção sem integração bancária ativa.',
      };
    }

    // Período Atual a partir do objeto já computado e auditado pelo serviço
    const gross = Math.max(0, creator.grossSalesConfirmedBrl);
    const creatorShare = Number((gross * creatorSplitRatio).toFixed(2));
    const platformFee = Number((gross * platformSplitRatio).toFixed(2));
    const pspFees = Math.max(0, creator.assignedFeesBrl || 0);
    const refunds = Math.max(0, creator.refundsAndAdjustmentsBrl || 0);
    const net = Math.max(0, creator.netAccumulatedEarningsBrl);

    const currentPeriodData: CreatorComparativePeriodData = {
      periodLabel: this.getPeriodDisplayName(period),
      grossSalesBrl: gross,
      creatorShareBrl: creatorShare,
      platformFeeBrl: platformFee,
      pspFeesBrl: pspFees,
      refundsBrl: refunds,
      netEarningsBrl: net,
      transactionCount: creator.salesCount,
      hasSufficientHistory: true,
    };

    // Calcular período anterior equivalente a partir do livro-razão existente
    const priorPeriodData = this.computePriorPeriodFromLedger(creator.creatorId, period);

    let deltaPct: number | null = null;
    let deltaAbsoluteBrl: number | null = null;
    let hasHistoryGap = false;
    let disclaimer = 'Split contábil: 70% Criador / 30% JOBS.';

    if (priorPeriodData && priorPeriodData.hasSufficientHistory) {
      deltaAbsoluteBrl = Number((net - priorPeriodData.netEarningsBrl).toFixed(2));
      if (priorPeriodData.netEarningsBrl > 0) {
        deltaPct = Number(
          (((net - priorPeriodData.netEarningsBrl) / priorPeriodData.netEarningsBrl) * 100).toFixed(1)
        );
      } else if (net > 0) {
        deltaPct = 100.0;
      } else {
        deltaPct = 0.0;
      }
    } else {
      hasHistoryGap = true;
      disclaimer = 'Sem histórico contábil no período anterior correspondente para comparação direta.';
    }

    return {
      creatorId: creator.creatorId,
      publicName: creator.publicName,
      environment: 'sandbox',
      currentPeriod: currentPeriodData,
      priorPeriod: priorPeriodData,
      deltaPct,
      deltaAbsoluteBrl,
      creatorSplitRatio,
      platformSplitRatio,
      hasHistoryGap,
      disclaimer,
    };
  }

  /**
   * Consulta os lançamentos do ledger para o período imediatamente anterior
   * Preserva a integridade do livro-razão (apenas leitura).
   */
  private computePriorPeriodFromLedger(
    creatorId: string,
    period: string
  ): CreatorComparativePeriodData | null {
    try {
      const allEntries = financialLedger.getEntries();
      const creatorEntries = allEntries.filter(
        (e) =>
          e.isSandbox &&
          (e.targetCreatorId === creatorId || (e.description && e.description.includes(creatorId)))
      );

      if (creatorEntries.length === 0) {
        return null;
      }

      // Definir janela de tempo para o período anterior
      const now = new Date();
      let durationDays = 7;
      if (period === 'today') durationDays = 1;
      else if (period === '7days') durationDays = 7;
      else if (period === '14days') durationDays = 14;
      else if (period === '30days' || period === 'current_month') durationDays = 30;
      else if (period === 'all') {
        // Se for "all", não existe período anterior prévio
        return null;
      }

      const currentWindowStart = new Date(now.getTime() - durationDays * 24 * 60 * 60 * 1000);
      const priorWindowStart = new Date(now.getTime() - 2 * durationDays * 24 * 60 * 60 * 1000);

      const priorEntries = creatorEntries.filter((entry) => {
        const entryTime = new Date(entry.timestamp).getTime();
        return (
          entryTime >= priorWindowStart.getTime() &&
          entryTime < currentWindowStart.getTime()
        );
      });

      if (priorEntries.length === 0) {
        return null;
      }

      // Calcular montantes do período anterior
      let priorGross = 0;
      let priorRefunds = 0;
      let priorPsp = 0;
      let txCount = 0;

      for (const entry of priorEntries) {
        if (entry.currency === 'BRL') {
          if (
            entry.operationType === 'CONTENT_UNLOCK' ||
            entry.operationType === 'TIP_GIFT' ||
            entry.operationType === 'SUBSCRIPTION_PURCHASE' ||
            entry.operationType === 'CREATOR_REVENUE_SHARE'
          ) {
            priorGross += entry.amount;
            txCount++;
          } else if (entry.operationType === 'REFUND' || entry.operationType === 'CHARGEBACK') {
            priorRefunds += Math.abs(entry.amount);
          } else if (entry.operationType === 'PLATFORM_COMMISSION') {
            priorPsp += Math.abs(entry.amount);
          }
        }
      }

      const priorCreatorShare = Number((priorGross * 0.70).toFixed(2));
      const priorPlatformFee = Number((priorGross * 0.30).toFixed(2));
      const priorNet = Math.max(0, Number((priorCreatorShare - priorPsp - priorRefunds).toFixed(2)));

      return {
        periodLabel: `Período anterior (${durationDays}d)`,
        grossSalesBrl: Number(priorGross.toFixed(2)),
        creatorShareBrl: priorCreatorShare,
        platformFeeBrl: priorPlatformFee,
        pspFeesBrl: Number(priorPsp.toFixed(2)),
        refundsBrl: Number(priorRefunds.toFixed(2)),
        netEarningsBrl: priorNet,
        transactionCount: txCount,
        hasSufficientHistory: true,
      };
    } catch {
      return null;
    }
  }

  private calculatePeriodDateRange(period: string): string {
    const now = new Date();
    const formatDate = (d: Date) =>
      d.toLocaleDateString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });

    if (period === 'today') {
      return `${formatDate(now)} (00:00 às 23:59 BRT)`;
    }
    if (period === '7days') {
      const past = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return `${formatDate(past)} até ${formatDate(now)} (BRT)`;
    }
    if (period === '14days') {
      const past = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      return `${formatDate(past)} até ${formatDate(now)} (BRT)`;
    }
    if (period === '30days' || period === 'current_month') {
      const past = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return `${formatDate(past)} até ${formatDate(now)} (BRT)`;
    }
    return 'Histórico Integral Auditado';
  }

  private getIndicatorDisplayName(key: IndicatorKey): string {
    switch (key) {
      case 'gross_sales':
        return 'Ganhos Brutos Confirmados';
      case 'platform_commission':
        return 'Comissão JOBS (30%)';
      case 'psp_fees':
        return 'Taxas de Intermediação PSP';
      case 'refunds_adjustments':
        return 'Estornos e Ajustes';
      case 'net_accumulated':
        return 'Ganhos Líquidos (70%)';
      case 'pending_payment':
        return 'Valores Pendentes (D+14)';
      case 'eligible_withdrawal':
        return 'Elegível para Saque';
      case 'total_paid':
        return 'Valores Já Pagos';
      case 'sales_count':
        return 'Quantidade de Vendas';
      case 'avg_ticket':
        return 'Ticket Médio';
      case 'growth_pct':
        return 'Taxa de Crescimento (%)';
      case 'conversion_rate':
        return 'Taxa de Conversão';
      default:
        return 'Indicador Financeiro';
    }
  }

  private getIndicatorFormula(key: IndicatorKey): string {
    switch (key) {
      case 'gross_sales':
        return '∑ Vendas Brutas Confirmadas em BRL';
      case 'platform_commission':
        return 'Vendas Brutas × 0,30';
      case 'psp_fees':
        return '∑ Taxas Operacionais Gateway';
      case 'refunds_adjustments':
        return '∑ Estornos com Lançamento Compensatório';
      case 'net_accumulated':
        return 'Vendas Brutas × 0,70 - Taxas PSP - Estornos';
      case 'pending_payment':
        return '∑ Ganhos Líquidos com carência < 14 dias';
      case 'eligible_withdrawal':
        return 'Ganhos Líquidos Liberados (> D+14) - Saques';
      case 'total_paid':
        return '∑ Saques Liquidados com Comprovante';
      default:
        return 'Regra contábil aplicável';
    }
  }

  private getPeriodDisplayName(period: string): string {
    switch (period) {
      case 'today':
        return 'Hoje (Dia Corrente)';
      case '7days':
        return 'Últimos 7 dias';
      case '14days':
        return 'Últimos 14 dias';
      case '30days':
        return 'Últimos 30 dias';
      case 'current_month':
        return 'Mês Atual';
      case 'previous_month':
        return 'Mês Anterior';
      case 'current_year':
        return 'Ano Atual';
      case 'custom':
        return 'Intervalo Personalizado';
      case 'all':
      default:
        return 'Histórico Completo';
    }
  }
}

export const creatorRankingAnalyticalService = CreatorRankingAnalyticalService.getInstance();
