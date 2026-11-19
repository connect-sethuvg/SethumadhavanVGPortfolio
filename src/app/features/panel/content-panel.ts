import { Component, computed, input, output, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { PanelTarget, SECTIONS } from '../../data/models';
import { EXPERIENCE, PROFILE, SKILL_GROUPS } from '../../data/portfolio.data';
import { PROJECTS } from '../../data/projects';

/** Slide-in panel that shows the content behind whatever the visitor interacted with in 3D. */
@Component({
  selector: 'app-content-panel',
  imports: [DatePipe],
  templateUrl: './content-panel.html',
  styleUrl: './content-panel.scss',
  host: {
    role: 'dialog',
    'aria-modal': 'true',
    '[attr.aria-label]': 'sectionLabel()',
    '(document:keydown.arrowright)': 'step(1)',
    '(document:keydown.arrowleft)': 'step(-1)',
  },
})
export class ContentPanel {
  readonly target = input.required<PanelTarget>();
  readonly closed = output<void>();
  readonly navigate = output<PanelTarget>();

  protected readonly profile = PROFILE;
  protected readonly skillGroups = SKILL_GROUPS;
  protected readonly projects = PROJECTS;
  protected readonly experience = EXPERIENCE;
  protected readonly educationIndex = EXPERIENCE.length;
  protected readonly copied = signal(false);

  protected readonly sectionLabel = computed(() => SECTIONS.find((s) => s.id === this.target().section)?.label ?? '');
  protected readonly index = computed(() => this.target().index ?? 0);

  /** Number of items in the current section, for prev/next navigation. */
  protected readonly count = computed(() => {
    switch (this.target().section) {
      case 'skills':
        return SKILL_GROUPS.length;
      case 'projects':
        return PROJECTS.length;
      case 'experience':
        return EXPERIENCE.length + 1;
      default:
        return 0;
    }
  });

  protected step(delta: number): void {
    const n = this.count();
    if (!n) return;
    this.navigate.emit({ section: this.target().section, index: (this.index() + delta + n) % n });
  }

  protected go(section: PanelTarget['section'], index?: number): void {
    this.navigate.emit({ section, index });
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
