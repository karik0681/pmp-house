import { Injectable, signal } from '@angular/core';
import { SETTINGS } from './settings';

type Choice = 'granted' | 'denied';
/** what a visitor did that counts as a result for the advertising */
export type Goal = 'lead' | 'chat' | 'whatsapp' | 'phone';
const KEY = 'pmp-consent';
declare global { interface Window { dataLayer: unknown[]; gtag: (...a: unknown[]) => void } }

/**
 * Google tag (Google Ads, optionally Google Analytics 4) with Consent Mode v2.
 * Nothing loads while SETTINGS.google.ads and .ga4 are empty, and no banner shows.
 * Until the visitor agrees, Google gets only cookieless signals (no cookies, no personal data).
 * Results counted: enquiry form, chat contact, a WhatsApp click, a phone click.
 */
@Injectable({ providedIn: 'root' })
export class TrackingService {
  readonly enabled = !!(SETTINGS.google.ads || SETTINGS.google.ga4);
  readonly choice = signal<Choice | null>(null);
  readonly bannerOpen = signal(false);
  private started = false;

  /** called once in the browser by the page frame */
  start() {
    if (this.started || typeof window === 'undefined' || !this.enabled) return;
    this.started = true;
    let saved: Choice | null = null;
    try { const v = localStorage.getItem(KEY); if (v === 'granted' || v === 'denied') saved = v; } catch { /* storage blocked */ }
    this.choice.set(saved);
    this.bannerOpen.set(!saved);

    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    const v = saved ?? 'denied';
    window.gtag('consent', 'default', { ad_storage: v, ad_user_data: v, ad_personalization: v, analytics_storage: v, wait_for_update: 500 });
    window.gtag('set', 'ads_data_redaction', v === 'denied');
    window.gtag('js', new Date());
    if (SETTINGS.google.ads) window.gtag('config', SETTINGS.google.ads);
    if (SETTINGS.google.ga4) window.gtag('config', SETTINGS.google.ga4);
    const s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + (SETTINGS.google.ads || SETTINGS.google.ga4);
    document.head.appendChild(s);

    /* WhatsApp and phone links anywhere on the site count without touching each button */
    document.addEventListener('click', e => {
      const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!a) return;
      if (a.href.startsWith('https://wa.me/')) this.goal('whatsapp');
      else if (a.href.startsWith('tel:')) this.goal('phone');
    }, true);
  }

  /** the visitor's answer in the cookie banner */
  set(v: Choice) {
    this.choice.set(v);
    this.bannerOpen.set(false);
    try { localStorage.setItem(KEY, v); } catch { /* storage blocked: asks again next visit */ }
    if (!this.started) return;
    window.gtag('consent', 'update', { ad_storage: v, ad_user_data: v, ad_personalization: v, analytics_storage: v });
    window.gtag('set', 'ads_data_redaction', v === 'denied');
  }

  /** reports a result: a GA4 event and, when its label is set, a Google Ads conversion */
  goal(g: Goal) {
    if (!this.started) return;
    window.gtag('event', g === 'lead' || g === 'chat' ? 'generate_lead' : g + '_click', { method: g });
    const label = SETTINGS.google.labels[g];
    if (SETTINGS.google.ads && label) window.gtag('event', 'conversion', { send_to: `${SETTINGS.google.ads}/${label}` });
  }
}
