import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import intlTelInput from 'intl-tel-input';

export default class PhoneInputComponent extends Component {
    @service fetch;
    @tracked iti;

    @action setupIntlTelInput(element) {
        this.iti = intlTelInput(element, {
            customContainer: `w-full ${this.args.wrapperClass ?? ''}`,
            initialCountry: 'auto',
            geoIpLookup: (success) => {
                this.fetch.get('lookup/whois').then((response) => {
                    success(response.country_code);
                });
            },
            utilsScript: '/assets/libphonenumber/utils.js',
        });
    }

    @action onInput() {
        const { onInput } = this.args;
        const number = this.iti.getNumber();

        if (typeof onInput === 'function') {
            onInput(number, ...arguments);
        }
    }
}
