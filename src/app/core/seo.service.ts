import { DOCUMENT, Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { SETTINGS } from './settings';

export interface PageSeo {
  /** the page's own address, for example '/montaz' */
  path: string;
  /** true: never in search results (demo content, for example), even when the site is open for search engines */
  noindex?: boolean;
}

/**
 * Gives every page its title, search-result description, canonical address and sharing preview,
 * and says whether search engines may list it (SETTINGS.indexable is the main switch).
 */
@Injectable({ providedIn: 'root' })
export class SeoService {
  private title = inject(Title);
  private meta = inject(Meta);
  private doc = inject(DOCUMENT);

  page(title: string, description: string, p: PageSeo) {
    const full = title.includes(SETTINGS.company) ? title : `${title} | ${SETTINGS.company}`;
    /* the server serves pages at addresses ending in '/' (/montaz/) and redirects the rest, so canonical links end in '/' */
    const url = SETTINGS.siteUrl + (p.path === '/' ? '/' : p.path.replace(/\/$/, '') + '/');
    this.title.setTitle(full);
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ name: 'robots', content: SETTINGS.indexable && !p.noindex ? 'index, follow' : 'noindex, nofollow' });
    /* read by scripts/postbuild.mjs: pages marked here stay out of sitemap.xml */
    if (p.noindex) this.meta.updateTag({ name: 'pmp-sitemap', content: 'skip' }); else this.meta.removeTag('name="pmp-sitemap"');
    this.meta.updateTag({ property: 'og:title', content: full });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:url', content: url });
    this.meta.updateTag({ property: 'og:type', content: 'website' });
    this.meta.updateTag({ property: 'og:locale', content: 'cs_CZ' });
    this.meta.updateTag({ property: 'og:site_name', content: SETTINGS.company });
    this.meta.updateTag({ property: 'og:image', content: SETTINGS.siteUrl + '/og-v2.jpg' });
    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.link('canonical', url);
  }

  /** Structured data (schema.org) that tells Google who the company is, where and when it is open. */
  company() {
    const data = {
      '@context': 'https://schema.org',
      '@type': 'HomeAndConstructionBusiness',
      name: SETTINGS.company,
      url: SETTINGS.siteUrl + '/',
      image: SETTINGS.siteUrl + '/og-v2.jpg',
      telephone: SETTINGS.phone.replace(/\s/g, ''),
      email: SETTINGS.mail,
      taxID: SETTINGS.ico,
      vatID: SETTINGS.dic,
      address: { '@type': 'PostalAddress', ...SETTINGS.postal, addressCountry: 'CZ' },
      areaServed: { '@type': 'Country', name: 'Česká republika' },
      openingHoursSpecification: [{
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        opens: '08:00', closes: '16:00',
      }],
      sameAs: [...Object.values(SETTINGS.social), ...SETTINGS.offices.flatMap(o => [o.google, o.firmy])].filter(Boolean),
      department: SETTINGS.offices.filter(o => o.street && !o.main).map(o => ({
        '@type': 'HomeAndConstructionBusiness',
        name: `${SETTINGS.company} ${o.city}`,
        telephone: o.phone.replace(/\s/g, ''),
        address: { '@type': 'PostalAddress', streetAddress: o.street, addressLocality: o.locality, postalCode: o.postal, addressCountry: 'CZ' },
      })),
    };
    let s = this.doc.head.querySelector<HTMLScriptElement>('script#ld-company');
    if (!s) {
      s = this.doc.createElement('script');
      s.id = 'ld-company';
      s.type = 'application/ld+json';
      this.doc.head.appendChild(s);
    }
    s.textContent = JSON.stringify(data);
  }

  private link(rel: string, href: string) {
    let l = this.doc.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
    if (!l) { l = this.doc.createElement('link'); l.rel = rel; this.doc.head.appendChild(l); }
    l.href = href;
  }
}
