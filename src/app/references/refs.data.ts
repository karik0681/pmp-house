import { PROJECTS, galleryPhoto } from '../configurator/data';
import { Kind } from '../configurator/model';

/*
 * DEMO REFERENCES
 * Titles, places and cover photos come from the current website.
 * Descriptions, years, sizes and the extra photos are SAMPLE content:
 * replace them with the real story of each project, then set demo: false.
 */

export type Use = 'business' | 'education' | 'leisure' | 'agri' | 'storage';
type Text = { cs: string };
export interface Photo { thumb: string; full: string }
export interface Reference {
  slug: string; title: Text; place: string; year: number; use: Use;
  type: Kind; L: number; W: number; count: number; days: number;
  lead: Text; task: Text; solution: Text; result: Text;
  cover: Photo; photos: Photo[]; demo: boolean;
}

const cover = (i: number): Photo => ({ thumb: PROJECTS[i].thumb, full: PROJECTS[i].full });
const extra = (...n: number[]): Photo[] => n.map(galleryPhoto);

export const USES: Use[] = ['business', 'education', 'leisure', 'agri', 'storage'];

export const REFERENCES: Reference[] = [
  {
    slug: 'kvetinove-studio', title: { cs: 'Květinové studio' }, place: 'Jihočeský kraj',
    year: 2025, use: 'business', type: 'P', L: 6, W: 3, count: 1, days: 1, cover: cover(0), photos: extra(3, 11, 36), demo: true,
    lead: { cs: 'Prodejna květin s velkým prosklením do ulice, aby kytice byly vidět už z chodníku.' },
    task: { cs: 'Majitelka hledala malou prodejnu, která bude hotová před sezónou a nebude potřebovat stavební práce na místě.' },
    solution: { cs: 'Zvolili jsme Premium bez prostředních sloupů. Přední stěnu tvoří francouzské dveře, uvnitř je pult, umyvadlo a police na vědra s vodou.' },
    result: { cs: 'Kontejner stál na připravených patkách za jedno dopoledne. Prodejna otevřela týden po dodání.' },
  },
  {
    slug: 'kontejner-pro-pastyre', title: { cs: 'Kontejner pro pastýře' }, place: 'Praha',
    year: 2025, use: 'agri', type: 'Y', L: 6, W: 3, count: 1, days: 1, cover: cover(1), photos: extra(5, 7, 12), demo: true,
    lead: { cs: 'Jednoduché zázemí u pastvin: místo na přespání, uskladnění vybavení a suché oblečení.' },
    task: { cs: 'Pastvina je daleko od obce a bez přípojek. Kontejner musel zvládnout horší příjezd a fungovat bez stálé elektřiny.' },
    solution: { cs: 'Ekonom s jednou místností, policemi a přípravou na solární panel. Stojí na betonových patkách, aby pod podlahou proudil vzduch.' },
    result: { cs: 'Hydraulická ruka kontejner usadila přímo z návěsu, autojeřáb nebyl potřeba.' },
  },
  {
    slug: 'pujcovna-aut', title: { cs: 'Půjčovna aut' }, place: 'Brno',
    year: 2025, use: 'business', type: 'K', L: 6, W: 3, count: 1, days: 1, cover: cover(2), photos: extra(8, 34, 62), demo: true,
    lead: { cs: 'Kancelář pro výdej a vracení aut přímo na parkovišti.' },
    task: { cs: 'Firma potřebovala kancelář, kterou může později přesunout na jiné parkoviště.' },
    solution: { cs: 'Standard 3 × 6 m s pracovním pultem pro dva lidi, klimatizací a WC. Elektřina vede z přípojky parkoviště.' },
    result: { cs: 'Kontejner jde kdykoli odpojit a převézt jinam celý, i s vybavením.' },
  },
  {
    slug: 'zazemi-golfoveho-klubu', title: { cs: 'Zázemí golfového klubu' }, place: 'Praha',
    year: 2025, use: 'leisure', type: 'K', L: 6, W: 3, count: 2, days: 2, cover: cover(3), photos: extra(132, 150, 79), demo: true,
    lead: { cs: 'Dva spojené moduly: recepce, šatna a sociální zařízení u odpaliště.' },
    task: { cs: 'Klub chtěl zázemí na sezónu bez dlouhé stavby a s rozpočtem známým předem.' },
    solution: { cs: 'Dva moduly Standard vedle sebe se společnou podlahou. V jednom je recepce, ve druhém šatna, WC a sprcha.' },
    result: { cs: 'Moduly jsme na místě spojili a utěsnili za dva dny. Přípojky dokončil elektrikář klubu.' },
  },
  {
    slug: 'prodejna-pardubice', title: { cs: 'Prodejna u hlavní silnice' }, place: 'Pardubice',
    year: 2024, use: 'business', type: 'K', L: 6, W: 3, count: 1, days: 1, cover: cover(4), photos: extra(9, 53, 54), demo: true,
    lead: { cs: 'Malá prodejna s výlohou a skladem v jednom.' },
    task: { cs: 'Klient chtěl začít prodávat rychle a bez nájmu v obchodním centru.' },
    solution: { cs: 'Standard s výlohou v přední stěně a příčkou, která odděluje malý sklad.' },
    result: { cs: 'Od objednávky po otevření uběhly necelé čtyři týdny.' },
  },
  {
    slug: 'lesni-skolka', title: { cs: 'Lesní školka' }, place: 'Brno',
    year: 2026, use: 'education', type: 'P', L: 9, W: 3, count: 1, days: 1, cover: cover(5), photos: extra(55, 60, 91), demo: true,
    lead: { cs: 'Teplé a suché zázemí pro děti, které tráví většinu dne venku.' },
    task: { cs: 'Školka potřebovala místo na převlékání, jídlo a odpolední spánek, a to na pozemku bez pevných základů.' },
    solution: { cs: 'Premium 3 × 9 m s velkými okny na jih, zateplenou podlahou a dřevěným obkladem. Stojí na zemních vrutech, které jdou později vyjmout.' },
    result: { cs: 'Děti mají světlou místnost s výhledem do lesa a pozemek zůstal bez betonu.' },
  },
  {
    slug: 'sklad-chvojno', title: { cs: 'Sklad u dílny' }, place: 'Chvojno',
    year: 2024, use: 'storage', type: 'Y', L: 6, W: 3, count: 1, days: 1, cover: cover(6), photos: extra(19, 20, 13), demo: true,
    lead: { cs: 'Uzamykatelný sklad nářadí a materiálu vedle dílny.' },
    task: { cs: 'Firma potřebovala rychle suchý a uzamykatelný sklad, bez zdění.' },
    solution: { cs: 'Ekonom s dveřmi v čele a regály po obou stěnách, usazený na zhutněný štěrk a betonové patky.' },
    result: { cs: 'Sklad slouží i jako výdejna materiálu pro partu na stavbách.' },
  },
  {
    slug: 'prodejna-mineralu', title: { cs: 'Prodejna minerálů a drahých kamenů' }, place: 'Praha',
    year: 2026, use: 'business', type: 'P', L: 6, W: 3, count: 1, days: 1, cover: cover(7), photos: extra(14, 63, 64), demo: true,
    lead: { cs: 'Butik s vitrínami, kde vynikne světlo a barvy kamenů.' },
    task: { cs: 'Majitel chtěl prodejnu, která sama působí jako výloha, a dost světla na vitríny.' },
    solution: { cs: 'Premium s panoramatickým oknem v přední stěně, tmavým rámem a LED osvětlením pod stropem.' },
    result: { cs: 'Tvar kontejneru zaujme už z ulice a uvnitř zůstává dost místa na pult i vitríny.' },
  },
];
