import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, fillIn, findAll } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | modals/tip-tap-editor-insert-table', function (hooks) {
    setupRenderingTest(hooks);

    const TEMPLATE = hbs`<Modals::TipTapEditorInsertTable @options={{this.options}} @onConfirm={{this.onConfirm}} @onDecline={{this.onDecline}} />`;

    test('it offers a row and a column field seeded from the options', async function (assert) {
        this.set('options', { rows: 3, columns: 4 });

        await render(TEMPLATE);

        const inputs = findAll('input');
        assert.strictEqual(inputs.length, 2, 'two dimensions are asked for');
        assert.dom(inputs[0]).hasValue('3');
        assert.dom(inputs[1]).hasValue('4');
        assert.dom(this.element).containsText('Rows');
        assert.dom(this.element).containsText('Columns');
    });

    test('each field explains itself', async function (assert) {
        this.set('options', { rows: 3, columns: 3 });

        await render(TEMPLATE);

        assert.dom(this.element).containsText('The number of rows for the table');
        assert.dom(this.element).containsText('The number of columns for the table');
    });

    test('editing the dimensions writes them back to the options', async function (assert) {
        const options = { rows: 3, columns: 3 };
        this.set('options', options);

        await render(TEMPLATE);
        const inputs = findAll('input');
        await fillIn(inputs[0], '8');
        await fillIn(inputs[1], '2');

        assert.strictEqual(options.rows, '8');
        assert.strictEqual(options.columns, '2');
    });

    test('it renders with no options at all', async function (assert) {
        await render(hbs`<Modals::TipTapEditorInsertTable />`);

        assert.strictEqual(findAll('input').length, 2, 'the fields are still offered');
    });
});
