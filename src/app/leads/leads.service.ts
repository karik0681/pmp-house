import { Injectable, computed, signal } from '@angular/core';
import { SETTINGS } from '../core/settings';
import { Lead, Note } from './lead';
import { seedLeads } from './seed';

const KEY = 'pmp-demo-leads';
type NewLead = Omit<Lead, 'id' | 'createdAt' | 'status' | 'notes' | 'next' | 'due'>;

/**
 * The enquiry list. Normally it lives on the server (/api/leads, shared by all staff).
 * With SETTINGS.demoCrm it is a demo kept in this browser (localStorage).
 */
@Injectable({ providedIn: 'root' })
export class LeadsService {
  readonly demo = SETTINGS.demoCrm;
  readonly leads = signal<Lead[]>(this.demo ? this.read() : []);
  /** false until the list has come from the server; true also after a failed load, with `failed` set */
  readonly loaded = signal(this.demo);
  readonly failed = signal(false);
  readonly today = new Date().toISOString().slice(0, 10);

  readonly active = computed(() => this.leads().filter(l => l.status < 4));
  readonly overdue = computed(() => this.leads().filter(l => l.status < 4 && l.due && l.due < this.today));
  readonly openValue = computed(() => this.leads().filter(l => l.status === 2 || l.status === 3).reduce((a, l) => a + (l.price || 0), 0));
  readonly sold = computed(() => this.leads().filter(l => l.status === 4));

  constructor() {
    /* demo: an enquiry sent from the website in another tab shows up here straight away */
    if (this.demo && typeof window !== 'undefined') addEventListener('storage', e => { if (e.key === KEY) this.leads.set(this.read()); });
  }

  /** Staff: fetches the list from the server. Returns false when the session has ended. */
  async load(): Promise<boolean> {
    if (this.demo) return true;
    try {
      const r = await fetch('/api/leads', { credentials: 'same-origin' });
      if (r.status === 401) return false;
      if (!r.ok) throw new Error(String(r.status));
      this.leads.set(await r.json());
      this.failed.set(false);
    } catch { this.failed.set(true); }
    this.loaded.set(true);
    return true;
  }

  /** A new enquiry from the website. Returns its number, or null when it could not be saved. */
  async add(data: NewLead, firstNote: string, next = ''): Promise<string | null> {
    if (this.demo) {
      const max = this.leads().reduce((m, l) => Math.max(m, +l.id.slice(2) || 0), 1000);
      const lead: Lead = { ...data, id: `P-${max + 1}`, createdAt: new Date().toISOString(), status: 0, next, due: this.today, notes: [{ at: new Date().toISOString(), text: firstNote }] };
      this.save([lead, ...this.leads()]);
      return lead.id;
    }
    try {
      const r = await fetch('/api/leads', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...data, firstNote, next }) });
      if (!r.ok) return null;
      return (await r.json()).id ?? null;
    } catch { return null; }
  }

  /** Changes fields and, optionally, adds a note, in one request so the two cannot overwrite each other. */
  update(id: string, patch: Partial<Lead>, note = '') {
    const n: Note[] = note ? [{ at: new Date().toISOString(), text: note }] : [];
    this.local(id, l => ({ ...l, ...patch, notes: [...n, ...l.notes] }));
    this.send(id, note ? { patch, note } : { patch });
  }
  addNote(id: string, text: string) {
    const note: Note = { at: new Date().toISOString(), text };
    this.local(id, l => ({ ...l, notes: [note, ...l.notes] }));
    this.send(id, { note: text });
  }
  /** Deletes an enquiry for good. Returns false when the server refused. */
  async remove(id: string): Promise<boolean> {
    if (!this.demo) {
      try { const r = await fetch(`/api/leads/${encodeURIComponent(id)}`, { method: 'DELETE' }); if (!r.ok) return false; }
      catch { return false; }
    }
    const list = this.leads().filter(l => l.id !== id);
    if (this.demo) this.save(list); else this.leads.set(list);
    return true;
  }
  /** Demo only: puts the sample enquiries back. */
  reset() { if (this.demo) this.save(seedLeads()); }

  private local(id: string, f: (l: Lead) => Lead) {
    const list = this.leads().map(l => (l.id === id ? f(l) : l));
    if (this.demo) this.save(list); else this.leads.set(list);
  }
  private async send(id: string, body: unknown) {
    if (this.demo) return;
    try {
      const r = await fetch(`/api/leads/${encodeURIComponent(id)}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      if (!r.ok) throw new Error(String(r.status));
      const fresh: Lead = await r.json();
      this.leads.update(list => list.map(l => (l.id === id ? fresh : l)));
    } catch { this.failed.set(true); }
  }
  private save(list: Lead[]) {
    this.leads.set(list);
    try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* storage full or blocked */ }
  }
  private read(): Lead[] {
    try { const s = localStorage.getItem(KEY); if (s) return JSON.parse(s); } catch { /* blocked */ }
    return seedLeads();
  }
}
