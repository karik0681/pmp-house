/* Own line drawings for the installation page (no photos needed). */
const G = '#17392c', MINT = '#dce9e1', POST = '#c8742a', W = '#ffffff', SOIL = '#c9d8cf', CON = '#b8b3a8';

const wrap = (vb: string, body: string) =>
  `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" role="presentation" fill="none" stroke-linejoin="round" stroke-linecap="round">${body}</svg>`;
const ground = (y = 168, w = 320) =>
  `<rect x="0" y="${y}" width="${w}" height="${200 - y}" fill="${SOIL}" stroke="none"/><path d="M0 ${y}H${w}" stroke="${G}" stroke-width="2"/>`;
/** container seen from the long side */
const box = (x: number, y: number, w = 160, h = 62) => `
  <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${W}" stroke="${G}" stroke-width="5"/>
  <rect x="${x + w * .12}" y="${y + h * .26}" width="${w * .22}" height="${h * .4}" fill="${MINT}" stroke="${G}" stroke-width="2"/>
  <rect x="${x + w * .58}" y="${y + h * .16}" width="${w * .15}" height="${h * .84 - 2.5}" fill="${W}" stroke="${G}" stroke-width="2"/>
  <circle cx="${x + w * .7}" cy="${y + h * .6}" r="1.6" fill="${G}" stroke="none"/>`;
const pads = (xs: number[], y = 160) => xs.map(x => `<rect x="${x}" y="${y}" width="18" height="12" fill="${CON}" stroke="${G}" stroke-width="2"/>`).join('');

export const STEP_ART = [
  /* 1 consultation: laptop with the configurator and a chat bubble */
  wrap('0 0 320 200', `
    <rect x="58" y="40" width="160" height="104" rx="6" fill="${W}" stroke="${G}" stroke-width="4"/>
    <path d="M40 152h196l-12 12H52z" fill="${MINT}" stroke="${G}" stroke-width="4"/>
    <path d="M86 116l28-14h70l-28 14z" fill="${MINT}" stroke="${G}" stroke-width="2"/>
    <path d="M86 116v-34l28-14v34M156 116v-34l28-14v34M86 82h70l28-14M114 68h70" stroke="${G}" stroke-width="2.5"/>
    <path d="M120 82v34M143 82v34" stroke="${POST}" stroke-width="3"/>
    <path d="M232 34h56a8 8 0 0 1 8 8v30a8 8 0 0 1-8 8h-34l-16 12v-12h-6a8 8 0 0 1-8-8V42a8 8 0 0 1 8-8z" fill="${POST}" stroke="${G}" stroke-width="3"/>
    <circle cx="246" cy="57" r="3.5" fill="${W}" stroke="none"/><circle cx="260" cy="57" r="3.5" fill="${W}" stroke="none"/><circle cx="274" cy="57" r="3.5" fill="${W}" stroke="none"/>`),
  /* 2 foundations: pads in the ground, the future container dashed, a spirit level */
  wrap('0 0 320 200', `
    ${ground()}
    <rect x="62" y="86" width="196" height="66" stroke="${G}" stroke-width="2.5" stroke-dasharray="7 7"/>
    ${pads([58, 151, 244])}
    <rect x="118" y="136" width="84" height="14" rx="3" fill="${MINT}" stroke="${G}" stroke-width="3"/>
    <rect x="152" y="139" width="16" height="8" rx="4" fill="${W}" stroke="${G}" stroke-width="2"/>
    <path d="M160 139v8" stroke="${POST}" stroke-width="2"/>
    <path d="M58 182h204" stroke="${G}" stroke-width="1.5" stroke-dasharray="3 5"/>`),
  /* 3 production: the steel skeleton with posts and a check mark */
  wrap('0 0 320 200', `
    ${ground(176)}
    <path d="M60 60l40-24h170l-40 24zM60 60v108h170V60M230 168l40-24V36M100 36v20" stroke="${G}" stroke-width="5"/>
    <path d="M117 60v108M173 60v108" stroke="${POST}" stroke-width="5"/>
    <path d="M60 150h170" stroke="${G}" stroke-width="3"/>
    <circle cx="262" cy="98" r="24" fill="${POST}" stroke="${G}" stroke-width="3"/>
    <path d="M251 98l8 8 14-16" stroke="${W}" stroke-width="4.5"/>`),
  /* 4 transport: truck with the container on the trailer */
  wrap('0 0 320 200', `
    ${ground(172)}
    <path d="M10 120h22M4 136h28M14 104h18" stroke="${G}" stroke-width="2.5"/>
    ${box(44, 72, 172, 66)}
    <rect x="40" y="138" width="190" height="12" fill="${G}" stroke="${G}" stroke-width="2"/>
    <path d="M230 150V108h34l20 22v20z" fill="${MINT}" stroke="${G}" stroke-width="4"/>
    <path d="M244 116h18l12 14h-30z" fill="${W}" stroke="${G}" stroke-width="2.5"/>
    <path d="M232 104l-6-30" stroke="${POST}" stroke-width="5"/>
    <circle cx="78" cy="158" r="12" fill="${W}" stroke="${G}" stroke-width="4"/><circle cx="108" cy="158" r="12" fill="${W}" stroke="${G}" stroke-width="4"/>
    <circle cx="262" cy="158" r="12" fill="${W}" stroke="${G}" stroke-width="4"/>`),
  /* 5 crane: the arm lowers the container onto the pads */
  wrap('0 0 320 200', `
    ${ground()}
    ${pads([46, 116, 186])}
    <path d="M290 160l-14-120-120 4" stroke="${POST}" stroke-width="7"/>
    <path d="M276 40l14 120" stroke="${G}" stroke-width="2"/>
    <rect x="262" y="140" width="50" height="22" fill="${MINT}" stroke="${G}" stroke-width="3"/>
    <path d="M156 44v14M156 58L54 84M156 58l54 26" stroke="${G}" stroke-width="2"/>
    ${box(46, 84, 164, 54)}
    <path d="M128 146v10M122 150l6 7 6-7" stroke="${G}" stroke-width="2.5"/>`),
  /* 6 connection and handover: finished home, cables into the ground, a key */
  wrap('0 0 320 200', `
    ${ground()}
    ${pads([46, 120, 194])}
    ${box(42, 96, 170, 64)}
    <path d="M60 160v26h-40" stroke="${POST}" stroke-width="3" stroke-dasharray="6 5"/>
    <path d="M190 160v24h50" stroke="${G}" stroke-width="3" stroke-dasharray="6 5"/>
    <path d="M232 168c0-14 4-24 12-30M244 138c6 2 8 8 6 14-8-1-10-6-6-14zM236 150c-6-2-10 0-12 6 6 2 10 0 12-6z" stroke="${G}" stroke-width="2.5" fill="${MINT}"/>
    <circle cx="266" cy="58" r="16" fill="${POST}" stroke="${G}" stroke-width="3"/><circle cx="266" cy="58" r="5" fill="${W}" stroke="${G}" stroke-width="2"/>
    <path d="M254 70l-26 26M236 88l6 6M242 82l5 5" stroke="${G}" stroke-width="4"/>`),
];

const beam = `<rect x="30" y="58" width="180" height="14" fill="${W}" stroke="${G}" stroke-width="4"/>`;
const soil = `<rect x="0" y="80" width="240" height="60" fill="${SOIL}" stroke="none"/><path d="M0 80H240" stroke="${G}" stroke-width="2"/>`;

export const FOUNDATION_ART: Record<string, string> = {
  pads: wrap('0 0 240 140', `${soil}${beam}
    <rect x="28" y="72" width="22" height="34" fill="${CON}" stroke="${G}" stroke-width="2.5"/>
    <rect x="109" y="72" width="22" height="34" fill="${CON}" stroke="${G}" stroke-width="2.5"/>
    <rect x="190" y="72" width="22" height="34" fill="${CON}" stroke="${G}" stroke-width="2.5"/>
    <path d="M58 76h42M140 76h42" stroke="${G}" stroke-width="1.5" stroke-dasharray="3 4"/>`),
  strips: wrap('0 0 240 140', `${soil}${beam}
    <rect x="26" y="72" width="188" height="46" fill="${CON}" stroke="${G}" stroke-width="2.5"/>
    <path d="M26 118h188" stroke="${G}" stroke-width="2.5"/>
    <path d="M226 80v38M222 114l4 5 4-5" stroke="${POST}" stroke-width="2"/>`),
  slab: wrap('0 0 240 140', `${soil}
    <rect x="10" y="88" width="220" height="12" fill="${MINT}" stroke="${G}" stroke-width="1.5" stroke-dasharray="2 3"/>
    <rect x="10" y="72" width="220" height="16" fill="${CON}" stroke="${G}" stroke-width="2.5"/>
    <rect x="30" y="56" width="180" height="14" fill="${W}" stroke="${G}" stroke-width="4"/>`),
  screws: wrap('0 0 240 140', `${soil}${beam}
    ${[38, 120, 202].map(x => `<rect x="${x - 10}" y="72" width="20" height="5" fill="${G}" stroke="none"/>
      <path d="M${x} 77v52" stroke="${G}" stroke-width="4"/>
      <path d="M${x - 7} 92l14 5M${x - 7} 102l14 5M${x - 7} 112l14 5M${x - 6} 122l12 4" stroke="${POST}" stroke-width="2.5"/>`).join('')}`),
};
