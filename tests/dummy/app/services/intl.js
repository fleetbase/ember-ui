import Service from '@ember/service';

/**
 * Stub of the host console's `intl` service. `t(key)` echoes the key back,
 * matching the dummy app's `t` helper (tests/dummy/app/helpers/t.js).
 */
export default class IntlService extends Service {
    calls = [];

    locales = ['en-us'];
    locale = ['en-us'];
    primaryLocale = 'en-us';

    _localeChangedCallbacks = [];

    t(key, options) {
        this.calls.push({ method: 't', args: [key, options] });
        return key;
    }

    exists(key) {
        this.calls.push({ method: 'exists', args: [key] });
        return true;
    }

    setLocale(locale) {
        this.calls.push({ method: 'setLocale', args: [locale] });
        this.primaryLocale = Array.isArray(locale) ? locale[0] : locale;
        this.locale = Array.isArray(locale) ? locale : [locale];
        for (const callback of [...this._localeChangedCallbacks]) {
            callback();
        }
    }

    onLocaleChanged(callback) {
        this._localeChangedCallbacks.push(callback);
        return callback;
    }
}
