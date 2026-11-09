import type { Lang } from './i18n';

/** Everything the friends may need to change lives here. */
export const SETTINGS = {
  /** Website languages. Only Czech for now; add 'de' and the CZ/DE switch comes back (German texts are kept). */
  languages: ['cs'] as Lang[],
  company: 'PMP House',
  mail: 'info@pmphouse.cz',
  whatsapp: '420771112113',
  phone: '+420 771 112 113',
  address: 'Roztoky, 403 32 Povrly',
  ico: '05185530',
  dic: 'CZ05185530',
  /** DEMO: opening hours to confirm with the company. */
  hours: { cs: 'Po–Pá 8:00–17:00', de: 'Mo–Fr 8:00–17:00' },
  /** Profile links. An empty link shows a grey icon so the place is visible in the demo. */
  social: { facebook: '', instagram: '', tiktok: '', youtube: '' } as Record<string, string>,
  /** Access key from web3forms.com, tied to the e-mail that should receive enquiries.
   *  Empty: the enquiry is not e-mailed (in demo mode it is only stored in the demo CRM). */
  formKey: '',
  formEndpoint: 'https://api.web3forms.com/submit',
  /** Demo CRM: enquiries are stored in this browser and shown in /admin. Turn off for the plain website. */
  demoCrm: true,
};
