import { fresh } from '../configurator/model';
import { Lead } from './lead';

/** Fictional enquiries so the demo board is never empty. */
export function seedLeads(): Lead[] {
  const day = (d: number) => { const x = new Date(); x.setDate(x.getDate() + d); return x.toISOString().slice(0, 10); };
  const at = (d: number, h: number) => { const x = new Date(); x.setDate(x.getDate() + d); x.setHours(h, 12, 0, 0); return x.toISOString(); };
  const p1 = fresh('P', 6, 3); p1.kitchen = 1; p1.color = 'wood';
  const k2 = fresh('K', 6, 2.4);
  const k3 = fresh('K', 6, 3); k3.count = 2;
  const p4 = fresh('P', 9, 3); p4.wc = 1; p4.shower = 1; p4.rooms = 2;
  const y5 = fresh('Y', 6, 3);
  const k6 = fresh('K', 6, 3);
  const base = { email: '', place: '', clientNote: '', demo: true };
  return [
    { ...base, id: 'P-1042', createdAt: at(0, 9), name: 'Jan Novák', phone: '+420 777 000 001', place: 'Brno', cfg: p1, price: 130000, source: 'google · premium-kontejner', status: 0, next: 'Zavolat', due: day(0), notes: [] },
    { ...base, id: 'P-1041', createdAt: at(-1, 16), name: 'Eva Svobodová', phone: '+420 777 000 002', place: 'Plzeň', cfg: k2, price: 99000, source: 'facebook · zahradni-domek', status: 0, next: 'Zavolat znovu', due: day(-1), notes: [{ at: at(-1, 17), text: 'Nezvedla telefon, poslána SMS.' }] },
    { ...base, id: 'P-1039', createdAt: at(-4, 11), name: 'Stavmont s.r.o.', phone: '+420 777 000 003', place: 'Praha', cfg: k3, price: 220000, source: 'Doporučení', status: 1, next: 'Ověřit příjezd pro jeřáb', due: day(2), notes: [{ at: at(-3, 10), text: 'Chtějí 2 moduly vedle sebe.' }] },
    { ...base, id: 'P-1036', createdAt: at(-6, 14), name: 'Petr Dvořák', phone: '+420 777 000 004', place: 'Ostrava', cfg: p4, price: 200000, source: 'google · modulární-dům', status: 2, next: 'Připomenout nabídku', due: day(1), notes: [{ at: at(-5, 9), text: 'Nabídka odeslána e-mailem.' }] },
    { ...base, id: 'P-1033', createdAt: at(-10, 10), name: 'Marie Králová', phone: '+420 777 000 005', place: 'Tábor', cfg: y5, price: 110000, source: 'Web', status: 3, next: 'Potvrdit termín dodání', due: day(3), notes: [{ at: at(-7, 15), text: 'Záloha přijata.' }] },
    { ...base, id: 'P-1028', createdAt: at(-20, 13), name: 'Farma Holub', phone: '+420 777 000 006', place: 'Čáslav', cfg: k6, price: 110000, source: 'facebook · zahradni-domek', status: 4, next: 'Požádat o recenzi', due: '', notes: [{ at: at(-12, 12), text: 'Kontejner dodán a usazen.' }] },
  ];
}
