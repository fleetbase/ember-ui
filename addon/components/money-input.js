import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { isNone } from '@ember/utils';
import numbersOnly from '../utils/numbers-only';
import getCurrency from '../utils/get-currency';
import AutoNumeric from 'autonumeric';

export default class MoneyInputComponent extends Component {
    @service fetch;
    @service currentUser;
    @tracked currency;
    @tracked currencyData;
    @tracked autonumeric;

    constructor() {
        super(...arguments);

        let whois = this.currentUser.getOption('whois');

        this.currency = this.args.currency ?? whois?.currency?.code ?? 'USD';
        this.currencyData = getCurrency(this.currency);
    }

    @action autoNumerize(element) {
        const { onCurrencyChange } = this.args;
        let currency = this.currencyData;
        let value = numbersOnly(this.args.value ?? 0);

        // CRITICAL: Conditional division based on currency precision
        // - Currencies with decimals (precision > 0): divide by 100 (stored in cents)
        // - Currencies without decimals (precision = 0): use as-is (stored in main unit)
        let amount = !currency.decimalSeparator ? value : value / 100;

        this.autonumeric = new AutoNumeric(element, amount, this.getCurrencyFormatOptions(currency));

        // default the currency from currency data
        if (typeof onCurrencyChange === 'function') {
            onCurrencyChange(currency.code, currency);
        }

        // Use rawValueModified for better change detection
        element.addEventListener('autoNumeric:rawValueModified', ({ detail }) => {
            if (typeof this.args.onChange === 'function') {
                // Convert back to storage format
                let rawValue = detail.newRawValue;
                // For precision > 0: multiply by 100 to get cents
                // For precision = 0: use as-is (main unit)
                let storedValue = !currency.decimalSeparator ? rawValue : Math.round(rawValue * 100);
                this.args.onChange(storedValue, detail);
            }
        });
    }

    @action setCurrency(currency) {
        const { onCurrencyChange } = this.args;

        /* istanbul ignore else -- autoNumerize runs from {{did-insert}} on the amount field, so
           the instance exists before the currency selector can be reached */
        if (this.autonumeric) {
            let value = this.autonumeric.getNumber();
            this.autonumeric.update(this.getCurrencyFormatOptions(currency));
            // Re-set the value to ensure it's formatted correctly with new currency
            this.autonumeric.set(value);
        }

        this.currency = currency.code;
        this.currencyData = currency;

        if (typeof onCurrencyChange === 'function') {
            onCurrencyChange(currency.code, currency);
        }
    }

    @action getCurrencyFormatOptions(currency) {
        /* istanbul ignore next -- every entry in get-currency.js declares a symbol */
        const currencySymbol = isNone(currency.symbol) ? '$' : currency.symbol;
        /* istanbul ignore next -- every entry in get-currency.js declares a precision */
        const decimalPlaces = isNone(currency.precision) ? 2 : currency.precision;
        /* istanbul ignore next -- every entry in get-currency.js declares a thousandSeparator */
        const digitGroupSeparator = isNone(currency.thousandSeparator) ? ',' : currency.thousandSeparator;

        let options = {
            currencySymbol,
            currencySymbolPlacement: currency.symbolPlacement === 'before' ? 'p' : 's',
            // Truthiness, not isNone: 16 zero-decimal currencies in get-currency.js carry
            // `decimalSeparator: ''`, and an empty decimalCharacter makes AutoNumeric build the
            // broken character class /[^-0123456789\]/ and throw. The rest of this component
            // already tests the separator with `!currency.decimalSeparator`.
            decimalCharacter: currency.decimalSeparator || '.',
            decimalPlaces,
            digitGroupSeparator,
        };

        // decimal and thousand seperator cannot be the same, if they are revert the thousand seperator
        if (options.decimalCharacter === options.digitGroupSeparator) {
            options.digitGroupSeparator = ',';
        }

        return options;
    }

    @action handleCurrencyChanges(el, [currency]) {
        this.setCurrency(getCurrency(currency));
    }
}
