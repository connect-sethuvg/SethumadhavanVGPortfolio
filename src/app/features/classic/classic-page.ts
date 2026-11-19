import { Component, afterNextRender, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { EXPERIENCE, PROFILE, SKILL_GROUPS } from '../../data/portfolio.data';
import { PROJECTS } from '../../data/projects';
import { DeviceService } from '../../core/device.service';
import { optInto3D } from '../../core/mode';
import { VisitorService } from '../../core/visitor.service';
import { AuthButton } from '../../shared/auth-button';

/** Minimal one-page version of the portfolio: the default on phones, and always one click away. */
@Component({
  selector: 'app-classic-page',
  imports: [DatePipe, AuthButton],
  templateUrl: './classic-page.html',
  styleUrl: './classic-page.scss',
  host: { class: 'theme-auto' },
})
export class ClassicPage {
  protected readonly profile = PROFILE;
  protected readonly skillGroups = SKILL_GROUPS;
  protected readonly experience = EXPERIENCE;
  protected readonly projects = PROJECTS;
  protected readonly device = inject(DeviceService);
  protected readonly copied = signal(false);
  protected readonly year = new Date().getFullYear();
  protected readonly nav = [
    { id: 'about', label: 'About' },
    { id: 'skills', label: 'Skills' },
    { id: 'experience', label: 'Experience' },
    { id: 'projects', label: 'Projects' },
    { id: 'contact', label: 'Contact' },
  ];
  private readonly router = inject(Router);
  protected readonly visitors = inject(VisitorService);

  constructor() {
    // Load Firebase after first paint so it never delays the page.
    afterNextRender(() => setTimeout(() => void this.visitors.trackVisit('2d'), 300));
  }

  protected scrollTo(id: string, e: Event): void {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  protected enter3D(): void {
    optInto3D();
    void this.router.navigateByUrl('/');
  }

  protected async copyEmail(): Promise<void> {
    try {
      await navigator.clipboard.writeText(PROFILE.links.email);
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 1800);
    } catch {
      window.location.href = `mailto:${PROFILE.links.email}`;
    }
  }
}
