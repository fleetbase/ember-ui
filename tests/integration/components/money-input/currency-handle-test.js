import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | money-input/currency-handle', function (hooks) {
    setupRenderingTest(hooks);

    test("it renders the currency's flag emoji", async function (assert) {
        this.set('currency', { code: 'AWG', emoji: '🇦🇼' });

        await render(hbs`<MoneyInput::CurrencyHandle @currency={{this.currency}} />`);

        assert.dom('.currency-flag').hasText('🇦🇼');
    });

    test('a currency with no emoji renders an empty handle', async function (assert) {
        this.set('currency', { code: 'USD' });

        await render(hbs`<MoneyInput::CurrencyHandle @currency={{this.currency}} />`);

        assert.dom('.currency-flag').hasText('');
    });

    test('it renders without a currency at all', async function (assert) {
        await render(hbs`<MoneyInput::CurrencyHandle />`);

        assert.dom('.currency-flag').exists();
        assert.dom('.currency-flag').hasText('');
    });

    test('a trigger class and splattributes are applied', async function (assert) {
        this.set('currency', { code: 'USD', emoji: '🇺🇸' });

        await render(hbs`<MoneyInput::CurrencyHandle @currency={{this.currency}} @triggerClass="my-trigger" data-test-handle="yes" />`);

        assert.dom('.currency-flag').hasClass('my-trigger');
        assert.dom('.currency-flag').hasAttribute('data-test-handle', 'yes');
    });
});
