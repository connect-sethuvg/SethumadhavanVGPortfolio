import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { VisitorService } from '../../core/visitor.service';
import { ADMIN_EMAILS } from '../../core/firebase.config';

interface Visit {
  id: string;
  uid: string;
  at: Date | null;
  mode: string;
  path: string;
  referrer: string;
  lang: string;
  tz: string;
  screen: string;
  device: string;
}

interface Visitor {
  uid: string;
  name: string;
  email: string;
  photo: string;
  provider: string;
  firstSeen: Date | null;
  lastSeen: Date | null;
  visits: number;
}

interface DayBar {
  label: string;
  date: string;
  count: number;
}

const DAYS = 14;

/** Private dashboard: only ADMIN_EMAILS can read the data (enforced by firestore.rules). */
@Component({
  selector: 'app-admin-page',
  imports: [DatePipe, RouterLink],
  templateUrl: './admin-page.html',
  styleUrl: './admin-page.scss',
  host: { class: 'theme-auto' },
})
export class AdminPage implements OnInit {
  protected readonly visitorsSvc = inject(VisitorService);
  protected readonly adminEmails = ADMIN_EMAILS;
  protected readonly state = signal<'loading' | 'signed-out' | 'forbidden' | 'ready' | 'error'>('loading');
  protected readonly error = signal('');
  protected readonly visits = signal<Visit[]>([]);
  protected readonly people = signal<Visitor[]>([]);
  protected readonly hovered = signal<DayBar | null>(null);

  private readonly byUid = computed(() => new Map(this.people().map((p) => [p.uid, p])));

  protected readonly stats = computed(() => {
    const v = this.visits();
    const today = new Date().toDateString();
    return {
      total: v.length,
      unique: new Set(v.map((x) => x.uid)).size,
      signedIn: this.people().length,
      today: v.filter((x) => x.at?.toDateString() === today).length,
    };
  });

  protected readonly days = computed<DayBar[]>(() => {
    const counts = new Map<string, number>();
    for (const v of this.visits()) if (v.at) counts.set(v.at.toDateString(), (counts.get(v.at.toDateString()) ?? 0) + 1);
    const out: DayBar[] = [];
    for (let i = DAYS - 1; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      out.push({
        label: d.toLocaleDateString('en-US', { day: 'numeric' }),
        date: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        count: counts.get(d.toDateString()) ?? 0,
      });
    }
    return out;
  });

  protected readonly maxDay = computed(() => niceMax(Math.max(...this.days().map((d) => d.count), 1)));

  protected readonly breakdowns = computed(() => {
    const v = this.visits();
    return [
      { title: 'Experience', rows: tally(v.map((x) => (x.mode === '3d' ? '3D gallery' : '2D page'))) },
      { title: 'Device', rows: tally(v.map((x) => (x.device === 'mobile' ? 'Mobile / touch' : 'Desktop'))) },
      { title: 'Came from', rows: tally(v.map((x) => x.referrer || 'Direct / unknown')).slice(0, 6) },
      { title: 'Timezone', rows: tally(v.map((x) => x.tz || 'Unknown')).slice(0, 6) },
    ];
  });

  async ngOnInit(): Promise<void> {
    if (!this.visitorsSvc.enabled) {
      this.state.set('error');
      this.error.set('Firebase is not configured yet: fill in src/app/core/firebase.config.ts.');
      return;
    }
    try {
      await this.visitorsSvc.init();
      await this.refresh();
    } catch (err) {
      this.fail(err);
    }
  }

  protected async signIn(): Promise<void> {
    try {
      await this.visitorsSvc.signIn('google');
      await this.refresh();
    } catch (err) {
      this.fail(err);
    }
  }

  protected async signOut(): Promise<void> {
    await this.visitorsSvc.signOut();
    this.state.set('signed-out');
  }

  protected async refresh(): Promise<void> {
    const profile = this.visitorsSvc.profile();
    if (!profile) return this.state.set('signed-out');
    if (!this.visitorsSvc.isAdmin()) return this.state.set('forbidden');
    this.state.set('loading');
    const { db, fs } = await this.visitorsSvc.firestore();
    const [visitSnap, peopleSnap] = await Promise.all([
      fs.getDocs(fs.query(fs.collection(db, 'visits'), fs.orderBy('at', 'desc'), fs.limit(1000))),
      fs.getDocs(fs.query(fs.collection(db, 'visitors'), fs.orderBy('lastSeen', 'desc'), fs.limit(500))),
    ]);
    const toDate = (t: unknown) => (t && typeof (t as { toDate?: () => Date }).toDate === 'function' ? (t as { toDate: () => Date }).toDate() : null);
    this.visits.set(
      visitSnap.docs.map((d) => {
        const x = d.data();
        return { id: d.id, ...(x as Omit<Visit, 'id' | 'at'>), at: toDate(x['at']) };
      }),
    );
    this.people.set(
      peopleSnap.docs.map((d) => {
        const x = d.data();
        return { ...(x as Visitor), firstSeen: toDate(x['firstSeen']), lastSeen: toDate(x['lastSeen']) };
      }),
    );
    this.state.set('ready');
  }

  protected visitorName(uid: string): string {
    const p = this.byUid().get(uid);
    return p ? p.name || p.email : '';
  }

  protected exportCsv(): void {
    const rows = [
      ['time', 'visitor', 'email', 'mode', 'device', 'referrer', 'timezone', 'language', 'screen'],
      ...this.visits().map((v) => {
        const p = this.byUid().get(v.uid);
        return [v.at?.toISOString() ?? '', p?.name ?? '', p?.email ?? '', v.mode, v.device, v.referrer, v.tz, v.lang, v.screen];
      }),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: 'portfolio-visits.csv' });
    a.click();
    URL.revokeObjectURL(url);
  }

  private fail(err: unknown): void {
    const code = (err as { code?: string }).code ?? '';
    if (code === 'auth/popup-closed-by-user') return;
    console.error(err);
    this.state.set('error');
    this.error.set(
      code === 'permission-denied'
        ? 'Permission denied. Check that firestore.rules is published and lists your email.'
        : `Something went wrong (${code || 'unknown error'}).`,
    );
  }
}

function tally(values: string[]): { label: string; count: number; pct: number }[] {
  const m = new Map<string, number>();
  values.forEach((v) => m.set(v, (m.get(v) ?? 0) + 1));
  const total = values.length || 1;
  return [...m.entries()]
    .map(([label, count]) => ({ label, count, pct: Math.round((count / total) * 100) }))
    .sort((a, b) => b.count - a.count);
}

function niceMax(n: number): number {
  if (n <= 5) return 5;
  const step = Math.pow(10, Math.floor(Math.log10(n)));
  return Math.ceil(n / step) * step;
}
