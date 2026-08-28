import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, findAll } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

function selectedRecords() {
    return [
        { id: 'ord_1', name: 'Order 123' },
        { id: 'ord_2', name: 'Order 456' },
    ];
}

module('Integration | Component | modals/bulk-delete-model', function (hooks) {
    setupRenderingTest(hooks);

    let removed;

    hooks.beforeEach(function () {
        removed = [];
        this.set('options', {
            modelName: 'order',
            modelNamePath: 'name',
            count: 2,
            selected: selectedRecords(),
            remove: (record) => removed.push(record),
        });
    });

    const TEMPLATE = hbs`<Modals::BulkDeleteModel @options={{this.options}} @onConfirm={{this.onConfirm}} @onDecline={{this.onDecline}} />`;

    test('it asks for confirmation, pluralising the model name', async function (assert) {
        await render(TEMPLATE);

        assert.dom('h3').containsText('Are you sure you want to delete these');
        assert.dom('h3').containsText('orders');
    });

    test('it reports how many records were selected', async function (assert) {
        await render(TEMPLATE);

        assert.dom(this.element).containsText('You have selected');
        assert.dom(this.element).containsText('2 orders');
        assert.dom(this.element).containsText('for deletion');
    });

    test('a single record is described in the singular', async function (assert) {
        this.set('options', { ...this.options, count: 1, selected: [selectedRecords()[0]] });

        await render(TEMPLATE);

        assert.dom(this.element).containsText('1 order');
    });

    test('it lists every selected record by the configured path', async function (assert) {
        await render(TEMPLATE);

        assert.deepEqual(
            findAll('li span').map((node) => node.textContent.trim()),
            ['Order 123', 'Order 456']
        );
    });

    test('a different name path is honoured', async function (assert) {
        this.set('options', {
            ...this.options,
            modelNamePath: 'id',
        });

        await render(TEMPLATE);

        assert.deepEqual(
            findAll('li span').map((node) => node.textContent.trim()),
            ['ord_1', 'ord_2']
        );
    });

    test('each record can be dropped from the selection', async function (assert) {
        await render(TEMPLATE);

        await click(findAll('li a')[1]);

        assert.strictEqual(removed.length, 1);
        assert.strictEqual(removed[0].id, 'ord_2', 'the record beside the clicked control is removed');
    });

    test('an empty selection renders no list entries', async function (assert) {
        this.set('options', { ...this.options, count: 0, selected: [] });

        await render(TEMPLATE);

        assert.strictEqual(findAll('li').length, 0);
        assert.dom('h3').containsText('orders', 'the prompt still renders');
    });

    test('it renders with no options at all', async function (assert) {
        await render(hbs`<Modals::BulkDeleteModel />`);

        assert.dom('h3').exists('the prompt still renders');
        assert.dom(this.element).doesNotContainText('undefined');
    });
});
