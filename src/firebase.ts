import {
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  getDocFromServer,
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  Unsubscribe,
} from 'firebase/firestore';
import { app, db, auth, googleProvider, firebaseConfig } from './utils/firebaseConfig';

export { app, db, auth, googleProvider, firebaseConfig };

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData.map((provider) => ({
          providerId: provider.providerId,
          displayName: provider.displayName,
          email: provider.email,
          photoUrl: provider.photoURL,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes('the client is offline') ||
        error.message.includes('Could not reach Cloud Firestore backend'))
    ) {
      // Opera em modo offline/local sem disparar erro fatal na inicialização da SPA
      return false;
    }
    // Permission error on /test/connection means client reached Firestore successfully
    return true;
  }
}


/**
 * Authenticates the user with Google Sign-In via Popup and syncs public/private profile documents
 * adhering to Firestore Security Rules (PII segregation + serverTimestamp).
 */
export async function signInWithGoogle(): Promise<FirebaseUser> {
  const credential = await signInWithPopup(auth, googleProvider);
  const user = credential.user;
  await syncUserProfileToFirestore(user);
  return user;
}

export async function signOutFirebase(): Promise<void> {
  await firebaseSignOut(auth);
}

export function subscribeToAuthChanges(callback: (user: FirebaseUser | null) => void): Unsubscribe {
  return onAuthStateChanged(auth, callback);
}

/**
 * Syncs public profile (/users/{userId}) and private PII (/users/{userId}/private/profile)
 */
export async function syncUserProfileToFirestore(user: FirebaseUser): Promise<void> {
  const uid = user.uid;
  const publicPath = `users/${uid}`;
  const privatePath = `users/${uid}/private/profile`;

  const rawHandle = user.email
    ? `@${user.email.split('@')[0].replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 30)}`
    : `@user_${uid.slice(0, 8)}`;
  const handle = rawHandle.length >= 2 ? rawHandle : `@u_${uid.slice(0, 8)}`;
  const displayName = (user.displayName || user.email?.split('@')[0] || 'JOBS User').slice(0, 100);

  try {
    const publicRef = doc(db, 'users', uid);
    const existingSnap = await getDoc(publicRef);

    const publicPayload: Record<string, unknown> = {
      uid,
      displayName,
      handle,
      updatedAt: serverTimestamp(),
    };
    if (user.photoURL && user.photoURL.length <= 500) {
      publicPayload.avatarUrl = user.photoURL;
    }
    if (!existingSnap.exists()) {
      publicPayload.createdAt = serverTimestamp();
      await setDoc(publicRef, publicPayload);
    } else {
      const existingData = existingSnap.data();
      publicPayload.createdAt = existingData.createdAt || serverTimestamp();
      await setDoc(publicRef, publicPayload);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, publicPath);
  }

  if (user.email) {
    try {
      const privateRef = doc(db, 'users', uid, 'private', 'profile');
      const existingPrivate = await getDoc(privateRef);
      const privatePayload: Record<string, unknown> = {
        uid,
        email: user.email.slice(0, 254),
        createdAt: existingPrivate.exists()
          ? existingPrivate.data().createdAt || serverTimestamp()
          : serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      await setDoc(privateRef, privatePayload);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, privatePath);
    }
  }
}

/**
 * Persists an immutable AdminAuditRecord to Firestore (/admin_audit_logs/{eventId})
 * when a verified administrator is signed in.
 */
export async function syncAdminAuditEventToFirestore(event: {
  eventId: string;
  action: string;
  targetType: string;
  targetId: string;
  result: 'success' | 'failure' | 'denied';
  reason: string;
  eventHash: string;
  previousEventHash: string;
}): Promise<boolean> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    return false;
  }

  const safeEventId = event.eventId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 128);
  const path = `admin_audit_logs/${safeEventId}`;

  try {
    const docRef = doc(db, 'admin_audit_logs', safeEventId);
    await setDoc(docRef, {
      eventId: safeEventId,
      actorId: currentUser.uid,
      action: event.action.slice(0, 64),
      targetType: event.targetType.slice(0, 64),
      targetId: (event.targetId || 'system').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 128),
      result: event.result,
      reason: (event.reason || 'Ação administrativa registrada').slice(0, 500),
      eventHash: event.eventHash,
      previousEventHash: event.previousEventHash,
      createdAt: serverTimestamp(),
    });
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

/**
 * Subscribes to the latest AdminAuditRecords in Firestore (/admin_audit_logs)
 */
export function subscribeToCloudAuditLogs(
  onData: (records: Array<Record<string, unknown>>) => void,
  onError?: (err: unknown) => void
): Unsubscribe {
  const path = 'admin_audit_logs';
  const q = query(collection(db, path), orderBy('createdAt', 'desc'), limit(50));
  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      onData(items);
    },
    (error) => {
      if (onError) {
        onError(error);
      } else {
        try {
          handleFirestoreError(error, OperationType.LIST, path);
        } catch {
          // Handled and logged via handleFirestoreError
        }
      }
    }
  );
}

/**
 * Persists an immutable LedgerSnapshot to Firestore (/ledger_entries/{entryId})
 * Restricted by Firestore Security Rules to verified administrators (isAdmin()).
 */
export async function syncLedgerEntrySnapshotToFirestore(entry: {
  entryId: string;
  actorId: string;
  operationType: string;
  debitAccount: string;
  creditAccount: string;
  amountCents: number;
  currency: 'BRL' | 'CREDITS';
  status: 'posted' | 'pending' | 'voided' | 'refunded';
  entryHash: string;
  previousHash: string;
}): Promise<boolean> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    return false;
  }

  const safeEntryId = entry.entryId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 128);
  const path = `ledger_entries/${safeEntryId}`;

  try {
    const docRef = doc(db, 'ledger_entries', safeEntryId);
    await setDoc(docRef, {
      entryId: safeEntryId,
      actorId: currentUser.uid,
      operationType: entry.operationType.slice(0, 64),
      debitAccount: entry.debitAccount.slice(0, 128),
      creditAccount: entry.creditAccount.slice(0, 128),
      amountCents: Math.max(1, Math.min(100000000, Math.round(entry.amountCents))),
      currency: entry.currency,
      status: entry.status,
      entryHash: entry.entryHash.slice(0, 128),
      previousHash: entry.previousHash.slice(0, 128),
      createdAt: serverTimestamp(),
    });
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export interface TalentProgressFirestorePayload {
  userId: string;
  role: 'produtor_conteudo' | 'colaborador';
  environmentMode: 'production';
  approvedPublishedMediaCount: number;
  collaboratorVerifiedActionsCount: number;
  eligibleMutualAndChatInteractionsCount: number;
  validLiveSessionsCount: number;
  weeklyActiveDaysCount: number;
  eligibleEngagementEventsCount: number;
  pontosConquistados: number;
  levelNumber: number;
  desafiosConcluidosCount: number;
}

/**
 * Persists an audited TalentProgressSnapshot to Firestore (/talent_progress/{userId}).
 * Strictly restricted to production mode and completely isolated from /ledger_entries.
 */
export async function syncTalentProgressToFirestore(
  payload: TalentProgressFirestorePayload,
  overrideAuthenticatedUid?: string
): Promise<boolean> {
  if (payload.environmentMode !== 'production') {
    throw new Error(
      'SECURITY_VIOLATION: Tentativa bloqueada de sincronizar dados de simulação em /talent_progress.'
    );
  }

  const effectiveUid = overrideAuthenticatedUid || auth.currentUser?.uid;
  if (!effectiveUid) {
    return false;
  }

  const rawUid =
    payload.userId && payload.userId !== 'current_user' ? payload.userId : effectiveUid;
  const safeUserId = rawUid.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 128);
  const path = `talent_progress/${safeUserId}`;

  try {
    const docRef = doc(db, 'talent_progress', safeUserId);
    const existingSnap = await getDoc(docRef);

    const clampInt = (val: number, min: number, max: number) =>
      Math.max(min, Math.min(max, Math.round(Number.isFinite(val) ? val : min)));

    const firestoreDoc: Record<string, unknown> = {
      userId: safeUserId,
      role: payload.role === 'colaborador' ? 'colaborador' : 'produtor_conteudo',
      environmentMode: 'production',
      approvedPublishedMediaCount: clampInt(payload.approvedPublishedMediaCount, 0, 1000000),
      collaboratorVerifiedActionsCount: clampInt(
        payload.collaboratorVerifiedActionsCount,
        0,
        1000000
      ),
      eligibleMutualAndChatInteractionsCount: clampInt(
        payload.eligibleMutualAndChatInteractionsCount,
        0,
        1000000
      ),
      validLiveSessionsCount: clampInt(payload.validLiveSessionsCount, 0, 1000000),
      weeklyActiveDaysCount: clampInt(payload.weeklyActiveDaysCount, 0, 7),
      eligibleEngagementEventsCount: clampInt(payload.eligibleEngagementEventsCount, 0, 1000000),
      pontosConquistados: clampInt(payload.pontosConquistados, 0, 1000000),
      levelNumber: clampInt(payload.levelNumber, 1, 10),
      desafiosConcluidosCount: clampInt(payload.desafiosConcluidosCount, 0, 5),
      createdAt: existingSnap.exists()
        ? existingSnap.data().createdAt || serverTimestamp()
        : serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(docRef, firestoreDoc);
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Subscribes to a participant's audited TalentProgressSnapshot in Firestore (/talent_progress/{userId}).
 */
export function subscribeToTalentProgressFromFirestore(
  userId: string,
  onData: (data: Record<string, unknown> | null) => void,
  onError?: (err: unknown) => void
): Unsubscribe {
  const safeUserId = (userId || 'current_user').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 128);
  const path = `talent_progress/${safeUserId}`;
  const docRef = doc(db, 'talent_progress', safeUserId);

  return onSnapshot(
    docRef,
    (snapshot) => {
      onData(snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null);
    },
    (error) => {
      if (onError) {
        onError(error);
      } else {
        try {
          handleFirestoreError(error, OperationType.GET, path);
        } catch {
          // Logged via handleFirestoreError
        }
      }
    }
  );
}

/**
 * Subscribes to audited TalentProgressSnapshots across /talent_progress for verified administrators (isAdmin()).
 */
export function subscribeToAllTalentProgressForAdmin(
  onData: (records: Array<Record<string, unknown>>) => void,
  onError?: (err: unknown) => void
): Unsubscribe {
  const path = 'talent_progress';
  const q = query(collection(db, path), limit(100));
  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      onData(items);
    },
    (error) => {
      if (onError) {
        onError(error);
      } else {
        try {
          handleFirestoreError(error, OperationType.LIST, path);
        } catch {
          // Logged via handleFirestoreError
        }
      }
    }
  );
}


