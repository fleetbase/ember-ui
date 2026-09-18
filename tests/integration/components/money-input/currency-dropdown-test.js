import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | money-input/currency-dropdown', function (hooks) {
    setupRenderingTest(hooks);

    test('it wraps its block in a plain container', async function (assert) {
        await render(hbs`<div class="host"><MoneyInput::CurrencyDropdown><span class="inside">USD</span></MoneyInput::CurrencyDropdown></div>`);

        assert.dom('.host > div > .inside').hasText('USD');
    });

    test('with no block it renders an empty container', async function (assert) {
        await render(hbs`<div class="host"><MoneyInput::CurrencyDropdown /></div>`);

        assert.dom('.host > div').exists();
        assert.dom('.host').hasText('');
    });
});
