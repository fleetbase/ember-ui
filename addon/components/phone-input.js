import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { debug } from '@ember/debug';
import { registerDestructor } from '@ember/destroyable';
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
            geoIpLookup: async (success) => {
                try {
                    const ipData = await lookupUserIp();
                    /* istanbul ignore else -- intl-tel-input resolves the auto-country once per
                       page and caches it, so geoIpLookup runs at most once in a whole test run;
                       the tests stub fetch to answer it with a country */
                    if (ipData && ipData.country_code) {
                        success(ipData.country_code);
                    } else {
                        // Fallback to US if no country code in response
                        debug('No country code in IP lookup response, defaulting to US');
                        success('us');
                    }
                } catch (error) {
                    // Always succeed with US fallback on error
                    /* istanbul ignore next -- see above: there is only one lookup per run, and
                       the tests answer it successfully */
                    debug('Failed to lookup country code, defaulting to US: ' + error.message);
                    /* istanbul ignore next -- see above */
                    success('us');
                }
            },
            utilsScript: '/assets/libphonenumber/utils.js',
        });

        if (typeof this.args.onInit === 'function') {
            this.args.onInit(this.iti);
        }

        element.addEventListener('countrychange', this.args.onCountryChange);

        // intl-tel-input re-parents the <input> into its own `.iti` wrapper. Without an
        // explicit destroy, Glimmer looks for the input where it originally put it and
        // teardown throws `NotFoundError: Failed to execute 'removeChild' on 'Node'`.
        registerDestructor(this, () => {
            element.removeEventListener('countrychange', this.args.onCountryChange);
            this.iti?.destroy();
        });
    }

    @action onInput() {
        const { onInput } = this.args;
        const number = this.iti.getNumber(intlTelInput.utils.numberFormat.E164);

        if (typeof onInput === 'function') {
            onInput(number, ...arguments);
        }
    }
}
