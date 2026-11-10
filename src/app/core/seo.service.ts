import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { SETTINGS } from './settings';

/** Gives every page its own browser title and search-result description. */
@Injectable({ providedIn: 'root' })
export class SeoService {
  private title = inject(Title);
  private meta = inject(Meta);

  page(title: string, description: string) {
    const full = title.includes(SETTINGS.company) ? title : `${title} | ${SETTINGS.company}`;
    this.title.setTitle(full);
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ property: 'og:title', content: full });
    this.meta.updateTag({ property: 'og:description', content: description });
  }
}
