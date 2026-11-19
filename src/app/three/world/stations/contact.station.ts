import * as THREE from 'three';
import { PROFILE } from '../../../data/portfolio.data';
import { COLORS, FONT_BODY, FONT_DISPLAY } from '../../palette';
import { canvasTexture, texturedPlane } from '../../canvas-text';
import { Interactable, Station, boxCollider } from '../../types';
import { WALL_INNER, sectionLabel } from '../gallery';

function stripProtocol(url: string): string {
  return url.replace(/^https?:\/\//, '');
}

/** South wall (behind spawn): a contact board and a mailbox whose flag pops up. */
export function buildContactStation(): Station {
  const group = new THREE.Group();
  const z = WALL_INNER;

  const label = sectionLabel(5, 'Contact');
  label.position.set(0, 4.0, z - 0.02);
  label.rotation.y = Math.PI;
  group.add(label);

  const boardTex = canvasTexture(1400, 640, (ctx, w, h) => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = COLORS.inkCss;
    ctx.font = `700 92px ${FONT_DISPLAY}`;
    ctx.fillText("Let's build something", 90, 170);
    ctx.fillStyle = COLORS.accentCss;
    ctx.fillText('together.', 90, 270);
    const rows: [string, string][] = [
      ['✉', PROFILE.links.email],
      ['in', stripProtocol(PROFILE.links.linkedin)],
      ['gh', stripProtocol(PROFILE.links.github)],
    ];
    rows.forEach(([icon, text], i) => {
      const y = 380 + i * 72;
      ctx.fillStyle = '#eff6ff';
      ctx.beginPath();
      ctx.roundRect(90, y - 40, 56, 56, 12);
      ctx.fill();
      ctx.fillStyle = COLORS.accentCss;
      ctx.font = `700 28px ${FONT_BODY}`;
      ctx.textAlign = 'center';
      ctx.fillText(icon, 118, y - 2);
      ctx.textAlign = 'left';
      ctx.fillStyle = '#334155';
      ctx.font = `500 36px ${FONT_BODY}`;
      ctx.fillText(text, 170, y);
    });
  });
  const board = new THREE.Group();
  const boardBack = new THREE.Mesh(
    new THREE.BoxGeometry(5.0, 2.3, 0.08),
    new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.8 }),
  );
  board.add(boardBack);
  const boardFace = texturedPlane(4.9, 2.24, boardTex, { unlit: true });
  boardFace.position.z = 0.045;
  board.add(boardFace);
  board.position.set(0, 2.3, z - 0.06);
  board.rotation.y = Math.PI;
  group.add(board);

  // Mailbox on a post.
  const mailbox = new THREE.Group();
  const accentMat = new THREE.MeshStandardMaterial({ color: COLORS.accent, roughness: 0.45 });
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 });
  const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.1, 0.12), whiteMat);
  post.position.y = 0.55;
  post.castShadow = true;
  mailbox.add(post);
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.32, 0.8), accentMat);
  body.position.y = 1.26;
  body.castShadow = true;
  mailbox.add(body);
  // Half cylinder: axis along z, curved side up.
  const roofGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.8, 24, 1, false, 0, Math.PI);
  roofGeo.rotateX(Math.PI / 2);
  roofGeo.rotateZ(Math.PI / 2);
  const roof = new THREE.Mesh(roofGeo, accentMat);
  roof.position.y = 1.42;
  roof.castShadow = true;
  mailbox.add(roof);
  const door = new THREE.Mesh(new THREE.CircleGeometry(0.2, 24, 0, Math.PI), whiteMat);
  door.position.set(0, 1.42, -0.405);
  door.rotation.y = Math.PI;
  mailbox.add(door);
  const doorBase = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.3), whiteMat);
  doorBase.position.set(0, 1.27, -0.405);
  doorBase.rotation.y = Math.PI;
  mailbox.add(doorBase);

  const flagPivot = new THREE.Group();
  flagPivot.position.set(0.27, 1.3, 0.15);
  const flagPole = new THREE.Mesh(
    new THREE.BoxGeometry(0.03, 0.42, 0.04),
    new THREE.MeshStandardMaterial({ color: COLORS.flag, roughness: 0.5 }),
  );
  flagPole.position.y = 0.19;
  flagPivot.add(flagPole);
  const flag = new THREE.Mesh(
    new THREE.BoxGeometry(0.03, 0.14, 0.18),
    new THREE.MeshStandardMaterial({ color: COLORS.flag, roughness: 0.5 }),
  );
  flag.position.set(0, 0.34, -0.09);
  flagPivot.add(flag);
  mailbox.add(flagPivot);

  const mailX = 4.0;
  const mailZ = z - 1.6;
  mailbox.position.set(mailX, 0, mailZ);
  group.add(mailbox);

  let boardHover = false;
  let mailHover = false;
  let flagUp = 0;
  let wiggle = 0;

  const interactables: Interactable[] = [
    {
      object: mailbox,
      label: 'Send me a message',
      target: { section: 'contact' },
      hover: (on) => (mailHover = on),
      activate: () => (wiggle = 1),
    },
    {
      object: board,
      label: 'Contact details',
      target: { section: 'contact' },
      hover: (on) => (boardHover = on),
    },
  ];

  return {
    id: 'contact',
    object: group,
    interactables,
    colliders: [boxCollider(mailX, mailZ, 0.32, 0.45)],
    orb: new THREE.Vector3(0, 1.2, 12),
    marker: { x: 0, z: 13.5 },
    update: (dt, time) => {
      // Flag is down (horizontal) by default and swings up on hover.
      flagUp += ((mailHover ? 1 : 0) - flagUp) * Math.min(1, dt * 6);
      flagPivot.rotation.x = (1 - flagUp) * (Math.PI / 2);
      wiggle = Math.max(0, wiggle - dt * 1.5);
      mailbox.rotation.y = Math.sin(time * 30) * 0.06 * wiggle;
      const tz = z - 0.06 - (boardHover ? 0.2 : 0);
      board.position.z += (tz - board.position.z) * Math.min(1, dt * 8);
    },
  };
}
