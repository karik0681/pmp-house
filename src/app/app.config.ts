import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withHashLocation } from '@angular/router';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    /* hash URLs (#/admin) work on any static hosting and even when the file is opened directly */
    provideRouter(routes, withHashLocation()),
  ],
};
