import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Helper | get-notification-key', function (hooks) {
    setupRenderingTest(hooks);

    test('it joins a stripped definition and a camelized name with a double underscore', async function (assert) {
        await render(hbs`{{get-notification-key "order_created" "created"}}`);

        assert.dom(this.element).hasText('ordercreated__created');
    });

    test('non word characters are stripped out of the definition', async function (assert) {
        await render(hbs`{{get-notification-key "fleet-ops:event.order.ready" "Order Ready"}}`);

        assert.dom(this.element).hasText('fleetopseventorderready__orderReady');
    });

    test('a PascalCase definition is camelized', async function (assert) {
        await render(hbs`{{get-notification-key "OrderNotification" "ready"}}`);

        assert.dom(this.element).hasText('orderNotification__ready');
    });

    test('a dasherized name is camelized', async function (assert) {
        await render(hbs`{{get-notification-key "orders" "order-ready-for-pickup"}}`);

        assert.dom(this.element).hasText('orders__orderReadyForPickup');
    });

    test('an underscored name is camelized', async function (assert) {
        await render(hbs`{{get-notification-key "orders" "order_dispatched"}}`);

        assert.dom(this.element).hasText('orders__orderDispatched');
    });

    test('digits survive the stripping of the definition', async function (assert) {
        await render(hbs`{{get-notification-key "v1.order.events" "ready"}}`);

        assert.dom(this.element).hasText('v1orderevents__ready');
    });

    test('an empty name still produces the separator', async function (assert) {
        await render(hbs`{{get-notification-key "orders" ""}}`);

        assert.dom(this.element).hasText('orders__');
    });

    test('an empty definition still produces the separator', async function (assert) {
        await render(hbs`{{get-notification-key "" "ready"}}`);

        assert.dom(this.element).hasText('__ready');
    });

    test('the key is stable for the same inputs', async function (assert) {
        await render(hbs`<span id="a">{{get-notification-key "fleet-ops:order" "ready"}}</span><span id="b">{{get-notification-key "fleet_ops:order" "ready"}}</span>`);

        assert.dom('#a').hasText('fleetopsorder__ready');
        assert.dom('#b').hasText('fleetopsorder__ready', 'separators are removed so dashes and underscores collapse to the same key');
    });
});
