import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18nService } from '../core/i18n.service';
import { TrackingService } from '../core/tracking.service';

/** Cookie banner. Both answers are equally easy; nothing is preselected. */
@Component({
  selector: 'app-consent',
  imports: [RouterLink],
  template: `
    @if (tr.bannerOpen()) {
      <section class="cc" role="dialog" aria-modal="false" aria-labelledby="cc-h">
        <div>
          <h2 id="cc-h">{{ t('ccH') }}</h2>
          <p>{{ t('ccP') }} <a routerLink="/ochrana-udaju">{{ t('ccMore') }}</a></p>
        </div>
        <div class="cc-b">
          <button type="button" class="btn btn-o" (click)="tr.set('denied')">{{ t('ccNo') }}</button>
          <button type="button" class="btn btn-o" (click)="tr.set('granted')">{{ t('ccYes') }}</button>
        </div>
      </section>
    }`,
})
export class ConsentComponent {
  readonly tr = inject(TrackingService);
  private i18n = inject(I18nService);
  t = (k: string) => this.i18n.t(k);
}
