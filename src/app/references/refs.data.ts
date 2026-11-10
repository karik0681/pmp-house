import { PROJECTS, galleryPhoto } from '../configurator/data';
import { Kind } from '../configurator/model';

/*
 * DEMO REFERENCES
 * Titles, places and cover photos come from the current website.
 * Descriptions, years, sizes and the extra photos are SAMPLE content:
 * replace them with the real story of each project, then set demo: false.
 */

export type Use = 'business' | 'education' | 'leisure' | 'agri' | 'storage';
type Text = { cs: string; de: string };
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
    slug: 'kvetinove-studio', title: { cs: 'Květinové studio', de: 'Blumenstudio' }, place: 'Jihočeský kraj',
    year: 2025, use: 'business', type: 'P', L: 6, W: 3, count: 1, days: 1, cover: cover(0), photos: extra(3, 11, 36), demo: true,
    lead: { cs: 'Prodejna květin s velkým prosklením do ulice, aby kytice byly vidět už z chodníku.', de: 'Ein Blumenladen mit großer Glasfront zur Straße, damit die Sträuße schon vom Gehweg aus zu sehen sind.' },
    task: { cs: 'Majitelka hledala malou prodejnu, která bude hotová před sezónou a nebude potřebovat stavební práce na místě.', de: 'Die Inhaberin suchte einen kleinen Laden, der vor der Saison fertig ist und vor Ort keine Bauarbeiten braucht.' },
    solution: { cs: 'Zvolili jsme Premium bez prostředních sloupů. Přední stěnu tvoří francouzské dveře, uvnitř je pult, umyvadlo a police na vědra s vodou.', de: 'Wir haben Premium ohne Mittelstützen gewählt. Die Front besteht aus französischen Fenstern, innen gibt es Theke, Waschbecken und Regale für Wassereimer.' },
    result: { cs: 'Kontejner stál na připravených patkách za jedno dopoledne. Prodejna otevřela týden po dodání.', de: 'Der Container stand an einem Vormittag auf den vorbereiteten Punktfundamenten. Der Laden öffnete eine Woche nach der Lieferung.' },
  },
  {
    slug: 'kontejner-pro-pastyre', title: { cs: 'Kontejner pro pastýře', de: 'Container für den Schäfer' }, place: 'Praha',
    year: 2025, use: 'agri', type: 'Y', L: 6, W: 3, count: 1, days: 1, cover: cover(1), photos: extra(5, 7, 12), demo: true,
    lead: { cs: 'Jednoduché zázemí u pastvin: místo na přespání, uskladnění vybavení a suché oblečení.', de: 'Ein einfacher Stützpunkt an der Weide: Schlafplatz, Lager für Ausrüstung und trockene Kleidung.' },
    task: { cs: 'Pastvina je daleko od obce a bez přípojek. Kontejner musel zvládnout horší příjezd a fungovat bez stálé elektřiny.', de: 'Die Weide liegt weit vom Dorf entfernt und hat keine Anschlüsse. Der Container musste eine schwierige Zufahrt meistern und ohne festen Strom auskommen.' },
    solution: { cs: 'Ekonom s jednou místností, policemi a přípravou na solární panel. Stojí na betonových patkách, aby pod podlahou proudil vzduch.', de: 'Ekonom mit einem Raum, Regalen und Vorbereitung für ein Solarmodul. Er steht auf Betonpunktfundamenten, damit unter dem Boden Luft zirkuliert.' },
    result: { cs: 'Hydraulická ruka kontejner usadila přímo z návěsu, autojeřáb nebyl potřeba.', de: 'Der Ladekran setzte den Container direkt vom Auflieger ab, ein Autokran war nicht nötig.' },
  },
  {
    slug: 'pujcovna-aut', title: { cs: 'Půjčovna aut', de: 'Autovermietung' }, place: 'Brno',
    year: 2025, use: 'business', type: 'K', L: 6, W: 3, count: 1, days: 1, cover: cover(2), photos: extra(8, 34, 62), demo: true,
    lead: { cs: 'Kancelář pro výdej a vracení aut přímo na parkovišti.', de: 'Ein Büro für Ausgabe und Rückgabe der Autos direkt auf dem Parkplatz.' },
    task: { cs: 'Firma potřebovala kancelář, kterou může později přesunout na jiné parkoviště.', de: 'Die Firma brauchte ein Büro, das sie später auf einen anderen Parkplatz umziehen kann.' },
    solution: { cs: 'Standard 3 × 6 m s pracovním pultem pro dva lidi, klimatizací a WC. Elektřina vede z přípojky parkoviště.', de: 'Standard 3 × 6 m mit Arbeitstheke für zwei Personen, Klimaanlage und WC. Der Strom kommt vom Anschluss des Parkplatzes.' },
    result: { cs: 'Kontejner jde kdykoli odpojit a převézt jinam celý, i s vybavením.', de: 'Der Container lässt sich jederzeit abklemmen und samt Einrichtung als Ganzes umsetzen.' },
  },
  {
    slug: 'zazemi-golfoveho-klubu', title: { cs: 'Zázemí golfového klubu', de: 'Clubhaus für einen Golfclub' }, place: 'Praha',
    year: 2025, use: 'leisure', type: 'K', L: 6, W: 3, count: 2, days: 2, cover: cover(3), photos: extra(132, 150, 79), demo: true,
    lead: { cs: 'Dva spojené moduly: recepce, šatna a sociální zařízení u odpaliště.', de: 'Zwei verbundene Module: Empfang, Umkleide und Sanitär am Abschlag.' },
    task: { cs: 'Klub chtěl zázemí na sezónu bez dlouhé stavby a s rozpočtem známým předem.', de: 'Der Club wollte ein Gebäude für die Saison, ohne lange Bauzeit und mit vorher bekanntem Budget.' },
    solution: { cs: 'Dva moduly Standard vedle sebe se společnou podlahou. V jednom je recepce, ve druhém šatna, WC a sprcha.', de: 'Zwei Standard-Module nebeneinander mit durchgehendem Boden. In einem Modul der Empfang, im zweiten Umkleide, WC und Dusche.' },
    result: { cs: 'Moduly jsme na místě spojili a utěsnili za dva dny. Přípojky dokončil elektrikář klubu.', de: 'Die Module wurden vor Ort in zwei Tagen verbunden und abgedichtet. Die Anschlüsse stellte der Elektriker des Clubs fertig.' },
  },
  {
    slug: 'prodejna-pardubice', title: { cs: 'Prodejna u hlavní silnice', de: 'Laden an der Hauptstraße' }, place: 'Pardubice',
    year: 2024, use: 'business', type: 'K', L: 6, W: 3, count: 1, days: 1, cover: cover(4), photos: extra(9, 53, 54), demo: true,
    lead: { cs: 'Malá prodejna s výlohou a skladem v jednom.', de: 'Ein kleiner Laden mit Schaufenster und Lager in einem.' },
    task: { cs: 'Klient chtěl začít prodávat rychle a bez nájmu v obchodním centru.', de: 'Der Kunde wollte schnell starten, ohne Miete im Einkaufszentrum.' },
    solution: { cs: 'Standard s výlohou v přední stěně a příčkou, která odděluje malý sklad.', de: 'Standard mit Schaufenster in der Frontwand und einer Trennwand für ein kleines Lager.' },
    result: { cs: 'Od objednávky po otevření uběhly necelé čtyři týdny.', de: 'Von der Bestellung bis zur Eröffnung vergingen knapp vier Wochen.' },
  },
  {
    slug: 'lesni-skolka', title: { cs: 'Lesní školka', de: 'Waldkindergarten' }, place: 'Brno',
    year: 2026, use: 'education', type: 'P', L: 9, W: 3, count: 1, days: 1, cover: cover(5), photos: extra(55, 60, 91), demo: true,
    lead: { cs: 'Teplé a suché zázemí pro děti, které tráví většinu dne venku.', de: 'Ein warmer, trockener Raum für Kinder, die den Großteil des Tages draußen verbringen.' },
    task: { cs: 'Školka potřebovala místo na převlékání, jídlo a odpolední spánek, a to na pozemku bez pevných základů.', de: 'Der Kindergarten brauchte einen Ort zum Umziehen, Essen und für den Mittagsschlaf, auf einem Grundstück ohne feste Fundamente.' },
    solution: { cs: 'Premium 3 × 9 m s velkými okny na jih, zateplenou podlahou a dřevěným obkladem. Stojí na zemních vrutech, které jdou později vyjmout.', de: 'Premium 3 × 9 m mit großen Südfenstern, gedämmtem Boden und Holzverkleidung. Er steht auf Erdschrauben, die sich später wieder entfernen lassen.' },
    result: { cs: 'Děti mají světlou místnost s výhledem do lesa a pozemek zůstal bez betonu.', de: 'Die Kinder haben einen hellen Raum mit Blick in den Wald, und das Grundstück blieb ohne Beton.' },
  },
  {
    slug: 'sklad-chvojno', title: { cs: 'Sklad u dílny', de: 'Lager neben der Werkstatt' }, place: 'Chvojno',
    year: 2024, use: 'storage', type: 'Y', L: 6, W: 3, count: 1, days: 1, cover: cover(6), photos: extra(19, 20, 13), demo: true,
    lead: { cs: 'Uzamykatelný sklad nářadí a materiálu vedle dílny.', de: 'Ein abschließbares Lager für Werkzeug und Material neben der Werkstatt.' },
    task: { cs: 'Firma potřebovala rychle suchý a uzamykatelný sklad, bez zdění.', de: 'Die Firma brauchte schnell ein trockenes, abschließbares Lager, ohne zu mauern.' },
    solution: { cs: 'Ekonom s dveřmi v čele a regály po obou stěnách, usazený na zhutněný štěrk a betonové patky.', de: 'Ekonom mit Tür an der Stirnseite und Regalen an beiden Wänden, aufgestellt auf verdichtetem Schotter und Betonpunktfundamenten.' },
    result: { cs: 'Sklad slouží i jako výdejna materiálu pro partu na stavbách.', de: 'Das Lager dient auch als Materialausgabe für das Team auf den Baustellen.' },
  },
  {
    slug: 'prodejna-mineralu', title: { cs: 'Prodejna minerálů a drahých kamenů', de: 'Laden für Mineralien und Edelsteine' }, place: 'Praha',
    year: 2026, use: 'business', type: 'P', L: 6, W: 3, count: 1, days: 1, cover: cover(7), photos: extra(14, 63, 64), demo: true,
    lead: { cs: 'Butik s vitrínami, kde vynikne světlo a barvy kamenů.', de: 'Eine Boutique mit Vitrinen, in der Licht und Farben der Steine zur Geltung kommen.' },
    task: { cs: 'Majitel chtěl prodejnu, která sama působí jako výloha, a dost světla na vitríny.', de: 'Der Inhaber wollte einen Laden, der selbst wie ein Schaufenster wirkt, mit viel Licht für die Vitrinen.' },
    solution: { cs: 'Premium s panoramatickým oknem v přední stěně, tmavým rámem a LED osvětlením pod stropem.', de: 'Premium mit Panoramafenster in der Frontwand, dunklem Rahmen und LED-Beleuchtung unter der Decke.' },
    result: { cs: 'Tvar kontejneru zaujme už z ulice a uvnitř zůstává dost místa na pult i vitríny.', de: 'Schon die Form fällt von der Straße auf, und innen bleibt genug Platz für Theke und Vitrinen.' },
  },
];
