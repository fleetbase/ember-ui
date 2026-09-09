import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Helper | smart-humanize', function (hooks) {
    setupRenderingTest(hooks);

    test('it title cases an underscored string', async function (assert) {
        this.set('value', 'first_name');

        await render(hbs`{{smart-humanize this.value}}`);

        assert.dom(this.element).hasText('First Name');
    });

    test('it decamelizes camel case input', async function (assert) {
        this.set('value', 'trackingNumber');

        await render(hbs`{{smart-humanize this.value}}`);

        assert.dom(this.element).hasText('Tracking Number');
    });

    test('it uppercases known acronyms', async function (assert) {
        this.set('apiKey', 'api_key');
        this.set('vatNumber', 'vat_number');
        this.set('uuid', 'uuid');

        await render(hbs`{{smart-humanize this.apiKey}}|{{smart-humanize this.vatNumber}}|{{smart-humanize this.uuid}}`);

        assert.dom(this.element).hasText('API Key|VAT Number|UUID');
    });

    test('it uppercases acronyms discovered through decamelization', async function (assert) {
        this.set('value', 'orderEta');

        await render(hbs`{{smart-humanize this.value}}`);

        assert.dom(this.element).hasText('Order ETA');
    });

    test('it only uppercases whole word acronyms', async function (assert) {
        this.set('value', 'rapid_transit');

        await render(hbs`{{smart-humanize this.value}}`);

        assert.dom(this.element).hasText('Rapid Transit');
    });

    test('it normalizes already uppercase input', async function (assert) {
        this.set('value', 'ORDER_STATUS');

        await render(hbs`{{smart-humanize this.value}}`);

        assert.dom(this.element).hasText('Order Status');
    });

    test('it capitalizes every word of a dasherized string', async function (assert) {
        this.set('value', 'order-status-code');

        await render(hbs`{{smart-humanize this.value}}`);

        assert.dom(this.element).hasText('Order Status Code');
    });

    test('it renders nothing for an empty string', async function (assert) {
        this.set('value', '');

        await render(hbs`{{smart-humanize this.value}}`);

        assert.dom(this.element).hasNoText();
    });

    test('it returns non string input unchanged', async function (assert) {
        this.set('number', 42);
        this.set('bool', true);

        await render(hbs`{{smart-humanize this.number}}|{{smart-humanize this.bool}}`);

        assert.dom(this.element).hasText('42|true');
    });

    test('it renders nothing for null and undefined', async function (assert) {
        this.set('nullValue', null);

        await render(hbs`{{smart-humanize this.nullValue}}{{smart-humanize this.missing}}`);

        assert.dom(this.element).hasNoText();
    });

    test('it preserves unicode words', async function (assert) {
        this.set('value', 'straße_städte');

        await render(hbs`{{smart-humanize this.value}}`);

        assert.dom(this.element).hasText('Straße Städte');
    });

    test('it handles numeric segments', async function (assert) {
        this.set('value', 'address_line_2');

        await render(hbs`{{smart-humanize this.value}}`);

        assert.dom(this.element).hasText('Address Line 2');
    });
});
