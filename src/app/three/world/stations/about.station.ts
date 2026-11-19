import * as THREE from 'three';
import { PROFILE } from '../../../data/portfolio.data';
import { COLORS, FONT_BODY, FONT_DISPLAY } from '../../palette';
import { canvasTexture, drawLines, texturedPlane, wrapText } from '../../canvas-text';
import { Station } from '../../types';
import { WALL_INNER, sectionLabel } from '../gallery';

/** North wall: a large portrait frame introducing the visitor to Sethu. */
export function buildAboutStation(): Station {
  const group = new THREE.Group();
  const z = -WALL_INNER;

  const label = sectionLabel(1, 'About');
  label.position.set(0, 4.0, z + 0.02);
  group.add(label);

  const tex = canvasTexture(1400, 840, (ctx, w, h) => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);

    // Monogram portrait.
    const cx = 300;
    const cy = 380;
    const grad = ctx.createLinearGradient(cx - 200, cy - 200, cx + 200, cy + 200);
    grad.addColorStop(0, '#60a5fa');
    grad.addColorStop(1, '#1d4ed8');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, 200, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = `700 150px ${FONT_DISPLAY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(PROFILE.initials, cx, cy + 8);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';

    const x = 580;
    const maxW = w - x - 90;
    ctx.fillStyle = COLORS.inkCss;
    // Shrink the name until it fits on one line.
    let size = 84;
    do {
      ctx.font = `700 ${size}px ${FONT_DISPLAY}`;
    } while (ctx.measureText(PROFILE.name).width > maxW && --size > 40);
    ctx.fillText(PROFILE.name, x, 230);
    ctx.fillStyle = COLORS.accentCss;
    ctx.font = `600 44px ${FONT_BODY}`;
    ctx.fillText(PROFILE.title, x, 300);
    ctx.fillStyle = '#334155';
    ctx.font = `400 36px ${FONT_BODY}`;
    let y = drawLines(ctx, wrapText(ctx, PROFILE.tagline, maxW, 3), x, 380, 50);
    ctx.fillStyle = COLORS.mutedCss;
    ctx.font = `500 32px ${FONT_BODY}`;
    y += 30;
    ctx.fillText(`📍 ${PROFILE.location}`, x, y);
    ctx.fillText(`🗣 ${PROFILE.languagesSpoken.join(' · ')}`, x, y + 52);

    ctx.fillStyle = COLORS.accentCss;
    ctx.font = `600 30px ${FONT_BODY}`;
    ctx.fillText('Press E to read more  →', x, h - 70);
  });

  // Frame: dark border box with the canvas inset.
  const frame = new THREE.Group();
  const border = new THREE.Mesh(
    new THREE.BoxGeometry(5.2, 3.24, 0.12),
    new THREE.MeshStandardMaterial({ color: COLORS.ink, roughness: 0.5 }),
  );
  border.castShadow = true;
  frame.add(border);
  const canvasPlane = texturedPlane(5.0, 3.0, tex, { unlit: true });
  canvasPlane.position.z = 0.065;
  frame.add(canvasPlane);
  frame.position.set(0, 2.25, z + 0.08);
  group.add(frame);

  let hovered = false;
  let pulse = 0;

  return {
    id: 'about',
    object: group,
    colliders: [],
    orb: new THREE.Vector3(0, 1.2, -12),
    marker: { x: 0, z: -13.5 },
    interactables: [
      {
        object: frame,
        label: 'About me',
        target: { section: 'about' },
        hover: (on) => (hovered = on),
        activate: () => (pulse = 1),
      },
    ],
    update: (dt) => {
      const tz = z + 0.08 + (hovered ? 0.25 : 0);
      frame.position.z += (tz - frame.position.z) * Math.min(1, dt * 8);
      frame.rotation.x += ((hovered ? -0.04 : 0) - frame.rotation.x) * Math.min(1, dt * 8);
      pulse = Math.max(0, pulse - dt * 2.5);
      frame.scale.setScalar(1 + Math.sin(pulse * Math.PI) * 0.03);
    },
  };
}
