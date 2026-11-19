import { Reference } from './refs.data';

/** Hashtags of a project: what it is for, the model, the size and the place. Used for the grid filter. */
export function refTags(r: Reference, t: (k: string) => string): string[] {
  const tag = (s: string) => '#' + s.toLocaleLowerCase('cs').replace(/[\s,.–-]+/g, '');
  return [
    tag(t('tag_' + r.use)),
    tag(t(r.type)),
    tag(`${r.L}x${r.W}m`),
    ...(r.count > 1 ? [tag(t('tag_multi'))] : []),
    tag(r.place),
  ];
}
