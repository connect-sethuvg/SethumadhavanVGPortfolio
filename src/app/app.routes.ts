import { inject } from '@angular/core';
import { CanMatchFn, Routes } from '@angular/router';
import { DeviceService } from './core/device.service';
import { MODE_KEY } from './core/mode';

/** 3D is the default on desktop; touch devices and devices without WebGL get the 2D page unless they opt in. */
const prefer3D: CanMatchFn = () => {
  const device = inject(DeviceService);
  if (!device.hasWebGL) return false;
  let optedIn = false;
  try {
    optedIn = sessionStorage.getItem(MODE_KEY) === '3d';
  } catch {
    /* storage blocked */
  }
  return optedIn || !device.prefers2D;
};

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    canMatch: [prefer3D],
    title: 'Sethu Madhavan V G · 3D Portfolio',
    loadComponent: () => import('./features/world/world-page').then((m) => m.WorldPage),
  },
  { path: '', pathMatch: 'full', redirectTo: 'classic' },
  {
    path: 'classic',
    title: 'Sethu Madhavan V G · Software Developer',
    loadComponent: () => import('./features/classic/classic-page').then((m) => m.ClassicPage),
  },
  {
    path: 'admin',
    title: 'Visitors · Admin',
    loadComponent: () => import('./features/admin/admin-page').then((m) => m.AdminPage),
  },
  { path: '**', redirectTo: '' },
];
