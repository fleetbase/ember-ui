import Service from '@ember/service';

/**
 * Stub of the host console's `language` service. Provides one fixed locale entry and a
 * pseudo `loadAvailableCountries` task (used via `.isRunning` in locale-selector-tray.hbs).
 */
export default class LanguageService extends Service {
    availableLocales = {
        'en-us': { emoji: '', language: 'English', country: 'United States' },
    };

    loadAvailableCountries = {
        isRunning: false,
        isIdle: true,
        perform: () => Promise.resolve(this.availableLocales),
    };
}
