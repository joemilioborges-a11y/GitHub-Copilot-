# JOBS — Relatório de Diagnóstico e Recuperação Auditável de Dependências

**Estado Final**: `DIAGNÓSTICO CONCLUÍDO`

---

## 1. Data, Hora e Ambiente (Fase 1)

| Parâmetro | Valor Registrado | Código de Saída (`Exit Code`) |
| :--- | :--- | :--- |
| **Raiz Confirmada do Projeto** | `/app/applet` | `0` |
| **Data/Hora de Início (UTC)** | `2026-10-27T02:20:28+00:00` (`2026-10-26T19:20:28-07:00` local) | `0` |
| **Data/Hora de Término (UTC)** | `2026-10-27T02:21:09+00:00` (`2026-10-26T19:21:09-07:00` local) | `0` |
| **`node --version`** | `v22.23.4` | `0` |
| **`npm --version`** | `10.9.9` | `0` |
| **`bun --version`** | `1.4.4` | `0` |
| **`git status --short`** | `fatal: not a git repository (or any of the parent directories): .git` | `128` |

---

## 2. Arquivos Inspecionados e Estado Inicial (Fase 1)

| Arquivo / Diretório | Existência | Tamanho Exato / Uso em Disco | Hash SHA-256 (Inicial e Final) | Validação Estrutural |
| :--- | :--- | :--- | :--- | :--- |
| **`package.json`** | Presente | `1.509 bytes` (`1.5K`) | `c4a42559d2848c31d346a5657176a73bcd7ccc68963c0ef5ab5fdd58559ecd1f` | JSON válido (`PACKAGE_JSON_VALID=true`, `exit code: 0`) |
| **`package-lock.json`** | **Ausente** | N/A | N/A | `ls: cannot access 'package-lock.json': No such file or directory` |
| **`bun.lock`** | Presente | `150.934 bytes` (`148K`) | `e2fadb0745f64ef7556874fb085cacf662a5fb43db3daa002487fb588e993270` | Lockfile JSONC do Bun (`lockfileVersion: 2`, `configVersion: 1`) |
| **`node_modules`** | Presente | `530M` (diretório `13.320 bytes`) | N/A | 31 dependências diretas íntegras (`npm ls --depth=0` -> `exit code: 0`) |
| **`yarn.lock`** | Ausente | N/A | N/A | `No such file or directory` |
| **`pnpm-lock.yaml`** | Ausente | N/A | N/A | `No such file or directory` |
| **`npm-shrinkwrap.json`** | Ausente | N/A | N/A | `No such file or directory` |

---

## 3. Análise Técnica de `package.json` e Lockfile (Fase 1.3)

1. **Validade JSON e Estrutura do Lockfile**:
   - `package.json` validado com `JSON.parse` no Node.js (`exit code: 0`).
   - `package-lock.json` não existe no repositório. O gerenciador que provisionou o ambiente é o **Bun (`v1.4.4`)**, utilizando `bun.lock` (`"lockfileVersion": 2`, `"configVersion": 1`).
2. **Compatibilidade de `lockfileVersion` com `npm`**:
   - O `"lockfileVersion": 2` dentro de `bun.lock` pertence à especificação textual JSONC do Bun (com vírgulas finais e tuplas compactas de resolução), **não** sendo um `package-lock.json` v2/v3 do `npm`.
3. **Sincronização entre Dependências Declaradas e Instaladas**:
   - Todas as **18 `dependencies`** e **13 `devDependencies`** declaradas em `package.json` estão 100% sincronizadas com a seção `workspaces[""]` de `bun.lock` e instaladas em `node_modules` em versões compatíveis com as faixas semânticas (`^`).
4. **Requisitos de Node.js**:
   - `package.json` não declara o campo `"engines"` nem `"packageManager"`.
   - Indiretamente, `@types/node` declara `^22.14.0` (resolvido para `22.20.5`) e `vite@8.3.4` exige Node `^20.19.0 || >=22.12.0`. O runtime ativo (`v22.23.4`) atende integralmente a esses requisitos.

---

## 4. Inconsistências Encontradas e Evidências Concretas (Fases 1 e 4)

### 4.1. Ausência de `package-lock.json` (Repositório Provisionado com `bun.lock`)
- **Evidência**: `ls -ld package-lock.json` retorna `No such file or directory`; `bun.lock` (`150.934 bytes`) é o único lockfile presente.

### 4.2. Conflito Latente de `peerDependencies`: `typescript@7.0.2` vs. `@typescript-eslint/*@8.72.0`
- **Evidência**:
  - `package.json` (linha 51) declara `"typescript": "^7.0.2"` (instalado `7.0.2`).
  - `@firebase/eslint-plugin-security-rules@0.0.2` depende de `@typescript-eslint/rule-tester@^8.57.2`, que resolve `@typescript-eslint/*@8.72.0` em `bun.lock` (linhas 471–485), cuja `peerDependencies` exige `"typescript": ">=4.8.4 <6.1.0"`.
  - Caso o `npm install` fosse executado sem `--legacy-peer-deps` ou `--force`, o `npm 10.9.9` abortaria com erro `ERESOLVE`.

### 4.3. Divergência de `peerDependencies` e Duplicação de `esbuild` (`0.25.12` vs. `0.28.2`)
- **Evidência**:
  - `package.json` (linha 46) declara `"esbuild": "^0.25.0"` (instalado `0.25.12` na raiz).
  - `vite@8.3.4` (`bun.lock`, linha 1151) declara peer opcional `"esbuild": "^0.27.0 || ^0.28.0"`.
  - `tsx@4.23.15` (`bun.lock`, linha 1117 e 1237) exige `"esbuild": "~0.28.0"`, gerando uma instalação duplicada aninhada `tsx/esbuild` na versão `0.28.2`.

### 4.4. Erros de Checagem Estática de Tipos (`npm run lint` / `tsc --noEmit`)
- **Evidência**: Embora o `npm run build` (`vite build`) e o `npm test` (`286/286 testes`) passem com código `0`, o script `npm run lint` (`tsc --noEmit`) retornou `EXIT_CODE_LINT=1` com 4 erros de tipagem estrita do `typescript@7.0.2`:
  - `src/components/admin/AdminRevenueSimulatorPanel.tsx(60,31): error TS2345: Argument of type 'number | undefined' is not assignable to parameter of type 'SetStateAction<number>'.`
  - `src/services/__tests__/revenueSimulatorService.test.ts(263,88): error TS2554: Expected 1 arguments, but got 2.`
  - `src/services/__tests__/revenueSimulatorService.test.ts(273,87): error TS2554: Expected 1 arguments, but got 2.`
  - `src/services/revenueSimulatorService.ts(340,7): error TS2322: Type 'number | undefined' is not assignable to type 'number | null'.`

---

## 5. Decisão Baseada em Evidências (Fases 2 e 3)

- **Decisão Tomada**: **NÃO remover `node_modules` e NÃO executar `npm install` (Fase 3 não acionada)**.
- **Justificativa Técnica Auditável**:
  1. A árvore `node_modules` (`530M`) está **100% íntegra e consistente** com `package.json` e `bun.lock`, comprovado por `npm ls --depth=0` (`EXIT_CODE_NPM_LS=0`), `npm run build` (`EXIT_CODE_BUILD=0`) e `npm test` (`286/286 aprovados`, `EXIT_CODE_TEST=0`).
  2. Conforme as diretrizes da Fase 2 (*"Se os arquivos estiverem consistentes, não apague `node_modules` por rotina"* e *"Verifique se o projeto usa npm como gerenciador oficial. Não misture npm com Yarn ou pnpm nem substitua o lockfile sem justificativa"*), remover `node_modules` e rodar `npm install` misturaria gerenciadores (`npm` sobre um projeto gerenciado por `bun.lock`) e falharia na resolução estrita de `peerDependencies` (`typescript@7.0.2` vs `@typescript-eslint@8.72.0`) já que a Fase 3 proíbe o uso de `--force` ou `--legacy-peer-deps`.
- **Alterações no Lockfile**: **Nenhuma** (`package.json` e `bun.lock` mantiveram exatamente os mesmos hashes SHA-256 antes e depois de todas as verificações).

---

## 6. Resultados das Verificações Posteriores (Fase 4)

| Verificação Executada | Comando | Exit Code | Resultado Resumido |
| :--- | :--- | :--- | :--- |
| **Árvore de Dependências (Nível 0)** | `npm ls --depth=0` | `0` | **Aprovado** — Todos os 31 pacotes diretos resolvidos sem pacotes `MISSING` ou `extraneous`. |
| **Listagem de Scripts** | `npm run` | `0` | **Aprovado** — 10 scripts listados (`test`, `dev`, `build`, `preview`, `clean`, `lint`, `typecheck`, `test:lives`, `build:android`, `cap:sync`). |
| **Checagem de Tipos TypeScript** | `npm run lint` (`tsc --noEmit`) | `1` | **Reprovado** — 4 erros de tipo em `AdminRevenueSimulatorPanel.tsx`, `revenueSimulatorService.ts` e `revenueSimulatorService.test.ts`. |
| **Build de Produção** | `npm run build` (`vite build`) | `0` | **Aprovado** — `2323 modules transformed`, `dist/index.html` (`1.76 kB`), `dist/assets/index-Q_Iw-rIx.css` (`287.81 kB`), `dist/assets/index-NH7aWtLZ.js` (`3,213.36 kB`) em `3.04s`. |
| **Suíte de Testes Automatizados** | `npm test` (`tsx scripts/runVerificationTests.ts`) | `0` | **Aprovado** — **286 de 286 casos de teste aprovados (100.0%)** em `694ms`, com `0 falhas`. |

---

## 7. Logs Salvos e Preservação de Evidências (Fase 5)

Os logs completos sem dados sensíveis foram gravados e confirmados no diretório de auditoria identificado por data `/app/applet/logs/auditoria-2026-10-26/` (automaticamente ignorado pelo Git via regra `*.log` na linha 6 do `.gitignore`):

| Arquivo de Log Confirmado em Disco | Tamanho | Conteúdo |
| :--- | :--- | :--- |
| `logs/auditoria-2026-10-26/01-fase1-inspecao.log` | `1.2 KB` | Timestamps, versões (`node`, `npm`, `bun`), status do Git, tamanhos em disco, validação JSON e hashes SHA-256 iniciais. |
| `logs/auditoria-2026-10-26/02-fase4-validacao.log` | `3.2 KB` | Saídas completas e códigos de saída de `npm ls --depth=0`, `npm run`, `npm run lint` e `npm run build`. |
| `logs/auditoria-2026-10-26/03-fase4-testes.log` | `65.0 KB` | Saída integral dos 286 testes automatizados da plataforma JOBS e hashes SHA-256 finais. |

---

## 8. Falhas Pendentes e Próximos Passos Recomendados

1. **Corrigir os 4 erros de tipagem reportados por `npm run lint` (`tsc --noEmit`)**:
   - Ajustar o fallback numérico em `src/components/admin/AdminRevenueSimulatorPanel.tsx` (linha 60) e `src/services/revenueSimulatorService.ts` (linha 340), bem como a assinatura das duas chamadas em `src/services/__tests__/revenueSimulatorService.test.ts` (linhas 263 e 273), para que `npm run lint` retorne `exit code: 0`.
2. **Alinhar `peerDependencies` antes de qualquer migração futura de `bun.lock` para `package-lock.json`**:
   - Atualizar `"esbuild"` em `devDependencies` para `"^0.28.0"` (eliminando a duplicação com `tsx` e atendendo ao peer do `vite@8.3.4`) e avaliar a compatibilidade de versão do `typescript` com `@typescript-eslint` caso deseje adotar `npm install` / `npm ci` nativamente.
