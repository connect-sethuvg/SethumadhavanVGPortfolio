import { DOCUMENT, Injectable, inject } from '@angular/core';
import { ActivatedRouteSnapshot, NavigationEnd, Router } from '@angular/router';
import { Meta } from '@angular/platform-browser';
import { filter } from 'rxjs';

/**
 * Keeps the canonical URL, og:url and robots meta in sync with the current route.
 * The site origin comes from the canonical link that the build stamps into index.html,
 * so every host serving the site points search engines at the one preferred domain.
 */
@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly doc = inject(DOCUMENT);
  private readonly meta = inject(Meta);
  private readonly router = inject(Router);
  private readonly origin = this.siteOrigin();

  init(): void {
    this.router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe((e) => {
      const path = (e as NavigationEnd).urlAfterRedirects.split(/[?#]/)[0] || '/';
      const url = this.origin + path;
      this.canonical().setAttribute('href', url);
      this.meta.updateTag({ property: 'og:url', content: url });
      const noindex = this.deepest(this.router.routerState.snapshot.root).data['noindex'] === true;
      this.meta.updateTag({ name: 'robots', content: noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large' });
    });
  }

  private siteOrigin(): string {
    const href = this.doc.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.getAttribute('href') ?? '';
    // In `ng serve` the placeholder is not replaced; fall back to the current origin.
    return /^https?:\/\//.test(href) ? href.replace(/\/+$/, '') : this.doc.location.origin;
  }

  private canonical(): HTMLLinkElement {
    let link = this.doc.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = this.doc.createElement('link');
      link.rel = 'canonical';
      this.doc.head.appendChild(link);
    }
    return link;
  }

  private deepest(snap: ActivatedRouteSnapshot): ActivatedRouteSnapshot {
    while (snap.firstChild) snap = snap.firstChild;
    return snap;
  }
}
