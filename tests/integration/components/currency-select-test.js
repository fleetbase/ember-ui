import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import { clickTrigger, typeInSearch } from 'ember-power-select/test-support/helpers';
import { selectChoose } from 'ember-power-select/test-support';

module('Integration | Component | currency-select', function (hooks) {
    setupRenderingTest(hooks);

    test('it defaults the selection to USD', async function (assert) {
        await render(hbs`<CurrencySelect />`);

        assert.dom('.ember-power-select-trigger').containsText('USD');
    });

    test('it preselects the currency provided by @value', async function (assert) {
        await render(hbs`<CurrencySelect @value="EUR" />`);

        assert.dom('.ember-power-select-trigger').containsText('EUR');
    });

    test('it defaults to the current user whois currency when available', async function (assert) {
        const currentUser = this.owner.lookup('service:current-user');
        currentUser.setOption('whois', { currency: { code: 'GBP' } });

        await render(hbs`<CurrencySelect />`);

        assert.dom('.ember-power-select-trigger').containsText('GBP');
    });

    test('selecting a currency fires the change callbacks with the code and currency', async function (assert) {
        const calls = [];
        this.set('onCurrencyChange', (code, currency) => calls.push({ method: 'onCurrencyChange', code, currency }));
        this.set('onSelect', (code, currency) => calls.push({ method: 'onSelect', code, currency }));
        this.set('onChange', (currency) => calls.push({ method: 'onChange', currency }));

        await render(hbs`<CurrencySelect @onCurrencyChange={{this.onCurrencyChange}} @onSelect={{this.onSelect}} @onChange={{this.onChange}} />`);

        await clickTrigger();
        await typeInSearch('EUR');
        await selectChoose('.ember-power-select-trigger', 'EUR');

        assert.deepEqual(
            calls.map((call) => call.method),
            ['onCurrencyChange', 'onSelect', 'onChange'],
            'all change callbacks fired'
        );
        assert.strictEqual(calls[0].code, 'EUR');
        assert.strictEqual(calls[0].currency.code, 'EUR');
        assert.strictEqual(calls[2].currency.code, 'EUR');
        assert.dom('.ember-power-select-trigger').containsText('EUR');
    });

    test('it yields the currency in block form for custom option rendering', async function (assert) {
        await render(hbs`
            <CurrencySelect as |currency|>
                <span data-test-currency-code>{{currency.code}}</span>
            </CurrencySelect>
        `);

        await clickTrigger();
        await typeInSearch('USD');

        assert.dom('.ember-power-select-option [data-test-currency-code]').exists();
    });
});
