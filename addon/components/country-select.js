import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { task } from 'ember-concurrency';

export default class CountrySelectComponent extends Component {
    @service fetch;
    @tracked countries = [];
    @tracked selected;
    /* istanbul ignore next -- the constructor assigns this before anything reads it */
    @tracked disabled = false;
    @tracked value;

    get renderInPlace() {
        return this.args.renderInPlace ?? true;
    }

    constructor(owner, { value = null, disabled = false }) {
        super(...arguments);
        this.disabled = disabled;
        this.value = value;
        this.fetchCountries.perform(value);
    }

    /* istanbul ignore next -- the constructor is the only caller and always passes `value`. */
    @task *fetchCountries(value = null) {
        try {
            this.countries = yield this.fetch.get(
                'lookup/countries',
                { columns: ['name', 'cca2', 'flag', 'emoji'] },
                { fromCache: true, expirationInterval: 1, expirationIntervalUnit: 'week' }
            );
            this.selected = this.findCountry(value);
        } catch (error) {
            this.countries = [];
        }
    }

    @action handleChange(el, [value]) {
        this.selected = this.findCountry(value);
    }

    @action selectCountry(country) {
        const { onChange } = this.args;
        this.selected = country;

        // Report a cleared selection too — `@allowClear` calls straight through to here with
        // null, and consumers otherwise keep their previous country applied.
        if (typeof onChange === 'function') {
            onChange(country?.cca2 ?? null, country ?? null);
        }
    }

    findCountry(iso2) {
        if (typeof iso2 === 'string') {
            return this.countries.find((country) => country.cca2 === iso2.toUpperCase());
        }

        return null;
    }
}
