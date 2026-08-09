import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, findAll, triggerEvent } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import { selectChoose, getDropdownItems } from 'ember-power-select/test-support';

const COLUMNS = [
    { name: 'status', label: 'Status', type: 'string', full: 'orders.status' },
    { name: 'total', label: 'Total', type: 'number', full: 'orders.total' },
    { name: 'created_at', label: 'Created At', type: 'datetime', full: 'orders.created_at' },
];

// The two power-selects are unlabelled siblings in the same grid: sort column, direction.
const COLUMN_SELECT = '.query-builder-panel-content .grid > div:nth-child(1)';
const DIRECTION_SELECT = '.query-builder-panel-content .grid > div:nth-child(2)';

function sortItems() {
    return findAll('.group-sort-item');
}

function addButton() {
    return findAll('button').find((button) => button.textContent.includes('Add Sort'));
}

function toggleButtonAt(index) {
    return sortItems()[index].querySelector('[title="Toggle sort direction"]');
}

function removeButtonAt(index) {
    return sortItems()[index].querySelectorAll('button')[1];
}

function itemText(index) {
    return sortItems()[index].textContent.replace(/\s+/g, ' ').trim();
}

module('Integration | Component | query-builder/sort-by', function (hooks) {
    setupRenderingTest(hooks);

    let changes;

    hooks.beforeEach(function () {
        changes = [];
        this.set('selectedColumns', COLUMNS);
        this.set('allSelectedColumns', COLUMNS);
        this.set('onChange', (items) => changes.push(items));
    });

    const TEMPLATE = hbs`
        <QueryBuilder::SortBy
            @selectedColumns={{this.selectedColumns}}
            @allSelectedColumns={{this.allSelectedColumns}}
            @sortBy={{this.sortBy}}
            @onChange={{this.onChange}}
        />
    `;

    module('availability and messaging', function () {
        test('it renders the panel and reports that nothing is sorted yet', async function (assert) {
            await render(TEMPLATE);

            assert.dom('.query-builder-panel').exists();
            assert.dom('.query-builder-panel-header').containsText('Sort By');
            assert.dom('.query-builder-panel-header').containsText('No sorting');
            assert.dom(this.element).containsText('Sorting Rules');
        });

        test('with no columns it explains that columns must be selected first', async function (assert) {
            this.set('selectedColumns', []);
            this.set('allSelectedColumns', []);

            await render(TEMPLATE);

            assert.dom(this.element).containsText('Select columns first to enable sorting');
            assert.dom(this.element).containsText('Select columns in the "Select Fields" section first');
            assert.dom(this.element).doesNotContainText('Sorting Rules');
        });

        test('it falls back to selectedColumns when allSelectedColumns is absent', async function (assert) {
            this.set('allSelectedColumns', undefined);

            await render(TEMPLATE);
            const options = await getDropdownItems(COLUMN_SELECT);

            assert.strictEqual(options.length, COLUMNS.length, 'the fallback list is used');
        });

        test('aggregated columns are offered with a function-qualified label', async function (assert) {
            this.set('allSelectedColumns', [
                { name: 'status', label: 'Status', type: 'string', full: 'orders.status' },
                { name: 'total', label: 'Total', type: 'number', full: 'orders.total', aggregate: 'sum' },
                { name: 'created_at', label: 'Created At', type: 'datetime', full: 'orders.created_at', aggregate: 'none' },
            ]);

            await render(TEMPLATE);
            const options = await getDropdownItems(COLUMN_SELECT);

            assert.true(
                options.some((option) => option.includes('SUM(Total)')),
                'an aggregated column is labelled with its function'
            );
            assert.true(
                options.some((option) => option.includes('Status')),
                'a plain column keeps its label'
            );
            assert.false(
                options.some((option) => option.includes('NONE(Created At)')),
                'an aggregate of "none" is not treated as aggregated'
            );
        });

        test('both directions are offered and ascending is preselected', async function (assert) {
            await render(TEMPLATE);

            const options = await getDropdownItems(DIRECTION_SELECT);
            assert.true(options.some((option) => option.includes('Ascending')));
            assert.true(options.some((option) => option.includes('Descending')));
            assert.dom(`${DIRECTION_SELECT} .ember-power-select-trigger`).containsText('Ascending', 'the default direction is preselected');
        });
    });

    module('adding sorts', function () {
        test('the add button is disabled until a column is chosen', async function (assert) {
            await render(TEMPLATE);
            assert.dom(addButton()).isDisabled('a direction alone is not enough');

            await selectChoose(COLUMN_SELECT, 'Status');

            assert.dom(addButton()).isNotDisabled();
        });

        test('adding a sort reports it and resets the column selector', async function (assert) {
            await render(TEMPLATE);
            await selectChoose(COLUMN_SELECT, 'Status');
            await selectChoose(DIRECTION_SELECT, 'Descending');
            await click(addButton());

            assert.strictEqual(changes.length, 1);
            const [item] = changes[0];
            assert.strictEqual(item.column.full, 'orders.status');
            assert.strictEqual(item.direction.value, 'desc');

            assert.dom(addButton()).isDisabled('the column selector is cleared');
            assert.dom(`${DIRECTION_SELECT} .ember-power-select-trigger`).containsText('Ascending', 'the direction resets to the default');
        });

        test('an added sort is described in the list and the header', async function (assert) {
            await render(TEMPLATE);
            await selectChoose(COLUMN_SELECT, 'Status');
            await click(addButton());

            assert.strictEqual(sortItems().length, 1);
            assert.true(itemText(0).includes('1.'), 'sorts are numbered by priority');
            assert.true(itemText(0).includes('Status'));
            assert.true(itemText(0).includes('Ascending'));
            assert.dom('.query-builder-panel-header').containsText('1 sort');
        });

        test('several sorts accumulate and the header pluralises', async function (assert) {
            await render(TEMPLATE);

            await selectChoose(COLUMN_SELECT, 'Status');
            await click(addButton());

            await selectChoose(COLUMN_SELECT, 'Total');
            await click(addButton());

            assert.strictEqual(sortItems().length, 2);
            assert.true(itemText(1).includes('2.'));
            assert.dom('.query-builder-panel-header').containsText('2 sorts');
        });

        test('re-adding a column updates its direction instead of duplicating it', async function (assert) {
            await render(TEMPLATE);

            await selectChoose(COLUMN_SELECT, 'Status');
            await click(addButton());

            await selectChoose(COLUMN_SELECT, 'Status');
            await selectChoose(DIRECTION_SELECT, 'Descending');
            await click(addButton());

            assert.strictEqual(sortItems().length, 1, 'the column is not listed twice');
            assert.true(itemText(0).includes('Descending'), 'the existing entry took the new direction');
            assert.strictEqual(changes[changes.length - 1][0].direction.value, 'desc');
        });

        test('sorting by a column that is not selected is refused', async function (assert) {
            const originalWarn = console.warn;
            const warnings = [];
            console.warn = (...args) => warnings.push(args.map(String).join(' '));

            try {
                // The column list is built from allSelectedColumns, but addSortBy validates
                // against selectedColumns — so a column present only in the former is
                // offered yet rejected on add.
                this.set('allSelectedColumns', COLUMNS);
                this.set('selectedColumns', [COLUMNS[1]]);

                await render(TEMPLATE);
                await selectChoose(COLUMN_SELECT, 'Status');
                await click(addButton());

                assert.strictEqual(changes.length, 0, 'nothing is reported');
                assert.strictEqual(sortItems().length, 0, 'nothing is added');
                assert.true(
                    warnings.some((warning) => warning.includes('Cannot sort by column that is not selected')),
                    'the refusal is logged'
                );
            } finally {
                console.warn = originalWarn;
            }
        });

        test('it works without an onChange handler', async function (assert) {
            await render(hbs`<QueryBuilder::SortBy @selectedColumns={{this.selectedColumns}} @allSelectedColumns={{this.allSelectedColumns}} />`);
            await selectChoose(COLUMN_SELECT, 'Status');
            await click(addButton());

            assert.strictEqual(sortItems().length, 1, 'the sort is still added');
        });

        test('it starts from the sortBy argument', async function (assert) {
            this.set('sortBy', [
                {
                    id: 1,
                    column: { ...COLUMNS[0], sortLabel: 'Status' },
                    direction: { value: 'desc', label: 'Descending', icon: 'arrow-down' },
                },
            ]);

            await render(TEMPLATE);

            assert.strictEqual(sortItems().length, 1);
            assert.true(itemText(0).includes('Descending'));
        });
    });

    module('editing existing sorts', function () {
        async function addSort(label) {
            await selectChoose(COLUMN_SELECT, label);
            await click(addButton());
        }

        test('the direction of an existing sort can be toggled both ways', async function (assert) {
            await render(TEMPLATE);
            await addSort('Status');
            assert.true(itemText(0).includes('Ascending'));

            await click(toggleButtonAt(0));
            assert.true(itemText(0).includes('Descending'), 'ascending toggles to descending');
            assert.strictEqual(changes[changes.length - 1][0].direction.value, 'desc');

            await click(toggleButtonAt(0));
            assert.true(itemText(0).includes('Ascending'), 'descending toggles back');
            assert.strictEqual(changes[changes.length - 1][0].direction.value, 'asc');
        });

        test('toggling one sort leaves the others alone', async function (assert) {
            await render(TEMPLATE);
            await addSort('Status');
            await addSort('Total');

            await click(toggleButtonAt(1));

            assert.true(itemText(0).includes('Ascending'), 'the first sort is untouched');
            assert.true(itemText(1).includes('Descending'));
        });

        test('a sort can be removed', async function (assert) {
            await render(TEMPLATE);
            await addSort('Status');
            await addSort('Total');

            await click(removeButtonAt(0));

            assert.strictEqual(sortItems().length, 1);
            assert.true(itemText(0).includes('Total'), 'the remaining sort is renumbered to first');
            assert.true(itemText(0).includes('1.'));
            assert.strictEqual(changes[changes.length - 1].length, 1);
        });

        test('removing the last sort empties the list', async function (assert) {
            await render(TEMPLATE);
            await addSort('Status');

            await click(removeButtonAt(0));

            assert.strictEqual(sortItems().length, 0);
            assert.deepEqual(changes[changes.length - 1], []);
            assert.dom('.query-builder-panel-header').containsText('No sorting');
        });

        // Regression: the template binds @dragEndAction={{this.reorderSortBy}} but the
        // class defined reorderGroupBy (copy-paste from group-by), so dragging silently
        // did nothing.
        test('dragging a sort onto a later position reorders the priority', async function (assert) {
            await render(TEMPLATE);
            await addSort('Status');
            await addSort('Total');

            const items = findAll('.dragSortItem');
            assert.strictEqual(items.length, 2, 'both sorts are draggable');

            const dataTransfer = { setData() {}, setDragImage() {} };
            await triggerEvent(items[0], 'dragstart', { dataTransfer });
            await triggerEvent(items[1], 'dragover', { dataTransfer, clientY: items[1].getBoundingClientRect().bottom });
            await triggerEvent(items[0], 'dragend', { dataTransfer });

            assert.true(itemText(0).includes('Total'), 'the dragged sort moved down');
            assert.true(itemText(1).includes('Status'));
            assert.strictEqual(changes[changes.length - 1][0].column.full, 'orders.total', 'the new priority order is reported');
        });

        test('dropping a sort back where it started reports nothing', async function (assert) {
            await render(TEMPLATE);
            await addSort('Status');
            await addSort('Total');

            const changesBefore = changes.length;
            const items = findAll('.dragSortItem');
            const dataTransfer = { setData() {}, setDragImage() {} };

            await triggerEvent(items[0], 'dragstart', { dataTransfer });
            await triggerEvent(items[0], 'dragend', { dataTransfer });

            assert.true(itemText(0).includes('Status'), 'the priority order is untouched');
            assert.strictEqual(changes.length, changesBefore, 'and a no-op drag is not reported as a change');
        });
    });

    test('it forwards splattributes', async function (assert) {
        await render(hbs`<QueryBuilder::SortBy data-test-sort-by="yes" />`);

        assert.dom('.query-builder-panel').hasAttribute('data-test-sort-by', 'yes');
    });
});
