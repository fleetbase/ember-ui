import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, fillIn, findAll } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

const COLUMNS = [
    { name: 'status', label: 'Status', type: 'string' },
    { name: 'total', label: 'Total', type: 'decimal' },
    { name: 'created_at', label: 'Created At', type: 'datetime' },
];

function columnItems() {
    return findAll('.column-item');
}

function checkboxAt(index) {
    return columnItems()[index].querySelector('input');
}

function labels() {
    return findAll('.column-label').map((node) => node.textContent.trim());
}

function buttonWithText(text) {
    return findAll('button').find((button) => button.textContent.trim().includes(text));
}

function selectedChips() {
    return findAll('span.inline-flex').map((node) => node.textContent.replace(/\s+/g, ' ').trim());
}

module('Integration | Component | query-builder/column-select', function (hooks) {
    setupRenderingTest(hooks);

    let changes;

    hooks.beforeEach(function () {
        changes = [];
        this.set('columns', COLUMNS);
        this.set('onChange', (columns, aliases) => changes.push({ columns, aliases }));
    });

    const TEMPLATE = hbs`
        <QueryBuilder::ColumnSelect
            @columns={{this.columns}}
            @selectedColumns={{this.selectedColumns}}
            @columnAliases={{this.columnAliases}}
            @onChange={{this.onChange}}
        />
    `;

    function lastChange() {
        return changes[changes.length - 1];
    }

    module('listing', function () {
        test('it lists every column with its type and reports none selected', async function (assert) {
            await render(TEMPLATE);

            assert.dom('.query-builder-panel-title').containsText('Select fields');
            assert.deepEqual(labels(), ['Status', 'Total', 'Created At']);
            assert.dom('.column-type').hasText('string');
            assert.dom('.query-builder-panel-header').containsText('None selected');
        });

        test('with no columns it invites the user to pick a data source', async function (assert) {
            this.set('columns', undefined);

            await render(TEMPLATE);

            assert.strictEqual(columnItems().length, 0);
            assert.dom(this.element).containsText('Select a data source');
            assert.dom(this.element).containsText('Choose a table to see available fields');
        });

        test('the search box filters by label and by name', async function (assert) {
            await render(TEMPLATE);

            await fillIn('.query-builder-panel-header input', 'tot');
            assert.deepEqual(labels(), ['Total'], 'matching is case-insensitive on the label');

            await fillIn('.query-builder-panel-header input', 'created_at');
            assert.deepEqual(labels(), ['Created At'], 'the underlying column name also matches');

            await fillIn('.query-builder-panel-header input', '   ');
            assert.deepEqual(labels(), ['Status', 'Total', 'Created At'], 'whitespace is not a search');

            await fillIn('.query-builder-panel-header input', 'nothing matches this');
            assert.strictEqual(columnItems().length, 0);
            assert.dom(this.element).containsText('Select a data source', 'the empty state is shown for an empty result');
        });

        test('a column missing a label or name is still searchable without throwing', async function (assert) {
            this.set('columns', [{ type: 'string' }, { name: 'sku', type: 'string' }]);

            await render(TEMPLATE);
            await fillIn('.query-builder-panel-header input', 'sku');

            assert.strictEqual(columnItems().length, 1, 'the sparse column is simply filtered out');
        });
    });

    module('selecting', function () {
        test('checking a column selects it and reports it with a null alias', async function (assert) {
            await render(TEMPLATE);
            await click(checkboxAt(0));

            assert.dom(columnItems()[0]).hasClass('selected');
            assert.dom('.query-builder-panel-header').containsText('1 selected');
            assert.deepEqual(lastChange().columns, [{ ...COLUMNS[0], alias: null }]);
            assert.deepEqual(lastChange().aliases, {});
        });

        test('checking it again deselects it', async function (assert) {
            await render(TEMPLATE);
            await click(checkboxAt(0));
            await click(checkboxAt(0));

            assert.dom(columnItems()[0]).doesNotHaveClass('selected');
            assert.deepEqual(lastChange().columns, []);
            assert.dom('.query-builder-panel-header').containsText('None selected');
        });

        test('selected columns appear as chips that can remove themselves', async function (assert) {
            await render(TEMPLATE);
            await click(checkboxAt(0));
            await click(checkboxAt(1));

            const chips = selectedChips();
            assert.strictEqual(chips.length, 2);
            assert.true(chips[0].includes('Status'));

            await click(findAll('span.inline-flex button')[0]);

            assert.strictEqual(selectedChips().length, 1);
            assert.deepEqual(
                lastChange().columns.map((column) => column.name),
                ['total']
            );
        });

        test('select all takes every column, clear all takes none', async function (assert) {
            await render(TEMPLATE);

            await click(checkboxAt(0));
            await click(buttonWithText('Select All'));

            assert.strictEqual(lastChange().columns.length, 3);
            assert.dom('.query-builder-panel-header').containsText('3 selected');

            await click(buttonWithText('Clear All'));

            assert.deepEqual(lastChange().columns, []);
            assert.deepEqual(lastChange().aliases, {}, 'aliases are cleared alongside the columns');
            assert.notOk(buttonWithText('Select All'), 'the bulk controls hide when nothing is selected');
        });

        test('select all is a no-op when there are no columns to take', async function (assert) {
            this.set('columns', undefined);
            this.set('selectedColumns', [COLUMNS[0]]);

            await render(TEMPLATE);
            await click(buttonWithText('Select All'));

            assert.strictEqual(changes.length, 0, 'nothing is reported because there was nothing to select');
        });

        test('preselected columns are shown as selected', async function (assert) {
            this.set('selectedColumns', [COLUMNS[1]]);

            await render(TEMPLATE);

            assert.dom(columnItems()[1]).hasClass('selected');
            assert.dom('.query-builder-panel-header').containsText('1 selected');
        });
    });

    module('aliases', function () {
        test('the alias editor only appears for a selected column', async function (assert) {
            await render(TEMPLATE);
            assert.strictEqual(findAll('.column-alias-input').length, 0);

            await click(checkboxAt(0));

            assert.strictEqual(findAll('.column-alias-input').length, 1);
            assert.dom('.column-alias-input').hasAttribute('placeholder', 'status', 'the column name is the placeholder');
        });

        test('an alias is reported alongside the column', async function (assert) {
            await render(TEMPLATE);
            await click(checkboxAt(0));
            await fillIn('.column-alias-input', 'order_state');

            assert.strictEqual(lastChange().aliases.status, 'order_state');
            assert.strictEqual(lastChange().columns[0].alias, 'order_state');
            assert.true(selectedChips()[0].includes('as order_state'), 'the chip shows the alias');
        });

        // Regression: the alias field used to be a two-way `<Input @value>`, whose write-back
        // landed AFTER updateAlias and re-inserted the raw text into the hash the callback had
        // already been handed.
        test('a whitespace-only alias is not written back into the reported aliases', async function (assert) {
            await render(TEMPLATE);
            await click(checkboxAt(0));
            await fillIn('.column-alias-input', '   ');

            const reported = lastChange().aliases;

            assert.deepEqual(reported, {}, 'the hash handed to onChange holds no alias');
            assert.notOk('status' in reported, 'and the key is absent rather than holding whitespace');
        });

        test('a whitespace-only alias is treated as no alias', async function (assert) {
            await render(TEMPLATE);
            await click(checkboxAt(0));
            await fillIn('.column-alias-input', '   ');

            assert.strictEqual(lastChange().columns[0].alias, null, 'the reported column carries no alias');
        });

        test('clearing an alias removes it', async function (assert) {
            await render(TEMPLATE);
            await click(checkboxAt(0));
            await fillIn('.column-alias-input', 'order_state');
            assert.strictEqual(lastChange().columns[0].alias, 'order_state');

            await fillIn('.column-alias-input', '');

            assert.strictEqual(lastChange().columns[0].alias, null, 'the alias is gone from the reported column');
        });

        test('deselecting a column drops its alias', async function (assert) {
            await render(TEMPLATE);
            await click(checkboxAt(0));
            await fillIn('.column-alias-input', 'order_state');
            await click(checkboxAt(0));

            assert.deepEqual(lastChange().aliases, {});
        });

        test('a preselected alias is restored into the editor', async function (assert) {
            this.set('selectedColumns', [COLUMNS[0]]);
            this.set('columnAliases', { status: 'order_state' });

            await render(TEMPLATE);

            assert.dom('.column-alias-input').hasValue('order_state');
        });
    });

    test('it works without an onChange handler', async function (assert) {
        await render(hbs`<QueryBuilder::ColumnSelect @columns={{this.columns}} />`);
        await click(checkboxAt(0));

        assert.dom('.query-builder-panel-header').containsText('1 selected');
    });

    test('it forwards splattributes', async function (assert) {
        await render(hbs`<QueryBuilder::ColumnSelect data-test-column-select="yes" />`);

        assert.dom('.query-builder-panel').hasAttribute('data-test-column-select', 'yes');
    });
});
