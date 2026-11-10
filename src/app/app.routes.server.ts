import { RenderMode, ServerRoute } from '@angular/ssr';
import { REFERENCES } from './references/refs.data';

/** Which pages are built as ready HTML for search engines, and which stay a plain browser app. */
export const serverRoutes: ServerRoute[] = [
  /* the staff cabinet is private: no ready HTML, nothing for search engines */
  { path: 'admin', renderMode: RenderMode.Client },
  { path: 'admin/login', renderMode: RenderMode.Client },
  /* one ready page per reference */
  { path: 'reference/:slug', renderMode: RenderMode.Prerender, getPrerenderParams: async () => REFERENCES.map(r => ({ slug: r.slug })) },
  { path: '**', renderMode: RenderMode.Prerender },
];
