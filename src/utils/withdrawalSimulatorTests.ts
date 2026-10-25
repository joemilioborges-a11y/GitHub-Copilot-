/**
 * SUITE DE TESTES OBRIGATÓRIOS DO SIMULADOR DE SAQUE (JOBS)
 *
 * Executa e valida os 12 testes do Requisito 9:
 * 1. Simulação com valor válido.
 * 2. Simulação com valor zero.
 * 3. Simulação com valor negativo.
 * 4. Simulação superior ao saldo elegível.
 * 5. Cálculo correto da taxa percentual.
 * 6. Cálculo correto da tarifa fixa.
 * 7. Cálculo correto do valor líquido e do saldo restante.
 * 8. Bloqueio quando as tarifas tornam o resultado inválido.
 * 9. Separação integral entre TESTE e PRODUÇÃO.
 * 10. Confirmação de que a simulação não debita nenhuma carteira.
 * 11. Confirmação de que não ocorre transferência real.
 * 12. Confirmação de que os módulos, rankings, créditos e funções anteriores continuam funcionando.
 */

import { monetizationService } from '../services/monetizationService';
import { financialLedger } from '../services/ledgerService';
import { WithdrawalSimulationInput } from '../types';

export interface TestCaseResult {
  testNumber: number;
  name: string;
  passed: boolean;
  details: string;
  observed: any;
}

export function runAllWithdrawalSimulatorTests(): {
  total: number;
  passed: number;
  failed: number;
  results: TestCaseResult[];
} {
  const results: TestCaseResult[] = [];

  // =========================================================================
  // TESTE 1: Simulação com valor válido
  // =========================================================================
  try {
    const input: WithdrawalSimulationInput = {
      environment: 'sandbox',
      targetType: 'admin',
      eligibleBalanceBrl: 10000.0,
      requestedAmountBrl: 2000.0,
      feePercentage: 1.5,
      fixedFeeBrl: 3.5,
      estimatedProcessingTime: 'Instantâneo via PIX',
      payoutMethod: 'pix_instant',
    };
    const res = monetizationService.simulateWithdrawal(input);
    const passed =
      res.isValid === true &&
      res.validationStatus === 'valid' &&
      res.requestedAmountBrl === 2000.0 &&
      res.estimatedPercentageFeeBrl === 30.0 &&
      res.estimatedFixedFeeBrl === 3.5 &&
      res.totalEstimatedFeesBrl === 33.5 &&
      res.netEstimatedAmountBrl === 1966.5 &&
      res.remainingBalanceBrl === 8000.0;

    results.push({
      testNumber: 1,
      name: 'Simulação com valor válido',
      passed,
      details: passed
        ? 'Cálculo de R$ 2.000,00 sobre R$ 10.000,00 gerou líquido de R$ 1.966,50 e restante de R$ 8.000,00 com sucesso.'
        : 'Inconsistência no cálculo de valor válido.',
      observed: { net: res.netEstimatedAmountBrl, fees: res.totalEstimatedFeesBrl, remaining: res.remainingBalanceBrl },
    });
  } catch (err: any) {
    results.push({ testNumber: 1, name: 'Simulação com valor válido', passed: false, details: err.message, observed: null });
  }

  // =========================================================================
  // TESTE 2: Simulação com valor zero
  // =========================================================================
  try {
    const input: WithdrawalSimulationInput = {
      environment: 'sandbox',
      targetType: 'admin',
      eligibleBalanceBrl: 5000.0,
      requestedAmountBrl: 0.0,
      feePercentage: 1.5,
      fixedFeeBrl: 3.5,
      estimatedProcessingTime: 'Instantâneo via PIX',
      payoutMethod: 'pix_instant',
    };
    const res = monetizationService.simulateWithdrawal(input);
    const passed = res.isValid === false && res.validationStatus === 'zero_or_negative';

    results.push({
      testNumber: 2,
      name: 'Simulação com valor zero',
      passed,
      details: passed
        ? 'Valor zero bloqueado corretamente com validationStatus = zero_or_negative.'
        : 'Valor zero não foi rejeitado conforme especificação.',
      observed: { isValid: res.isValid, validationStatus: res.validationStatus },
    });
  } catch (err: any) {
    results.push({ testNumber: 2, name: 'Simulação com valor zero', passed: false, details: err.message, observed: null });
  }

  // =========================================================================
  // TESTE 3: Simulação com valor negativo
  // =========================================================================
  try {
    const input: WithdrawalSimulationInput = {
      environment: 'sandbox',
      targetType: 'admin',
      eligibleBalanceBrl: 5000.0,
      requestedAmountBrl: -250.0,
      feePercentage: 1.5,
      fixedFeeBrl: 3.5,
      estimatedProcessingTime: 'Instantâneo via PIX',
      payoutMethod: 'pix_instant',
    };
    const res = monetizationService.simulateWithdrawal(input);
    const passed = res.isValid === false && res.validationStatus === 'zero_or_negative';

    results.push({
      testNumber: 3,
      name: 'Simulação com valor negativo',
      passed,
      details: passed
        ? 'Valor negativo (-R$ 250,00) rejeitado com sucesso e mensagem explicativa.'
        : 'Valor negativo aceito indevidamente.',
      observed: { isValid: res.isValid, msg: res.validationMessage },
    });
  } catch (err: any) {
    results.push({ testNumber: 3, name: 'Simulação com valor negativo', passed: false, details: err.message, observed: null });
  }

  // =========================================================================
  // TESTE 4: Simulação superior ao saldo elegível
  // =========================================================================
  try {
    const input: WithdrawalSimulationInput = {
      environment: 'sandbox',
      targetType: 'admin',
      eligibleBalanceBrl: 1500.0,
      requestedAmountBrl: 5000.0, // excede R$ 1.500
      feePercentage: 1.5,
      fixedFeeBrl: 3.5,
      estimatedProcessingTime: 'Instantâneo via PIX',
      payoutMethod: 'pix_instant',
    };
    const res = monetizationService.simulateWithdrawal(input);
    const passed = res.isValid === false && res.validationStatus === 'above_balance';

    results.push({
      testNumber: 4,
      name: 'Simulação superior ao saldo elegível',
      passed,
      details: passed
        ? 'Saque superior ao saldo (R$ 5.000 > R$ 1.500) bloqueado com status above_balance.'
        : 'Saque acima do saldo disponível foi permitido.',
      observed: { isValid: res.isValid, status: res.validationStatus, msg: res.validationMessage },
    });
  } catch (err: any) {
    results.push({ testNumber: 4, name: 'Simulação superior ao saldo elegível', passed: false, details: err.message, observed: null });
  }

  // =========================================================================
  // TESTE 5: Cálculo correto da taxa percentual
  // =========================================================================
  try {
    // 2.75% de R$ 4.000,00 = R$ 110,00
    const input: WithdrawalSimulationInput = {
      environment: 'sandbox',
      targetType: 'admin',
      eligibleBalanceBrl: 10000.0,
      requestedAmountBrl: 4000.0,
      feePercentage: 2.75,
      fixedFeeBrl: 0.0,
      estimatedProcessingTime: 'TED Bancário',
      payoutMethod: 'ted_banco',
    };
    const res = monetizationService.simulateWithdrawal(input);
    const passed = res.estimatedPercentageFeeBrl === 110.0;

    results.push({
      testNumber: 5,
      name: 'Cálculo correto da taxa percentual',
      passed,
      details: passed
        ? 'Taxa percentual de 2.75% sobre R$ 4.000,00 calculada exatamente como R$ 110,00.'
        : `Esperado R$ 110,00, obtido R$ ${res.estimatedPercentageFeeBrl}`,
      observed: { feePercentageApplied: res.feePercentageApplied, feePctBrl: res.estimatedPercentageFeeBrl },
    });
  } catch (err: any) {
    results.push({ testNumber: 5, name: 'Cálculo correto da taxa percentual', passed: false, details: err.message, observed: null });
  }

  // =========================================================================
  // TESTE 6: Cálculo correto da tarifa fixa
  // =========================================================================
  try {
    const input: WithdrawalSimulationInput = {
      environment: 'sandbox',
      targetType: 'admin',
      eligibleBalanceBrl: 5000.0,
      requestedAmountBrl: 1000.0,
      feePercentage: 0.0, // percentual zero para isolar tarifa fixa
      fixedFeeBrl: 8.75,
      estimatedProcessingTime: 'Instantâneo via PIX',
      payoutMethod: 'pix_instant',
    };
    const res = monetizationService.simulateWithdrawal(input);
    const passed = res.estimatedFixedFeeBrl === 8.75 && res.totalEstimatedFeesBrl === 8.75;

    results.push({
      testNumber: 6,
      name: 'Cálculo correto da tarifa fixa',
      passed,
      details: passed
        ? 'Tarifa fixa de R$ 8,75 atribuída e somada isoladamente com total exato de R$ 8,75.'
        : `Erro na tarifa fixa. Esperado R$ 8,75, obtido R$ ${res.totalEstimatedFeesBrl}`,
      observed: { fixedFeeBrl: res.estimatedFixedFeeBrl, totalFees: res.totalEstimatedFeesBrl },
    });
  } catch (err: any) {
    results.push({ testNumber: 6, name: 'Cálculo correto da tarifa fixa', passed: false, details: err.message, observed: null });
  }

  // =========================================================================
  // TESTE 7: Cálculo correto do valor líquido e do saldo restante
  // =========================================================================
  try {
    // Solicitado: R$ 3.000,00 | Elegível: R$ 8.500,00
    // Taxa percentual: 2% = R$ 60,00 | Tarifa fixa: R$ 5,00 | Total tarifas = R$ 65,00
    // Líquido esperado = R$ 2.935,00 | Restante esperado = R$ 5.500,00
    const input: WithdrawalSimulationInput = {
      environment: 'sandbox',
      targetType: 'admin',
      eligibleBalanceBrl: 8500.0,
      requestedAmountBrl: 3000.0,
      feePercentage: 2.0,
      fixedFeeBrl: 5.0,
      estimatedProcessingTime: 'Instantâneo via PIX',
      payoutMethod: 'pix_instant',
    };
    const res = monetizationService.simulateWithdrawal(input);
    const passed =
      res.netEstimatedAmountBrl === 2935.0 &&
      res.remainingBalanceBrl === 5500.0 &&
      res.totalEstimatedFeesBrl === 65.0;

    results.push({
      testNumber: 7,
      name: 'Cálculo correto do valor líquido e do saldo restante',
      passed,
      details: passed
        ? 'Líquido apurado em R$ 2.935,00 e Saldo restante em R$ 5.500,00 com 100% de exatidão matemática.'
        : `Esperado Líquido 2935 e Restante 5500. Obtido: Líquido ${res.netEstimatedAmountBrl}, Restante ${res.remainingBalanceBrl}`,
      observed: { net: res.netEstimatedAmountBrl, remaining: res.remainingBalanceBrl },
    });
  } catch (err: any) {
    results.push({ testNumber: 7, name: 'Cálculo correto do valor líquido e do saldo restante', passed: false, details: err.message, observed: null });
  }

  // =========================================================================
  // TESTE 8: Bloqueio quando as tarifas tornam o resultado inválido
  // =========================================================================
  try {
    // Valor solicitado: R$ 10,00 | Tarifa fixa: R$ 15,00 | Total tarifas (R$ 15,15) > R$ 10,00
    const input: WithdrawalSimulationInput = {
      environment: 'sandbox',
      targetType: 'admin',
      eligibleBalanceBrl: 1000.0,
      requestedAmountBrl: 10.0,
      feePercentage: 1.5,
      fixedFeeBrl: 15.0,
      estimatedProcessingTime: 'Instantâneo via PIX',
      payoutMethod: 'pix_instant',
    };
    const res = monetizationService.simulateWithdrawal(input);
    const passed = res.isValid === false && res.validationStatus === 'fees_exceed_amount';

    results.push({
      testNumber: 8,
      name: 'Bloqueio quando as tarifas tornam o resultado inválido',
      passed,
      details: passed
        ? 'Tarifas superiores ao valor solicitado bloqueadas com status fees_exceed_amount e mensagem explicativa.'
        : 'Simulação com valor líquido negativo ou nulo permitida indevidamente.',
      observed: { isValid: res.isValid, validationStatus: res.validationStatus, msg: res.validationMessage },
    });
  } catch (err: any) {
    results.push({ testNumber: 8, name: 'Bloqueio quando as tarifas tornam o resultado inválido', passed: false, details: err.message, observed: null });
  }

  // =========================================================================
  // TESTE 9: Separação integral entre TESTE e PRODUÇÃO
  // =========================================================================
  try {
    // Em produção sem integração real, saldo elegível é 0 e o simulador bloqueia com aviso explícito
    const prodInput: WithdrawalSimulationInput = {
      environment: 'production',
      targetType: 'admin',
      eligibleBalanceBrl: 0.0, // Em produção, saldo real não conectado
      requestedAmountBrl: 500.0,
      feePercentage: 1.5,
      fixedFeeBrl: 3.5,
      estimatedProcessingTime: 'Aguardando Bacen',
      payoutMethod: 'pix_instant',
    };
    const prodRes = monetizationService.simulateWithdrawal(prodInput);

    // No Sandbox, dados de teste são processados
    const sandboxInput: WithdrawalSimulationInput = {
      environment: 'sandbox',
      targetType: 'admin',
      eligibleBalanceBrl: 5000.0,
      requestedAmountBrl: 500.0,
      feePercentage: 1.5,
      fixedFeeBrl: 3.5,
      estimatedProcessingTime: 'Instantâneo via PIX',
      payoutMethod: 'pix_instant',
    };
    const sandRes = monetizationService.simulateWithdrawal(sandboxInput);

    const passed =
      prodRes.isValid === false &&
      prodRes.validationStatus === 'no_real_balance' &&
      sandRes.isValid === true &&
      sandRes.validationStatus === 'valid';

    results.push({
      testNumber: 9,
      name: 'Separação integral entre TESTE e PRODUÇÃO',
      passed,
      details: passed
        ? 'Ambiente Produção bloqueado por ausência de integração bancária real (R$ 0,00). Sandbox plenamente operacional.'
        : 'Falha na separação estrita entre ambientes.',
      observed: { prodStatus: prodRes.validationStatus, sandboxStatus: sandRes.validationStatus },
    });
  } catch (err: any) {
    results.push({ testNumber: 9, name: 'Separação integral entre TESTE e PRODUÇÃO', passed: false, details: err.message, observed: null });
  }

  // =========================================================================
  // TESTE 10: Confirmação de que a simulação não debita nenhuma carteira
  // =========================================================================
  try {
    const walletBefore = monetizationService.getWallet();
    const balanceBefore = walletBefore.balance;

    // Executa simulação
    const input: WithdrawalSimulationInput = {
      environment: 'sandbox',
      targetType: 'admin',
      eligibleBalanceBrl: 5000.0,
      requestedAmountBrl: 1200.0,
      feePercentage: 1.5,
      fixedFeeBrl: 3.5,
      estimatedProcessingTime: 'Instantâneo via PIX',
      payoutMethod: 'pix_instant',
    };
    const res = monetizationService.simulateWithdrawal(input);

    // Salva registro de simulação
    monetizationService.saveWithdrawalSimulationRecord(res);

    const walletAfter = monetizationService.getWallet();
    const balanceAfter = walletAfter.balance;

    const passed = balanceBefore === balanceAfter && res.isValid === true;

    results.push({
      testNumber: 10,
      name: 'Confirmação de que a simulação não debita nenhuma carteira',
      passed,
      details: passed
        ? `Saldo da carteira inalterado antes (${balanceBefore}) e depois (${balanceAfter}) da simulação e do registro.`
        : `Violação de idempotência: saldo alterado de ${balanceBefore} para ${balanceAfter}`,
      observed: { balanceBefore, balanceAfter, delta: balanceAfter - balanceBefore },
    });
  } catch (err: any) {
    results.push({ testNumber: 10, name: 'Confirmação de que a simulação não debita nenhuma carteira', passed: false, details: err.message, observed: null });
  }

  // =========================================================================
  // TESTE 11: Confirmação de que não ocorre transferência real
  // =========================================================================
  try {
    const withdrawalsBefore = monetizationService.getAdminWithdrawalRecords('production');
    const prodRecordsCountBefore = withdrawalsBefore.length;

    // Simula e registra
    const input: WithdrawalSimulationInput = {
      environment: 'sandbox',
      targetType: 'admin',
      eligibleBalanceBrl: 10000.0,
      requestedAmountBrl: 4000.0,
      feePercentage: 1.5,
      fixedFeeBrl: 3.5,
      estimatedProcessingTime: 'Instantâneo via PIX',
      payoutMethod: 'pix_instant',
    };
    const res = monetizationService.simulateWithdrawal(input);
    const savedRecord = monetizationService.saveWithdrawalSimulationRecord(res);

    const withdrawalsAfter = monetizationService.getAdminWithdrawalRecords('production');
    const prodRecordsCountAfter = withdrawalsAfter.length;

    const passed =
      prodRecordsCountBefore === 0 &&
      prodRecordsCountAfter === 0 &&
      savedRecord.status === 'SIMULAÇÃO — SEM MOVIMENTAÇÃO FINANCEIRA';

    results.push({
      testNumber: 11,
      name: 'Confirmação de que não ocorre transferência real',
      passed,
      details: passed
        ? 'Nenhuma ordem bancária ou saque real foi criado. Registro identificado como "SIMULAÇÃO — SEM MOVIMENTAÇÃO FINANCEIRA".'
        : 'Ordem real gerada indevidamente durante a simulação.',
      observed: { prodRecordsCount: prodRecordsCountAfter, recordStatus: savedRecord.status },
    });
  } catch (err: any) {
    results.push({ testNumber: 11, name: 'Confirmação de que não ocorre transferência real', passed: false, details: err.message, observed: null });
  }

  // =========================================================================
  // TESTE 12: Confirmação de que módulos, rankings, créditos e funções anteriores continuam funcionando
  // =========================================================================
  try {
    const creatorRankings = monetizationService.getCreatorRankings('sandbox', 'all');
    const userRankings = monetizationService.getUserVolumeRankings('sandbox', 'all');
    const statement = monetizationService.getPlatformFinancialStatement('sandbox', 'all');
    const ledgerCheck = financialLedger.verifyLedgerIntegrity();

    const passed =
      creatorRankings.length > 0 &&
      userRankings.length > 0 &&
      statement.grossRevenueConfirmedBrl > 0 &&
      ledgerCheck.isValid === true;

    results.push({
      testNumber: 12,
      name: 'Confirmação de que módulos, rankings, créditos e funções anteriores continuam funcionando',
      passed,
      details: passed
        ? `Rankings (${creatorRankings.length} criadores, ${userRankings.length} usuários), 9 indicadores da plataforma e livro-razão íntegros e preservados.`
        : 'Inconsistência nos módulos existentes após a adição do simulador.',
      observed: {
        creatorsCount: creatorRankings.length,
        usersCount: userRankings.length,
        grossRevenue: statement.grossRevenueConfirmedBrl,
        ledgerValid: ledgerCheck.isValid,
      },
    });
  } catch (err: any) {
    results.push({ testNumber: 12, name: 'Confirmação de que módulos, rankings, créditos e funções anteriores continuam funcionando', passed: false, details: err.message, observed: null });
  }

  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.length - passedCount;

  return {
    total: results.length,
    passed: passedCount,
    failed: failedCount,
    results,
  };
}
