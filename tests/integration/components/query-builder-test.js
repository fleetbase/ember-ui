import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, fillIn, findAll, find } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import { selectChoose, getDropdownItems } from 'ember-power-select/test-support';

const ORDERS = {
    name: 'orders',
    label: 'Orders',
    columns: [
        { name: 'status', label: 'Status', type: 'string' },
        { name: 'total', label: 'Total', type: 'number' },
    ],
    relationships: { customer: { table: 'customers' } },
};

const PRODUCTS = {
    name: 'products',
    label: 'Products',
    columns: [{ name: 'sku', label: 'SKU', type: 'string' }],
};

// The shape query-builder hands to its children once a table and columns are chosen.
function selectedColumn(table, column) {
    return { ...column, table: table.name, full: `${table.name}.${column.name}`, label: column.label };
}

function buttonWithText(text) {
    return findAll('button').find((button) => button.textContent.trim().toLowerCase().includes(text.toLowerCase()));
}

function panelTitles() {
    return findAll('.query-builder-panel-title').map((node) => node.textContent.trim());
}

module('Integration | Component | query-builder', function (hooks) {
    setupRenderingTest(hooks);

    let changes;

    hooks.beforeEach(function () {
        changes = [];
        this.set('tables', [ORDERS, PRODUCTS]);
        this.set('onChange', (queryObject) => changes.push(queryObject));
    });

    function lastQuery() {
        return changes[changes.length - 1];
    }

    module('layout', function () {
        test('without a block it renders the full builder', async function (assert) {
            await render(hbs`<QueryBuilder @tables={{this.tables}} @onChange={{this.onChange}} />`);

            assert.dom('.query-builder').exists();
            const titles = panelTitles();
            for (const title of ['Actions', 'Data Source', 'Group By', 'Sort By', 'Limit Results']) {
                assert.true(
                    titles.some((rendered) => rendered.includes(title)),
                    `the ${title} panel is rendered`
                );
            }
        });

        test('with a block it yields only the requested sections', async function (assert) {
            await render(hbs`
                <QueryBuilder @tables={{this.tables}} @onChange={{this.onChange}} as |qb|>
                    <qb.select />
                </QueryBuilder>
            `);

            assert.dom('.query-builder').doesNotExist('the default layout is replaced by the block');
            assert.deepEqual(panelTitles(), ['Data Source'], 'only the yielded section renders');
        });

        test('the limit section reports its default as soon as it renders', async function (assert) {
            await render(hbs`
                <QueryBuilder @onChange={{this.onChange}} as |qb|>
                    <qb.limit />
                </QueryBuilder>
            `);

            assert.strictEqual(lastQuery().limit, 50, 'the default limit reaches the query object');
        });

        test('a quick limit updates the query object', async function (assert) {
            await render(hbs`
                <QueryBuilder @onChange={{this.onChange}} as |qb|>
                    <qb.limit />
                </QueryBuilder>
            `);

            await click(buttonWithText('250'));

            assert.strictEqual(lastQuery().limit, 250);
        });

        test('it survives having no onChange handler', async function (assert) {
            await render(hbs`<QueryBuilder @tables={{this.tables}} />`);

            assert.dom('.query-builder').exists('rendering does not depend on a handler');
        });
    });

    module('choosing a data source', function () {
        const TEMPLATE = hbs`
            <QueryBuilder @tables={{this.tables}} @initialQuery={{this.initialQuery}} @onChange={{this.onChange}} as |qb|>
                <qb.select />
            </QueryBuilder>
        `;

        test('selecting a table puts it on the query object', async function (assert) {
            await render(TEMPLATE);
            await selectChoose('.query-builder-panel-content', 'Orders');

            assert.strictEqual(lastQuery().table.name, 'orders');
        });

        test('changing the table clears everything derived from the old one', async function (assert) {
            this.set('initialQuery', {
                table: PRODUCTS,
                columns: [selectedColumn(PRODUCTS, PRODUCTS.columns[0])],
                joins: [{ table: ORDERS }],
                conditions: [{ field: 'x' }],
                groupBy: [{ id: 1 }],
                sortBy: [{ id: 2 }],
                limit: 10,
            });

            await render(TEMPLATE);
            await selectChoose('.query-builder-panel-content', 'Orders');

            const query = lastQuery();
            assert.strictEqual(query.table.name, 'orders');
            assert.deepEqual(query.columns, [], 'columns are cleared');
            assert.deepEqual(query.joins, [], 'joins are cleared');
            assert.deepEqual(query.conditions, [], 'conditions are cleared');
            assert.deepEqual(query.groupBy, [], 'groupings are cleared');
            assert.deepEqual(query.sortBy, [], 'sorts are cleared');
            assert.strictEqual(query.limit, 10, 'the limit is deliberately kept');
        });
    });

    module('selecting columns', function (hooks) {
        const TEMPLATE = hbs`
            <QueryBuilder @initialQuery={{this.initialQuery}} @onChange={{this.onChange}} as |qb|>
                <qb.columns />
            </QueryBuilder>
        `;

        hooks.beforeEach(function () {
            this.set('initialQuery', { table: ORDERS });
        });

        test('picking a column adds it to the query object with a null alias', async function (assert) {
            await render(TEMPLATE);
            await click(findAll('.column-checkbox-wrapper input')[0]);

            const query = lastQuery();
            assert.strictEqual(query.columns.length, 1);
            assert.strictEqual(query.columns[0].name, 'status');
            assert.strictEqual(query.columns[0].alias, null, 'no alias has been given yet');
        });

        test('an alias typed for a column reaches the query object', async function (assert) {
            await render(TEMPLATE);
            await click(findAll('.column-checkbox-wrapper input')[0]);
            await fillIn('.column-alias-input', 'order_state');

            assert.strictEqual(lastQuery().columns[0].alias, 'order_state');
        });
    });

    module('grouping and sorting', function (hooks) {
        hooks.beforeEach(function () {
            this.set('initialQuery', {
                table: ORDERS,
                columns: ORDERS.columns.map((column) => selectedColumn(ORDERS, column)),
            });
        });

        test('a grouping added by the child reaches the query object', async function (assert) {
            await render(hbs`
                <QueryBuilder @initialQuery={{this.initialQuery}} @onChange={{this.onChange}} as |qb|>
                    <qb.group />
                </QueryBuilder>
            `);

            await selectChoose('.query-builder-panel-content .grid > div:nth-child(1)', 'Status');
            await selectChoose('.query-builder-panel-content .grid > div:nth-child(2)', 'Count');
            await click(buttonWithText('Add Grouping'));

            const query = lastQuery();
            assert.strictEqual(query.groupBy.length, 1);
            assert.strictEqual(query.groupBy[0].groupBy.full, 'orders.status');
        });

        test('a sort added by the child reaches the query object', async function (assert) {
            await render(hbs`
                <QueryBuilder @initialQuery={{this.initialQuery}} @onChange={{this.onChange}} as |qb|>
                    <qb.sort />
                </QueryBuilder>
            `);

            await selectChoose('.query-builder-panel-content .grid > div:nth-child(1)', 'Total');
            await click(buttonWithText('Add Sort'));

            const query = lastQuery();
            assert.strictEqual(query.sortBy.length, 1);
            assert.strictEqual(query.sortBy[0].column.full, 'orders.total');
        });

        test('a condition added by the child reaches the query object', async function (assert) {
            await render(hbs`
                <QueryBuilder @initialQuery={{this.initialQuery}} @onChange={{this.onChange}} as |qb|>
                    <qb.conditions />
                </QueryBuilder>
            `);

            await click(buttonWithText('Add condition'));

            assert.true(lastQuery().conditions.length > 0, 'the condition is recorded on the query object');
        });
    });

    module('columns available to the children', function () {
        test('columns selected on a join join the main ones in the condition field list', async function (assert) {
            this.set('initialQuery', {
                table: ORDERS,
                columns: [selectedColumn(ORDERS, ORDERS.columns[0])],
                joins: [{ table: PRODUCTS, selectedColumns: [selectedColumn(PRODUCTS, PRODUCTS.columns[0])] }],
            });

            await render(hbs`
                <QueryBuilder @initialQuery={{this.initialQuery}} @onChange={{this.onChange}} as |qb|>
                    <qb.conditions />
                </QueryBuilder>
            `);

            await click(buttonWithText('Add condition'));
            const options = await getDropdownItems('.condition-field');

            assert.true(
                options.some((option) => option.includes('Status')),
                'the main table contributes its selected columns'
            );
            assert.true(
                options.some((option) => option.includes('SKU')),
                'a joined table contributes the columns selected on it'
            );
        });

        test('a join with no selected columns contributes nothing', async function (assert) {
            this.set('initialQuery', {
                table: ORDERS,
                columns: [selectedColumn(ORDERS, ORDERS.columns[0])],
                joins: [{ table: PRODUCTS }],
            });

            await render(hbs`
                <QueryBuilder @initialQuery={{this.initialQuery}} @onChange={{this.onChange}} as |qb|>
                    <qb.conditions />
                </QueryBuilder>
            `);

            await click(buttonWithText('Add condition'));
            const options = await getDropdownItems('.condition-field');

            assert.strictEqual(options.length, 1, 'only the selected main-table column is listed');
        });

        test('columns selected on a join are groupable alongside the main ones', async function (assert) {
            this.set('initialQuery', {
                table: ORDERS,
                columns: [selectedColumn(ORDERS, ORDERS.columns[0])],
                joins: [{ table: PRODUCTS, selectedColumns: [selectedColumn(PRODUCTS, PRODUCTS.columns[0])] }],
            });

            await render(hbs`
                <QueryBuilder @initialQuery={{this.initialQuery}} @onChange={{this.onChange}} as |qb|>
                    <qb.group />
                </QueryBuilder>
            `);

            const options = await getDropdownItems('.query-builder-panel-content .grid > div:nth-child(1)');

            assert.true(options.some((option) => option.includes('Status')));
            assert.true(
                options.some((option) => option.includes('SKU')),
                'a column selected on a join is offered for grouping'
            );
        });

        test('with no table and no joins there is nothing to build a query from', async function (assert) {
            await render(hbs`
                <QueryBuilder @onChange={{this.onChange}} as |qb|>
                    <qb.group />
                </QueryBuilder>
            `);

            assert.dom(this.element).containsText('Select columns first to enable grouping');
        });
    });

    module('loading an existing query', function () {
        test('an initial query populates every section', async function (assert) {
            this.set('initialQuery', {
                table: ORDERS,
                columns: [{ ...selectedColumn(ORDERS, ORDERS.columns[0]), alias: 'order_state' }, selectedColumn(ORDERS, ORDERS.columns[1])],
                joins: [{ table: PRODUCTS }],
                conditions: [{ field: 'orders.status' }],
                groupBy: [{ id: 1, groupBy: selectedColumn(ORDERS, ORDERS.columns[0]), aggregateFn: { value: 'count', label: 'Count' }, aggregateBy: { label: 'All Records' } }],
                sortBy: [{ id: 2, column: { ...selectedColumn(ORDERS, ORDERS.columns[1]), sortLabel: 'Total' }, direction: { value: 'asc', label: 'Ascending' } }],
                limit: 250,
            });

            await render(hbs`
                <QueryBuilder @initialQuery={{this.initialQuery}} @onChange={{this.onChange}} as |qb|>
                    <qb.group />
                    <qb.sort />
                    <qb.limit />
                </QueryBuilder>
            `);

            assert.strictEqual(findAll('.group-sort-item').length, 2, 'the saved grouping and sort are both restored');

            // The limit child re-notifies on insert, which is the first chance to observe
            // the restored query object.
            const query = lastQuery();
            assert.strictEqual(query.table.name, 'orders');
            assert.strictEqual(query.joins.length, 1);
            assert.strictEqual(query.conditions.length, 1);
            assert.strictEqual(query.groupBy.length, 1);
            assert.strictEqual(query.sortBy.length, 1);
        });

        test('aliases are extracted from the loaded columns', async function (assert) {
            this.set('initialQuery', {
                table: ORDERS,
                columns: [{ ...selectedColumn(ORDERS, ORDERS.columns[0]), alias: 'order_state' }, selectedColumn(ORDERS, ORDERS.columns[1])],
            });

            await render(hbs`
                <QueryBuilder @initialQuery={{this.initialQuery}} @onChange={{this.onChange}} as |qb|>
                    <qb.columns />
                </QueryBuilder>
            `);

            assert.dom(findAll('.column-alias-input')[0]).hasValue('order_state', 'the saved alias is restored into the editor');

            // Toggling an unrelated column forces a notification carrying the query object.
            await click(findAll('.column-checkbox-wrapper input')[1]);
            const aliased = lastQuery().columns.find((column) => column.name === 'status');
            assert.strictEqual(aliased.alias, 'order_state', 'the alias survives on the query object');
        });

        test('a sparse initial query leaves the untouched sections empty', async function (assert) {
            this.set('initialQuery', { limit: 10 });

            await render(hbs`
                <QueryBuilder @initialQuery={{this.initialQuery}} @onChange={{this.onChange}} as |qb|>
                    <qb.group />
                </QueryBuilder>
            `);

            assert.strictEqual(findAll('.group-sort-item').length, 0);
            assert.dom(this.element).containsText('Select columns first to enable grouping');
        });
    });

    module('actions', function (hooks) {
        const TEMPLATE = hbs`
            <QueryBuilder
                @initialQuery={{this.initialQuery}}
                @onChange={{this.onChange}}
                @onExecute={{this.onExecute}}
                @onSave={{this.onSave}}
                @onClear={{this.onClear}}
                as |qb|
            >
                <qb.actions />
            </QueryBuilder>
        `;

        hooks.beforeEach(function () {
            this.set('initialQuery', {
                table: ORDERS,
                columns: [selectedColumn(ORDERS, ORDERS.columns[0])],
                limit: 100,
            });
        });

        test('execute hands the current query object to the handler', async function (assert) {
            let executed;
            this.set('onExecute', (query) => (executed = query));

            await render(TEMPLATE);
            await click(buttonWithText('Execute'));

            assert.strictEqual(executed.table.name, 'orders');
            assert.strictEqual(executed.columns.length, 1);
        });

        test('save hands the current query object to the handler', async function (assert) {
            let saved;
            this.set('onSave', (query) => (saved = query));

            await render(TEMPLATE);
            await click(buttonWithText('Save'));

            assert.strictEqual(saved.limit, 100);
        });

        test('clear resets the query and reports the empty state', async function (assert) {
            let cleared;
            this.set('onClear', (query) => (cleared = query));

            await render(TEMPLATE);
            await click(buttonWithText('Clear'));

            assert.strictEqual(cleared.table, null, 'the table is cleared');
            assert.deepEqual(cleared.columns, []);
            assert.strictEqual(cleared.limit, null);
            assert.strictEqual(lastQuery().table, null, 'the reset is also reported through onChange');
        });

        test('the buttons are inert when no handlers are given', async function (assert) {
            await render(hbs`
                <QueryBuilder @initialQuery={{this.initialQuery}} as |qb|>
                    <qb.actions />
                </QueryBuilder>
            `);

            await click(buttonWithText('Execute'));
            await click(buttonWithText('Save'));
            await click(buttonWithText('Clear'));

            assert.ok(find('.query-builder-panel'), 'no handler is required for any action');
        });
    });
});
