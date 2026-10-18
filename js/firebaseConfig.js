/**
 * Firebase Realtime Database Configuration & Detection
 * 
 * Supports configuration via:
 * 1. Vite Environment variables (VITE_FIREBASE_...)
 * 2. window.FIREBASE_CONFIG (injected or static script)
 * 3. Fallback default config object
 */

function getEnvVar(key) {
  try {
    if (typeof import.meta !== 'undefined' && import.meta && import.meta.env) {
      if (import.meta.env[key] !== undefined) return import.meta.env[key];
    }
  } catch (e) {}

  try {
    if (typeof process !== 'undefined' && process && process.env) {
      if (process.env[key] !== undefined) return process.env[key];
    }
  } catch (e) {}

  return undefined;
}

export function getFirebaseConfig() {
  // 1. Check window.FIREBASE_CONFIG if running in browser
  if (typeof window !== 'undefined' && window.FIREBASE_CONFIG && typeof window.FIREBASE_CONFIG === 'object') {
    return { ...window.FIREBASE_CONFIG };
  }

  // 2. Read from Environment Variables (Vite or Process)
  const apiKey = getEnvVar('VITE_FIREBASE_API_KEY');
  const authDomain = getEnvVar('VITE_FIREBASE_AUTH_DOMAIN');
  const databaseURL = getEnvVar('VITE_FIREBASE_DATABASE_URL');
  const projectId = getEnvVar('VITE_FIREBASE_PROJECT_ID');
  const storageBucket = getEnvVar('VITE_FIREBASE_STORAGE_BUCKET');
  const messagingSenderId = getEnvVar('VITE_FIREBASE_MESSAGING_SENDER_ID');
  const appId = getEnvVar('VITE_FIREBASE_APP_ID');

  return {
    apiKey: apiKey || '',
    authDomain: authDomain || '',
    databaseURL: databaseURL || '',
    projectId: projectId || '',
    storageBucket: storageBucket || '',
    messagingSenderId: messagingSenderId || '',
    appId: appId || ''
  };
}

/**
 * Check if the Firebase configuration is valid and ready to connect
 * (not empty and not using default placeholders)
 */
export function isFirebaseConfigured(config = getFirebaseConfig()) {
  if (!config) return false;
  const apiKey = config.apiKey || '';
  const databaseURL = config.databaseURL || '';
  const projectId = config.projectId || '';

  if (!apiKey || !databaseURL) return false;
  if (apiKey.includes('YOUR_') || apiKey.includes('PLACEHOLDER')) return false;
  if (databaseURL.includes('your-project') || databaseURL.includes('example.firebaseio.com')) return false;
  if (projectId.includes('your-project')) return false;

  return true;
}
