/* E-mail from the site: the enquiry notices (crm.ts) and the login codes (staff.ts).
   Sent through Cloudflare (the "send_email" binding MAILER). On the free plan it reaches only addresses
   verified in Email Routing → Destination addresses, so every staff mailbox is confirmed there once. */

export interface Mailer { send(message: unknown): Promise<void> }

export const SENDER = 'poptavky@pmphouse.cz';

/** A plain-text e-mail. "Reply" in the mail program answers replyTo (the customer) when it is given. */
export function mime(to: string, subject: string, text: string, replyTo = '') {
  const b64 = (s: string) => btoa(unescape(encodeURIComponent(s)));
  const body = b64(text).replace(/.{76}/g, '$&\r\n');
  return [
    `From: "PMP House web" <${SENDER}>`, `To: ${to}`,
    ...(/^[^\s@<>]+@[^\s@<>]+$/.test(replyTo) ? [`Reply-To: ${replyTo}`] : []),
    `Subject: =?UTF-8?B?${b64(subject)}?=`, `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${crypto.randomUUID()}@pmphouse.cz>`, 'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: base64', '', body,
  ].join('\r\n');
}

export async function sendMail(mailer: Mailer, to: string, subject: string, text: string, replyTo = '') {
  // @ts-ignore: provided by the Cloudflare runtime
  const { EmailMessage } = await import('cloudflare:email');
  await mailer.send(new EmailMessage(SENDER, to, mime(to, subject, text, replyTo)));
}
