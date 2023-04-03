import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action, get } from '@ember/object';

export default class CountryNameComponent extends Component {
    @service fetch;
    @tracked countryName;

    constructor(owner, { country }) {
        super(...arguments);

        this.countryName = country;

        if (typeof country === 'string' && country.length === 2) {
            this.lookupCountryName(country);
        }
    }

    @action async lookupCountryName(country) {
        const lookupResponse = await this.fetch.cachedGet(`lookup/country/${country}`);
        const countryName = lookupResponse.name;

        this.countryName = countryName;

        return countryName;
    }
}
