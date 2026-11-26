import { Component, computed, inject, output, signal } from '@angular/core';
import { I18nService } from '../core/i18n.service';

interface Msg { role: 'user' | 'assistant'; content: string; at: string }
interface Chat { id: string; createdAt: string; updatedAt: string; page: string; lead: string | null; msgs: Msg[] }

/** Conversations from the chat window on the website, also those where the visitor left no contact. */
@Component({
  selector: 'app-chats',
  template: `
    <section class="chats">
      <h2>{{ t('ch_h') }}</h2>
      <p class="note">{{ t('ch_sub') }}</p>
      @if (failed()) { <p class="note warn" role="alert">{{ t('adm_fail') }}</p> }
      <label class="ch-only"><input type="checkbox" [checked]="noLead()" (change)="noLead.set($any($event.target).checked)"> {{ t('ch_noLead') }}</label>
      <div class="ch-wrap">
        <ul class="ch-list">
          @for (c of shown(); track c.id) {
            <li><button type="button" [class.on]="c.id === picked()" (click)="picked.set(c.id)">
              <span class="ch-when">{{ when(c.updatedAt) }} · {{ c.msgs.length }} {{ t('ch_msgs') }}</span>
              <span class="ch-first">{{ first(c) }}</span>
              @if (c.lead) { <span class="ch-lead">{{ t('ch_isLead') }} {{ c.lead }}</span> }
            </button></li>
          } @empty { <li class="mute">{{ t(loaded() ? 'ch_empty' : 'ch_loading') }}</li> }
        </ul>
        @if (chat(); as c) {
          <article class="ch-talk">
            <header>
              <span class="mute">{{ when(c.createdAt) }} · {{ c.page || '/' }}</span>
              @if (c.lead) { <button type="button" class="adm-link" (click)="openLead.emit(c.lead)">{{ t('ch_openLead') }} {{ c.lead }}</button> }
              <button type="button" class="adm-link" (click)="remove(c)">{{ t('ch_delete') }}</button>
            </header>
            <div class="ch-log">
              @for (m of c.msgs; track $index) {
                <p class="chat-m" [class.is-u]="m.role === 'user'" [class.is-a]="m.role !== 'user'">{{ m.content || t('ch_noAnswer') }}</p>
              }
            </div>
          </article>
        } @else { <p class="mute ch-talk">{{ t('ch_pick') }}</p> }
      </div>
    </section>`,
})
export class ChatsComponent {
  private i18n = inject(I18nService);
  readonly openLead = output<string>();
  readonly chats = signal<Chat[]>([]);
  readonly loaded = signal(false);
  readonly failed = signal(false);
  readonly picked = signal<string | null>(null);
  readonly noLead = signal(false);
  readonly shown = computed(() => (this.noLead() ? this.chats().filter(c => !c.lead) : this.chats()));
  readonly chat = computed(() => this.chats().find(c => c.id === this.picked()) ?? null);

  constructor() { this.load(); }
  t = (k: string) => this.i18n.t(k);

  async load() {
    try {
      const r = await fetch('/api/chats', { credentials: 'same-origin' });
      if (!r.ok) throw new Error(String(r.status));
      this.chats.set(await r.json());
      this.failed.set(false);
    } catch { this.failed.set(true); }
    this.loaded.set(true);
  }
  first(c: Chat) { const q = c.msgs.find(m => m.role === 'user')?.content || ''; return q.length > 90 ? q.slice(0, 90) + '…' : q; }
  when(iso: string) {
    return new Intl.DateTimeFormat('cs-CZ', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
  }
  async remove(c: Chat) {
    if (!confirm(this.t('ch_deleteAsk'))) return;
    const r = await fetch('/api/chats/' + encodeURIComponent(c.id), { method: 'DELETE', credentials: 'same-origin' }).catch(() => null);
    if (!r?.ok) { this.failed.set(true); return; }
    this.chats.update(list => list.filter(x => x.id !== c.id));
    this.picked.set(null);
  }
}
