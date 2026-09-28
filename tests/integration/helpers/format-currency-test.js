import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Helper | format-currency', function (hooks) {
    setupRenderingTest(hooks);

    test('it formats an amount in cents as USD by default', async function (assert) {
        this.set('inputValue', '1234');

        await render(hbs`{{format-currency this.inputValue}}`);

        assert.dom(this.element).hasText('$12.34');
    });

    test('it formats using an explicit currency code', async function (assert) {
        await render(hbs`{{format-currency 500 "EUR"}}`);

        assert.dom(this.element).hasText('€ 5,00');
    });

    test('it renders a zero amount when no arguments are given', async function (assert) {
        await render(hbs`{{format-currency}}`);

        assert.dom(this.element).hasText('$0.00');
    });
});
