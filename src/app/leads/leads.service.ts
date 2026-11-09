import { Injectable, computed, signal } from '@angular/core';
import { Lead, Note } from './lead';
import { seedLeads } from './seed';

const KEY = 'pmp-demo-leads';

/**
 * Demo storage: enquiries live in this browser (localStorage).
 * For the real CRM only this class changes, to HTTP calls to the server; components stay the same.
 */
@Injectable({ providedIn: 'root' })
export class LeadsService {
  readonly leads = signal<Lead[]>(this.read());
  readonly today = new Date().toISOString().slice(0, 10);

  readonly active = computed(() => this.leads().filter(l => l.status < 4));
  readonly overdue = computed(() => this.leads().filter(l => l.status < 4 && l.due && l.due < this.today));
  readonly openValue = computed(() => this.leads().filter(l => l.status === 2 || l.status === 3).reduce((a, l) => a + (l.price || 0), 0));
  readonly sold = computed(() => this.leads().filter(l => l.status === 4));

  constructor() {
    /* an enquiry sent from the website in another tab shows up here straight away */
    addEventListener('storage', e => { if (e.key === KEY) this.leads.set(this.read()); });
  }

  add(data: Omit<Lead, 'id' | 'createdAt' | 'status' | 'notes' | 'next' | 'due'>, firstNote: string, next = ''): Lead {
    const max = this.leads().reduce((m, l) => Math.max(m, +l.id.slice(2) || 0), 1000);
    const lead: Lead = { ...data, id: `P-${max + 1}`, createdAt: new Date().toISOString(), status: 0, next, due: this.today, notes: [{ at: new Date().toISOString(), text: firstNote }] };
    this.save([lead, ...this.leads()]);
    return lead;
  }
  update(id: string, patch: Partial<Lead>) { this.save(this.leads().map(l => (l.id === id ? { ...l, ...patch } : l))); }
  addNote(id: string, text: string) {
    const note: Note = { at: new Date().toISOString(), text };
    this.save(this.leads().map(l => (l.id === id ? { ...l, notes: [note, ...l.notes] } : l)));
  }
  reset() { this.save(seedLeads()); }

  private save(list: Lead[]) {
    this.leads.set(list);
    try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* storage full or blocked */ }
  }
  private read(): Lead[] {
    try { const s = localStorage.getItem(KEY); if (s) return JSON.parse(s); } catch { /* blocked */ }
    return seedLeads();
  }
}
