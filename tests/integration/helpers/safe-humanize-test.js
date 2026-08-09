import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Helper | safe-humanize', function (hooks) {
    setupRenderingTest(hooks);

    test('it humanizes an underscored string', async function (assert) {
        this.set('value', 'first_name');

        await render(hbs`{{safe-humanize this.value}}`);

        assert.dom(this.element).hasText('First name');
    });

    test('it humanizes a dasherized string', async function (assert) {
        this.set('value', 'order-status-code');

        await render(hbs`{{safe-humanize this.value}}`);

        assert.dom(this.element).hasText('Order status code');
    });

    test('it lowercases the remainder of the string', async function (assert) {
        this.set('value', 'ORDER_STATUS');

        await render(hbs`{{safe-humanize this.value}}`);

        assert.dom(this.element).hasText('Order status');
    });

    test('it collapses runs of separators into a single space', async function (assert) {
        this.set('value', 'order__status--code');

        await render(hbs`{{safe-humanize this.value}}`);

        assert.dom(this.element).hasText('Order status code');
    });

    test('it coerces undefined and null to their string form instead of returning empty text', async function (assert) {
        this.set('nullValue', null);

        await render(hbs`{{safe-humanize this.missing}}|{{safe-humanize this.nullValue}}`);

        assert.dom(this.element).hasText('Undefined|Null');
    });

    test('it coerces numbers and booleans', async function (assert) {
        this.set('zero', 0);
        this.set('bool', false);

        await render(hbs`{{safe-humanize this.zero}}|{{safe-humanize this.bool}}`);

        assert.dom(this.element).hasText('0|False');
    });

    test('it renders nothing for an empty string', async function (assert) {
        this.set('value', '');

        await render(hbs`{{safe-humanize this.value}}`);

        assert.dom(this.element).hasNoText();
    });

    test('it only humanizes the first positional argument', async function (assert) {
        this.set('first', 'first_name');
        this.set('second', 'last_name');

        await render(hbs`{{safe-humanize this.first this.second}}`);

        assert.dom(this.element).hasText('First name');
    });

    test('it preserves unicode characters', async function (assert) {
        this.set('value', 'straße_städte');

        await render(hbs`{{safe-humanize this.value}}`);

        assert.dom(this.element).hasText('Straße städte');
    });

    test('it leaves an already humanized string capitalized', async function (assert) {
        this.set('value', 'Order status');

        await render(hbs`{{safe-humanize this.value}}`);

        assert.dom(this.element).hasText('Order status');
    });
});
