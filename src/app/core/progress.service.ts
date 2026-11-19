import { Injectable, computed, signal } from '@angular/core';
import { SECTIONS, SectionId } from '../data/models';
import { readStore, writeStore } from './storage';

const KEY = 'portfolio.discovered.v1';

/** Tracks which sections (orbs) the visitor has discovered. */
@Injectable({ providedIn: 'root' })
export class ProgressService {
  readonly total = SECTIONS.length;
  private readonly found = signal<SectionId[]>(readStore<SectionId[]>(KEY, []));

  readonly discovered = this.found.asReadonly();
  readonly count = computed(() => this.found().length);
  readonly complete = computed(() => this.count() >= this.total);

  has(id: SectionId): boolean {
    return this.found().includes(id);
  }

  /** Returns true when this call newly discovered the section. */
  discover(id: SectionId): boolean {
    if (this.has(id)) return false;
    this.found.update((list) => [...list, id]);
    writeStore(KEY, this.found());
    return true;
  }

  reset(): void {
    this.found.set([]);
    writeStore(KEY, []);
  }
}
