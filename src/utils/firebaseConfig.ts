import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, Auth } from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  setLogLevel,
  Firestore,
} from 'firebase/firestore';

/**
 * Estrutura exata das propriedades de configuração do Firebase para o applet JOBS.
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

const DEFAULT_FIREBASE_APPLET_CONFIG: FirebaseAppletConfig = {
  projectId: 'gen-lang-client-0491658347',
  appId: '1:541885029150:web:57f62836abdd4b6cb4870f',
  apiKey: 'AIzaSyDNakpK3SRV8Xu0ZJ9vclwIKOKcFE0PDiI',
  authDomain: 'gen-lang-client-0491658347.firebaseapp.com',
  firestoreDatabaseId: 'ai-studio-jhobs-f94517bd-f73d-4ef7-a99c-d8080b58c257',
  storageBucket: 'gen-lang-client-0491658347.firebasestorage.app',
  messagingSenderId: '541885029150',
  measurementId: '',
  oAuthClientId: '541885029150-35227l6up26oavulhss5afit095fjh8k.apps.googleusercontent.com',
  recaptchaSiteKey: '',
};

const env: Record<string, string | undefined> =
  typeof import.meta !== 'undefined' && import.meta.env
    ? (import.meta.env as Record<string, string | undefined>)
    : {};

function resolveConfigValue(envValue: string | undefined, fallbackValue: string): string {
  return typeof envValue === 'string' && envValue.trim().length > 0 ? envValue.trim() : fallbackValue;
}

export const firebaseConfig: Readonly<FirebaseAppletConfig> = Object.freeze({
  projectId: resolveConfigValue(
    env.VITE_FIREBASE_PROJECT_ID,
    DEFAULT_FIREBASE_APPLET_CONFIG.projectId
  ),
  appId: resolveConfigValue(env.VITE_FIREBASE_APP_ID, DEFAULT_FIREBASE_APPLET_CONFIG.appId),
  apiKey: resolveConfigValue(env.VITE_FIREBASE_API_KEY, DEFAULT_FIREBASE_APPLET_CONFIG.apiKey),
  authDomain: resolveConfigValue(
    env.VITE_FIREBASE_AUTH_DOMAIN,
    DEFAULT_FIREBASE_APPLET_CONFIG.authDomain
  ),
  firestoreDatabaseId: resolveConfigValue(
    env.VITE_FIREBASE_FIRESTORE_DATABASE_ID,
    DEFAULT_FIREBASE_APPLET_CONFIG.firestoreDatabaseId
  ),
  storageBucket: resolveConfigValue(
    env.VITE_FIREBASE_STORAGE_BUCKET,
    DEFAULT_FIREBASE_APPLET_CONFIG.storageBucket
  ),
  messagingSenderId: resolveConfigValue(
    env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    DEFAULT_FIREBASE_APPLET_CONFIG.messagingSenderId
  ),
  measurementId: resolveConfigValue(
    env.VITE_FIREBASE_MEASUREMENT_ID,
    DEFAULT_FIREBASE_APPLET_CONFIG.measurementId
  ),
  oAuthClientId: resolveConfigValue(
    env.VITE_FIREBASE_OAUTH_CLIENT_ID,
    DEFAULT_FIREBASE_APPLET_CONFIG.oAuthClientId
  ),
  recaptchaSiteKey: resolveConfigValue(
    env.VITE_FIREBASE_RECAPTCHA_SITE_KEY,
    DEFAULT_FIREBASE_APPLET_CONFIG.recaptchaSiteKey
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

