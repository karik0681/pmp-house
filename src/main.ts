import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { captureSource } from './app/core/source.service';

/* old links looked like /#/admin: send them to the same page at its new address */
if (location.hash.startsWith('#/')) history.replaceState(null, '', location.hash.slice(1));

/* read ?utm_source… before the router rewrites the address */
captureSource();

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
