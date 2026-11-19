import * as THREE from 'three';
import { EXPERIENCE, PROFILE } from '../../../data/portfolio.data';
import { COLORS, FONT_BODY, FONT_DISPLAY } from '../../palette';
import { canvasTexture, drawLines, texturedPlane, wrapText } from '../../canvas-text';
import { Interactable, Station } from '../../types';
import { WALL_INNER, sectionLabel } from '../gallery';

const CENTER_Z = -1;
const PLAQUE_W = 3.6;
const PLAQUE_H = 2.1;

interface TimelineEntry {
  dates: string;
  title: string;
  org: string;
  detail: string;
  current: boolean;
  index: number;
}

/** Index EXPERIENCE.length is the education entry. */
export const EDUCATION_INDEX = EXPERIENCE.length;

function entries(): TimelineEntry[] {
  const jobs = EXPERIENCE.map((e, index) => ({
    dates: `${e.start} — ${e.end}`,
    title: e.role,
    org: e.company + (e.location ? `, ${e.location}` : ''),
    detail: e.project ?? e.summary,
    current: e.end.toLowerCase() === 'present',
    index,
  }));
  const education: TimelineEntry = {
    dates: 'Education',
    title: PROFILE.education.degree,
    org: PROFILE.education.school,
    detail: PROFILE.education.university,
    current: false,
    index: EDUCATION_INDEX,
  };
  // Oldest first (left to right when facing the wall). EXPERIENCE is newest first.
  return [education, ...jobs.reverse()];
}

function paintPlaque(e: TimelineEntry): THREE.CanvasTexture {
  return canvasTexture(1080, 630, (ctx, w, h) => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = e.current ? COLORS.accentCss : COLORS.lineCss;
    ctx.fillRect(0, 0, 14, h);

    const x = 70;
    const maxW = w - 130;
    ctx.fillStyle = COLORS.accentCss;
    ctx.font = `600 32px ${FONT_BODY}`;
    ctx.fillText(e.dates.toUpperCase() + (e.current ? '   ●  NOW' : ''), x, 100);
    ctx.fillStyle = COLORS.inkCss;
    ctx.font = `700 56px ${FONT_DISPLAY}`;
    let y = drawLines(ctx, wrapText(ctx, e.title, maxW, 2), x, 186, 64);
    ctx.fillStyle = '#334155';
    ctx.font = `500 36px ${FONT_BODY}`;
    y = drawLines(ctx, wrapText(ctx, e.org, maxW, 2), x, y + 6, 46);
    ctx.fillStyle = COLORS.mutedCss;
    ctx.font = `400 30px ${FONT_BODY}`;
    drawLines(ctx, wrapText(ctx, e.detail, maxW, 2), x, y + 14, 42);
    ctx.fillStyle = COLORS.accentCss;
    ctx.font = `600 28px ${FONT_BODY}`;
    ctx.fillText('E  ·  Details', x, h - 50);
  });
}

/** West wall: a timeline of plaques along an accent line. */
export function buildExperienceStation(): Station {
  const group = new THREE.Group();
  const x = -WALL_INNER;
  const list = entries();
  const spacing = 4.6;

  const label = sectionLabel(4, 'Experience');
  label.position.set(x + 0.02, 4.0, CENTER_Z);
  label.rotation.y = Math.PI / 2;
  group.add(label);

  const lineLen = spacing * (list.length - 1) + 3;
  const line = new THREE.Mesh(
    new THREE.BoxGeometry(0.03, 0.05, lineLen),
    new THREE.MeshBasicMaterial({ color: COLORS.accent }),
  );
  line.position.set(x + 0.02, 0.9, CENTER_Z);
  group.add(line);

  const plaqueMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.8 });
  const dotMat = new THREE.MeshBasicMaterial({ color: COLORS.accent });
  const interactables: Interactable[] = [];
  const plaques: { root: THREE.Group; hover: boolean; dot: THREE.Mesh; current: boolean }[] = [];

  list.forEach((entry, i) => {
    // Facing -x, the player's right is -z, so oldest (i = 0) goes to +z.
    const z = CENTER_Z + ((list.length - 1) / 2 - i) * spacing;
    const root = new THREE.Group();
    root.position.set(x + 0.06, 2.3, z);
    root.rotation.y = Math.PI / 2;
    const back = new THREE.Mesh(new THREE.BoxGeometry(PLAQUE_W, PLAQUE_H, 0.06), plaqueMat);
    back.castShadow = true;
    root.add(back);
    const face = texturedPlane(PLAQUE_W - 0.04, PLAQUE_H - 0.04, paintPlaque(entry), { unlit: true });
    face.position.z = 0.032;
    root.add(face);
    group.add(root);

    const dot = new THREE.Mesh(new THREE.SphereGeometry(entry.current ? 0.11 : 0.08, 20, 16), dotMat);
    dot.position.set(x + 0.06, 0.9, z);
    group.add(dot);

    const state = { root, hover: false, dot, current: entry.current };
    plaques.push(state);
    interactables.push({
      object: root,
      label: entry.index === EDUCATION_INDEX ? 'Education' : `Experience · ${entry.title}`,
      target: { section: 'experience', index: entry.index },
      hover: (on) => (state.hover = on),
    });
  });

  return {
    id: 'experience',
    object: group,
    interactables,
    colliders: [],
    orb: new THREE.Vector3(-12.2, 1.2, CENTER_Z),
    marker: { x: -13.5, z: CENTER_Z },
    update: (dt, time) => {
      for (const p of plaques) {
        const tx = x + 0.06 + (p.hover ? 0.22 : 0);
        p.root.position.x += (tx - p.root.position.x) * Math.min(1, dt * 8);
        if (p.current) p.dot.scale.setScalar(1 + Math.sin(time * 3) * 0.25);
      }
    },
  };
}
