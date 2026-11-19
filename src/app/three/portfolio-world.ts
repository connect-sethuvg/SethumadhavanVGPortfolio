import * as THREE from 'three';
import { PanelTarget, SectionId } from '../data/models';
import { setMaxAnisotropy } from './canvas-text';
import { COLORS } from './palette';
import { PlayerController } from './player-controller';
import { Collider, Interactable, Station } from './types';
import { Collectible, sharedGlowTexture } from './world/collectible';
import { buildGallery } from './world/gallery';
import { buildAboutStation } from './world/stations/about.station';
import { buildContactStation } from './world/stations/contact.station';
import { buildExperienceStation } from './world/stations/experience.station';
import { buildProjectsStation } from './world/stations/projects.station';
import { buildSkillsStation } from './world/stations/skills.station';

const INTERACT_DISTANCE = 6.5;
const SPAWN = { x: 0, z: 7.5, yaw: 0 };

export interface WorldHooks {
  onProgress(fraction: number, message: string): void;
  onHover(label: string | null): void;
  onInteract(target: PanelTarget): void;
  onDiscover(id: SectionId): void;
  onFootstep(): void;
  onLockChange(locked: boolean): void;
  onLockError(): void;
  /** Called every frame; keep it cheap (no signal writes). */
  onPlayerMove(x: number, z: number, yaw: number): void;
}

export interface MapMarker {
  id: SectionId;
  x: number;
  z: number;
}

/**
 * Owns the renderer, scene and game loop. It is plain TypeScript with no Angular
 * dependencies; the WorldPage component wires the hooks to signals and services.
 */
export class PortfolioWorld {
  readonly markers: MapMarker[] = [];

  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(70, 1, 0.05, 120);
  private readonly clock = new THREE.Clock();
  private readonly raycaster = new THREE.Raycaster();
  private readonly center = new THREE.Vector2(0, 0);
  private readonly player: PlayerController;
  private readonly colliders: Collider[] = [];
  private readonly interactables: Interactable[] = [];
  private readonly updaters: ((dt: number, t: number, viewer: THREE.Vector3) => void)[] = [];
  private readonly orbs: Collectible[] = [];
  private readonly targets: THREE.Object3D[] = [];
  private hovered: Interactable | null = null;
  private resizeObserver?: ResizeObserver;
  private disposed = false;
  private dragging = false;
  private lastPointer = { x: 0, y: 0 };
  private interactionEnabled = false;
  private readonly frameTimes: number[] = [];
  private goodWindows = 0;
  private qualityLocked = false;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly hooks: WorldHooks,
    private readonly lowPower: boolean,
  ) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: !lowPower, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, lowPower ? 1.5 : 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = !lowPower;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    // Every shadow caster is static, so the shadow map is rendered once (see init) instead of every frame.
    this.renderer.shadowMap.autoUpdate = false;
    setMaxAnisotropy(this.renderer.capabilities.getMaxAnisotropy());

    this.scene.background = new THREE.Color(COLORS.background);
    this.scene.fog = new THREE.Fog(COLORS.background, 22, 60);
    this.raycaster.far = INTERACT_DISTANCE;

    this.player = new PlayerController(this.camera, this.colliders, () => this.hooks.onFootstep());
  }

  /** Builds the world step by step so the intro screen can show real progress. */
  async init(alreadyDiscovered: SectionId[]): Promise<void> {
    const step = async (fraction: number, message: string) => {
      this.hooks.onProgress(fraction, message);
      await new Promise((r) => setTimeout(r, 0));
    };

    await step(0.05, 'Loading fonts');
    try {
      await Promise.race([
        Promise.all([
          document.fonts.load('700 64px "Space Grotesk"'),
          document.fonts.load('600 64px "Space Grotesk"'),
          document.fonts.load('400 32px "Inter"'),
          document.fonts.load('500 32px "Inter"'),
          document.fonts.load('600 32px "Inter"'),
          document.fonts.load('700 32px "Inter"'),
        ]),
        new Promise((r) => setTimeout(r, 2500)),
      ]);
    } catch {
      /* fall back to system fonts */
    }

    await step(0.2, 'Building the gallery');
    const gallery = buildGallery();
    this.scene.add(gallery.object);
    this.colliders.push(...gallery.colliders);
    this.updaters.push(gallery.update);

    const builders: [string, () => Station][] = [
      ['Hanging the portrait', buildAboutStation],
      ['Arranging the skill cubes', buildSkillsStation],
      ['Booting project screens', buildProjectsStation],
      ['Mounting the timeline', buildExperienceStation],
      ['Installing the mailbox', buildContactStation],
    ];
    const glow = sharedGlowTexture();
    for (let i = 0; i < builders.length; i++) {
      const [message, build] = builders[i];
      await step(0.3 + (i / builders.length) * 0.5, message);
      const station = build();
      this.scene.add(station.object);
      this.colliders.push(...station.colliders);
      station.interactables.forEach((it) => this.addInteractable(it));
      if (station.update) this.updaters.push(station.update);
      this.markers.push({ id: station.id, x: station.marker.x, z: station.marker.z });

      const orb = new Collectible(station.id, station.orb, glow);
      if (alreadyDiscovered.includes(station.id)) orb.markCollected();
      this.orbs.push(orb);
      this.scene.add(orb.object);
    }

    this.scene.traverse((o) => {
      if (o instanceof THREE.Mesh && !(o.material instanceof THREE.MeshBasicMaterial)) o.receiveShadow = true;
    });

    await step(0.85, 'Compiling shaders');
    this.player.spawn(SPAWN.x, SPAWN.z, SPAWN.yaw);
    this.resize();
    this.renderer.shadowMap.needsUpdate = true;
    this.renderer.compile(this.scene, this.camera);
    this.renderer.render(this.scene, this.camera);

    await step(1, 'Ready');
    this.bindEvents();
    this.clock.start();
    this.renderer.setAnimationLoop(() => this.frame());
  }

  /** Enables movement/interaction (after the intro, or when a panel closes). */
  setActive(active: boolean): void {
    this.player.enabled = active;
    this.interactionEnabled = active;
    if (!active) {
      this.player.clearKeys();
      this.setHovered(null);
    }
  }

  requestLock(): void {
    if (document.pointerLockElement === this.canvas) return;
    try {
      const result = this.canvas.requestPointerLock() as unknown as Promise<void> | undefined;
      result?.catch?.(() => this.hooks.onLockError());
    } catch {
      this.hooks.onLockError();
    }
  }

  exitLock(): void {
    if (document.pointerLockElement === this.canvas) document.exitPointerLock();
  }

  get isLocked(): boolean {
    return document.pointerLockElement === this.canvas;
  }

  /** Activates whatever is under the crosshair. */
  interact(): void {
    if (!this.interactionEnabled || !this.hovered) return;
    this.hovered.activate?.();
    this.hooks.onInteract(this.hovered.target);
  }

  setTouchMove(x: number, y: number): void {
    this.player.setTouchMove(x, y);
  }

  touchLook(dx: number, dy: number): void {
    this.player.look(dx, dy, true);
  }

  resetOrbs(): void {
    for (const orb of this.orbs) {
      orb.collected = false;
      orb.object.visible = true;
      orb.object.scale.setScalar(1);
    }
  }

  dispose(): void {
    this.disposed = true;
    this.renderer.setAnimationLoop(null);
    this.unbindEvents();
    this.exitLock();
    this.scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      mesh.geometry?.dispose();
      const mats = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : [];
      for (const m of mats) {
        for (const value of Object.values(m)) if (value instanceof THREE.Texture) value.dispose();
        m.dispose();
      }
    });
    this.renderer.dispose();
  }

  private addInteractable(it: Interactable): void {
    const index = this.interactables.length;
    this.interactables.push(it);
    it.object.traverse((o) => (o.userData['interactable'] = index));
    this.targets.push(it.object);
  }

  private frame(): void {
    if (this.disposed) return;
    const rawDt = this.clock.getDelta();
    const dt = Math.min(rawDt, 0.05);
    const t = this.clock.elapsedTime;
    this.adaptQuality(rawDt);

    this.player.update(dt);
    const viewer = this.camera.position;
    for (const update of this.updaters) update(dt, t, viewer);
    for (const orb of this.orbs) {
      if (orb.update(dt, t, this.player.position) && this.interactionEnabled) this.hooks.onDiscover(orb.id);
    }
    if (this.interactionEnabled) this.updateHover();
    this.hooks.onPlayerMove(this.player.position.x, this.player.position.z, this.player.yaw);
    this.renderer.render(this.scene, this.camera);
  }

  /**
   * Adaptive quality: measures frame time over ~1.5s windows and steps the pixel ratio
   * down (and drops shadows) on slow GPUs, so integrated graphics stay smooth.
   */
  private adaptQuality(dt: number): void {
    if (this.qualityLocked || document.hidden || dt > 0.5) return;
    this.frameTimes.push(dt);
    if (this.frameTimes.length < 90) return;
    const avg = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
    this.frameTimes.length = 0;
    const fps = 1 / avg;
    if (fps >= 50) {
      if (++this.goodWindows >= 2) this.qualityLocked = true;
      return;
    }
    const steps = [Math.min(window.devicePixelRatio, 2), 1.25, 1, 0.75, 0.6];
    const current = this.renderer.getPixelRatio();
    const next = steps.find((s) => s < current - 0.01);
    if (this.renderer.shadowMap.enabled && current <= 1.25) {
      this.renderer.shadowMap.enabled = false;
      this.scene.traverse((o) => {
        const m = (o as THREE.Mesh).material as THREE.Material | undefined;
        if (m) m.needsUpdate = true;
      });
    } else if (next) {
      this.renderer.setPixelRatio(next);
      this.resize();
    } else {
      this.qualityLocked = true;
    }
  }

  private updateHover(): void {
    this.raycaster.setFromCamera(this.center, this.camera);
    const hit = this.raycaster.intersectObjects(this.targets, true)[0];
    const index = hit?.object.userData['interactable'] as number | undefined;
    this.setHovered(index === undefined ? null : this.interactables[index]);
  }

  private setHovered(next: Interactable | null): void {
    if (next === this.hovered) return;
    this.hovered?.hover(false);
    this.hovered = next;
    next?.hover(true);
    this.hooks.onHover(next?.label ?? null);
  }

  private resize = (): void => {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  };

  // ---- input -------------------------------------------------------------

  private readonly onKeyDown = (e: KeyboardEvent): void => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    if (this.player.enabled && ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
      e.preventDefault();
    }
    this.player.keyDown(e.code);
    if ((e.code === 'KeyE' || e.code === 'Enter') && !e.repeat) this.interact();
  };

  private readonly onKeyUp = (e: KeyboardEvent): void => this.player.keyUp(e.code);

  private readonly onMouseMove = (e: MouseEvent): void => {
    if (this.isLocked) {
      this.player.look(e.movementX, e.movementY);
    } else if (this.dragging) {
      // Fallback when pointer lock is unavailable: drag to look.
      this.player.look(e.clientX - this.lastPointer.x, e.clientY - this.lastPointer.y);
      this.lastPointer = { x: e.clientX, y: e.clientY };
    }
  };

  private readonly onMouseDown = (e: MouseEvent): void => {
    if (e.button !== 0) return;
    if (this.isLocked) {
      this.interact();
    } else {
      this.dragging = true;
      this.lastPointer = { x: e.clientX, y: e.clientY };
    }
  };

  private readonly onMouseUp = (): void => {
    this.dragging = false;
  };

  private readonly onLockChange = (): void => this.hooks.onLockChange(this.isLocked);
  private readonly onLockErrorEvent = (): void => this.hooks.onLockError();
  private readonly onBlur = (): void => this.player.clearKeys();

  private bindEvents(): void {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
    document.addEventListener('mousemove', this.onMouseMove);
    this.canvas.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mouseup', this.onMouseUp);
    document.addEventListener('pointerlockchange', this.onLockChange);
    document.addEventListener('pointerlockerror', this.onLockErrorEvent);
    this.resizeObserver = new ResizeObserver(this.resize);
    this.resizeObserver.observe(this.canvas);
  }

  private unbindEvents(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
    document.removeEventListener('mousemove', this.onMouseMove);
    this.canvas.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('mouseup', this.onMouseUp);
    document.removeEventListener('pointerlockchange', this.onLockChange);
    document.removeEventListener('pointerlockerror', this.onLockErrorEvent);
    this.resizeObserver?.disconnect();
  }
}
