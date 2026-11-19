import { Injectable } from '@angular/core';

/** Capability checks that decide whether visitors start in 3D or in the 2D page. */
@Injectable({ providedIn: 'root' })
export class DeviceService {
  readonly isTouch =
    typeof window !== 'undefined' &&
    (window.matchMedia?.('(pointer: coarse)').matches || navigator.maxTouchPoints > 0) &&
    !window.matchMedia?.('(pointer: fine)').matches;

  readonly hasWebGL = (() => {
    try {
      const c = document.createElement('canvas');
      return !!(c.getContext('webgl2') || c.getContext('webgl'));
    } catch {
      return false;
    }
  })();

  readonly prefersReducedMotion =
    typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  /** True when the default experience should be the 2D page. */
  get prefers2D(): boolean {
    return !this.hasWebGL || this.isTouch;
  }
}
