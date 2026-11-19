import { Injectable, computed, inject, signal } from '@angular/core';
import type { FirebaseApp } from 'firebase/app';
import type { Auth, AuthProvider, User } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import type { Analytics } from 'firebase/analytics';
import { ADMIN_EMAILS, FIREBASE_CONFIG, isFirebaseConfigured } from './firebase.config';
import { DeviceService } from './device.service';

export type SignInProvider = 'google' | 'github';

export interface VisitorProfile {
  uid: string;
  name: string;
  email: string;
  photo: string;
  provider: string;
}

interface Sdk {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
  authMod: typeof import('firebase/auth');
  fsMod: typeof import('firebase/firestore');
  analytics?: { mod: typeof import('firebase/analytics'); instance: Analytics };
}

const SESSION_KEY = 'portfolio.visit-logged.';

/**
 * Visitor tracking and optional sign-in on top of Firebase.
 *
 * - Every visitor gets an invisible anonymous Firebase account, and each session writes
 *   one document to `visits` (mode, page, referrer host, language, timezone, device).
 * - Visitors may choose to sign in with Google or GitHub. The anonymous account is
 *   linked, so earlier visits stay attached, and a `visitors/{uid}` profile stores their
 *   name and email.
 * - Only ADMIN_EMAILS can read any of it (enforced by firestore.rules), on /admin.
 *
 * The Firebase SDK is loaded lazily, after the page renders, so it never delays the site.
 */
@Injectable({ providedIn: 'root' })
export class VisitorService {
  readonly enabled = isFirebaseConfigured();

  private readonly device = inject(DeviceService);
  private readonly currentUser = signal<User | null>(null);
  private sdk?: Promise<Sdk>;

  /** The signed-in (non-anonymous) visitor, if any. */
  readonly profile = computed<VisitorProfile | null>(() => {
    const u = this.currentUser();
    if (!u || u.isAnonymous) return null;
    const provider = u.providerData[0];
    return {
      uid: u.uid,
      name: u.displayName ?? provider?.displayName ?? '',
      email: u.email ?? provider?.email ?? '',
      photo: u.photoURL ?? provider?.photoURL ?? '',
      provider: provider?.providerId ?? 'unknown',
    };
  });

  readonly isAdmin = computed(() => {
    const u = this.currentUser();
    return !!u && !u.isAnonymous && !!u.email && u.emailVerified && ADMIN_EMAILS.includes(u.email);
  });

  /** Records one visit per browser session per mode. Never throws. */
  async trackVisit(mode: '3d' | '2d'): Promise<void> {
    if (!this.enabled) return;
    try {
      if (sessionStorage.getItem(SESSION_KEY + mode)) return;
      sessionStorage.setItem(SESSION_KEY + mode, '1');
    } catch {
      /* storage blocked: still log */
    }
    try {
      const sdk = await this.load();
      const user = await this.ensureUser(sdk);
      if (!user || this.isAdmin()) return; // don't count my own visits
      const { addDoc, collection, serverTimestamp } = sdk.fsMod;
      await addDoc(collection(sdk.db, 'visits'), {
        uid: user.uid,
        at: serverTimestamp(),
        mode,
        path: location.pathname.slice(0, 190),
        referrer: referrerHost(),
        lang: (navigator.language || '').slice(0, 32),
        tz: (Intl.DateTimeFormat().resolvedOptions().timeZone || '').slice(0, 60),
        screen: `${screen.width}x${screen.height}`,
        device: this.device.isTouch ? 'mobile' : 'desktop',
      });
      if (!user.isAnonymous) await this.saveProfile(sdk, user, true);
    } catch (err) {
      console.warn('[visitors] could not record visit', err);
    }
  }

  /** Google Analytics event (no-op without a measurementId). */
  logEvent(name: string, params: Record<string, string | number> = {}): void {
    if (!this.enabled || !FIREBASE_CONFIG.measurementId) return;
    void this.load()
      .then((sdk) => sdk.analytics && sdk.analytics.mod.logEvent(sdk.analytics.instance, name, params))
      .catch(() => undefined);
  }

  /** Optional sign-in. Links the anonymous account so earlier visits stay attached. */
  async signIn(which: SignInProvider): Promise<void> {
    const sdk = await this.load();
    const m = sdk.authMod;
    const provider: AuthProvider =
      which === 'google' ? new m.GoogleAuthProvider() : new m.GithubAuthProvider().addScope('read:user');
    const current = sdk.auth.currentUser;
    try {
      if (current?.isAnonymous) await m.linkWithPopup(current, provider);
      else await m.signInWithPopup(sdk.auth, provider);
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code === 'auth/credential-already-in-use' || code === 'auth/email-already-in-use') {
        // This Google/GitHub account visited before: switch to it instead of linking.
        const cred =
          which === 'google'
            ? m.GoogleAuthProvider.credentialFromError(err as never)
            : m.GithubAuthProvider.credentialFromError(err as never);
        if (!cred) throw err;
        await m.signInWithCredential(sdk.auth, cred);
      } else {
        throw err;
      }
    }
    const user = sdk.auth.currentUser;
    this.currentUser.set(user);
    if (user && !user.isAnonymous && !this.isAdmin()) await this.saveProfile(sdk, user, false);
    this.logEvent('login', { method: which });
  }

  async signOut(): Promise<void> {
    const sdk = await this.load();
    await sdk.authMod.signOut(sdk.auth);
    await sdk.authMod.signInAnonymously(sdk.auth).catch(() => undefined);
  }

  /** Loads Firebase and resolves auth state (used by the admin page). */
  async init(): Promise<void> {
    if (!this.enabled) return;
    const sdk = await this.load();
    await sdk.auth.authStateReady();
    this.currentUser.set(sdk.auth.currentUser);
  }

  /** Firestore access for the admin page. */
  async firestore(): Promise<{ db: Firestore; fs: typeof import('firebase/firestore') }> {
    const sdk = await this.load();
    return { db: sdk.db, fs: sdk.fsMod };
  }

  private load(): Promise<Sdk> {
    this.sdk ??= (async () => {
      const [appMod, authMod, fsMod] = await Promise.all([
        import('firebase/app'),
        import('firebase/auth'),
        import('firebase/firestore'),
      ]);
      const app = appMod.initializeApp(FIREBASE_CONFIG);
      const auth = authMod.getAuth(app);
      const db = fsMod.getFirestore(app);
      authMod.onAuthStateChanged(auth, (u) => this.currentUser.set(u));
      let analytics: Sdk['analytics'];
      if (FIREBASE_CONFIG.measurementId) {
        try {
          const mod = await import('firebase/analytics');
          if (await mod.isSupported()) analytics = { mod, instance: mod.getAnalytics(app) };
        } catch {
          /* blocked by an ad blocker, etc. */
        }
      }
      return { app, auth, db, authMod, fsMod, analytics };
    })();
    return this.sdk;
  }

  private async ensureUser(sdk: Sdk): Promise<User | null> {
    await sdk.auth.authStateReady();
    if (sdk.auth.currentUser) return sdk.auth.currentUser;
    const cred = await sdk.authMod.signInAnonymously(sdk.auth);
    return cred.user;
  }

  private async saveProfile(sdk: Sdk, user: User, countVisit: boolean): Promise<void> {
    const { doc, getDoc, setDoc, serverTimestamp, increment } = sdk.fsMod;
    const ref = doc(sdk.db, 'visitors', user.uid);
    const existing = await getDoc(ref);
    const p = this.profile();
    await setDoc(
      ref,
      {
        uid: user.uid,
        name: (p?.name ?? '').slice(0, 120),
        email: user.email ?? '',
        photo: (p?.photo ?? '').slice(0, 500),
        provider: p?.provider ?? '',
        lastSeen: serverTimestamp(),
        visits: existing.exists() ? increment(countVisit ? 1 : 0) : 1,
        ...(existing.exists() ? {} : { firstSeen: serverTimestamp() }),
      },
      { merge: true },
    );
  }
}

/** Only the referring site's host (e.g. "www.linkedin.com"), never the full URL. */
function referrerHost(): string {
  try {
    if (!document.referrer) return '';
    const host = new URL(document.referrer).host;
    return host === location.host ? '' : host.slice(0, 190);
  } catch {
    return '';
  }
}
