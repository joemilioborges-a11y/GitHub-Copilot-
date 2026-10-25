/**
 * JOBS — Utilitários de Formatação Internacional e Localização (i18n)
 * 
 * Diretrizes de expansão internacional:
 * 1. Não depender de formatações manuais fixas (ex: replace('.', ',')).
 * 2. Utilizar Intl.NumberFormat e Intl.DateTimeFormat para adaptação nativa a múltiplos idiomas e moedas.
 * 3. Preservar o valor numérico original do livro-razão para todos os cálculos matemáticos;
 *    a formatação é exclusivamente uma camada visual de apresentação.
 * 4. Centralizar textos e labels de interface para facilitar futura tradução completa.
 */

export type SupportedCurrency = 'BRL' | 'USD' | 'EUR' | 'CREDITS';

/**
 * Formata valores monetários com precisão contábil e suporte a moedas globais.
 */
export function formatCurrency(
  amount: number,
  currency: SupportedCurrency = 'BRL',
  locale = 'pt-BR'
): string {
  if (currency === 'CREDITS') {
    return `${Math.round(amount)} 💎`;
  }

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    // Fallback defensivo caso o locale não seja reconhecido pelo ambiente
    return `R$ ${amount.toFixed(2).replace('.', ',')}`;
  }
}

/**
 * Formata percentuais com precisão configurável.
 */
export function formatPercentage(value: number, decimals = 1, locale = 'pt-BR'): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'percent',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value / 100);
  } catch {
    return `${value.toFixed(decimals)}%`;
  }
}

/**
 * Formata números inteiros ou decimais com separadores de milhar apropriados.
 */
export function formatCompactNumber(value: number, locale = 'pt-BR'): string {
  try {
    return new Intl.NumberFormat(locale, {
      notation: 'compact',
      compactDisplay: 'short',
    }).format(value);
  } catch {
    return String(value);
  }
}

/**
 * Dicionário centralizado de strings da interface do Ranking de Criadores.
 * Permite futura expansão multilíngue (en-US, es-ES, etc.) sem dispersão no código.
 */
export const RANKING_I18N = {
  pt: {
    title: 'Ranking de Ganhos dos Criadores',
    subtitle: 'Classificação oficial dos criadores por volume e rendimento no período.',
    splitBadge: 'Split Oficial 70/30',
    searchPlaceholder: 'Buscar por criador, @handle ou ID...',
    clearSearchLabel: 'Limpar pesquisa',
    clearSearchButton: 'Limpar Pesquisa',
    emptyTitle: 'Nenhum criador encontrado',
    emptyDescription: (q: string) =>
      `Não encontramos nenhum criador correspondente a "${q}". Verifique o nome de usuário, @handle ou ID.`,
    showingCount: (count: number, total: number) =>
      count === total ? `${total} criadores listados` : `Exibindo ${count} de ${total} criadores`,
    tabSandbox: 'Ranking de Testes (Sandbox)',
    tabProduction: 'Ranking Real (Produção)',
    productionWarningTitle: 'Ranking real indisponível — aguardando integração financeira',
    productionWarningBadge: 'INTEGRAÇÃO FINANCEIRA REAL NÃO ATIVADA',
    columns: {
      rank: 'Pos.',
      avatar: 'Foto',
      creator: 'Criador / Usuário',
      internalId: 'ID Interno',
      grossSales: 'Vendas Brutas',
      platformCommission: 'JOBS (30%)',
      pspFees: 'Taxas PSP',
      refunds: 'Estornos',
      netEarnings: 'Ganhos Líquidos (70%)',
      pending: 'Pendente (D+14)',
      withdrawable: 'Elegível Saque',
      totalPaid: 'Já Pago',
      lastMovement: 'Última Mov.',
      statusKyc: 'Status & KYC',
      actions: 'Ações',
    },
  },
  en: {
    title: 'Creator Earnings Leaderboard',
    subtitle: 'Official ranking of creators by volume and earnings for the selected period.',
    splitBadge: 'Official 70/30 Split',
    searchPlaceholder: 'Search by creator, @handle or ID...',
    clearSearchLabel: 'Clear search',
    clearSearchButton: 'Clear Search',
    emptyTitle: 'No creators found',
    emptyDescription: (q: string) =>
      `No creators match "${q}". Check the username, @handle or creator ID.`,
    showingCount: (count: number, total: number) =>
      count === total ? `${total} creators listed` : `Showing ${count} of ${total} creators`,
    tabSandbox: 'Testing Leaderboard (Sandbox)',
    tabProduction: 'Live Leaderboard (Production)',
    productionWarningTitle: 'Live leaderboard unavailable — awaiting financial integration',
    productionWarningBadge: 'LIVE FINANCIAL INTEGRATION NOT ACTIVE',
    columns: {
      rank: 'Rank',
      avatar: 'Photo',
      creator: 'Creator / User',
      internalId: 'Internal ID',
      grossSales: 'Gross Sales',
      platformCommission: 'JOBS (30%)',
      pspFees: 'PSP Fees',
      refunds: 'Refunds',
      netEarnings: 'Net Earnings (70%)',
      pending: 'Pending (D+14)',
      withdrawable: 'Eligible for Payout',
      totalPaid: 'Already Paid',
      lastMovement: 'Last Activity',
      statusKyc: 'Status & KYC',
      actions: 'Actions',
    },
  },
};
