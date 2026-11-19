import { Component, input, output, signal } from '@angular/core';

const STICK_RADIUS = 48;

/** On-screen joystick (left), drag-to-look area (right) and an interact button for touch devices. */
@Component({
  selector: 'app-touch-controls',
  template: `
    <div
      class="look-zone"
      (pointerdown)="lookStart($event)"
      (pointermove)="lookMove($event)"
      (pointerup)="lookEnd($event)"
      (pointercancel)="lookEnd($event)"
    ></div>
    <div
      class="stick-zone"
      (pointerdown)="stickStart($event)"
      (pointermove)="stickMove($event)"
      (pointerup)="stickEnd($event)"
      (pointercancel)="stickEnd($event)"
    >
      <div class="stick-base" [style.left.px]="base().x" [style.top.px]="base().y" [class.visible]="stickId() !== null">
        <div class="stick-knob" [style.transform]="'translate(' + knob().x + 'px,' + knob().y + 'px)'"></div>
      </div>
      @if (stickId() === null) {
        <span class="hint">Drag to move</span>
      }
    </div>
    @if (canInteract()) {
      <button class="interact" (click)="interact.emit()">Open</button>
    }
  `,
  styles: `
    :host { position: fixed; inset: 0; z-index: 5; touch-action: none; user-select: none; -webkit-user-select: none; }
    .look-zone { position: absolute; inset: 0; }
    .stick-zone { position: absolute; left: 0; bottom: 0; width: 45%; height: 55%; }
    .stick-base {
      position: absolute; width: 112px; height: 112px; margin: -56px 0 0 -56px; border-radius: 50%;
      background: rgba(255,255,255,.35); border: 1px solid rgba(15,23,42,.12); backdrop-filter: blur(6px);
      opacity: 0; transition: opacity .15s; display: grid; place-items: center;
    }
    .stick-base.visible { opacity: 1; }
    .stick-knob { width: 48px; height: 48px; border-radius: 50%; background: var(--accent); box-shadow: var(--shadow); }
    .hint {
      position: absolute; left: 28px; bottom: 32px; font-size: 13px; font-weight: 600; color: var(--muted);
      padding: 8px 12px; border-radius: 999px; background: var(--surface-glass); border: 1px solid var(--line);
    }
    .interact {
      position: absolute; right: 24px; bottom: 36px; width: 84px; height: 84px; border-radius: 50%;
      border: none; background: var(--accent); color: #fff; font-weight: 700; font-size: 15px;
      box-shadow: 0 10px 30px -8px rgba(59,130,246,.7); animation: pulse 1.6s ease-in-out infinite;
    }
    @keyframes pulse { 50% { transform: scale(1.06); } }
  `,
})
export class TouchControls {
  readonly canInteract = input(false);
  readonly move = output<{ x: number; y: number }>();
  readonly look = output<{ dx: number; dy: number }>();
  readonly interact = output<void>();

  protected readonly stickId = signal<number | null>(null);
  protected readonly base = signal({ x: 90, y: 0 });
  protected readonly knob = signal({ x: 0, y: 0 });
  private lookId: number | null = null;
  private lastLook = { x: 0, y: 0 };

  protected stickStart(e: PointerEvent): void {
    e.stopPropagation();
    if (this.stickId() !== null) return;
    const zone = (e.currentTarget as HTMLElement).getBoundingClientRect();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    this.stickId.set(e.pointerId);
    this.base.set({ x: e.clientX - zone.left, y: e.clientY - zone.top });
    this.knob.set({ x: 0, y: 0 });
  }

  protected stickMove(e: PointerEvent): void {
    if (e.pointerId !== this.stickId()) return;
    const zone = (e.currentTarget as HTMLElement).getBoundingClientRect();
    let dx = e.clientX - zone.left - this.base().x;
    let dy = e.clientY - zone.top - this.base().y;
    const len = Math.hypot(dx, dy);
    if (len > STICK_RADIUS) {
      dx = (dx / len) * STICK_RADIUS;
      dy = (dy / len) * STICK_RADIUS;
    }
    this.knob.set({ x: dx, y: dy });
    this.move.emit({ x: dx / STICK_RADIUS, y: -dy / STICK_RADIUS });
  }

  protected stickEnd(e: PointerEvent): void {
    if (e.pointerId !== this.stickId()) return;
    this.stickId.set(null);
    this.knob.set({ x: 0, y: 0 });
    this.move.emit({ x: 0, y: 0 });
  }

  protected lookStart(e: PointerEvent): void {
    if (this.lookId !== null) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    this.lookId = e.pointerId;
    this.lastLook = { x: e.clientX, y: e.clientY };
  }

  protected lookMove(e: PointerEvent): void {
    if (e.pointerId !== this.lookId) return;
    this.look.emit({ dx: e.clientX - this.lastLook.x, dy: e.clientY - this.lastLook.y });
    this.lastLook = { x: e.clientX, y: e.clientY };
  }

  protected lookEnd(e: PointerEvent): void {
    if (e.pointerId === this.lookId) this.lookId = null;
  }
}
