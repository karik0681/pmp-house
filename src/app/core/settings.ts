import type { Lang } from './i18n';

/** Everything the friends may need to change lives here. */
export const SETTINGS = {
  /** Website languages. Only Czech for now; add 'de' and the CZ/DE switch comes back (German texts are kept). */
  languages: ['cs'] as Lang[],
  company: 'PMP House',
  legalName: 'POWER MACHINERY PARTS s.r.o.',
  /** The site's address, used for canonical links, the sitemap and sharing previews. */
  siteUrl: 'https://pmphouse.cz',
  /** Main switch for search engines. false while the texts are still samples; true opens the site to Google. */
  indexable: false,
  /** The showroom address in parts, for Google (schema.org). */
  postal: { streetAddress: 'Roztoky', addressLocality: 'Povrly', postalCode: '403 32' },
  mail: 'info@pmphouse.cz',
  whatsapp: '420771112113',
  phone: '+420 771 112 113',
  address: 'Roztoky, 403 32 Povrly',
  ico: '05185530',
  dic: 'CZ05185530',
  /** Branches, shown in the contact section, on the map and to Google. x/y = place on the map of Czechia (cz-map.ts).
   *  street '' = the exact address is not public yet: the card asks to arrange a visit by phone.
   *  google / firmy = the branch's profile on Google Maps and firmy.cz ('' = no profile yet, no button). */
  offices: [
    { id: 'usti', city: 'Ústí nad Labem', main: true, street: 'Roztoky', postal: '403 32', locality: 'Povrly',
      google: '', firmy: 'https://www.firmy.cz/detail/13420079-pmp-house-power-machinery-parts-s-r-o-povrly-roztoky.html', x: 308, y: 82 },
    { id: 'praha', city: 'Praha', main: false, street: '', postal: '', locality: 'Praha',
      google: '', firmy: '', x: 347, y: 218 },
    { id: 'brno', city: 'Brno', main: false, street: 'Hodějice 397', postal: '684 01', locality: 'Hodějice',
      google: 'https://maps.app.goo.gl/mhnTEz7M9jxyez2XA', firmy: 'https://www.firmy.cz/detail/13419644-pmp-house-power-machinery-parts-s-r-o-hodejice.html', x: 714, y: 434 },
  ],
  /** Opening hours, confirmed by the company. */
  hours: { cs: 'Po–Pá 8:00–16:00', de: 'Mo–Fr 8:00–16:00' },
  /** Profile links. An empty link shows a grey icon so the place is visible in the demo. */
  social: { facebook: '', instagram: '', tiktok: '', youtube: '' } as Record<string, string>,
  /** Access key from web3forms.com, tied to the e-mail that should receive enquiries.
   *  Empty: the enquiry is not e-mailed (in demo mode it is only stored in the demo CRM). */
  formKey: '',
  formEndpoint: 'https://api.web3forms.com/submit',
  /** Demo CRM: enquiries are stored only in this browser. Off: they go to the shared list on the server (/api/leads). */
  demoCrm: false,
};
