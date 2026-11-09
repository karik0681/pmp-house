import { Routes } from '@angular/router';
import { LayoutComponent } from './site/layout.component';
import { SiteComponent } from './site/site.component';
import { ReferencesComponent } from './references/references.component';
import { ReferenceDetailComponent } from './references/reference-detail.component';
import { MontageComponent } from './montage/montage.component';
import { PrivacyComponent } from './site/privacy.component';
import { LoginComponent } from './admin/login.component';
import { AdminComponent } from './admin/admin.component';
import { authGuard } from './admin/auth.service';

export const routes: Routes = [
  { path: 'admin/login', component: LoginComponent },
  { path: 'admin', component: AdminComponent, canActivate: [authGuard] },
  /* public pages share the header, the footer and the WhatsApp button */
  {
    path: '', component: LayoutComponent, children: [
      { path: '', component: SiteComponent },
      { path: 'reference', component: ReferencesComponent },
      { path: 'reference/:slug', component: ReferenceDetailComponent },
      { path: 'montaz', component: MontageComponent },
      { path: 'ochrana-udaju', component: PrivacyComponent },
    ],
  },
  { path: '**', redirectTo: '' },
];
