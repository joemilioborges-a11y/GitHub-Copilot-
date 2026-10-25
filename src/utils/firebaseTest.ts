import { doc, getDocFromServer, getDoc } from 'firebase/firestore';
import { app, db, auth, firebaseConfig } from './firebaseConfig';
import { OperationType, handleFirestoreError } from '../firebase';

export const TEST_AUDIT_COLLECTION = 'test_audit';
export const DEFAULT_TEST_AUDIT_DOC_ID = 'connection_probe';

export type FirebaseAuditTestStatus =
  | 'read_granted'
  | 'permission_enforced'
  | 'offline_or_misconfigured'
  | 'error';

export interface FirebaseTestAuditResult {
  initialized: boolean;
  reachable: boolean;
  accessGranted: boolean;
  status: FirebaseAuditTestStatus;
  collection: string;
  docId: string;
  path: string;
  projectId: string;
  databaseId: string;
  authenticatedUid: string | null;
  authenticatedEmail: string | null;
  documentExists: boolean;
  data: Record<string, unknown> | null;
  message: string;
  timestamp: string;
  errorCode?: string;
}

/**
 * Tenta ler um documento de teste simples da coleção 'test_audit' no Cloud Firestore
 * para validar:
 * 1. A inicialização correta do SDK Firebase (app, db, auth) e credenciais de firebase-applet-config.json;
 * 2. A conectividade de rede com o banco nomeado no Firestore;
 * 3. As permissões de acesso configuradas nas regras de segurança (firestore.rules).
 *
 * @param docId Identificador do documento na coleção 'test_audit' (padrão: 'connection_probe')
 * @param options Se throwOnError=true, delega falhas de permissão para handleFirestoreError
 */
export async function testFirestoreAuditRead(
  docId: string = DEFAULT_TEST_AUDIT_DOC_ID,
  options: { throwOnError?: boolean } = {}
): Promise<FirebaseTestAuditResult> {
  const safeDocId = docId.trim() || DEFAULT_TEST_AUDIT_DOC_ID;
  const path = `${TEST_AUDIT_COLLECTION}/${safeDocId}`;
  const timestamp = new Date().toISOString();

  const initialized = Boolean(
    app &&
      app.name &&
      db &&
      firebaseConfig.projectId &&
      firebaseConfig.firestoreDatabaseId
  );

  const currentUser = auth?.currentUser ?? null;

  if (!initialized) {
    return {
      initialized: false,
      reachable: false,
      accessGranted: false,
      status: 'offline_or_misconfigured',
      collection: TEST_AUDIT_COLLECTION,
      docId: safeDocId,
      path,
      projectId: firebaseConfig?.projectId || 'unknown',
      databaseId: firebaseConfig?.firestoreDatabaseId || 'unknown',
      authenticatedUid: currentUser?.uid ?? null,
      authenticatedEmail: currentUser?.email ?? null,
      documentExists: false,
      data: null,
      message: 'Instância do Firebase não inicializada corretamente.',
      timestamp,
    };
  }

  try {
    const docRef = doc(db, TEST_AUDIT_COLLECTION, safeDocId);
    let snapshot;
    try {
      snapshot = await getDocFromServer(docRef);
    } catch (serverErr) {
      // Caso o ambiente de execução bloqueie WebChannel direto em testes locais, tenta getDoc padrão
      const msg = serverErr instanceof Error ? serverErr.message : String(serverErr);
      if (
        msg.includes('permission-denied') ||
        msg.includes('Missing or insufficient permissions')
      ) {
        throw serverErr;
      }
      snapshot = await getDoc(docRef);
    }

    return {
      initialized: true,
      reachable: true,
      accessGranted: true,
      status: 'read_granted',
      collection: TEST_AUDIT_COLLECTION,
      docId: safeDocId,
      path,
      projectId: firebaseConfig.projectId,
      databaseId: firebaseConfig.firestoreDatabaseId,
      authenticatedUid: currentUser?.uid ?? null,
      authenticatedEmail: currentUser?.email ?? null,
      documentExists: snapshot.exists(),
      data: snapshot.exists() ? (snapshot.data() as Record<string, unknown>) : null,
      message: snapshot.exists()
        ? `Leitura em '${path}' concluída com sucesso (documento encontrado).`
        : `Conexão e permissão de leitura em '${path}' validadas com sucesso (documento de teste ainda não criado).`,
      timestamp,
    };
  } catch (error) {
    if (options.throwOnError) {
      handleFirestoreError(error, OperationType.GET, path);
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorCode =
      typeof error === 'object' && error !== null && 'code' in error
        ? String((error as { code?: unknown }).code)
        : undefined;

    const isPermissionDenied =
      errorCode === 'permission-denied' ||
      errorMessage.includes('permission-denied') ||
      errorMessage.includes('Missing or insufficient permissions');

    if (isPermissionDenied) {
      return {
        initialized: true,
        reachable: true,
        accessGranted: false,
        status: 'permission_enforced',
        collection: TEST_AUDIT_COLLECTION,
        docId: safeDocId,
        path,
        projectId: firebaseConfig.projectId,
        databaseId: firebaseConfig.firestoreDatabaseId,
        authenticatedUid: currentUser?.uid ?? null,
        authenticatedEmail: currentUser?.email ?? null,
        documentExists: false,
        data: null,
        message:
          'Firebase inicializado e conectado ao Firestore: regras de segurança ativas bloquearam leitura não autenticada em test_audit.',
        timestamp,
        errorCode: errorCode || 'permission-denied',
      };
    }

    const isOffline =
      errorCode === 'unavailable' ||
      errorMessage.includes('the client is offline') ||
      errorMessage.includes('Failed to get document because the client is offline');

    if (isOffline) {
      console.warn('Firestore operando em modo offline ou aguardando reconexão.');
      return {
        initialized: true,
        reachable: false,
        accessGranted: false,
        status: 'offline_or_misconfigured',
        collection: TEST_AUDIT_COLLECTION,
        docId: safeDocId,
        path,
        projectId: firebaseConfig.projectId,
        databaseId: firebaseConfig.firestoreDatabaseId,
        authenticatedUid: currentUser?.uid ?? null,
        authenticatedEmail: currentUser?.email ?? null,
        documentExists: false,
        data: null,
        message: `Cliente Firestore offline ou falha de rede ao acessar '${path}': ${errorMessage}`,
        timestamp,
        errorCode: errorCode || 'unavailable',
      };
    }

    return {
      initialized: true,
      reachable: false,
      accessGranted: false,
      status: 'error',
      collection: TEST_AUDIT_COLLECTION,
      docId: safeDocId,
      path,
      projectId: firebaseConfig.projectId,
      databaseId: firebaseConfig.firestoreDatabaseId,
      authenticatedUid: currentUser?.uid ?? null,
      authenticatedEmail: currentUser?.email ?? null,
      documentExists: false,
      data: null,
      message: `Erro ao consultar '${path}': ${errorMessage}`,
      timestamp,
      errorCode,
    };
  }
}

export default testFirestoreAuditRead;
