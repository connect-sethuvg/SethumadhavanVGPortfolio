import * as THREE from 'three';
import { Project } from '../../../data/models';
import { PROJECTS } from '../../../data/projects';
import { COLORS, FONT_BODY, FONT_DISPLAY, LANGUAGE_COLORS } from '../../palette';
import { canvasTexture, drawChips, drawLines, texturedPlane, wrapText } from '../../canvas-text';
import { Collider, Interactable, Station, boxCollider } from '../../types';
import { WALL_INNER, sectionLabel } from '../gallery';

const CENTER_Z = -1;
const SCREEN_W = 3.0;
const SCREEN_H = 1.85;

function formatDate(iso: string): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function paintScreen(p: Project, index: number): THREE.CanvasTexture {
  return canvasTexture(1200, 740, (ctx, w, h) => {
    const bg = ctx.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, '#0f172a');
    bg.addColorStop(1, '#111c34');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Window chrome.
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, w, 64);
    ['#ef4444', '#f59e0b', '#22c55e'].forEach((c, i) => {
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(40 + i * 34, 32, 10, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.fillStyle = '#64748b';
    ctx.font = `500 26px ${FONT_BODY}`;
    ctx.fillText(`project_${String(index + 1).padStart(2, '0')}`, 160, 41);

    const x = 64;
    const maxW = w - 128;
    let y = 150;
    if (p.language) {
      ctx.fillStyle = LANGUAGE_COLORS[p.language] ?? '#94a3b8';
      ctx.beginPath();
      ctx.arc(x + 10, y - 10, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#94a3b8';
      ctx.font = `500 28px ${FONT_BODY}`;
      ctx.fillText(p.language, x + 32, y);
    }
    y += 80;
    ctx.fillStyle = '#f8fafc';
    ctx.font = `700 64px ${FONT_DISPLAY}`;
    y = drawLines(ctx, wrapText(ctx, p.title, maxW, 2), x, y, 72);
    ctx.fillStyle = '#cbd5e1';
    ctx.font = `400 32px ${FONT_BODY}`;
    y = drawLines(ctx, wrapText(ctx, p.tagline, maxW, 3), x, y + 16, 44);
    drawChips(ctx, p.tech.slice(0, 6), x, y + 24, maxW, {
      font: `500 26px ${FONT_BODY}`,
      fg: '#93c5fd',
      bg: 'rgba(59,130,246,0.16)',
      height: 46,
      padX: 18,
      gap: 12,
      maxRows: 1,
    });

    ctx.fillStyle = '#64748b';
    ctx.font = `500 26px ${FONT_BODY}`;
    ctx.fillText(`★ ${p.stars}   ·   Updated ${formatDate(p.updated)}`, x, h - 48);
    ctx.textAlign = 'right';
    ctx.fillStyle = COLORS.accentCss;
    ctx.font = `600 28px ${FONT_BODY}`;
    ctx.fillText('E  ·  Open project', w - x, h - 48);
  });
}

/** East wall: a row of monitors, one per project (curated + GitHub). */
export function buildProjectsStation(): Station {
  const group = new THREE.Group();
  const x = WALL_INNER;
  const n = PROJECTS.length;
  const spacing = Math.min(3.7, 25 / Math.max(1, n));

  const label = sectionLabel(3, 'Projects');
  label.position.set(x - 0.02, 4.0, CENTER_Z);
  label.rotation.y = -Math.PI / 2;
  group.add(label);

  const bezelMat = new THREE.MeshStandardMaterial({ color: COLORS.bezel, roughness: 0.4, metalness: 0.2 });
  const interactables: Interactable[] = [];
  const screens: { root: THREE.Group; halo: THREE.MeshBasicMaterial; hover: boolean; flash: number }[] = [];

  PROJECTS.forEach((project, i) => {
    const z = CENTER_Z + (i - (n - 1) / 2) * spacing;
    const root = new THREE.Group();
    root.position.set(x - 0.08, 2.15, z);
    root.rotation.y = -Math.PI / 2;

    const halo = new THREE.MeshBasicMaterial({ color: COLORS.accent, transparent: true, opacity: 0 });
    const haloMesh = new THREE.Mesh(new THREE.PlaneGeometry(SCREEN_W + 0.22, SCREEN_H + 0.22), halo);
    haloMesh.position.z = -0.06;
    root.add(haloMesh);

    const bezel = new THREE.Mesh(new THREE.BoxGeometry(SCREEN_W, SCREEN_H, 0.08), bezelMat);
    bezel.castShadow = true;
    root.add(bezel);
    const screen = texturedPlane(SCREEN_W - 0.12, SCREEN_H - 0.12, paintScreen(project, i), { unlit: true });
    screen.position.z = 0.045;
    root.add(screen);
    group.add(root);

    const state = { root, halo, hover: false, flash: 0 };
    screens.push(state);
    interactables.push({
      object: root,
      label: `Project · ${project.title}`,
      target: { section: 'projects', index: i },
      hover: (on) => (state.hover = on),
      activate: () => (state.flash = 1),
    });
  });

  // A gallery bench facing the screens.
  const colliders: Collider[] = [];
  const benchMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7 });
  const bench = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.42, 3.2), benchMat);
  bench.position.set(8.6, 0.21, CENTER_Z);
  bench.castShadow = true;
  bench.receiveShadow = true;
  group.add(bench);
  colliders.push(boxCollider(8.6, CENTER_Z, 0.4, 1.65));

  return {
    id: 'projects',
    object: group,
    interactables,
    colliders,
    orb: new THREE.Vector3(12.2, 1.2, CENTER_Z),
    marker: { x: 13.5, z: CENTER_Z },
    update: (dt) => {
      for (const s of screens) {
        s.flash = Math.max(0, s.flash - dt * 2);
        const target = (s.hover ? 0.85 : 0) + s.flash * 0.15;
        s.halo.opacity += (target - s.halo.opacity) * Math.min(1, dt * 10);
        const tx = x - 0.08 - (s.hover ? 0.18 : 0);
        s.root.position.x += (tx - s.root.position.x) * Math.min(1, dt * 8);
      }
    },
  };
}
