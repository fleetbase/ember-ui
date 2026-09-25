import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Helper | join-column-list', function (hooks) {
    setupRenderingTest(hooks);

    test('it prefixes a single column with the table name', async function (assert) {
        this.set('columns', [{ name: 'id' }]);

        await render(hbs`{{join-column-list this.columns "orders"}}`);

        assert.dom(this.element).hasText('orders.id');
    });

    test('it joins multiple columns with a comma and space', async function (assert) {
        this.set('columns', [{ name: 'id' }, { name: 'public_id' }, { name: 'status' }]);

        await render(hbs`{{join-column-list this.columns "orders"}}`);

        assert.strictEqual(this.element.textContent.trim(), 'orders.id, orders.public_id, orders.status');
    });

    test('it appends an alias when one is present', async function (assert) {
        this.set('columns', [{ name: 'public_id', alias: 'reference' }]);

        await render(hbs`{{join-column-list this.columns "orders"}}`);

        assert.strictEqual(this.element.textContent.trim(), 'orders.public_id AS reference');
    });

    test('it mixes aliased and non aliased columns', async function (assert) {
        this.set('columns', [{ name: 'id' }, { name: 'public_id', alias: 'reference' }, { name: 'status', alias: null }]);

        await render(hbs`{{join-column-list this.columns "orders"}}`);

        assert.strictEqual(this.element.textContent.trim(), 'orders.id, orders.public_id AS reference, orders.status');
    });

    test('it ignores an empty string alias', async function (assert) {
        this.set('columns', [{ name: 'id', alias: '' }]);

        await render(hbs`{{join-column-list this.columns "orders"}}`);

        assert.strictEqual(this.element.textContent.trim(), 'orders.id');
    });

    test('it reports when no columns are selected', async function (assert) {
        this.set('columns', []);

        await render(hbs`{{join-column-list this.columns "orders"}}`);

        assert.dom(this.element).hasText('No columns selected');
    });

    test('it reports when the column list is null or undefined', async function (assert) {
        this.set('columns', null);

        await render(hbs`{{join-column-list this.columns "orders"}}|{{join-column-list this.missing "orders"}}`);

        assert.strictEqual(this.element.textContent.trim(), 'No columns selected|No columns selected');
    });

    test('it still renders the column when the table name is missing', async function (assert) {
        this.set('columns', [{ name: 'id' }]);

        await render(hbs`{{join-column-list this.columns}}`);

        assert.dom(this.element).hasText('undefined.id');
    });

    test('it preserves column names containing special characters', async function (assert) {
        this.set('columns', [{ name: 'meta->"$.driver"' }, { name: 'créé_à', alias: 'created' }]);

        await render(hbs`{{join-column-list this.columns "orders"}}`);

        assert.strictEqual(this.element.textContent.trim(), 'orders.meta->"$.driver", orders.créé_à AS created');
    });
});
