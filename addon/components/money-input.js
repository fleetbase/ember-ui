import { set } from '@ember/object';
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action, get, computed } from '@ember/object';
import { later } from '@ember/runloop';
import numbersOnly from '../utils/numbers-only';
import getCurrency from '../utils/get-currency';
import AutoNumeric from 'autonumeric';

export default class MoneyInputComponent extends Component {
  /**
   * Injection of the `fetch` service
   *
   * @var {Service}
   */
  @service fetch;

  /**
   * Injection of the `fetch` service
   *
   * @var {Service}
   */
  @service currentUser;

  /**
   * All currencies.
   *
   * @var {Array}
   */
  @tracked currencies = getCurrency();

  /**
   * Mutable currency selected.
   *
   * @var {Array}
   */
  @tracked selectedCurrency;

  /**
   * The mutable input value.
   *
   * @var {String}
   */
  @tracked _value;

  /**
   * The user value, or mutable value or default value
   *
   * @var {Integer}
   */
  @computed('_value', 'args.value') get value() {
    return this._value || this.args.value || 0;
  }

  /** setter for value */
  set value(value) {
    this._value = value;
  }

  /**
   * Data for selected currency.
   *
   * @var {Object}
   */
  @tracked _currencyData;

  /**
   * The autonumeric mask instance.
   *
   * @var {Object}
   */
  @tracked autonumeric;

  /**
   * Currencies loaded from the server.
   *
   * @var {Array}
   */
  @computed('args.currency', 'selectedCurrency') get currency() {
    let whois = this.currentUser.getOption('whois');

    return (
      this.selectedCurrency ||
      this.args.currency ||
      get(whois, 'currency.code') ||
      'USD'
    );
  }

  /** setter for currency */
  set currency(currency) {
    this.selectedCurrency = currency;
  }

  /**
   * Currencies loaded from the server.
   *
   * @var {Array}
   */
  @computed('currency') get currencyData() {
    return getCurrency(this.currency);
  }

  /** setter for currencyData */
  set currencyData(currencyData) {
    this._currencyData = currencyData;
  }

  @action autoNumerize(element) {
    let currency = this.currencyData;
    let value = numbersOnly(this.value);
    let amount = !currency.decimalSeparator ? value : value / 100;

    this.autonumeric = new AutoNumeric(
      element,
      amount,
      this.getCurrencyFormatOptions(currency)
    );

    // default the currency from currency data
    if (typeof this.args.onCurrencyChange === 'function') {
      this.args.onCurrencyChange(currency.code, currency);
    }

    element.addEventListener(
      'autoNumeric:formatted',
      this.onFormatCompleted.bind(this)
    );
  }

  @action setCurrency(currency, dd) {
    if (typeof dd?.actions?.close === 'function') {
      dd.actions.close();
    }

    if (this.autonumeric) {
      this.autonumeric.set(
        numbersOnly(this.value, true),
        this.getCurrencyFormatOptions(currency)
      );
    }

    set(this, 'currency', currency.code);
    this.currencyData = currency;

    if (typeof this.args.onCurrencyChange === 'function') {
      this.args.onCurrencyChange(currency.code, currency);
    }
  }

  @action onFormatCompleted({ detail }) {
    const { onFormatCompleted, onChange } = this.args;

    // 300ms for format to apply to input ?
    later(
      this,
      () => {
        if (typeof onFormatCompleted === 'function') {
          onFormatCompleted(detail);
        }
      },
      300
    );

    if (typeof onChange === 'function') {
      onChange(detail);
    }
  }

  @action getCurrencyFormatOptions(currency) {
    let options = {
      currencySymbol: currency.symbol || '$',
      currencySymbolPlacement:
        currency.symbolPlacement === 'before' ? 'p' : 's',
      decimalCharacter: currency.decimalSeperator || '.',
      decimalPlaces: currency.precision || 2,
      digitGroupSeparator: currency.thousandSeparator || ',',
    };

    // decimal and thousand seperator cannot be the same, if they are revert the thousand seperator
    if (options.decimalCharacter === options.digitGroupSeparator) {
      options.digitGroupSeparator = ',';
    }

    return options;
  }

  @action searchCurrencies(currency, term) {
    if (!term || typeof term !== 'string') {
      return -1;
    }

    let name =
      `${currency.title} ${currency.code} ${currency.iso2}`.toLowerCase();

    return name.indexOf(term.toLowerCase());
  }
}
