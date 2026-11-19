import * as THREE from 'three';
import { Collider } from './types';

const EYE_HEIGHT = 1.7;
const RADIUS = 0.35;
const WALK_SPEED = 4.2;
const SPRINT_SPEED = 7.5;
const GRAVITY = 22;
const JUMP_VELOCITY = 6.5;
const MOUSE_SENSITIVITY = 0.0022;
const TOUCH_SENSITIVITY = 0.005;
const MAX_PITCH = Math.PI / 2 - 0.05;

/** First-person movement: keyboard/mouse, touch joystick, AABB collision, head bob. */
export class PlayerController {
  readonly position = new THREE.Vector3();
  yaw = 0;
  pitch = 0;
  enabled = false;

  private readonly keys = new Set<string>();
  private readonly velocity = new THREE.Vector3();
  private readonly touchMove = new THREE.Vector2();
  private verticalVelocity = 0;
  private height = 0;
  private bobPhase = 0;
  private lastStepSign = 1;

  constructor(
    private readonly camera: THREE.PerspectiveCamera,
    private readonly colliders: Collider[],
    private readonly onFootstep: () => void,
  ) {
    camera.rotation.order = 'YXZ';
  }

  spawn(x: number, z: number, yaw: number): void {
    this.position.set(x, 0, z);
    this.yaw = yaw;
    this.pitch = 0;
    this.applyCamera(0);
  }

  keyDown(code: string): void {
    this.keys.add(code);
    if (code === 'Space' && this.enabled && this.height <= 0.001) this.verticalVelocity = JUMP_VELOCITY;
  }

  keyUp(code: string): void {
    this.keys.delete(code);
  }

  clearKeys(): void {
    this.keys.clear();
    this.touchMove.set(0, 0);
  }

  look(dx: number, dy: number, touch = false): void {
    if (!this.enabled) return;
    const s = touch ? TOUCH_SENSITIVITY : MOUSE_SENSITIVITY;
    this.yaw -= dx * s;
    this.pitch = THREE.MathUtils.clamp(this.pitch - dy * s, -MAX_PITCH, MAX_PITCH);
  }

  /** Joystick vector: x = strafe right, y = forward; each in [-1, 1]. */
  setTouchMove(x: number, y: number): void {
    this.touchMove.set(x, y);
  }

  update(dt: number): void {
    let forward = 0;
    let strafe = 0;
    if (this.enabled) {
      if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) forward += 1;
      if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) forward -= 1;
      if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) strafe += 1;
      if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) strafe -= 1;
      forward += this.touchMove.y;
      strafe += this.touchMove.x;
    }
    const len = Math.hypot(forward, strafe);
    if (len > 1) {
      forward /= len;
      strafe /= len;
    }
    const sprint = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');
    const speed = sprint ? SPRINT_SPEED : WALK_SPEED;

    // Desired velocity in world space from yaw.
    const sin = Math.sin(this.yaw);
    const cos = Math.cos(this.yaw);
    const targetX = (-sin * forward + cos * strafe) * speed;
    const targetZ = (-cos * forward - sin * strafe) * speed;
    const accel = 1 - Math.exp(-dt * 12);
    this.velocity.x += (targetX - this.velocity.x) * accel;
    this.velocity.z += (targetZ - this.velocity.z) * accel;

    // Move one axis at a time so the player slides along walls.
    const nx = this.position.x + this.velocity.x * dt;
    if (!this.collides(nx, this.position.z)) this.position.x = nx;
    else this.velocity.x = 0;
    const nz = this.position.z + this.velocity.z * dt;
    if (!this.collides(this.position.x, nz)) this.position.z = nz;
    else this.velocity.z = 0;

    // Jump / gravity.
    this.verticalVelocity -= GRAVITY * dt;
    this.height = Math.max(0, this.height + this.verticalVelocity * dt);
    if (this.height === 0) this.verticalVelocity = Math.max(0, this.verticalVelocity);

    // Head bob and footsteps.
    const horizontalSpeed = Math.hypot(this.velocity.x, this.velocity.z);
    if (horizontalSpeed > 0.3 && this.height === 0) {
      this.bobPhase += dt * horizontalSpeed * 2.2;
      const sign = Math.sign(Math.sin(this.bobPhase));
      if (sign !== this.lastStepSign) {
        this.lastStepSign = sign;
        this.onFootstep();
      }
    } else {
      this.bobPhase += (Math.round(this.bobPhase / Math.PI) * Math.PI - this.bobPhase) * Math.min(1, dt * 6);
    }
    this.applyCamera(Math.min(1, horizontalSpeed / WALK_SPEED));
  }

  private applyCamera(bobAmount: number): void {
    const bob = Math.abs(Math.sin(this.bobPhase)) * 0.06 * bobAmount;
    this.camera.position.set(this.position.x, EYE_HEIGHT + this.height + bob, this.position.z);
    this.camera.rotation.set(this.pitch, this.yaw, 0);
  }

  private collides(x: number, z: number): boolean {
    for (const c of this.colliders) {
      const cx = Math.max(c.minX, Math.min(x, c.maxX));
      const cz = Math.max(c.minZ, Math.min(z, c.maxZ));
      const dx = x - cx;
      const dz = z - cz;
      if (dx * dx + dz * dz < RADIUS * RADIUS) return true;
    }
    return false;
  }
}
