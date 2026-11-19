import { Component, ElementRef, inject, input, output, viewChild } from '@angular/core';
import { SECTIONS } from '../../data/models';
import { PROFILE } from '../../data/portfolio.data';
import { AudioService } from '../../core/audio.service';
import { ProgressService } from '../../core/progress.service';
import type { MapMarker } from '../../three/portfolio-world';

const MAP_HALF = 15;

/** In-game overlay: crosshair, interaction prompt, progress, minimap and quick actions. */
@Component({
  selector: 'app-hud',
  templateUrl: './hud.html',
  styleUrl: './hud.scss',
})
export class Hud {
  readonly hoverLabel = input<string | null>(null);
  readonly markers = input<MapMarker[]>([]);
  readonly touch = input(false);
  readonly switch2D = output<void>();
  readonly help = output<void>();

  protected readonly audio = inject(AudioService);
  protected readonly progress = inject(ProgressService);
  protected readonly sections = SECTIONS;
  protected readonly name = PROFILE.name;
  protected readonly mapHalf = MAP_HALF;

  private readonly playerDot = viewChild<ElementRef<SVGGElement>>('player');

  /** Called every frame by the world; writes the DOM directly to avoid change detection. */
  updatePlayer(x: number, z: number, yaw: number): void {
    const el = this.playerDot()?.nativeElement;
    if (!el) return;
    const deg = (-yaw * 180) / Math.PI;
    el.setAttribute('transform', `translate(${x.toFixed(2)} ${z.toFixed(2)}) rotate(${deg.toFixed(1)})`);
  }

  protected sectionLabel(id: string): string {
    return SECTIONS.find((s) => s.id === id)?.label ?? id;
  }
}
