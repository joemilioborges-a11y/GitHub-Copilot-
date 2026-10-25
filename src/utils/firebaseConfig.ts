import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, Auth } from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  setLogLevel,
  Firestore,
} from 'firebase/firestore';
import rawAppletConfig from '../../firebase-applet-config.json';

/**
 * Estrutura exata das propriedades reais presentes em firebase-applet-config.json.
 */
export interface FirebaseAppletConfig {
  projectId: string;
  appId: string;
  apiKey: string;
  authDomain: string;
  firestoreDatabaseId: string;
  storageBucket: string;
  messagingSenderId: string;
  measurementId: string;
  oAuthClientId: string;
  recaptchaSiteKey: string;
}

export type FirebaseAppletCredentials = FirebaseAppletConfig;

const env: Record<string, string | undefined> =
  typeof import.meta !== 'undefined' && import.meta.env
    ? (import.meta.env as Record<string, string | undefined>)
    : {};

function resolveConfigValue(envValue: string | undefined, fallbackValue: string): string {
  return typeof envValue === 'string' && envValue.trim().length > 0 ? envValue.trim() : fallbackValue;
}

export const firebaseConfig: Readonly<FirebaseAppletConfig> = Object.freeze({
  projectId: resolveConfigValue(env.VITE_FIREBASE_PROJECT_ID, rawAppletConfig.projectId),
  appId: resolveConfigValue(env.VITE_FIREBASE_APP_ID, rawAppletConfig.appId),
  apiKey: resolveConfigValue(env.VITE_FIREBASE_API_KEY, rawAppletConfig.apiKey),
  authDomain: resolveConfigValue(env.VITE_FIREBASE_AUTH_DOMAIN, rawAppletConfig.authDomain),
  firestoreDatabaseId: resolveConfigValue(
    env.VITE_FIREBASE_FIRESTORE_DATABASE_ID,
    rawAppletConfig.firestoreDatabaseId
  ),
  storageBucket: resolveConfigValue(env.VITE_FIREBASE_STORAGE_BUCKET, rawAppletConfig.storageBucket),
  messagingSenderId: resolveConfigValue(
    env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    rawAppletConfig.messagingSenderId
  ),
  measurementId: resolveConfigValue(env.VITE_FIREBASE_MEASUREMENT_ID, rawAppletConfig.measurementId),
  oAuthClientId: resolveConfigValue(env.VITE_FIREBASE_OAUTH_CLIENT_ID, rawAppletConfig.oAuthClientId),
  recaptchaSiteKey: resolveConfigValue(
    env.VITE_FIREBASE_RECAPTCHA_SITE_KEY,
    rawAppletConfig.recaptchaSiteKey
  ),
});

/**
 * Inicializa ou retorna a instância existente do aplicativo Firebase (padrão Singleton),
 * evitando inicializações duplicadas via getApps() / getApp().
 */
export function initializeFirebaseApp(): FirebaseApp {
  return getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
}

export const app: FirebaseApp = initializeFirebaseApp();

// Evita que timeouts transitórios de WebChannel em iframes/proxies disparem console.error globais
try {
  setLogLevel('silent');
} catch {
  // Ignora caso o ambiente restrinja ajuste de logLevel
}

/**
 * Inicializa ou obtém a instância do Cloud Firestore vinculada ao firestoreDatabaseId configurado
 * (ai-studio-jhobs-f94517bd-f73d-4ef7-a99c-d8080b58c257), utilizando long-polling adaptativo
 * para compatibilidade com iframes e proxies restritos.
 */
function initFirestoreInstance(firebaseApp: FirebaseApp): Firestore {
  try {
    return initializeFirestore(
      firebaseApp,
      {
        experimentalAutoDetectLongPolling: true,
      },
      firebaseConfig.firestoreDatabaseId
    );
  } catch {
    return getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);
  }
}

export const db: Firestore = initFirestoreInstance(app);

/**
 * Instância do Firebase Authentication utilizada pelo módulo de auditoria administrativa.
 */
export const auth: Auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export default app;

