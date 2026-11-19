import * as THREE from 'three';

export type Painter = (ctx: CanvasRenderingContext2D, w: number, h: number) => void;

let maxAnisotropy = 4;
export function setMaxAnisotropy(value: number): void {
  maxAnisotropy = value;
}

/** Paints a 2D canvas and wraps it as a texture (used for every label, screen and plaque). */
export function canvasTexture(width: number, height: number, paint: Painter): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  paint(ctx, width, height);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(8, maxAnisotropy);
  return tex;
}

/** Splits text into lines that fit `maxWidth` with the current ctx font. */
export function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines = 99): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
      if (lines.length === maxLines) break;
    } else {
      line = test;
    }
  }
  if (lines.length < maxLines && line) lines.push(line);
  if (lines.length === maxLines && words.join(' ') !== lines.join(' ')) {
    let last = lines[maxLines - 1];
    while (ctx.measureText(last + '…').width > maxWidth && last.length) last = last.slice(0, -1);
    lines[maxLines - 1] = last.trimEnd() + '…';
  }
  return lines;
}

export function drawLines(
  ctx: CanvasRenderingContext2D,
  lines: string[],
  x: number,
  y: number,
  lineHeight: number,
): number {
  lines.forEach((l, i) => ctx.fillText(l, x, y + i * lineHeight));
  return y + lines.length * lineHeight;
}

export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

/** Draws pill-shaped chips left to right, wrapping rows. Returns the y below the last row. */
export function drawChips(
  ctx: CanvasRenderingContext2D,
  chips: string[],
  x: number,
  y: number,
  maxWidth: number,
  opts: { font: string; fg: string; bg: string; height: number; padX: number; gap: number; maxRows?: number },
): number {
  ctx.font = opts.font;
  ctx.textBaseline = 'middle';
  let cx = x;
  let row = 0;
  for (const chip of chips) {
    const w = ctx.measureText(chip).width + opts.padX * 2;
    if (cx + w > x + maxWidth && cx > x) {
      row++;
      if (opts.maxRows && row >= opts.maxRows) break;
      cx = x;
    }
    const cy = y + row * (opts.height + opts.gap);
    ctx.fillStyle = opts.bg;
    roundRect(ctx, cx, cy, w, opts.height, opts.height / 2);
    ctx.fill();
    ctx.fillStyle = opts.fg;
    ctx.fillText(chip, cx + opts.padX, cy + opts.height / 2 + 1);
    cx += w + opts.gap;
  }
  ctx.textBaseline = 'alphabetic';
  return y + (row + 1) * (opts.height + opts.gap);
}

/** A flat plane carrying a canvas texture. */
export function texturedPlane(
  width: number,
  height: number,
  texture: THREE.Texture,
  opts: { transparent?: boolean; unlit?: boolean } = {},
): THREE.Mesh {
  const material = opts.unlit
    ? new THREE.MeshBasicMaterial({ map: texture, transparent: opts.transparent, toneMapped: false })
    : new THREE.MeshStandardMaterial({ map: texture, transparent: opts.transparent, roughness: 0.85 });
  return new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
}

/** Soft radial glow texture used for orbs and halos. */
export function glowTexture(color: string): THREE.CanvasTexture {
  return canvasTexture(128, 128, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, color);
    g.addColorStop(0.35, color + '88');
    g.addColorStop(1, color + '00');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });
}
