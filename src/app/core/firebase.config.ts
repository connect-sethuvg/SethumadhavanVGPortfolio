/**
 * Firebase web config: Firebase console → Project settings → Your apps → Web app → Config.
 * These values are public identifiers, not secrets (access is enforced by firestore.rules),
 * so they are safe to commit. While `apiKey` is empty, visitor tracking and sign-in are
 * switched off and the site works exactly as before.
 */
export const FIREBASE_CONFIG = {
  apiKey: '',
  authDomain: '',
  projectId: '',
  storageBucket: '',
  messagingSenderId: '',
  appId: '',
  /** Optional: enables Google Analytics (country/city, engagement). Leave empty to skip. */
  measurementId: '',
};

/**
 * Google accounts allowed to open /admin. Must match the list in firestore.rules.
 * Change this if you sign in to Google with a different address.
 */
export const ADMIN_EMAILS = ['sethuvalanchery@gmail.com'];

export const isFirebaseConfigured = (): boolean => !!FIREBASE_CONFIG.apiKey && !!FIREBASE_CONFIG.projectId;
