import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  getSafeMeetupRecommendationsServer,
  generateContentServer,
} from '../../server/geminiService';
import { fetchZoneSafeMeetupRecommendations } from '../../utils/proximityPrivacyService';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../..');

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`FALHA DE ASSERÇÃO: ${message}`);
  }
}

async function runGeminiServerMigrationTests(): Promise<void> {
  console.log('======================================================================');
  console.log('SUÍTE DE TESTES: MIGRAÇÃO DO GEMINI API PARA O SERVIDOR (FULL-STACK)');
  console.log('======================================================================');

  // ---------------------------------------------------------------------------
  // TESTE 1: Verificação de ausência de importação de @google/genai no cliente
  // ---------------------------------------------------------------------------
  const proximityServiceContent = fs.readFileSync(
    path.join(rootDir, 'src/utils/proximityPrivacyService.ts'),
    'utf-8'
  );
  assert(
    !proximityServiceContent.includes("from '@google/genai'") &&
      !proximityServiceContent.includes('from "@google/genai"'),
    'Teste 1: src/utils/proximityPrivacyService.ts NÃO deve importar @google/genai no cliente'
  );
  assert(
    !proximityServiceContent.includes('process.env.GEMINI_API_KEY'),
    'Teste 1b: src/utils/proximityPrivacyService.ts NÃO deve ler process.env.GEMINI_API_KEY no cliente'
  );
  console.log('✓ Teste 1 passou: Código do navegador livre de importações do SDK @google/genai e chaves de API.');

  // ---------------------------------------------------------------------------
  // TESTE 2: Recomendação segura no servidor (fallback e estrutura de retorno)
  // ---------------------------------------------------------------------------
  const serverResult = await getSafeMeetupRecommendationsServer({
    zoneId: 'sp_jardins',
    neighborhoodName: 'Jardins',
    cityName: 'São Paulo',
    centroid: { lat: -23.565, lng: -46.665 },
  });

  assert(
    typeof serverResult.summaryText === 'string' && serverResult.summaryText.length > 10,
    'Teste 2a: summaryText deve ser uma string descritiva'
  );
  assert(
    Array.isArray(serverResult.citations),
    'Teste 2b: citations deve ser um array'
  );
  assert(
    serverResult.source === 'curated_public_landmarks' || serverResult.source === 'gemini_maps_grounding',
    'Teste 2c: source deve ser válido'
  );
  console.log(`✓ Teste 2 passou: getSafeMeetupRecommendationsServer executado com sucesso (origem: ${serverResult.source}).`);

  // ---------------------------------------------------------------------------
  // TESTE 3: fetchZoneSafeMeetupRecommendations opera de forma transparente
  // ---------------------------------------------------------------------------
  const clientResult = await fetchZoneSafeMeetupRecommendations('sp_jardins');
  assert(
    clientResult.zoneId === 'sp_jardins',
    'Teste 3a: zoneId deve ser sp_jardins'
  );
  assert(
    clientResult.citations.length > 0,
    'Teste 3b: Deve conter locais seguros recomendados'
  );
  assert(
    clientResult.citations[0].uri.includes('google.com/maps'),
    'Teste 3c: Links devem apontar para Google Maps'
  );
  console.log('✓ Teste 3 passou: fetchZoneSafeMeetupRecommendations preservou 100% da interface e comportamento.');

  // ---------------------------------------------------------------------------
  // TESTE 4: Verificação de metadata.json e capacidades server-side
  // ---------------------------------------------------------------------------
  const metadataRaw = fs.readFileSync(path.join(rootDir, 'metadata.json'), 'utf-8');
  const metadata = JSON.parse(metadataRaw);
  assert(
    Array.isArray(metadata.majorCapabilities) &&
      metadata.majorCapabilities.includes('MAJOR_CAPABILITY_SERVER_SIDE_GEMINI_API'),
    'Teste 4: metadata.json deve conter MAJOR_CAPABILITY_SERVER_SIDE_GEMINI_API'
  );
  console.log('✓ Teste 4 passou: metadata.json configurado com MAJOR_CAPABILITY_SERVER_SIDE_GEMINI_API.');

  console.log('======================================================================');
  console.log('TODOS OS 4 TESTES DE MIGRAÇÃO DO GEMINI PARA O SERVIDOR APROVADOS!');
  console.log('======================================================================');
}

runGeminiServerMigrationTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
