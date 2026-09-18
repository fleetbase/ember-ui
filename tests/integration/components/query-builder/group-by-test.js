import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, findAll, triggerEvent, settled } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import { selectChoose, getDropdownItems } from 'ember-power-select/test-support';

const COLUMNS = [
    { name: 'status', label: 'Status', type: 'string', full: 'orders.status' },
    { name: 'total', label: 'Total', type: 'number', full: 'orders.total' },
    { name: 'created_at', label: 'Created At', type: 'datetime', full: 'orders.created_at' },
];

// The three power-selects are unlabelled siblings in the same grid, so they are
// addressed positionally: group-by column, aggregate function, aggregate-by column.
const GROUP_BY_SELECT = '.query-builder-panel-content .grid > div:nth-child(1)';
const FN_SELECT = '.query-builder-panel-content .grid > div:nth-child(2)';
const AGGREGATE_BY_SELECT = '.query-builder-panel-content .grid > div:nth-child(3)';

function groupSortItems() {
    return findAll('.group-sort-item');
}

function addButton() {
    return findAll('button').find((button) => button.textContent.includes('Add Grouping'));
}

module('Integration | Component | query-builder/group-by', function (hooks) {
    setupRenderingTest(hooks);

    let changes;

    hooks.beforeEach(function () {
        changes = [];
        this.set('selectedColumns', COLUMNS);
        this.set('allSelectedColumns', COLUMNS);
        this.set('onChange', (items) => changes.push(items));
    });

    const TEMPLATE = hbs`
        <QueryBuilder::GroupBy
            @selectedColumns={{this.selectedColumns}}
            @allSelectedColumns={{this.allSelectedColumns}}
            @groupBy={{this.groupBy}}
            @onChange={{this.onChange}}
        />
    `;

    module('availability and messaging', function () {
        test('it renders the panel and reports that nothing is grouped yet', async function (assert) {
            await render(TEMPLATE);

            assert.dom('.query-builder-panel').exists();
            assert.dom('.query-builder-panel-header').containsText('Group By');
            assert.dom('.query-builder-panel-header').containsText('No grouping');
        });

        test('with no columns it explains that columns must be selected first', async function (assert) {
            this.set('selectedColumns', []);
            this.set('allSelectedColumns', []);

            await render(TEMPLATE);

            assert.dom(this.element).containsText('Select columns first to enable grouping');
            assert.dom(this.element).containsText('Select columns in the "Select Fields" section first');
        });

        test('aggregated columns are excluded from the group-by options', async function (assert) {
            this.set('allSelectedColumns', [
                { name: 'status', label: 'Status', type: 'string', full: 'orders.status' },
                { name: 'total', label: 'Total', type: 'number', full: 'orders.total', aggregate: 'sum' },
            ]);

            await render(TEMPLATE);
            const options = await getDropdownItems(GROUP_BY_SELECT);

            assert.true(options.some((option) => option.includes('Status')));
            assert.false(
                options.some((option) => option.includes('Total')),
                'a column that is already aggregated cannot also be grouped by'
            );
        });

        test('an aggregate of "none" does not exclude the column', async function (assert) {
            this.set('allSelectedColumns', [{ name: 'total', label: 'Total', type: 'number', full: 'orders.total', aggregate: 'none' }]);

            await render(TEMPLATE);
            const options = await getDropdownItems(GROUP_BY_SELECT);

            assert.true(options.some((option) => option.includes('Total')));
        });

        test('it reports when every column is already aggregated', async function (assert) {
            this.set('allSelectedColumns', [{ name: 'total', label: 'Total', type: 'number', full: 'orders.total', aggregate: 'sum' }]);

            await render(TEMPLATE);

            assert.dom(this.element).containsText('No non-aggregated columns available for grouping');
            assert.dom(this.element).doesNotContainText('Select columns in the "Select Fields" section first', 'columns are selected, they are just all aggregated');
        });

        test('it falls back to selectedColumns when allSelectedColumns is absent', async function (assert) {
            this.set('allSelectedColumns', undefined);

            await render(TEMPLATE);
            const options = await getDropdownItems(GROUP_BY_SELECT);

            assert.strictEqual(options.length, COLUMNS.length, 'the fallback list is used');
        });

        test('the grouping rules panel only shows when grouping is possible', async function (assert) {
            this.set('selectedColumns', []);
            this.set('allSelectedColumns', []);

            await render(TEMPLATE);
            assert.dom(this.element).doesNotContainText('Grouping Rules');

            this.set('selectedColumns', COLUMNS);
            this.set('allSelectedColumns', COLUMNS);
            await settled();

            assert.dom(this.element).containsText('Grouping Rules');
        });
    });

    module('aggregate function options', function () {
        test('every aggregate function is offered', async function (assert) {
            await render(TEMPLATE);
            const options = await getDropdownItems(FN_SELECT);

            for (const label of ['Count', 'Sum', 'Average', 'Minimum', 'Maximum', 'Concatenate']) {
                assert.true(
                    options.some((option) => option.includes(label)),
                    `${label} is offered`
                );
            }
        });

        test('the aggregate-by select is disabled until a function is chosen', async function (assert) {
            await render(TEMPLATE);

            assert.dom(`${AGGREGATE_BY_SELECT} .ember-power-select-trigger`).hasAttribute('aria-disabled', 'true');

            await selectChoose(FN_SELECT, 'Count');

            assert.dom(`${AGGREGATE_BY_SELECT} .ember-power-select-trigger`).hasAttribute('aria-disabled', 'false');
        });

        test('count offers an all-records option alongside every column', async function (assert) {
            await render(TEMPLATE);
            await selectChoose(FN_SELECT, 'Count');

            const options = await getDropdownItems(AGGREGATE_BY_SELECT);
            assert.true(
                options.some((option) => option.includes('All Records')),
                'count can operate on all records'
            );
            assert.true(options.some((option) => option.includes('Status')));
        });

        test('sum and average offer only numeric columns', async function (assert) {
            await render(TEMPLATE);

            await selectChoose(FN_SELECT, 'Sum');
            let options = await getDropdownItems(AGGREGATE_BY_SELECT);
            assert.true(options.some((option) => option.includes('Total')));
            assert.false(
                options.some((option) => option.includes('Status')),
                'a string column cannot be summed'
            );

            await selectChoose(FN_SELECT, 'Average');
            options = await getDropdownItems(AGGREGATE_BY_SELECT);
            assert.true(options.some((option) => option.includes('Total')));
            assert.false(options.some((option) => option.includes('Created At')));
        });

        test('minimum and maximum also accept dates and strings', async function (assert) {
            await render(TEMPLATE);

            await selectChoose(FN_SELECT, 'Minimum');
            let options = await getDropdownItems(AGGREGATE_BY_SELECT);
            assert.true(
                options.some((option) => option.includes('Total')),
                'numeric'
            );
            assert.true(
                options.some((option) => option.includes('Created At')),
                'datetime'
            );
            assert.true(
                options.some((option) => option.includes('Status')),
                'string'
            );

            await selectChoose(FN_SELECT, 'Maximum');
            options = await getDropdownItems(AGGREGATE_BY_SELECT);
            assert.strictEqual(options.length, COLUMNS.length);
        });

        test('concatenate offers only text columns', async function (assert) {
            await render(TEMPLATE);
            await selectChoose(FN_SELECT, 'Concatenate');

            const options = await getDropdownItems(AGGREGATE_BY_SELECT);
            assert.true(options.some((option) => option.includes('Status')));
            assert.false(
                options.some((option) => option.includes('Total')),
                'a number cannot be concatenated'
            );
        });
    });

    module('adding and removing groupings', function () {
        test('the add button is disabled until every part is chosen', async function (assert) {
            await render(TEMPLATE);
            assert.dom(addButton()).isDisabled('nothing selected');

            await selectChoose(GROUP_BY_SELECT, 'Status');
            assert.dom(addButton()).isDisabled('no aggregate function yet');

            await selectChoose(FN_SELECT, 'Sum');
            assert.dom(addButton()).isDisabled('no aggregate-by column yet');

            await selectChoose(AGGREGATE_BY_SELECT, 'Total');
            assert.dom(addButton()).isNotDisabled('now complete');
        });

        test('choosing count auto-selects all records', async function (assert) {
            await render(TEMPLATE);
            await selectChoose(GROUP_BY_SELECT, 'Status');
            await selectChoose(FN_SELECT, 'Count');

            assert.dom(addButton()).isNotDisabled('count is immediately actionable');
        });

        test('switching away from count clears the auto-selection', async function (assert) {
            await render(TEMPLATE);
            await selectChoose(GROUP_BY_SELECT, 'Status');
            await selectChoose(FN_SELECT, 'Count');
            await selectChoose(FN_SELECT, 'Sum');

            assert.dom(addButton()).isDisabled('a new aggregate-by column must be chosen');
        });

        test('a function with no compatible column can never be added', async function (assert) {
            this.set('selectedColumns', [COLUMNS[2]]);
            this.set('allSelectedColumns', [COLUMNS[2]]);

            await render(TEMPLATE);
            await selectChoose(GROUP_BY_SELECT, 'Created At');
            await selectChoose(FN_SELECT, 'Sum');

            assert.dom(addButton()).isDisabled('a datetime column cannot be summed');
        });

        test('adding a grouping reports it and resets the selectors', async function (assert) {
            await render(TEMPLATE);
            await selectChoose(GROUP_BY_SELECT, 'Status');
            await selectChoose(FN_SELECT, 'Sum');
            await selectChoose(AGGREGATE_BY_SELECT, 'Total');
            await click(addButton());

            assert.strictEqual(changes.length, 1, 'the change is reported once');
            const [item] = changes[0];
            assert.strictEqual(item.groupBy.full, 'orders.status');
            assert.strictEqual(item.aggregateFn.value, 'sum');
            assert.strictEqual(item.aggregateBy.full, 'orders.total');
            assert.dom(addButton()).isDisabled('the selectors are cleared after adding');
        });

        test('an added grouping is described in the list and the header', async function (assert) {
            await render(TEMPLATE);
            await selectChoose(GROUP_BY_SELECT, 'Status');
            await selectChoose(FN_SELECT, 'Count');
            await click(addButton());

            assert.strictEqual(groupSortItems().length, 1);
            assert.dom('.group-sort-item').containsText('Group by');
            assert.dom('.group-sort-item').containsText('Status');
            assert.dom('.group-sort-item').containsText('Count');
            assert.dom('.group-sort-item').containsText('All Records');
            assert.dom('.query-builder-panel-header').containsText('1 group');
        });

        test('several groupings accumulate and the header pluralises', async function (assert) {
            await render(TEMPLATE);

            await selectChoose(GROUP_BY_SELECT, 'Status');
            await selectChoose(FN_SELECT, 'Count');
            await click(addButton());

            await selectChoose(GROUP_BY_SELECT, 'Created At');
            await selectChoose(FN_SELECT, 'Count');
            await click(addButton());

            assert.strictEqual(groupSortItems().length, 2);
            assert.strictEqual(changes[changes.length - 1].length, 2);
            assert.dom('.query-builder-panel-header').containsText('2 groups');
        });

        test('a grouping can be removed', async function (assert) {
            await render(TEMPLATE);
            await selectChoose(GROUP_BY_SELECT, 'Status');
            await selectChoose(FN_SELECT, 'Count');
            await click(addButton());

            await click(groupSortItems()[0].querySelector('button'));

            assert.strictEqual(groupSortItems().length, 0);
            assert.deepEqual(changes[changes.length - 1], [], 'the empty list is reported');
        });

        test('it starts from the groupBy argument', async function (assert) {
            this.set('groupBy', [
                {
                    id: 1,
                    groupBy: COLUMNS[0],
                    aggregateFn: { value: 'count', label: 'Count' },
                    aggregateBy: COLUMNS[1],
                },
            ]);

            await render(TEMPLATE);

            assert.strictEqual(groupSortItems().length, 1);
            assert.dom('.query-builder-panel-header').containsText('1 group');
        });

        test('grouping by a column that is not selected is refused', async function (assert) {
            const originalWarn = console.warn;
            const warnings = [];
            console.warn = (...args) => warnings.push(args.map(String).join(' '));

            try {
                // The group-by list is built from allSelectedColumns, but the guard in
                // addGroupBy checks selectedColumns — so a column present only in the
                // former is offered yet rejected on add.
                this.set('allSelectedColumns', COLUMNS);
                this.set('selectedColumns', [COLUMNS[1]]);

                await render(TEMPLATE);
                await selectChoose(GROUP_BY_SELECT, 'Status');
                await selectChoose(FN_SELECT, 'Count');
                await click(addButton());

                assert.strictEqual(changes.length, 0, 'nothing is reported');
                assert.strictEqual(groupSortItems().length, 0, 'nothing is added');
                assert.true(
                    warnings.some((warning) => warning.includes('Cannot group by column that is not selected')),
                    'the refusal is logged'
                );
            } finally {
                console.warn = originalWarn;
            }
        });

        test('it works without an onChange handler', async function (assert) {
            await render(hbs`<QueryBuilder::GroupBy @selectedColumns={{this.selectedColumns}} @allSelectedColumns={{this.allSelectedColumns}} />`);
            await selectChoose(GROUP_BY_SELECT, 'Status');
            await selectChoose(FN_SELECT, 'Count');
            await click(addButton());

            assert.strictEqual(groupSortItems().length, 1, 'the grouping is still added');
        });
    });

    module('reordering', function () {
        async function addGrouping(label) {
            await selectChoose(GROUP_BY_SELECT, label);
            await selectChoose(FN_SELECT, 'Count');
            await click(addButton());
        }

        test('dragging a grouping onto a later position reorders the list', async function (assert) {
            await render(TEMPLATE);
            await addGrouping('Status');
            await addGrouping('Created At');

            const items = findAll('.dragSortItem');
            assert.strictEqual(items.length, 2, 'both groupings are draggable');

            const dataTransfer = { setData() {}, setDragImage() {} };
            await triggerEvent(items[0], 'dragstart', { dataTransfer });
            await triggerEvent(items[1], 'dragover', { dataTransfer, clientY: items[1].getBoundingClientRect().bottom });
            await triggerEvent(items[0], 'dragend', { dataTransfer });

            const labels = groupSortItems().map((node) => node.textContent.replace(/\s+/g, ' ').trim());
            assert.true(labels[0].includes('Created At'), 'the dragged item moved down');
            assert.true(labels[1].includes('Status'));
            assert.strictEqual(changes[changes.length - 1][0].groupBy.label, 'Created At', 'the new order is reported');
        });

        test('dropping a grouping back where it started reports nothing', async function (assert) {
            await render(TEMPLATE);
            await addGrouping('Status');
            await addGrouping('Created At');

            const changesBefore = changes.length;
            const items = findAll('.dragSortItem');
            const dataTransfer = { setData() {}, setDragImage() {} };

            await triggerEvent(items[0], 'dragstart', { dataTransfer });
            await triggerEvent(items[0], 'dragend', { dataTransfer });

            const labels = groupSortItems().map((node) => node.textContent.replace(/\s+/g, ' ').trim());
            assert.true(labels[0].includes('Status'), 'the order is untouched');
            assert.strictEqual(changes.length, changesBefore, 'and a no-op drag is not reported as a change');
        });
    });

    test('it forwards splattributes', async function (assert) {
        await render(hbs`<QueryBuilder::GroupBy data-test-group-by="yes" />`);

        assert.dom('.query-builder-panel').hasAttribute('data-test-group-by', 'yes');
    });
    module('where the column list comes from', function () {
        test('with no allSelectedColumns it falls back to selectedColumns', async function (assert) {
            this.set('allSelectedColumns', undefined);

            await render(TEMPLATE);

            assert.dom(this.element).doesNotContainText('Select columns first', 'the fallback list is enough to enable grouping');
        });

        test('with neither list the panel asks for columns', async function (assert) {
            this.set('allSelectedColumns', undefined);
            this.set('selectedColumns', undefined);

            await render(TEMPLATE);

            assert.dom('.query-builder-panel').exists('the panel still renders');
            assert.dom(this.element).containsText('Select columns', 'and explains why it cannot group');
        });
    });
    // validateGroupByItems is wired to {{did-update}} on the selected columns. The existing tests
    // render with an empty column list, which never fires it — the branch only runs when the
    // columns CHANGE after a grouping already exists. Same shape as query-builder/conditions.
    module('reacting to the selected columns changing', function () {
        async function addGrouping(label) {
            await selectChoose(GROUP_BY_SELECT, label);
            await selectChoose(FN_SELECT, 'Count');
            await click(addButton());
        }

        test('every grouping is dropped when the columns go away', async function (assert) {
            await render(TEMPLATE);
            await addGrouping('Status');
            assert.strictEqual(groupSortItems().length, 1, 'a grouping exists');

            this.set('selectedColumns', []);
            await settled();

            assert.strictEqual(groupSortItems().length, 0, 'the grouping is gone');
            assert.deepEqual(changes[changes.length - 1], [], 'the empty state is reported');
        });

        test('losing the columns reports nothing when nothing was grouped', async function (assert) {
            await render(TEMPLATE);
            const reports = changes.length;

            this.set('selectedColumns', []);
            await settled();

            assert.strictEqual(changes.length, reports, 'no change is reported');
        });

        test('a grouping on a column that is no longer selected is pruned', async function (assert) {
            await render(TEMPLATE);
            await addGrouping('Status');
            await addGrouping('Created At');
            assert.strictEqual(groupSortItems().length, 2);

            this.set('selectedColumns', [COLUMNS[2]]);
            await settled();

            const remaining = changes[changes.length - 1];
            assert.strictEqual(remaining.length, 1, 'only the still-selected grouping survives');
            assert.strictEqual(remaining[0].groupBy.label, 'Created At');
        });

        test('a grouping whose column is still selected is left alone', async function (assert) {
            await render(TEMPLATE);
            await addGrouping('Status');
            const reports = changes.length;

            // Narrow the list but keep the grouped column in it.
            this.set('selectedColumns', [COLUMNS[0], COLUMNS[1]]);
            await settled();

            assert.strictEqual(changes.length, reports, 'nothing is reported when nothing was pruned');
            assert.strictEqual(groupSortItems().length, 1, 'and the grouping survives');
        });
    });
});
