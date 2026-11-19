import type { Object3D, Vector3 } from 'three';
import type { PanelTarget, SectionId } from '../data/models';

/** Axis-aligned box on the floor plane used for player collision. */
export interface Collider {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface Interactable {
  /** Raycast target (hit test is recursive). */
  object: Object3D;
  /** Prompt text, e.g. "View project · Contact Manager". */
  label: string;
  target: PanelTarget;
  hover(on: boolean): void;
  activate?(): void;
}

export interface Station {
  id: SectionId;
  object: Object3D;
  interactables: Interactable[];
  colliders: Collider[];
  /** Where this section's collectible orb floats. */
  orb: Vector3;
  /** Marker position for the minimap. */
  marker: { x: number; z: number };
  /** `viewer` is the camera position, for billboards and proximity effects. */
  update?(dt: number, time: number, viewer: Vector3): void;
}

export function boxCollider(x: number, z: number, halfX: number, halfZ: number): Collider {
  return { minX: x - halfX, maxX: x + halfX, minZ: z - halfZ, maxZ: z + halfZ };
}
