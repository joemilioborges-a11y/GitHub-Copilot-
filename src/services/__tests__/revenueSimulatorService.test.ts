/**
 * JOBS — SUÍTE DE TESTES AUTOMATIZADOS DO SIMULADOR ADMINISTRATIVO DE RECEITA
 *
 * Cobre integralmente os 10 casos obrigatórios da Seção 9:
 * 1. Cenário padrão: 1.000 vendas do pacote Inicial por R$ 9,90 -> R$ 9.900,00 bruto, R$ 6.930,00 criadores (70%),
 *    R$ 1.980,00 JOBS (20%), R$ 990,00 reserva (10%), 50.000 💎 pagos, 0 💎 bônus.
 * 2. Cenário com 0 vendas.
 * 3. Cenário com 1 venda.
 * 4. Cenário com grande volume (100.000 vendas) sem perda de precisão em centavos.
 * 5. Cenário com centavos quebrados garantindo c_criadores + c_jobs + c_reserva === B (100%).
 * 6. Cenário com pacote contendo bônus promocional (segregação de bônus vs diamantes pagos).
 * 7. Rejeição de percentuais inválidos (soma != 100%).
 * 8. Rejeição de valores negativos (vendas < 0, preço <= 0, diamantes < 0).
 * 9. Garantia de que a simulação não altera saldos reais do ledgerService.
 * 10. Separação estrita entre sandbox e produção + bloqueio de perfil não administrativo.
 */

import { financialLedger } from '../ledgerService';
import { revenueSimulatorService } from '../revenueSimulatorService';

export interface RevenueSimulatorTestCaseResult {
  testNumber: number;
  id: string;
  name: string;
  passed: boolean;
  durationMs: number;
  evidence: string;
  error?: string;
}

export interface RevenueSimulatorTestSuiteSummary {
  total: number;
  passed: number;
  failed: number;
  durationMs: number;
  results: RevenueSimulatorTestCaseResult[];
}

function assertCondition(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

export async function runRevenueSimulatorTestSuite(): Promise<RevenueSimulatorTestSuiteSummary> {
  const results: RevenueSimulatorTestCaseResult[] = [];
  const suiteStart = Date.now();

  const runTest = async (
    testNumber: number,
    id: string,
    name: string,
    fn: () => Promise<string> | string
  ) => {
    const t0 = Date.now();
    try {
      const evidence = await fn();
      results.push({
        testNumber,
        id,
        name,
        passed: true,
        durationMs: Date.now() - t0,
        evidence,
      });
    } catch (err: any) {
      results.push({
        testNumber,
        id,
        name,
        passed: false,
        durationMs: Date.now() - t0,
        evidence: 'Falha na asserção',
        error: err?.message || String(err),
      });
    }
  };

  // 1. Cenário padrão obrigatório: 1.000 vendas do pacote Inicial por R$ 9,90
  await runTest(
    1,
    'REV-SIM-01',
    'Cenário de referência obrigatório: 1.000 vendas × Pacote Inicial (R$ 9,90 | 50 💎 | 0 bônus | 70/20/10)',
    () => {
      const res = revenueSimulatorService.runSimulation();
      assertCondition(res.grossEstimatedRevenueCents === 990000, `Esperado 990000 centavos, obtido ${res.grossEstimatedRevenueCents}`);
      assertCondition(res.grossEstimatedRevenueBrl === 9900, `Esperado R$ 9.900,00, obtido ${res.grossEstimatedRevenueBrl}`);
      assertCondition(res.creatorsGrossShareCents === 693000, `Esperado 693000 centavos (R$ 6.930,00), obtido ${res.creatorsGrossShareCents}`);
      assertCondition(res.jobsGrossShareCents === 198000, `Esperado 198000 centavos (R$ 1.980,00), obtido ${res.jobsGrossShareCents}`);
      assertCondition(res.reserveShareCents === 99000, `Esperado 99000 centavos (R$ 990,00), obtido ${res.reserveShareCents}`);
      assertCondition(res.totalDistributedCents === 990000, `Total distribuído deve ser 990000 centavos`);
      assertCondition(res.diamondBreakdown.totalPaidDiamondsCredited === 50000, `Esperado 50.000 💎 pagos`);
      assertCondition(res.diamondBreakdown.totalBonusDiamondsCredited === 0, `Esperado 0 💎 bônus`);
      assertCondition(res.diamondBreakdown.totalDiamondsDistributed === 50000, `Esperado 50.000 💎 distribuídos`);
      assertCondition(!res.catalogVerification.hasPriceDivergence, `Pacote Inicial não deve divergir do catálogo padrão (R$ 9,90)`);
      assertCondition(res.indicators.length === 11, `Devem existir exatamente os 11 indicadores obrigatórios`);
      const jobsInd = res.indicators.find((i) => i.key === 'jobs_gross_share');
      const netInd = res.indicators.find((i) => i.key === 'net_result');
      assertCondition(jobsInd?.isAvailableForWithdrawal === false, `Participação bruta do JOBS (R$ 1.980,00) jamais pode ser marcada como sacável`);
      assertCondition(netInd?.status === 'insufficient_data' && netInd?.formattedDisplay === 'Dados insuficientes', `Resultado líquido sem despesas completas deve retornar "Dados insuficientes"`);
      return `Bruto=${res.grossEstimatedRevenueCents}c (R$ 9.900,00) | 70%=${res.creatorsGrossShareCents}c (R$ 6.930,00) | 20%=${res.jobsGrossShareCents}c (R$ 1.980,00) | 10%=${res.reserveShareCents}c (R$ 990,00) | Diamantes=${res.diamondBreakdown.totalDiamondsDistributed} 💎`;
    }
  );

  // 2. Cenário com 0 vendas
  await runTest(
    2,
    'REV-SIM-02',
    'Cenário com 0 vendas (receita zero, parcelas zero e zero diamantes emitidos)',
    () => {
      const res = revenueSimulatorService.runSimulation({ salesQuantity: 0 });
      assertCondition(res.grossEstimatedRevenueCents === 0, 'Receita bruta deve ser 0');
      assertCondition(res.creatorsGrossShareCents === 0, 'Parcela criadores deve ser 0');
      assertCondition(res.jobsGrossShareCents === 0, 'Parcela JOBS deve ser 0');
      assertCondition(res.reserveShareCents === 0, 'Reserva deve ser 0');
      assertCondition(res.totalDistributedCents === 0, 'Total distribuído deve ser 0');
      assertCondition(res.diamondBreakdown.totalDiamondsDistributed === 0, 'Total de diamantes deve ser 0');
      return `N=0 -> Bruto=0c | Distribuído=0c | Diamantes=0 💎`;
    }
  );

  // 3. Cenário com 1 venda
  await runTest(
    3,
    'REV-SIM-03',
    'Cenário com 1 venda do pacote Inicial (R$ 9,90 -> R$ 6,93 / R$ 1,98 / R$ 0,99)',
    () => {
      const res = revenueSimulatorService.runSimulation({ salesQuantity: 1 });
      assertCondition(res.grossEstimatedRevenueCents === 990, 'Receita bruta deve ser 990 centavos');
      assertCondition(res.creatorsGrossShareCents === 693, '70% de 990c deve ser 693c (R$ 6,93)');
      assertCondition(res.jobsGrossShareCents === 198, '20% de 990c deve ser 198c (R$ 1,98)');
      assertCondition(res.reserveShareCents === 99, '10% de 990c deve ser 99c (R$ 0,99)');
      assertCondition(res.totalDistributedCents === 990, 'Soma distribuída deve ser 990c');
      assertCondition(res.diamondBreakdown.totalDiamondsDistributed === 50, '50 💎 distribuídos');
      return `N=1 -> 990c = 693c (70%) + 198c (20%) + 99c (10%) | 50 💎`;
    }
  );

  // 4. Cenário com grande volume (100.000 vendas)
  await runTest(
    4,
    'REV-SIM-04',
    'Cenário de alto volume (100.000 vendas) sem perda de precisão em centavos inteiros',
    () => {
      const res = revenueSimulatorService.runSimulation({ salesQuantity: 100000 });
      assertCondition(res.grossEstimatedRevenueCents === 99000000, 'Esperado 99.000.000 centavos (R$ 990.000,00)');
      assertCondition(res.creatorsGrossShareCents === 69300000, 'Esperado 69.300.000 centavos (R$ 693.000,00)');
      assertCondition(res.jobsGrossShareCents === 19800000, 'Esperado 19.800.000 centavos (R$ 198.000,00)');
      assertCondition(res.reserveShareCents === 9900000, 'Esperado 9.900.000 centavos (R$ 99.000,00)');
      assertCondition(res.totalDistributedCents === 99000000, 'Soma distribuída exata de 99.000.000 centavos');
      assertCondition(res.diamondBreakdown.totalDiamondsDistributed === 5000000, 'Esperado 5.000.000 💎');
      return `N=100.000 -> Bruto=99.000.000c (R$ 990.000,00) | Diamantes=5.000.000 💎`;
    }
  );

  // 5. Cenário com centavos quebrados garantindo c_criadores + c_jobs + c_reserva === B
  await runTest(
    5,
    'REV-SIM-05',
    'Cenário com centavos quebrados (1 venda a R$ 9,99 = 999 centavos) garantindo soma exata de 100%',
    () => {
      const res = revenueSimulatorService.runSimulation({
        salesQuantity: 1,
        referencePricePerPackageCents: 999,
      });
      // floor(999 * 0.70) = 699, floor(999 * 0.20) = 199, floor(999 * 0.10) = 99 -> soma parcial = 997, resíduo = 2c -> reserva = 101c
      assertCondition(res.grossEstimatedRevenueCents === 999, 'Base B deve ser 999 centavos');
      assertCondition(
        res.creatorsGrossShareCents + res.jobsGrossShareCents + res.reserveShareCents === 999,
        `Soma das partes (${res.creatorsGrossShareCents + res.jobsGrossShareCents + res.reserveShareCents}) deve ser idêntica a B (999)`
      );
      assertCondition(res.roundingRemainderCents === 2, `Resíduo esperado de 2 centavos, obtido ${res.roundingRemainderCents}`);
      assertCondition(res.catalogVerification.hasPriceDivergence === true, 'Deve detectar divergência em relação ao preço padrão de 990c');
      return `B=999c -> Criadores=${res.creatorsGrossShareCents}c + JOBS=${res.jobsGrossShareCents}c + Reserva=${res.reserveShareCents}c = ${res.totalDistributedCents}c (resíduo=${res.roundingRemainderCents}c)`;
    }
  );

  // 6. Cenário com pacote contendo bônus (ex: Pacote Popular: 150 pagos + 20 bônus por R$ 27,90)
  await runTest(
    6,
    'REV-SIM-06',
    'Cenário com pacote contendo bônus (Popular: 150 💎 pagos + 20 💎 bônus, passivo fiduciário de bônus = R$ 0,00)',
    () => {
      const res = revenueSimulatorService.runSimulation({
        packageId: 'pkg_popular',
        packageName: 'Popular',
        salesQuantity: 100,
        paidDiamondsPerSale: 150,
        bonusDiamondsPerSale: 20,
        referencePricePerPackageCents: 2790,
      });
      assertCondition(res.grossEstimatedRevenueCents === 279000, '100 * 2790c = 279.000c (R$ 2.790,00)');
      assertCondition(res.diamondBreakdown.totalPaidDiamondsCredited === 15000, '15.000 💎 pagos');
      assertCondition(res.diamondBreakdown.totalBonusDiamondsCredited === 2000, '2.000 💎 bônus');
      assertCondition(res.diamondBreakdown.totalDiamondsDistributed === 17000, '17.000 💎 totais');
      assertCondition(res.diamondBreakdown.bonusDiamondsFiatValueCents === 0, 'Bônus promocional deve ter valor fiduciário 0');
      assertCondition(!res.catalogVerification.hasPriceDivergence, 'Compatível com o pacote Popular do catálogo');
      return `Popular (100 vendas): Pagos=15.000 💎 | Bônus=2.000 💎 (R$ 0,00 passivo) | Total=17.000 💎 | Bruto=R$ 2.790,00`;
    }
  );

  // 7. Rejeição de percentuais inválidos (soma != 100%)
  await runTest(
    7,
    'REV-SIM-07',
    'Rejeição de alíquotas cuja soma seja diferente de 100% (ex: 70% + 20% + 5% = 95%)',
    () => {
      let rejected = false;
      let errMsg = '';
      try {
        revenueSimulatorService.runSimulation({
          creatorSharePct: 70,
          jobsSharePct: 20,
          reserveSharePct: 5,
        });
      } catch (err: any) {
        rejected = true;
        errMsg = err?.message || '';
      }
      assertCondition(rejected, 'Simulação deveria falhar quando a soma dos percentuais é 95%');
      assertCondition(errMsg.includes('100%'), `Mensagem de erro deve mencionar exigência de 100%: ${errMsg}`);
      return `Rejeitado com sucesso: "${errMsg}"`;
    }
  );

  // 8. Rejeição de valores negativos (N < 0, P <= 0, diamantes < 0)
  await runTest(
    8,
    'REV-SIM-08',
    'Rejeição de parâmetros negativos ou preço igual a zero (N < 0, P <= 0, d_pago < 0, d_bonus < 0)',
    () => {
      const invalidCases = [
        { salesQuantity: -10 },
        { referencePricePerPackageCents: 0 },
        { referencePricePerPackageCents: -990 },
        { paidDiamondsPerSale: -5 },
        { bonusDiamondsPerSale: -1 },
      ];
      let rejectedCount = 0;
      for (const invalid of invalidCases) {
        try {
          revenueSimulatorService.runSimulation(invalid);
        } catch {
          rejectedCount += 1;
        }
      }
      assertCondition(
        rejectedCount === invalidCases.length,
        `Esperado rejeitar todos os ${invalidCases.length} casos inválidos, rejeitou ${rejectedCount}`
      );
      return `${rejectedCount}/${invalidCases.length} entradas negativas/inválidas bloqueadas com sucesso`;
    }
  );

  // 9. Garantia de imutabilidade do ledgerService antes e depois da simulação
  await runTest(
    9,
    'REV-SIM-09',
    'Garantia de que a simulação não altera saldos reais nem entradas do ledgerService',
    () => {
      const entriesBefore = financialLedger.getEntries().length;
      const userCreditsBefore = financialLedger.getUserCredits('current_user');
      const creatorBalBefore = financialLedger.getCreatorBalances('creator_valentina').availableBrl;
      const integrityBefore = financialLedger.verifyLedgerIntegrity();

      const res = revenueSimulatorService.runSimulation({
        salesQuantity: 5000,
        referencePricePerPackageCents: 990,
      });

      const entriesAfter = financialLedger.getEntries().length;
      const userCreditsAfter = financialLedger.getUserCredits('current_user');
      const creatorBalAfter = financialLedger.getCreatorBalances('creator_valentina').availableBrl;
      const integrityAfter = financialLedger.verifyLedgerIntegrity();

      assertCondition(entriesBefore === entriesAfter, 'Número de entradas do ledger não pode mudar');
      assertCondition(userCreditsBefore === userCreditsAfter, 'Saldo de créditos do usuário não pode mudar');
      assertCondition(creatorBalBefore === creatorBalAfter, 'Saldo fiduciário do criador não pode mudar');
      assertCondition(integrityBefore.isValid && integrityAfter.isValid, 'Integridade SHA-256 do ledger deve permanecer válida');
      assertCondition(res.ledgerMutated === false, 'Flag ledgerMutated deve ser false');

      return `Ledger intacto: entradas=${entriesBefore}->${entriesAfter} | userCredits=${userCreditsBefore} | creatorBrl=${creatorBalBefore} | SHA-256 válido`;
    }
  );

  // 10. Separação entre sandbox e produção + bloqueio de perfil não administrativo
  await runTest(
    10,
    'REV-SIM-10',
    'Separação entre sandbox e produção e bloqueio de execução por perfil não administrativo',
    () => {
      const sandboxRes = revenueSimulatorService.runSimulation({
        environment: 'sandbox',
        salesQuantity: 1000,
      });
      const prodRes = revenueSimulatorService.runSimulation({
        environment: 'production',
        salesQuantity: 1000,
      });

      const prodConfirmedSales = prodRes.indicators.find((i) => i.key === 'confirmed_sales_revenue');
      const prodAvailable = prodRes.indicators.find((i) => i.key === 'confirmed_available_platform_amount');

      assertCondition(sandboxRes.environment === 'sandbox', 'Ambiente sandbox identificado');
      assertCondition(prodRes.environment === 'production', 'Ambiente production identificado');
      assertCondition(prodConfirmedSales?.amountCents === 0, 'Em produção isolada, receita confirmada real deve ser 0c');
      assertCondition(prodAvailable?.amountCents === 0, 'Em produção isolada, saldo disponível confirmado deve ser 0c');

      let nonAdminBlocked = false;
      try {
        revenueSimulatorService.runSimulation({
          actorRole: 'user',
        });
      } catch {
        nonAdminBlocked = true;
      }
      assertCondition(nonAdminBlocked, 'Perfil não administrativo ("user") deve ser bloqueado');

      return `Sandbox e Produção segregados (Prod confirmado=0c) | Perfil "user" bloqueado por RBAC`;
    }
  );

  const passed = results.filter((r) => r.passed).length;
  const failed = results.length - passed;

  return {
    total: results.length,
    passed,
    failed,
    durationMs: Date.now() - suiteStart,
    results,
  };
}
