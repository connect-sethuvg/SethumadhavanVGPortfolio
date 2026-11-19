import * as THREE from 'three';
import { SectionId } from '../../data/models';
import { COLORS } from '../palette';
import { glowTexture } from '../canvas-text';

const PICKUP_RADIUS = 1.1;

/** A glowing orb that is collected when the player walks into it. */
export class Collectible {
  readonly object = new THREE.Group();
  collected = false;
  private shrink = 0;
  private readonly core: THREE.Mesh;
  private readonly ring: THREE.Mesh;

  constructor(
    readonly id: SectionId,
    private readonly base: THREE.Vector3,
    glow: THREE.Texture,
  ) {
    this.core = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.16, 2),
      new THREE.MeshBasicMaterial({ color: COLORS.accent, toneMapped: false }),
    );
    this.object.add(this.core);
    const halo = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: glow, color: 0x93c5fd, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
    );
    halo.scale.setScalar(1.1);
    this.object.add(halo);
    this.ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.3, 0.012, 8, 48),
      new THREE.MeshBasicMaterial({ color: COLORS.accent, transparent: true, opacity: 0.8 }),
    );
    this.object.add(this.ring);
    this.object.position.copy(base);
  }

  /** Returns true on the frame the orb gets collected. */
  update(dt: number, time: number, player: THREE.Vector3): boolean {
    if (this.collected) {
      if (this.shrink > 0) {
        this.shrink = Math.max(0, this.shrink - dt * 3);
        this.object.scale.setScalar(this.shrink);
        this.object.position.y += dt * 2.5;
        this.object.visible = this.shrink > 0;
      }
      return false;
    }
    this.object.position.y = this.base.y + Math.sin(time * 2 + this.base.x) * 0.12;
    this.core.rotation.y += dt * 1.5;
    this.ring.rotation.x = time * 1.3;
    this.ring.rotation.y = time * 0.9;
    const dx = player.x - this.base.x;
    const dz = player.z - this.base.z;
    if (dx * dx + dz * dz < PICKUP_RADIUS * PICKUP_RADIUS) {
      this.collected = true;
      this.shrink = 1;
      return true;
    }
    return false;
  }

  markCollected(): void {
    this.collected = true;
    this.object.visible = false;
  }
}

export function sharedGlowTexture(): THREE.Texture {
  return glowTexture('#60a5fa');
}
