import { Component, ElementRef, OnDestroy, afterNextRender, computed, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { Stage, layout } from '../three/stage';
import { I18nService } from '../core/i18n.service';
import { money, num, dim } from '../core/format';
import { STEPS, ConfiguratorService, View } from './configurator.service';
import { Kind, WallKey, blank, planSvg, sizesOf, summaryLines, Side } from './model';
import { EnquiryService, Result } from '../leads/enquiry.service';

const WALL_THETA: Record<WallKey, number> = { f: 0, b: Math.PI, l: -Math.PI / 2, r: Math.PI / 2 };
const SIDE = [.62, 1.38], TOP = [0, .3], SKEL = [-.5, 1.1];

@Component({
  selector: 'app-configurator',
  imports: [RouterLink],
  templateUrl: './configurator.component.html',
})
export class ConfiguratorComponent implements OnDestroy {
  readonly i18n = inject(I18nService);
  readonly s = inject(ConfiguratorService);
  private enquiry = inject(EnquiryService);
  private sanitizer = inject(DomSanitizer);

  private canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private tagBath = viewChild.required<ElementRef<HTMLElement>>('tagBath');
  private tagKitchen = viewChild.required<ElementRef<HTMLElement>>('tagKitchen');
  private panes = viewChild.required<ElementRef<HTMLElement>>('panes');
  private stage: any = null;
  readonly no3d = signal(false);

  readonly steps = STEPS;
  readonly tabs = STEPS.map((_, i) => i);
  readonly types: Kind[] = ['Y', 'K', 'P'];
  readonly walls: { k: WallKey; label: string }[] = [{ k: 'f', label: 'front' }, { k: 'b', label: 'rear' }, { k: 'l', label: 'left' }, { k: 'r', label: 'right' }];
  readonly wallSteps = [{ k: 'door', max: 3, move: true }, { k: 'win', max: 8, move: true }, { k: 'fr', max: 4, move: true }, { k: 'pano', max: 2, move: false }];
  readonly sides: Side[] = ['l', 'm', 'r'];
  readonly insulation = ['0', '1', '50', '80', '100'];

  readonly cfg = this.s.cfg;
  readonly sizes = computed(() => sizesOf(this.cfg().type).map(([L, W]) => ({ L, W, label: dim(L, W), area: num(+(L * W).toFixed(1)) })));
  readonly plan = computed(() => this.sanitizer.bypassSecurityTrustHtml(planSvg(this.cfg(), k => this.i18n.t(k))));
  readonly summary = computed(() => summaryLines(this.cfg(), k => this.i18n.t(k)));
  readonly dimText = computed(() => dim(this.cfg().L, this.cfg().W));
  readonly hasEntry = computed(() => Object.values(this.cfg().w).some(w => w.door + w.fr + (w.pano || 0) > 0));
  readonly panoBlocked = computed(() => {
    const c = this.cfg(), w = this.s.wall();
    return c.type !== 'P' && !c.w[w].pano && !layout({ ...c, w: { ...c.w, [w]: { ...blank(), pano: 1 } } })
      && !!layout({ ...c, type: 'P', posts: [], w: { ...c.w, [w]: { ...blank(), pano: 1 } } });
  });
  /** Panoramic window is only for front/rear walls; also blocked when the opposite wall already has a large opening. */
  readonly panoAddDisabled = computed(() => {
    const c = this.cfg(), w = this.s.wall();
    if (w === 'l' || w === 'r') return true;
    const opp = w === 'f' ? 'b' : 'f';
    if ((c.w[opp].pano || 0) > 0 || c.w[opp].fr > 0) return true;
    const o = c.w[w];
    return !layout({ ...c, w: { ...c.w, [w]: { ...o, door: 0, win: 0, pano: (o.pano || 0) + 1 } } });
  });
  /** Is the + button of this opening off? Adding French doors or a panoramic window replaces the plain doors and windows of the wall. */
  addDisabled(k: string, max: number) {
    if (k === 'pano') return this.wallVal(k) >= max || this.panoAddDisabled();
    if (k === 'door' || k === 'win') return this.s.bigOnWall() || this.wallVal(k) >= max || !this.s.fitsWall(k, this.wallVal(k) + 1);
    const c = this.cfg(), w = this.s.wall(), o = c.w[w];
    return this.wallVal(k) >= max || !layout({ ...c, w: { ...c.w, [w]: { ...o, door: 0, win: 0, fr: o.fr + 1 } } });
  }
  readonly anyBlocked = computed(() => {
    const c = this.cfg();
    return (['kitchen', 'wc', 'shower'] as const).some(k => !c[k] && !this.s.fits({ [k]: 1 }))
      || [1, 2, 3].some(r => !this.s.fits({ rooms: r }))
      || (!!(c.wc || c.shower) && (['l', 'm', 'r'] as const).some(p => !this.s.fits({ bathPos: p })));
  });

  /* form */
  readonly form = signal({ name: '', phone: '', email: '', place: '', note: '', gdpr: false, bot: false });
  readonly msg = signal<{ text: string; state: '' | 'ok' | 'err' }>({ text: '', state: '' });
  readonly sending = signal(false);
  readonly result = signal<Result | null>(null);

  constructor() {
    afterNextRender(() => {
      try {
        this.stage = new Stage(this.canvas().nativeElement, { interactive: true });
        this.stage.fitScale = 1.04;
        this.stage.tags = { bath: this.tagBath().nativeElement, kitchen: this.tagKitchen().nativeElement };
        this.stage.build(this.cfg());
        this.camera();
        (window as any).__stage = this.stage;
      } catch (e) { console.warn(e); this.no3d.set(true); }
    });
    /* rebuild the 3D model whenever the configuration changes */
    effect(() => { const c = this.cfg(); untracked(() => this.stage?.build(c)); });
    /* move the camera when the step, view or wall changes */
    effect(() => { this.s.step(); this.s.view(); this.s.wall(); untracked(() => this.camera()); });
  }

  ngOnDestroy() { this.stage?.destroy(); }

  t = (k: string) => this.i18n.t(k);
  money = money;
  pressed(v: boolean) { return v ? 'true' : 'false'; }

  private camera() {
    const st = this.stage; if (!st) return;
    const step = this.s.stepKey(), view = this.s.view(), inside = step === 'inside' && view !== 'skel', skel = view === 'skel';
    st.liftTo = inside ? 1 : 0; st.skelTo = skel ? 1 : 0;
    st.fitScale = inside ? 1 : 1.04; st.fit();
    if (skel) st.look(...SKEL); else if (inside) st.look(...TOP); else if (step === 'walls') st.look(WALL_THETA[this.s.wall()], 1.36); else st.look(...SIDE);
  }

  go(i: number) { this.s.go(i); this.panes().nativeElement.scrollTop = 0; }
  setView(v: View) { this.s.view.set(v); }
  pickSize(L: number, W: number) { this.s.setSize(L, W); }
  isOn(k: string) { return !!(this.cfg() as any)[k]; }
  canAdd(k: string) { return this.s.fits({ [k]: 1 } as any); }
  canBath(p: string) { return this.s.fits({ bathPos: p } as any); }
  posOf(k: string) { return (this.cfg().w[this.s.wall()].pos as any)?.[k] ?? null; }
  wallVal(k: string) { return (this.cfg().w[this.s.wall()] as any)[k] || 0; }
  wallCount(k: WallKey) { const w = this.cfg().w[k]; return w.door + w.win + (w.win3 || 0) + w.fr + (w.pano || 0) || ''; }
  maxFloors() { return this.cfg().type === 'P' ? 2 : 1; }

  /* form */
  field(k: 'name' | 'phone' | 'email' | 'place' | 'note', v: string) { this.form.update(f => ({ ...f, [k]: v })); }
  check(k: 'gdpr' | 'bot', v: boolean) { this.form.update(f => ({ ...f, [k]: v })); }
  private valid() {
    const f = this.form(), ok = !!(f.name.trim() && f.phone.trim() && /.+@.+\..+/.test(f.email) && f.gdpr);
    this.msg.set(ok ? { text: '', state: '' } : { text: this.t('formErr'), state: 'err' });
    return ok;
  }
  private contact() { const f = this.form(); return { name: f.name.trim(), phone: f.phone.trim(), email: f.email.trim(), place: f.place.trim(), note: f.note.trim() }; }
  async submit(e: Event) {
    e.preventDefault();
    if (this.form().bot || !this.valid()) return;
    this.sending.set(true); this.msg.set({ text: this.t('sending'), state: '' });
    const r = await this.enquiry.send(this.cfg(), this.contact());
    this.sending.set(false); this.result.set(r);
    const text = { sent: 'sent', sentDemo: 'sentDemo', mailto: 'formOk', failed: 'sendFail' }[r];
    this.msg.set({ text: this.t(text), state: r === 'failed' ? 'err' : 'ok' });
    if (r === 'sent' || r === 'sentDemo') this.form.set({ name: '', phone: '', email: '', place: '', note: '', gdpr: false, bot: false });
  }
  whatsapp() { if (this.valid()) this.enquiry.whatsapp(this.cfg(), this.contact()); }
}
