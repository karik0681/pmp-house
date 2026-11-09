import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { captureSource } from './app/core/source.service';

/* read ?utm_source… before the router rewrites the address */
captureSource();

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
