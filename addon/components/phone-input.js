import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { debug } from '@ember/debug';
import intlTelInput from 'intl-tel-input';
import lookupUserIp from '@fleetbase/ember-core/utils/lookup-user-ip';

export default class PhoneInputComponent extends Component {
    @service fetch;
    @tracked iti;

    @action setupIntlTelInput(element) {
        this.iti = intlTelInput(element, {
            containerClass: `w-full ${this.args.wrapperClass ?? ''}`,
            initialCountry: 'auto',
            separateDialCode: true,
            formatAsYouType: true,
            geoIpLookup: async (success, failure) => {
                try {
                    const ipData = await lookupUserIp();
                    if (ipData && ipData.country_code) {
                        success(ipData.country_code);
                    } else {
                        throw new Error('No country code in IP lookup response');
                    }
                } catch (error) {
                    debug('Failed to lookup country code with frontend IP lookup:', error.message);
                    failure(error);
                }
            },
            utilsScript: '/assets/libphonenumber/utils.js',
        });

        if (typeof this.args.onInit === 'function') {
            this.args.onInit(this.iti);
        }

        element.addEventListener('countrychange', this.args.onCountryChange);
    }

    @action onInput() {
        const { onInput } = this.args;
        const number = this.iti.getNumber(intlTelInput.utils.numberFormat.E164);

        if (typeof onInput === 'function') {
            onInput(number, ...arguments);
        }
    }
}
