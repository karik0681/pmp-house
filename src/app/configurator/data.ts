// @ts-nocheck
export const SIZES = {
  /* Ekonom is offered in the same standard sizes as Standard */
  Y: [[2.4, 2.4], [4, 2.4], [6, 2.4], [6, 3], [7, 3], [8, 3], [9, 3], [12, 3], [12, 4]],
  K: [[2.4, 2.4], [4, 2.4], [6, 2.4], [6, 3], [7, 3], [8, 3], [9, 3], [12, 3], [12, 4]],
  P: [[6, 3], [9, 3], [12, 3], [5, 4], [8, 4], [10, 4], [12, 4]],
};
/* published "from" prices, excl. VAT */
export const PRICES = { Y: { '6x3': 110000 }, K: { '2.4x2.4': 65000, '4x2.4': 80000, '6x2.4': 99000, '6x3': 110000 }, P: { '6x3': 130000, '9x3': 200000 } };
const UP = 'https://pmp-mobilnidomy.cz/wp-content/uploads/';
export const PROJECTS = [
  ['2026/08/real-2.png', 'Květinové studio', 'Jihočeský kraj', 'P'], ['2026/08/Rectangle-60.png', 'Kontejner pro pastýře', 'Praha', 'Y'],
  ['2026/08/WhatsApp-Image-2025-01-05-at-22.45.12-2-1.png', 'Půjčovna aut', 'Brno', 'K'], ['2026/08/WhatsApp-Image-2025-08-15-at-08.38.27.jpeg', 'Zázemí golfového klubu', 'Praha', 'K'],
  ['2026/08/proj-1.png', 'Prodejna', 'Pardubice', ''], ['2026/08/WhatsApp-Image-2026-03-27-at-11.45.03-1.jpeg', 'Lesní školka', 'Brno', ''],
  ['2026/08/IMG-20250728-WA0061.jpg', 'Sklad', 'Chvojno', ''], ['2026/10/reference-2026-obytny-kontejner-16.webp', 'Prodejna minerálů a drahých kamenů', 'Praha', ''],
].map(([p, title, place, type]) => ({ thumb: UP + p, full: UP + p, title, place, type, album: 'best' }));
const IN = [11, 12, 34, 36, 53, 54, 55, 60, 61, 63, 64, 68, 70, 72, 91, 92, 93, 94, 99, 111, 114, 116, 119, 122, 124, 125, 128, 130, 131, 139, 144];
const BATH = [62, 79, 87, 88, 89, 90, 118, 127, 129, 159, 160];
const TWO = [132, 150, 152, 153, 155, 166];
const SMALL = [19, 20, 27, 28, 77, 78, 80, 134, 154, 170, 175, 177];
const PL = 'https://pmp-house.cz/images/projekty/modularni-stavby-pmp-';
const ALL = Array.from({ length: 179 }, (_, i) => {
  const n = i + 1, id = String(n).padStart(3, '0');
  const album = TWO.includes(n) ? 'two' : BATH.includes(n) ? 'bath' : IN.includes(n) ? 'in' : SMALL.includes(n) ? 'small' : 'out';
  return { thumb: `${PL}${id}-th.jpg`, full: `${PL}${id}.jpg`, title: '', place: '', type: '', album };
});
export const PHOTOS = [...PROJECTS, ...ALL];
/** One photo of the pmp-house.cz gallery by its number (1–179). */
export const galleryPhoto = (n) => { const id = String(n).padStart(3, '0'); return { thumb: `${PL}${id}-th.jpg`, full: `${PL}${id}.jpg` }; };
