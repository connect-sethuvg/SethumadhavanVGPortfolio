import { AfterViewInit, Component, ElementRef, OnDestroy, inject, isDevMode, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { PanelTarget, SECTIONS, SectionId } from '../../data/models';
import { PROFILE } from '../../data/portfolio.data';
import { AudioService } from '../../core/audio.service';
import { DeviceService } from '../../core/device.service';
import { ProgressService } from '../../core/progress.service';
import { clear3DOptIn } from '../../core/mode';
import { MapMarker, PortfolioWorld } from '../../three/portfolio-world';
import { ContentPanel } from '../panel/content-panel';
import { confettiBurst } from '../../shared/confetti';
import { Hud } from './hud';
import { TouchControls } from './touch-controls';

type Phase = 'loading' | 'intro' | 'playing' | 'paused' | 'panel' | 'error';

interface Toast {
  id: number;
  title: string;
  text: string;
  big?: boolean;
}

@Component({
  selector: 'app-world-page',
  imports: [Hud, ContentPanel, TouchControls],
  templateUrl: './world-page.html',
  styleUrl: './world-page.scss',
  host: { '(window:keydown)': 'onKey($event)' },
})
export class WorldPage implements AfterViewInit, OnDestroy {
  protected readonly profile = PROFILE;
  protected readonly device = inject(DeviceService);
  protected readonly audio = inject(AudioService);
  protected readonly progress = inject(ProgressService);
  private readonly router = inject(Router);

  protected readonly phase = signal<Phase>('loading');
  protected readonly loadProgress = signal(0);
  protected readonly loadMessage = signal('Preparing');
  protected readonly hoverLabel = signal<string | null>(null);
  protected readonly panel = signal<PanelTarget | null>(null);
  protected readonly markers = signal<MapMarker[]>([]);
  protected readonly toasts = signal<Toast[]>([]);
  protected readonly touch = this.device.isTouch;

  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly hud = viewChild(Hud);
  private world?: PortfolioWorld;
  /** Pointer lock never worked (e.g. embedded iframe): fall back to drag-to-look without pausing. */
  private noLock = false;
  private hasLocked = false;
  private panelOpenedAt = 0;
  private toastId = 0;

  async ngAfterViewInit(): Promise<void> {
    const world = new PortfolioWorld(
      this.canvas().nativeElement,
      {
        onProgress: (f, m) => {
          this.loadProgress.set(f);
          this.loadMessage.set(m);
        },
        onHover: (label) => {
          this.hoverLabel.set(label);
          if (label) this.audio.hover();
        },
        onInteract: (target) => this.openPanel(target),
        onDiscover: (id) => this.discover(id),
        onFootstep: () => this.audio.footstep(),
        onLockChange: (locked) => this.lockChanged(locked),
        onLockError: () => this.lockFailed(),
        onPlayerMove: (x, z, yaw) => this.hud()?.updatePlayer(x, z, yaw),
      },
      this.touch,
    );
    this.world = world;
    if (isDevMode()) (window as unknown as { __world: PortfolioWorld }).__world = world;
    try {
      await world.init(this.progress.discovered());
      this.markers.set(world.markers);
      this.phase.set('intro');
    } catch (err) {
      console.error(err);
      this.phase.set('error');
    }
  }

  ngOnDestroy(): void {
    this.world?.dispose();
  }

  // ---- flow -------------------------------------------------------------

  protected enter(): void {
    this.audio.unlock();
    this.audio.click();
    if (this.touch || this.noLock) {
      this.play();
    } else {
      this.world?.requestLock();
    }
  }

  protected resume(): void {
    this.audio.unlock();
    if (this.touch || this.noLock) this.play();
    else this.world?.requestLock();
  }

  private play(): void {
    this.phase.set('playing');
    this.world?.setActive(true);
  }

  private lockChanged(locked: boolean): void {
    if (locked) {
      this.hasLocked = true;
      this.play();
    } else if (this.phase() === 'playing') {
      this.phase.set('paused');
      this.world?.setActive(false);
    }
  }

  private lockFailed(): void {
    if (!this.hasLocked && this.phase() === 'intro') {
      // Pointer lock is not available here: play with drag-to-look instead.
      this.noLock = true;
      this.play();
    } else if (this.phase() !== 'playing') {
      // Usually the browser's short cooldown after leaving lock; let the visitor click Resume.
      this.phase.set('paused');
    }
  }

  protected openPanel(target: PanelTarget): void {
    this.audio.click();
    this.panel.set(target);
    this.panelOpenedAt = performance.now();
    this.phase.set('panel');
    this.world?.setActive(false);
    this.world?.exitLock();
  }

  protected closePanel(): void {
    if (!this.panel()) return;
    this.audio.close();
    this.panel.set(null);
    this.phase.set('paused');
    this.resume();
  }

  protected pause(): void {
    if (this.phase() !== 'playing') return;
    this.world?.exitLock();
    this.world?.setActive(false);
    this.phase.set('paused');
  }

  protected onKey(e: KeyboardEvent): void {
    const phase = this.phase();
    if (phase === 'panel') {
      const justOpened = performance.now() - this.panelOpenedAt < 250;
      if (!justOpened && (e.code === 'Escape' || e.code === 'KeyE')) {
        e.preventDefault();
        this.closePanel();
      }
    } else if (phase === 'playing' && this.noLock && e.code === 'Escape') {
      this.pause();
    } else if (phase === 'intro' && (e.code === 'Enter' || e.code === 'Space')) {
      e.preventDefault();
      this.enter();
    }
  }

  private discover(id: SectionId): void {
    if (!this.progress.discover(id)) return;
    this.audio.pickup();
    const label = SECTIONS.find((s) => s.id === id)?.label ?? id;
    if (this.progress.complete()) {
      setTimeout(() => {
        this.audio.achievement();
        confettiBurst();
        this.toast('Achievement unlocked: Explorer 🏆', 'You found all 5 sections. Thanks for exploring!', true);
      }, 450);
    }
    this.toast(`Section discovered · ${label}`, `${this.progress.count()} of ${this.progress.total} found`);
  }

  private toast(title: string, text: string, big = false): void {
    const id = ++this.toastId;
    this.toasts.update((list) => [...list, { id, title, text, big }]);
    setTimeout(() => this.toasts.update((list) => list.filter((t) => t.id !== id)), big ? 5200 : 2800);
  }

  protected resetProgress(): void {
    this.progress.reset();
    this.world?.resetOrbs();
  }

  // ---- touch ------------------------------------------------------------

  protected touchMove(v: { x: number; y: number }): void {
    this.world?.setTouchMove(v.x, v.y);
  }

  protected touchLook(v: { dx: number; dy: number }): void {
    this.world?.touchLook(v.dx, v.dy);
  }

  protected touchInteract(): void {
    this.world?.interact();
  }

  protected goTo2D(): void {
    clear3DOptIn();
    void this.router.navigateByUrl('/classic');
  }
}
