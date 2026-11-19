import { Component, inject, input, signal } from '@angular/core';
import { SignInProvider, VisitorService } from '../core/visitor.service';

/**
 * Optional "Say hi — sign in" control. Renders nothing until Firebase is configured.
 * `variant="card"` is a full-width block for the intro/pause/contact cards; `variant="nav"` is compact.
 */
@Component({
  selector: 'app-auth-button',
  template: `
    @if (visitors.enabled) {
      @if (visitors.profile(); as p) {
        <div class="signed-in" [class.card]="variant() === 'card'">
          @if (p.photo) {
            <img [src]="p.photo" alt="" referrerpolicy="no-referrer" />
          } @else {
            <span class="initial">{{ (p.name || p.email || '?')[0] }}</span>
          }
          <span class="who">
            @if (variant() === 'card') {
              Thanks for saying hi, <b>{{ p.name || p.email }}</b>!
            } @else {
              {{ p.name || p.email }}
            }
          </span>
          <button class="link" (click)="signOut()">Sign out</button>
        </div>
      } @else if (variant() === 'card') {
        <div class="card-block">
          <p class="title">👋 Let me know you stopped by <span class="optional">(optional)</span></p>
          <div class="providers">
            <button class="btn" (click)="signIn('google')" [disabled]="busy()">
              <span class="g">G</span> Sign in with Google
            </button>
            <button class="btn" (click)="signIn('github')" [disabled]="busy()">
              <span class="gh">⌥</span> Sign in with GitHub
            </button>
          </div>
          <p class="note">I only see your name and email. Browsing doesn't require it.</p>
          @if (error()) {
            <p class="error">{{ error() }}</p>
          }
        </div>
      } @else {
        <div class="nav-wrap">
          <button class="btn sm" (click)="open.set(!open())" [attr.aria-expanded]="open()">Say hi 👋</button>
          @if (open()) {
            <div class="menu" role="menu">
              <p>Sign in so I know you visited (optional).</p>
              <button class="btn" role="menuitem" (click)="signIn('google')" [disabled]="busy()">
                <span class="g">G</span> Google
              </button>
              <button class="btn" role="menuitem" (click)="signIn('github')" [disabled]="busy()">
                <span class="gh">⌥</span> GitHub
              </button>
              <p class="note">I only see your name and email.</p>
              @if (error()) {
                <p class="error">{{ error() }}</p>
              }
            </div>
          }
        </div>
      }
    }
  `,
  styles: `
    :host { display: contents; }
    .card-block { margin-top: 20px; padding: 16px; border: 1px dashed var(--line); border-radius: 16px; background: var(--surface); }
    .title { margin: 0 0 12px; font-weight: 600; font-size: 14px; color: var(--text); }
    .optional { font-weight: 400; color: var(--muted); }
    .providers { display: flex; flex-wrap: wrap; gap: 8px; }
    .note { margin: 10px 0 0; font-size: 12px; color: var(--muted); }
    .error { margin: 8px 0 0; font-size: 12px; color: #dc2626; }
    .g { font-weight: 800; color: #4285f4; }
    .gh { font-weight: 800; }
    .btn.sm { height: 36px; padding: 0 14px; font-size: 13px; }
    .signed-in { display: inline-flex; align-items: center; gap: 8px; font-size: 13px; color: var(--text-2); }
    .signed-in.card { display: flex; margin-top: 20px; padding: 12px 14px; border: 1px solid var(--line); border-radius: 14px; background: var(--surface); }
    .signed-in img, .initial { width: 28px; height: 28px; border-radius: 50%; flex: none; }
    .initial { display: grid; place-items: center; background: var(--accent-soft); color: var(--accent-strong); font-weight: 700; text-transform: uppercase; }
    .who { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 220px; }
    .signed-in.card .who { max-width: none; white-space: normal; }
    .link { border: none; background: none; color: var(--accent); cursor: pointer; font-size: 13px; padding: 0; }
    .nav-wrap { position: relative; }
    .menu {
      position: absolute; right: 0; top: calc(100% + 8px); width: 230px; padding: 14px; z-index: 20;
      display: flex; flex-direction: column; gap: 8px;
      background: var(--surface); border: 1px solid var(--line); border-radius: 14px; box-shadow: var(--shadow);
    }
    .menu p { margin: 0; font-size: 13px; color: var(--text-2); }
    .menu .note { font-size: 12px; color: var(--muted); }
  `,
})
export class AuthButton {
  readonly variant = input<'card' | 'nav'>('card');
  protected readonly visitors = inject(VisitorService);
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly open = signal(false);

  protected async signIn(which: SignInProvider): Promise<void> {
    this.busy.set(true);
    this.error.set('');
    try {
      await this.visitors.signIn(which);
      this.open.set(false);
    } catch (err) {
      const code = (err as { code?: string }).code ?? '';
      if (code !== 'auth/popup-closed-by-user' && code !== 'auth/cancelled-popup-request') {
        this.error.set('Sign-in did not work. Please try again.');
        console.warn('[auth]', err);
      }
    } finally {
      this.busy.set(false);
    }
  }

  protected async signOut(): Promise<void> {
    await this.visitors.signOut();
  }
}
