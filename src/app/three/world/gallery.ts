import * as THREE from 'three';
import { COLORS, FONT_BODY, FONT_DISPLAY } from '../palette';
import { canvasTexture, texturedPlane, wrapText } from '../canvas-text';
import { Collider } from '../types';

/** Half-size of the square gallery hall (metres). */
export const ROOM_HALF = 15;
export const WALL_HEIGHT = 4.6;
const WALL_THICKNESS = 0.4;
/** Inner face of each wall. */
export const WALL_INNER = ROOM_HALF - WALL_THICKNESS / 2;

export interface Gallery {
  object: THREE.Group;
  colliders: Collider[];
  update(dt: number, time: number): void;
}

/** Floor, walls, light strips, lighting and the floating welcome sign. */
export function buildGallery(): Gallery {
  const group = new THREE.Group();

  // Lighting: soft sky/ground fill plus one shadow-casting sun.
  group.add(new THREE.HemisphereLight(0xffffff, 0xd9dee7, 1.7));
  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.position.set(9, 16, 7);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -18;
  sun.shadow.camera.right = 18;
  sun.shadow.camera.top = 18;
  sun.shadow.camera.bottom = -18;
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.02;
  group.add(sun);

  // Floor with a subtle 2m tile grid.
  const floorTex = canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#e8ebf0';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#d6dbe3';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, w, h);
  });
  floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
  floorTex.repeat.set(ROOM_HALF, ROOM_HALF);
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM_HALF * 2, ROOM_HALF * 2),
    new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.95 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  group.add(floor);

  // Walls.
  // A touch of emissive keeps the walls gallery-white whichever way they face the sun.
  const wallMat = new THREE.MeshStandardMaterial({ color: COLORS.wall, roughness: 0.95, emissive: 0xffffff, emissiveIntensity: 0.4 });
  const stripMat = new THREE.MeshBasicMaterial({ color: COLORS.accent });
  const baseMat = new THREE.MeshStandardMaterial({ color: 0xdfe3ea, roughness: 0.9 });
  const len = ROOM_HALF * 2 + WALL_THICKNESS;
  const walls: [number, number, number][] = [
    [0, -ROOM_HALF, 0],
    [0, ROOM_HALF, Math.PI],
    [-ROOM_HALF, 0, Math.PI / 2],
    [ROOM_HALF, 0, -Math.PI / 2],
  ];
  for (const [x, z, rot] of walls) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(len, WALL_HEIGHT, WALL_THICKNESS), wallMat);
    wall.position.set(x, WALL_HEIGHT / 2, z);
    wall.rotation.y = rot;
    wall.receiveShadow = true;
    group.add(wall);

    // Accent light strip along the top and a skirting board along the bottom.
    const strip = new THREE.Mesh(new THREE.BoxGeometry(len - 0.6, 0.05, 0.06), stripMat);
    strip.position.set(0, WALL_HEIGHT / 2 - 0.12, WALL_THICKNESS / 2 + 0.03);
    wall.add(strip);
    const base = new THREE.Mesh(new THREE.BoxGeometry(len - 0.4, 0.14, 0.04), baseMat);
    base.position.set(0, -WALL_HEIGHT / 2 + 0.07, WALL_THICKNESS / 2 + 0.02);
    wall.add(base);
  }

  // Floating welcome sign above the spawn point.
  const welcomeTex = canvasTexture(1024, 300, (ctx, w, h) => {
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.beginPath();
    ctx.roundRect(4, 4, w - 8, h - 8, 36);
    ctx.fill();
    ctx.strokeStyle = COLORS.lineCss;
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.fillStyle = COLORS.inkCss;
    ctx.font = `700 76px ${FONT_DISPLAY}`;
    ctx.fillText("Hi, I'm Sethu 👋", w / 2, 120);
    ctx.fillStyle = COLORS.mutedCss;
    ctx.font = `500 34px ${FONT_BODY}`;
    const lines = wrapText(ctx, 'Explore the gallery, collect the 5 glowing orbs, and press E on anything that lights up.', w - 140);
    lines.forEach((l, i) => ctx.fillText(l, w / 2, 190 + i * 44));
  });
  const welcome = texturedPlane(3.4, 1.0, welcomeTex, { transparent: true, unlit: true });
  welcome.position.set(0, 3.0, 3.2);
  group.add(welcome);

  const colliders: Collider[] = [
    { minX: -ROOM_HALF - 1, maxX: ROOM_HALF + 1, minZ: -ROOM_HALF - 1, maxZ: -WALL_INNER },
    { minX: -ROOM_HALF - 1, maxX: ROOM_HALF + 1, minZ: WALL_INNER, maxZ: ROOM_HALF + 1 },
    { minX: -ROOM_HALF - 1, maxX: -WALL_INNER, minZ: -ROOM_HALF - 1, maxZ: ROOM_HALF + 1 },
    { minX: WALL_INNER, maxX: ROOM_HALF + 1, minZ: -ROOM_HALF - 1, maxZ: ROOM_HALF + 1 },
  ];

  return {
    object: group,
    colliders,
    update: (_dt, time) => {
      welcome.position.y = 3.0 + Math.sin(time * 0.8) * 0.05;
    },
  };
}

/** "02 — SKILLS" style label used above each station. */
export function sectionLabel(index: number, title: string, width = 3.2): THREE.Mesh {
  const tex = canvasTexture(1024, 128, (ctx, w, h) => {
    ctx.textBaseline = 'middle';
    ctx.font = `600 54px ${FONT_DISPLAY}`;
    const num = String(index).padStart(2, '0');
    const label = title.toUpperCase();
    ctx.letterSpacing = '8px';
    const numW = ctx.measureText(num).width;
    const labelW = ctx.measureText(label).width;
    const total = numW + 70 + labelW;
    let x = (w - total) / 2;
    ctx.fillStyle = COLORS.accentCss;
    ctx.fillText(num, x, h / 2);
    x += numW + 18;
    ctx.fillRect(x, h / 2 - 2, 34, 4);
    x += 52;
    ctx.fillStyle = COLORS.inkCss;
    ctx.fillText(label, x, h / 2);
  });
  return texturedPlane(width, width / 8, tex, { transparent: true, unlit: true });
}
