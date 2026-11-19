import * as THREE from 'three';
import { SKILL_GROUPS } from '../../../data/portfolio.data';
import { COLORS, FONT_BODY, FONT_DISPLAY } from '../../palette';
import { canvasTexture, wrapText } from '../../canvas-text';
import { Collider, Interactable, Station, boxCollider } from '../../types';
import { sectionLabel } from '../gallery';

const CENTER = new THREE.Vector3(0, 0, -2);
const RADIUS = 3.4;

/** Centre of the hall: a ring of pedestals, each with a floating skill cube. */
export function buildSkillsStation(): Station {
  const group = new THREE.Group();
  group.position.copy(CENTER);

  // Floor ring and a billboard label in the middle.
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(RADIUS - 0.03, RADIUS + 0.03, 96),
    new THREE.MeshBasicMaterial({ color: COLORS.accent }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.005;
  group.add(ring);

  const label = sectionLabel(2, 'Skills', 2.8);
  label.position.y = 3.4;
  group.add(label);

  const pillarMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 });
  const edgeMat = new THREE.LineBasicMaterial({ color: COLORS.accent });
  const interactables: Interactable[] = [];
  const animated: {
    cube: THREE.Group;
    hover: boolean;
    spin: number;
    jump: number;
    phase: number;
    mat: THREE.MeshStandardMaterial;
  }[] = [];
  const colliders: Collider[] = [];

  SKILL_GROUPS.forEach((skillGroup, i) => {
    const angle = (i / SKILL_GROUPS.length) * Math.PI * 2 + Math.PI / SKILL_GROUPS.length;
    const x = Math.sin(angle) * RADIUS;
    const z = Math.cos(angle) * RADIUS;

    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 1.15, 24), pillarMat);
    pillar.position.set(x, 0.575, z);
    pillar.castShadow = true;
    pillar.receiveShadow = true;
    group.add(pillar);
    colliders.push(boxCollider(CENTER.x + x, CENTER.z + z, 0.28, 0.28));

    const tex = canvasTexture(512, 512, (ctx, w, h) => {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = COLORS.accentCss;
      ctx.fillRect(0, 0, w, 14);
      ctx.textAlign = 'center';
      ctx.fillStyle = COLORS.inkCss;
      ctx.font = `700 64px ${FONT_DISPLAY}`;
      const lines = wrapText(ctx, skillGroup.title, w - 60, 2);
      const top = lines.length > 1 ? 200 : 240;
      lines.forEach((l, k) => ctx.fillText(l, w / 2, top + k * 72));
      ctx.fillStyle = COLORS.mutedCss;
      ctx.font = `500 34px ${FONT_BODY}`;
      ctx.fillText(`${skillGroup.skills.length} skills`, w / 2, 380);
    });
    const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.4, emissive: COLORS.accent, emissiveIntensity: 0 });
    const cube = new THREE.Group();
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.62, 0.62), mat);
    // Cubes animate, and the shadow map is static, so they do not cast shadows.
    cube.add(box);
    cube.add(new THREE.LineSegments(new THREE.EdgesGeometry(box.geometry), edgeMat));
    cube.position.set(x, 1.8, z);
    cube.rotation.y = angle;
    group.add(cube);

    const state = { cube, hover: false, spin: 0.4, jump: 0, phase: i * 0.7, mat };
    animated.push(state);
    interactables.push({
      object: cube,
      label: `Skills · ${skillGroup.title}`,
      target: { section: 'skills', index: i },
      hover: (on) => (state.hover = on),
      activate: () => (state.jump = 1),
    });
  });

  return {
    id: 'skills',
    object: group,
    interactables,
    colliders,
    orb: new THREE.Vector3(CENTER.x, 1.2, CENTER.z),
    marker: { x: CENTER.x, z: CENTER.z },
    update: (dt, time, viewer) => {
      // Billboard the label towards the player (yaw only).
      label.rotation.y = Math.atan2(viewer.x - CENTER.x, viewer.z - CENTER.z);
      for (const s of animated) {
        const targetSpin = s.hover ? 2.6 : 0.4;
        s.spin += (targetSpin - s.spin) * Math.min(1, dt * 4);
        s.cube.rotation.y += s.spin * dt;
        s.cube.rotation.x = Math.sin(time * 0.6 + s.phase) * 0.12;
        s.jump = Math.max(0, s.jump - dt * 1.8);
        s.cube.position.y = 1.8 + Math.sin(time * 1.4 + s.phase) * 0.06 + Math.sin(s.jump * Math.PI) * 0.45;
        const scale = s.hover ? 1.22 : 1;
        s.cube.scale.setScalar(s.cube.scale.x + (scale - s.cube.scale.x) * Math.min(1, dt * 10));
        s.mat.emissiveIntensity += ((s.hover ? 0.18 : 0) - s.mat.emissiveIntensity) * Math.min(1, dt * 10);
      }
    },
  };
}
