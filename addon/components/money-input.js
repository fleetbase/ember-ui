import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { isNone } from '@ember/utils';
import getCurrency from '../utils/get-currency';
import AutoNumeric from 'autonumeric';

export default class MoneyInputComponent extends Component {
    @service fetch;
    @service currentUser;
    @tracked currencies = getCurrency();
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

        this.autonumeric = new AutoNumeric(element, this.args.value ?? 0, this.getCurrencyFormatOptions(currency));

        // default the currency from currency data
        if (typeof onCurrencyChange === 'function') {
            onCurrencyChange(currency.code, currency);
        }

        element.addEventListener('autoNumeric:rawValueModified', ({ detail }) => {
            if (typeof this.args.onChange === 'function') {
                this.args.onChange(detail.newRawValue, detail);
            }
        });
    }

    @action setCurrency(currency) {
        const { onCurrencyChange } = this.args;

        if (this.autonumeric) {
            this.autonumeric.update(this.getCurrencyFormatOptions(currency));
        }

        this.currency = currency.code;
        this.currencyData = currency;

        if (typeof onCurrencyChange === 'function') {
            onCurrencyChange(currency.code, currency);
        }
    }

    @action getCurrencyFormatOptions(currency) {
        let options = {
            currencySymbol: isNone(currency.symbol) ? '$' : currency.symbol,
            currencySymbolPlacement: currency.symbolPlacement === 'before' ? 'p' : 's',
            decimalCharacter: isNone(currency.decimalSeperator) ? '.' : currency.decimalSeparator,
            decimalPlaces: isNone(currency.precision) ? 2 : currency.precision,
            digitGroupSeparator: isNone(currency.thousandSeparator) ? ',' : currency.thousandSeparator,
            rawValueDivisor: 100,
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

    @action handleValueChanges(element, [value]) {
        if (this.autonumeric && this.autonumeric.getNumber() !== value) {
            this.autonumeric.set(value ?? 0);
        }
    }
}
