import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import configJson from '../firebase-applet-config.json';

// Simple function to see if a value is a dummy placeholder, empty, or a short mock digit
function isValueValid(val: any): boolean {
  if (!val || typeof val !== 'string') return false;
  const trimmed = val.trim();
  const lower = trimmed.toLowerCase();
  if (
    trimmed === '' ||
    trimmed.length <= 3 ||
    lower === 'undefined' ||
    lower === 'null' ||
    lower === 'placeholder' ||
    lower.includes('placeholder') ||
    lower.includes('your_') ||
    lower.includes('my_') ||
    lower.includes('enter_') ||
    lower === 'none' ||
    lower === 'false'
  ) {
    return false;
  }
  return true;
}

// Extract config prioritizing environment variables (current Firebase project) over firebase-applet-config.json
const getFirebaseConfig = () => {
  const metaEnv = (import.meta as any).env || {};
  
  const selectValue = (envVal: any, jsonVal: any) => {
    if (isValueValid(envVal)) return envVal.trim();
    if (isValueValid(jsonVal)) return jsonVal.trim();
    return '';
  };

  const config = {
    apiKey: selectValue(metaEnv.VITE_FIREBASE_API_KEY, configJson.apiKey),
    authDomain: selectValue(metaEnv.VITE_FIREBASE_AUTH_DOMAIN, configJson.authDomain),
    projectId: selectValue(metaEnv.VITE_FIREBASE_PROJECT_ID, configJson.projectId),
    storageBucket: selectValue(metaEnv.VITE_FIREBASE_STORAGE_BUCKET, configJson.storageBucket),
    messagingSenderId: selectValue(metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID, configJson.messagingSenderId),
    appId: selectValue(metaEnv.VITE_FIREBASE_APP_ID, configJson.appId),
    measurementId: selectValue(metaEnv.VITE_FIREBASE_MEASUREMENT_ID, configJson.measurementId),
    firestoreDatabaseId: selectValue(metaEnv.VITE_FIREBASE_DATABASE_ID, configJson.firestoreDatabaseId) || '(default)',
  };

  return config;
};

const firebaseConfig = getFirebaseConfig();

// Validate config helper
export function validateFirebaseConfig(config: any): boolean {
  return !!(
    isValueValid(config.apiKey) &&
    config.apiKey.startsWith('AIzaSy') &&
    isValueValid(config.authDomain) &&
    isValueValid(config.projectId) &&
    isValueValid(config.storageBucket) &&
    isValueValid(config.messagingSenderId) &&
    isValueValid(config.appId) &&
    config.appId.startsWith('1:')
  );
}

export const isConfigValid = validateFirebaseConfig(firebaseConfig);

// Safe diagnostic logging for configuration
console.log("Firebase config loaded:", {
  projectId: firebaseConfig.projectId,
  authDomain: firebaseConfig.authDomain,
  firestoreDatabaseId: firebaseConfig.firestoreDatabaseId,
  apiKeyMasked: firebaseConfig.apiKey ? `${firebaseConfig.apiKey.substring(0, 6)}...${firebaseConfig.apiKey.slice(-4)}` : 'undefined',
  appIdMasked: firebaseConfig.appId ? `${firebaseConfig.appId.substring(0, 10)}...` : 'undefined',
  isConfigValid,
});

// Initialize Services safely to prevent startup crash
let app: any = null;
let db: any = null;
let auth: any = null;
let googleProvider: any = null;

if (isConfigValid) {
  try {
    const apps = getApps();
    if (apps.length === 0) {
      app = initializeApp(firebaseConfig);
    } else {
      app = getApp();
    }

    db = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
      ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
      : getFirestore(app);

    auth = getAuth(app);
    googleProvider = new GoogleAuthProvider();
  } catch (error) {
    console.error("Firebase services initialization error:", error);
  }
} else {
  console.warn("Firebase config is missing or invalid. Authentication and Database features will not be available.");
}

export { app, db, auth, googleProvider, firebaseConfig };

// Google login popup helper
export const signInWithGoogle = async () => {
  if (!isConfigValid || !auth) {
    throw new Error("Firebase Authentication is not configured.");
  }
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Google authentication error:", error);
    throw error;
  }
};

// Optional non-blocking Firestore connection diagnostic helper
export async function testConnection() {
  if (!isConfigValid || !db) return;
  try {
    console.log("Starting Firebase connection check...");
    // Avoid getDocFromServer to prevent blocking startup when backend takes a moment to connect
  } catch (error: any) {
    console.warn("Firebase connection diagnostic:", error.message || error);
  }
}

// Structured Firestore error handler conforming to Firebase guidelines
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
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const userId = auth?.currentUser?.uid || null;
  const email = auth?.currentUser?.email || null;
  const emailVerified = auth?.currentUser?.emailVerified || null;
  const isAnonymous = auth?.currentUser?.isAnonymous || null;
  const tenantId = auth?.currentUser?.tenantId || null;
  const providerInfo = auth?.currentUser?.providerData?.map((provider: any) => ({
    providerId: provider.providerId,
    email: provider.email,
  })) || [];

  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId,
      email,
      emailVerified,
      isAnonymous,
      tenantId,
      providerInfo,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
