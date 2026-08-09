import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

const VALID_UUID = '5a9c8f2e-3b1d-4c7a-9e0f-1a2b3c4d5e6f';

module('Integration | Component | with-record', function (hooks) {
    setupRenderingTest(hooks);

    let store;
    let peeked;
    let found;

    hooks.beforeEach(function () {
        peeked = [];
        found = [];
        store = this.owner.lookup('service:store');
        store.peekRecord = (...args) => {
            peeked.push(args);
            return null;
        };
        store.findRecord = (...args) => {
            found.push(args);
            return Promise.resolve({ id: args[1], name: 'Order 123' });
        };
    });

    const TEMPLATE = hbs`
        <WithRecord @id={{this.id}} @type={{this.type}} as |record isLoading error|>
            <span class="name">{{record.name}}</span>
            <span class="loading">{{if isLoading "loading" "idle"}}</span>
            <span class="error">{{error}}</span>
        </WithRecord>
    `;

    test('it fetches the record and yields it', async function (assert) {
        this.setProperties({ id: VALID_UUID, type: 'Order' });

        await render(TEMPLATE);

        assert.deepEqual(peeked, [['order', VALID_UUID]], 'the type is dasherized before it reaches the store');
        assert.deepEqual(found, [['order', VALID_UUID]], 'a cache miss falls through to findRecord');
        assert.dom('.name').hasText('Order 123');
        assert.dom('.loading').hasText('idle');
        assert.dom('.error').hasText('');
    });

    test('a cached record is used without a network fetch', async function (assert) {
        store.peekRecord = () => ({ id: VALID_UUID, name: 'Cached order' });
        this.setProperties({ id: VALID_UUID, type: 'order' });

        await render(TEMPLATE);

        assert.dom('.name').hasText('Cached order');
        assert.deepEqual(found, [], 'findRecord is never reached');
    });

    test('a multi-word type is dasherized', async function (assert) {
        this.setProperties({ id: VALID_UUID, type: 'purchaseRate' });

        await render(TEMPLATE);

        assert.deepEqual(peeked[0], ['purchase-rate', VALID_UUID]);
    });

    test('a failed lookup is reported through the yielded error', async function (assert) {
        store.findRecord = () => Promise.reject(new Error('Order not found'));
        this.setProperties({ id: VALID_UUID, type: 'order' });

        await render(TEMPLATE);

        assert.dom('.error').hasText('Order not found');
        assert.dom('.name').hasText('', 'no record is yielded');
    });

    test('a lookup returning nothing yields no record and no error', async function (assert) {
        store.findRecord = () => Promise.resolve(null);
        this.setProperties({ id: VALID_UUID, type: 'order' });

        await render(TEMPLATE);

        assert.dom('.name').hasText('');
        assert.dom('.error').hasText('');
    });

    test('a non-uuid id is never looked up', async function (assert) {
        this.setProperties({ id: 'not-a-uuid', type: 'order' });

        await render(TEMPLATE);

        assert.deepEqual(peeked, [], 'the request is rejected before it reaches the store');
        assert.dom('.name').hasText('');
    });

    test('a missing id or type is never looked up', async function (assert) {
        this.setProperties({ id: undefined, type: 'order' });
        await render(TEMPLATE);
        assert.deepEqual(peeked, [], 'no id means no lookup');

        this.setProperties({ id: VALID_UUID, type: undefined });
        await render(TEMPLATE);
        assert.deepEqual(peeked, [], 'no type means no lookup');
    });
});
