import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, settled, triggerEvent, find } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import { selectChoose } from 'ember-power-select/test-support';
import Service from '@ember/service';

function input() {
    return find('.ui-money-input input');
}

module('Integration | Component | money-input', function (hooks) {
    setupRenderingTest(hooks);

    let currencyChanges;
    let whois;

    hooks.beforeEach(function () {
        currencyChanges = [];
        whois = undefined;

        this.owner.unregister('service:currentUser');
        this.owner.register(
            'service:currentUser',
            class extends Service {
                getOption(key) {
                    return key === 'whois' ? whois : undefined;
                }
            }
        );

        this.owner.unregister('service:fetch');
        this.owner.register('service:fetch', class extends Service {});

        this.set('onCurrencyChange', (code, data) => currencyChanges.push([code, data]));
    });

    const TEMPLATE = hbs`
        <MoneyInput
            @value={{this.value}}
            @currency={{this.currency}}
            @canSelectCurrency={{this.canSelectCurrency}}
            @wrapperClass={{this.wrapperClass}}
            @onChange={{this.onChange}}
            @onCurrencyChange={{this.onCurrencyChange}}
        />
    `;

    module('rendering', function () {
        test('it renders a currency handle and an amount input', async function (assert) {
            await render(TEMPLATE);

            assert.dom('.ui-money-input').exists();
            assert.ok(input(), 'an amount field is rendered');
            assert.dom(input()).hasAttribute('type', 'tel');
        });

        test('a wrapper class is applied and splattributes reach the input', async function (assert) {
            this.set('wrapperClass', 'my-money');

            await render(hbs`<MoneyInput @wrapperClass={{this.wrapperClass}} data-test-money="yes" />`);

            assert.dom('.ui-money-input').hasClass('my-money');
            assert.dom(input()).hasAttribute('data-test-money', 'yes');
        });

        test('it defaults to USD when nothing else is available', async function (assert) {
            await render(TEMPLATE);

            assert.strictEqual(currencyChanges[0][0], 'USD');
        });

        test("it adopts the current user's currency when no argument is given", async function (assert) {
            whois = { currency: { code: 'EUR' } };

            await render(TEMPLATE);

            assert.strictEqual(currencyChanges[0][0], 'EUR');
        });

        test('an explicit currency argument wins over the user default', async function (assert) {
            whois = { currency: { code: 'EUR' } };
            this.set('currency', 'GBP');

            await render(TEMPLATE);

            assert.strictEqual(currencyChanges[0][0], 'GBP');
        });

        test('a currency selector is offered only when asked for', async function (assert) {
            await render(TEMPLATE);
            assert.dom('.ember-power-select-trigger').doesNotExist('no selector by default');

            this.set('canSelectCurrency', true);
            await settled();

            assert.dom('.ember-power-select-trigger').exists('the selector appears');
        });
    });

    module('formatting the amount', function () {
        test('a decimal currency treats the value as minor units', async function (assert) {
            this.set('currency', 'USD');
            this.set('value', 1500);

            await render(TEMPLATE);

            assert.strictEqual(input().value, '$15.00', '1500 cents renders as $15.00');
        });

        test('a zero-decimal currency uses the value as-is', async function (assert) {
            this.set('currency', 'JPY');
            this.set('value', 1500);

            await render(TEMPLATE);

            assert.true(input().value.includes('1,500'), 'yen is not divided by one hundred');
        });

        test('a missing value renders zero', async function (assert) {
            this.set('currency', 'USD');

            await render(TEMPLATE);

            assert.strictEqual(input().value, '$0.00');
        });

        test('the currency symbol is applied', async function (assert) {
            this.set('currency', 'GBP');
            this.set('value', 2500);

            await render(TEMPLATE);

            assert.true(input().value.includes('25'), `the amount is present (got ${input().value})`);
            assert.true(input().value.includes('£'), `and carries the currency symbol (got ${input().value})`);
        });

        test('a comma-decimal currency uses its own separator', async function (assert) {
            this.set('currency', 'AWG');
            this.set('value', 1234);

            await render(TEMPLATE);

            assert.true(input().value.endsWith(',34'), `the Aruban guilder's comma decimal separator is honoured (got ${input().value})`);
        });
    });

    module('changing currency', function () {
        test('a new currency argument reformats the field and is reported', async function (assert) {
            this.set('currency', 'USD');
            this.set('value', 1500);

            await render(TEMPLATE);
            const before = currencyChanges.length;

            this.set('currency', 'JPY');
            await settled();

            assert.true(currencyChanges.length > before, 'the change is reported');
            assert.strictEqual(currencyChanges[currencyChanges.length - 1][0], 'JPY');
        });

        test('it renders without an onCurrencyChange handler', async function (assert) {
            await render(hbs`<MoneyInput @currency="USD" @value={{100}} />`);

            assert.ok(input(), 'no handler is required');
        });

        // 16 of the currencies in get-currency.js place their symbol after the amount.
        test('a currency that places its symbol after the amount is formatted that way', async function (assert) {
            this.set('currency', 'CZK');
            this.set('value', 1500);

            await render(TEMPLATE);

            assert.dom(input()).hasValue(/K\u010d$/, 'the koruna symbol trails the amount');
        });

        // CLP declares the same character for both separators. AutoNumeric refuses that, so the
        // component reverts the group separator to a comma.
        test('a currency whose separators would collide has its group separator reverted', async function (assert) {
            this.set('currency', 'CLP');
            this.set('value', 1234567);

            await render(TEMPLATE);

            assert.dom(input()).hasValue(/,/, 'the amount is grouped with commas rather than being rejected');
        });

        test('picking a currency with no handler behind it still reformats', async function (assert) {
            await render(hbs`<MoneyInput @currency="USD" @value={{1500}} @canSelectCurrency={{true}} />`);
            await selectChoose('.ember-power-select-trigger', 'JPY');

            assert.dom(input()).hasValue(/\u00a5/, 'the field is reformatted for the new currency');
        });
    });

    // AutoNumeric announces every edit as `autoNumeric:rawValueModified` on its own element;
    // the component converts that raw value back into the storage format before reporting it.
    module('reporting edits', function () {
        async function editTo(rawValue) {
            await triggerEvent(input(), 'autoNumeric:rawValueModified', { detail: { newRawValue: rawValue } });
        }

        test('a decimal currency reports the amount in cents', async function (assert) {
            const changes = [];
            this.set('currency', 'USD');
            this.set('value', 100);
            this.set('onChange', (stored) => changes.push(stored));

            await render(TEMPLATE);
            await editTo('12.34');

            assert.deepEqual(changes, [1234], '12.34 dollars is stored as 1234 cents');
        });

        test('a fractional cent is rounded rather than truncated', async function (assert) {
            const changes = [];
            this.set('currency', 'USD');
            this.set('value', 100);
            this.set('onChange', (stored) => changes.push(stored));

            await render(TEMPLATE);
            await editTo('0.005');

            assert.deepEqual(changes, [1], 'half a cent rounds up to one');
        });

        test('a zero-decimal currency reports the value as-is', async function (assert) {
            const changes = [];
            this.set('currency', 'JPY');
            this.set('value', 500);
            this.set('onChange', (stored) => changes.push(stored));

            await render(TEMPLATE);
            await editTo('1200');

            assert.deepEqual(changes, ['1200'], 'yen has no subunit, so the raw value is stored');
        });

        test('an edit is safe with no onChange handler', async function (assert) {
            await render(hbs`<MoneyInput @currency="USD" @value={{100}} />`);
            await editTo('9.99');

            assert.ok(input(), 'the component survives');
        });
    });
});
