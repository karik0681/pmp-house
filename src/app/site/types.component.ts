import { Component, inject } from '@angular/core';
import { I18nService } from '../core/i18n.service';
import { money } from '../core/format';
import { scrollToId } from '../core/scroll';
import { ConfiguratorService } from '../configurator/configurator.service';
import { Kind, fromPrice } from '../configurator/model';

@Component({
  selector: 'app-types',
  template: `
    <section class="types" id="konstrukce"><div class="wrap">
      <h2>{{ t('typesH') }}</h2><p class="sub">{{ t('typesSub') }}</p>
      <div class="tgrid">
        @for (k of kinds; track k.k) {
          <div class="tc" [attr.data-col]="k.k">
            <h3>{{ t(k.k) }}</h3><p>{{ t(k.k + 'd') }}</p>
            <div class="tc-pic"><img [src]="'/hero/typ-' + k.k.toLowerCase() + '.webp'" width="760" height="508" loading="lazy" [alt]="t(k.k) + ': ' + t(k.k + 'pV')"></div>
            <dl>
              <div><dt>{{ t('tPosts') }}</dt><dd>{{ t(k.k + 'pV') }}</dd></div>
              <div><dt>{{ t('tHeight') }}</dt><dd>{{ k.height }} cm</dd></div>
              <div><dt>{{ t('tWalls') }}</dt><dd>{{ t(k.k + 'wV') }}</dd></div>
              <div><dt>{{ t('tRoof') }}</dt><dd>{{ t(k.k + 'rV') }}</dd></div>
              <div><dt>{{ t('tFloor') }}</dt><dd>{{ t(k.k + 'fV') }}</dd></div>
              <div><dt>{{ t('tStack') }}</dt><dd>{{ t(k.k + 'sV') }}</dd></div>
              <div><dt>{{ t('tFrom') }}</dt><dd><b>{{ t('from') }} {{ money(k.price) }}</b> {{ t('noVat') }}</dd></div>
            </dl>
            <button type="button" class="btn" [class.btn-g]="k.k === 'P'" [class.btn-o]="k.k !== 'P'" (click)="choose(k.k)">{{ t('pick') }} {{ t(k.k) }}</button>
          </div>
        }
      </div>
    </div></section>`,
})
export class TypesComponent {
  private i18n = inject(I18nService);
  private cfg = inject(ConfiguratorService);
  t = (k: string) => this.i18n.t(k);
  money = money;
  readonly kinds = (['Y', 'K', 'P'] as Kind[]).map(k => ({ k, height: { Y: '257 / 235', K: '264 / 240', P: '280 / 250' }[k], price: fromPrice(k) }));
  choose(k: Kind) { this.cfg.setType(k); this.cfg.go(0); scrollToId('konfigurator'); }
}
