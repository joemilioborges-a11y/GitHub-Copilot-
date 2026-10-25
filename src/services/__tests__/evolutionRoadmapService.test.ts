import { evolutionRoadmapService } from '../evolutionRoadmapService';

export interface EvolutionTestResult {
  testNumber: number;
  name: string;
  passed: boolean;
  message?: string;
  durationMs: number;
}

export interface EvolutionTestSuiteSummary {
  total: number;
  passed: number;
  failed: number;
  executionDurationMs: number;
  results: EvolutionTestResult[];
}

export async function runEvolutionRoadmapTestSuite(): Promise<EvolutionTestSuiteSummary> {
  const start = performance.now();
  const results: EvolutionTestResult[] = [];

  const runTest = (num: number, name: string, fn: () => boolean | void) => {
    const t0 = performance.now();
    try {
      const res = fn();
      const passed = res !== false;
      results.push({
        testNumber: num,
        name,
        passed,
        durationMs: Math.round(performance.now() - t0),
      });
    } catch (err: any) {
      results.push({
        testNumber: num,
        name,
        passed: false,
        message: err?.message || String(err),
        durationMs: Math.round(performance.now() - t0),
      });
    }
  };

  // Teste 1: Existência de todas as 12 fases (Fases 0 a 11)
  runTest(1, 'Exatamente 12 fases cadastradas (Fases 0 a 11)', () => {
    const phases = evolutionRoadmapService.getEvolutionPhases();
    if (phases.length !== 12) throw new Error(`Esperado 12 fases, recebido ${phases.length}`);
    for (let i = 0; i <= 11; i++) {
      const p = evolutionRoadmapService.getPhaseByNumber(i as any);
      if (!p) throw new Error(`Fase ${i} não encontrada.`);
      if (p.phaseNumber !== i) throw new Error(`Inconsistência no número da fase: ${p.phaseNumber}`);
    }
  });

  // Teste 2: Critérios de Aceite mínimos por fase (>= 3)
  runTest(2, 'Cada fase possui no mínimo 3 critérios de aceitação mapeados', () => {
    const phases = evolutionRoadmapService.getEvolutionPhases();
    for (const p of phases) {
      if (p.acceptanceCriteria.length < 3) {
        throw new Error(`Fase ${p.phaseNumber} tem apenas ${p.acceptanceCriteria.length} critérios.`);
      }
    }
  });

  // Teste 3: Métricas de resumo executivo calculadas corretamente
  runTest(3, 'Métricas globais de resumo com 100% de integridade', () => {
    const m = evolutionRoadmapService.getSummaryMetrics();
    if (m.totalPhases !== 12) throw new Error(`Total de fases incorreto: ${m.totalPhases}`);
    if (m.totalCriteria < 36) throw new Error(`Total de critérios abaixo de 36: ${m.totalCriteria}`);
    if (m.metCriteria !== m.totalCriteria) {
      throw new Error(`Critérios não atendidos: ${m.metCriteria}/${m.totalCriteria}`);
    }
    if (m.overallProgressPct !== 100) {
      throw new Error(`Progresso geral incorreto: ${m.overallProgressPct}%`);
    }
  });

  // Teste 4: Execução da Auditoria de Conformidade
  runTest(4, 'Auditoria de conformidade passa em 100% das fases', () => {
    const audit = evolutionRoadmapService.runPhaseAudit();
    if (!audit.allPassed) throw new Error('Auditoria falhou em alguma fase.');
    if (audit.phasesAudited !== 12) throw new Error(`Fases auditadas incorreto: ${audit.phasesAudited}`);
  });

  // Teste 5: Exportação de Relatório Markdown
  runTest(5, 'Exportação de relatório executivo em Markdown estruturado', () => {
    const md = evolutionRoadmapService.exportRoadmapMarkdown();
    if (!md.includes('JOBS 1.0 — Relatório Consolidado')) {
      throw new Error('Cabeçalho de relatório ausente no Markdown.');
    }
    if (!md.includes('FASE_0') || !md.includes('FASE_11')) {
      throw new Error('Fases 0 e 11 devem estar no Markdown gerado.');
    }
  });

  // Teste 6: Princípios mandatórios e notas LGPD em cada fase
  runTest(6, 'Cada fase possui princípios arquiteturais e notas de segurança/LGPD', () => {
    const phases = evolutionRoadmapService.getEvolutionPhases();
    for (const p of phases) {
      if (!p.principles || p.principles.length === 0) {
        throw new Error(`Fase ${p.phaseNumber} não possui princípios documentados.`);
      }
      if (!p.securityAndLgpdNotes || p.securityAndLgpdNotes.length === 0) {
        throw new Error(`Fase ${p.phaseNumber} não possui notas de segurança/LGPD.`);
      }
    }
  });

  // Teste 7: Todas as fases possuem tarefas com atribuição nominal de responsabilidade técnica
  runTest(7, 'Todas as 12 fases possuem tarefas mapeadas com atribuição nominal de papéis', () => {
    const phases = evolutionRoadmapService.getEvolutionPhases();
    let totalTasksCount = 0;
    for (const p of phases) {
      if (!p.tasks || p.tasks.length === 0) {
        throw new Error(`Fase ${p.phaseNumber} não possui tarefas mapeadas.`);
      }
      for (const t of p.tasks) {
        totalTasksCount++;
        if (!t.taskNumber || !t.title || !t.responsibleRole || !t.assignedNominalLead) {
          throw new Error(`Tarefa ${t.taskNumber} em Fase ${p.phaseNumber} com atributos incompletos.`);
        }
      }
    }
    if (totalTasksCount < 25) {
      throw new Error(`Total de tarefas nominais insuficiente: ${totalTasksCount}`);
    }
  });

  const duration = Math.round(performance.now() - start);
  const passed = results.filter((r) => r.passed).length;

  return {
    total: results.length,
    passed,
    failed: results.length - passed,
    executionDurationMs: duration,
    results,
  };
}
