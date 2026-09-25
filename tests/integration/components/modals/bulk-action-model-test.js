import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, findAll } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

function records() {
    return [
        { id: 'ord_1', public_id: 'ORD-1', name: 'Order 123', list_resolved_name: 'Resolved 123' },
        { id: 'ord_2', public_id: 'ORD-2', name: 'Order 456', list_resolved_name: 'Resolved 456' },
    ];
}

module('Integration | Component | modals/bulk-action-model', function (hooks) {
    setupRenderingTest(hooks);

    let removed;

    hooks.beforeEach(function () {
        removed = [];
        this.set('options', {
            verb: 'cancel',
            modelName: 'order',
            modelNamePath: 'name',
            count: 2,
            selected: records(),
            remove: (record) => removed.push(record),
        });
    });

    const TEMPLATE = hbs`<Modals::BulkActionModel @options={{this.options}} @onConfirm={{this.onConfirm}} @onDecline={{this.onDecline}} />`;

    module('the prompt', function () {
        test('it asks for confirmation using the verb and pluralised model name', async function (assert) {
            await render(TEMPLATE);

            assert.dom('h3').containsText('Are you sure you want to');
            assert.dom('h3').containsText('cancel');
            assert.dom('h3').containsText('orders');
        });

        test('it reports how many records were selected and what for', async function (assert) {
            await render(TEMPLATE);

            assert.dom(this.element).containsText('You have selected');
            assert.dom(this.element).containsText('2 orders');
            assert.dom(this.element).containsText('for cancel');
        });

        test('an explicit message replaces the generated summary', async function (assert) {
            this.set('options', { ...this.options, message: 'These orders will be cancelled immediately.' });

            await render(TEMPLATE);

            assert.dom(this.element).containsText('These orders will be cancelled immediately.');
            assert.dom(this.element).doesNotContainText('You have selected');
        });

        test('a subtitle is rendered in the heading', async function (assert) {
            this.set('options', { ...this.options, subtitle: 'Cancel these orders?', message: 'This cannot be undone.' });

            await render(TEMPLATE);

            assert.dom('h3').containsText('Cancel these orders?');
            assert.dom('h3').doesNotContainText('This cannot be undone.', 'the message belongs in the body, not the heading');
        });

        test('a subtitle with no message still fills the heading', async function (assert) {
            this.set('options', { ...this.options, subtitle: 'Cancel these orders?' });

            await render(TEMPLATE);

            assert.dom('h3').containsText('Cancel these orders?');
        });
    });

    module('the selection list', function () {
        test('it lists every record by the configured path', async function (assert) {
            await render(TEMPLATE);

            assert.deepEqual(
                findAll('li span').map((node) => node.textContent.trim()),
                ['Order 123', 'Order 456']
            );
        });

        test('each entry carries its identifiers', async function (assert) {
            await render(TEMPLATE);

            const [first] = findAll('li');
            assert.dom(first).hasAttribute('id', 'ord_1');
            assert.dom(first).hasAttribute('data-public-id', 'ORD-1');
        });

        test('resolveModelName switches to the pre-resolved name', async function (assert) {
            this.set('options', { ...this.options, resolveModelName: true });

            await render(TEMPLATE);

            assert.deepEqual(
                findAll('li span').map((node) => node.textContent.trim()),
                ['Resolved 123', 'Resolved 456']
            );
        });

        test('a record missing its name renders a not-available marker', async function (assert) {
            this.set('options', { ...this.options, selected: [{ id: 'ord_3', public_id: 'ORD-3' }], count: 1 });

            await render(TEMPLATE);

            assert.strictEqual(findAll('li').length, 1);
            assert.notStrictEqual(findAll('li span')[0].textContent.trim(), '', 'a placeholder is shown');
        });

        test('each record can be dropped from the selection', async function (assert) {
            await render(TEMPLATE);

            await click(findAll('li a')[1]);

            assert.strictEqual(removed.length, 1);
            assert.strictEqual(removed[0].id, 'ord_2');
        });

        test('a list scroll box class from the options is applied', async function (assert) {
            this.set('options', { ...this.options, listScrollBoxClass: 'my-scroll-box' });

            await render(TEMPLATE);

            assert.dom('ul').hasClass('my-scroll-box');
        });

        test('an empty selection renders no entries', async function (assert) {
            this.set('options', { ...this.options, selected: [], count: 0 });

            await render(TEMPLATE);

            assert.strictEqual(findAll('li').length, 0);
        });
    });

    test('a block is yielded the options', async function (assert) {
        await render(hbs`
            <Modals::BulkActionModel @options={{this.options}} as |options|>
                <span class="yielded-verb">{{options.verb}}</span>
            </Modals::BulkActionModel>
        `);

        assert.dom('.yielded-verb').hasText('cancel');
    });
});
