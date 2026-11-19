/** sessionStorage key: '3d' when a visitor on a touch device opts into the 3D gallery. */
export const MODE_KEY = 'portfolio.mode';

export function optInto3D(): void {
  try {
    sessionStorage.setItem(MODE_KEY, '3d');
  } catch {
    /* storage blocked: the route guard falls back to device defaults */
  }
}

export function clear3DOptIn(): void {
  try {
    sessionStorage.removeItem(MODE_KEY);
  } catch {
    /* ignore */
  }
}
