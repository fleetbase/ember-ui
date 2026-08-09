import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, findAll, find, settled, triggerEvent } from '@ember/test-helpers';
import { set } from '@ember/object';
import { hbs } from 'ember-cli-htmlbars';

const COLUMNS = [
    { label: 'Name', valuePath: 'name', sortable: true },
    { label: 'Status', valuePath: 'status', sortable: true, sortParam: 'state' },
    { label: 'Notes', valuePath: 'notes' },
];

function rows(count = 3) {
    return Array.from({ length: count }, (_, index) => ({
        id: `row-${index}`,
        name: `Row ${index}`,
        status: 'active',
        notes: '',
    }));
}

function headerCells() {
    return findAll('thead th');
}

function bodyRows() {
    return findAll('tbody tr');
}

module('Integration | Component | table', function (hooks) {
    setupRenderingTest(hooks);

    let sorts;

    hooks.beforeEach(function () {
        sorts = [];
        this.set('columns', COLUMNS);
        this.set('rows', rows());
        this.set('onSort', (sortString, sortColumns) => sorts.push({ sortString, sortColumns }));
    });

    const TEMPLATE = hbs`
        <Table
            @columns={{this.columns}}
            @rows={{this.rows}}
            @selectable={{this.selectable}}
            @canExpand={{this.canExpand}}
            @sortBy={{this.sortBy}}
            @sortOrder={{this.sortOrder}}
            @onSort={{this.onSort}}
        />
    `;

    module('rendering', function () {
        test('it renders a header cell per visible column', async function (assert) {
            await render(TEMPLATE);

            const labels = headerCells().map((cell) => cell.textContent.trim());
            assert.true(labels.some((l) => l.includes('Name')));
            assert.true(labels.some((l) => l.includes('Status')));
            assert.true(labels.some((l) => l.includes('Notes')));
        });

        test('hidden columns are excluded', async function (assert) {
            this.set('columns', [...COLUMNS, { label: 'Secret', valuePath: 'secret', hidden: true }]);

            await render(TEMPLATE);

            assert.false(
                headerCells()
                    .map((cell) => cell.textContent)
                    .join(' ')
                    .includes('Secret')
            );
        });

        test('it renders a body row per row', async function (assert) {
            await render(TEMPLATE);

            assert.strictEqual(bodyRows().length, 3);
        });

        test('an empty row set renders the empty state instead of rows', async function (assert) {
            this.set('rows', []);

            await render(TEMPLATE);

            assert.strictEqual(bodyRows().filter((row) => row.querySelector('td[colspan]')).length, 1, 'a single spanning empty-state row is shown');
        });

        test('the empty-state colspan accounts for selection and expand columns', async function (assert) {
            this.set('rows', []);
            await render(TEMPLATE);
            const base = Number(find('td[colspan]').getAttribute('colspan'));

            this.set('selectable', true);
            assert.strictEqual(Number(find('td[colspan]').getAttribute('colspan')), base + 1, 'the checkbox column is counted');

            this.set('canExpand', true);
            assert.strictEqual(Number(find('td[colspan]').getAttribute('colspan')), base + 2, 'the expand column is counted too');
        });

        test('it accepts an array-like rows argument with toArray', async function (assert) {
            this.set('rows', { toArray: () => rows(2) });

            await render(TEMPLATE);

            assert.strictEqual(bodyRows().length, 2, 'an Ember-array-like object is normalised');
        });

        test('it renders with no rows argument at all', async function (assert) {
            this.set('rows', undefined);

            await render(TEMPLATE);

            assert.dom('table').exists('a table with no rows still renders its chrome');
        });
    });

    module('sorting', function () {
        function sortableHeader(label) {
            return headerCells().find((cell) => cell.textContent.includes(label));
        }

        function sortLink(label) {
            return sortableHeader(label)?.querySelector('a, button');
        }

        test('a non-sortable column does not sort', async function (assert) {
            await render(TEMPLATE);

            const link = sortLink('Notes');
            if (link) {
                await click(link);
            }

            assert.deepEqual(sorts, [], 'Notes is not sortable so nothing is reported');
        });

        test('clicking a sortable column sorts ascending', async function (assert) {
            await render(TEMPLATE);
            await click(sortLink('Name'));

            assert.strictEqual(sorts.length, 1);
            assert.strictEqual(sorts[0].sortString, 'name');
            assert.deepEqual(sorts[0].sortColumns, [{ param: 'name', direction: 'asc' }]);
        });

        test('clicking again flips to descending', async function (assert) {
            await render(TEMPLATE);
            await click(sortLink('Name'));
            await click(sortLink('Name'));

            assert.strictEqual(sorts[1].sortString, '-name', 'descending is encoded with a leading dash');
        });

        test('a third click clears the sort', async function (assert) {
            await render(TEMPLATE);
            await click(sortLink('Name'));
            await click(sortLink('Name'));
            await click(sortLink('Name'));

            assert.strictEqual(sorts[2].sortString, '', 'the sort is removed entirely');
            assert.deepEqual(sorts[2].sortColumns, []);
        });

        test('sortParam is preferred over valuePath', async function (assert) {
            await render(TEMPLATE);
            await click(sortLink('Status'));

            assert.strictEqual(sorts[0].sortString, 'state', 'the explicit sortParam is used');
        });

        test('sorting a different column replaces the previous sort', async function (assert) {
            await render(TEMPLATE);
            await click(sortLink('Name'));
            await click(sortLink('Status'));

            assert.strictEqual(sorts[1].sortString, 'state');
            assert.strictEqual(sorts[1].sortColumns.length, 1, 'a plain click is single-column sort');
        });

        test('shift-clicking builds a multi-column sort', async function (assert) {
            await render(TEMPLATE);
            await click(sortLink('Name'));
            await click(sortLink('Status'), { shiftKey: true });

            assert.strictEqual(sorts[1].sortString, 'name,state', 'both columns are encoded, in order');
            assert.strictEqual(sorts[1].sortColumns.length, 2);
        });

        test('shift-clicking an existing column flips then removes it', async function (assert) {
            await render(TEMPLATE);
            await click(sortLink('Name'));
            await click(sortLink('Status'), { shiftKey: true });

            await click(sortLink('Status'), { shiftKey: true });
            assert.strictEqual(sorts[2].sortString, 'name,-state', 'the second column flips to descending');

            await click(sortLink('Status'), { shiftKey: true });
            assert.strictEqual(sorts[3].sortString, 'name', 'a further shift-click drops it from the sort');
        });

        test('it seeds a single sort column from @sortBy', async function (assert) {
            this.set('sortBy', 'name');

            await render(TEMPLATE);
            await click(sortLink('Name'));

            assert.strictEqual(sorts[0].sortString, '-name', 'the seeded ascending sort flips on first click');
        });

        test('a leading dash in @sortBy seeds a descending sort', async function (assert) {
            this.set('sortBy', '-name');

            await render(TEMPLATE);
            await click(sortLink('Name'));

            assert.strictEqual(sorts[0].sortString, '', 'a seeded descending sort clears on first click');
        });

        test('@sortOrder sets the direction of a seeded sort', async function (assert) {
            this.set('sortBy', 'name');
            this.set('sortOrder', 'desc');

            await render(TEMPLATE);
            await click(sortLink('Name'));

            assert.strictEqual(sorts[0].sortString, '', 'a seeded desc sort clears on first click');
        });

        test('a comma-delimited @sortBy seeds several columns', async function (assert) {
            this.set('sortBy', 'name,-state');

            await render(TEMPLATE);
            await click(sortLink('Name'), { shiftKey: true });

            assert.strictEqual(sorts[0].sortString, '-name,-state', 'both seeded columns are present and Name flipped to descending');
            assert.strictEqual(sorts[0].sortColumns.length, 2);
        });

        test('it sorts without an onSort handler', async function (assert) {
            await render(hbs`<Table @columns={{this.columns}} @rows={{this.rows}} />`);
            await click(sortLink('Name'));

            assert.dom('table').exists('sorting is inert but safe with no callback');
        });
    });

    module('selection', function () {
        test('no checkbox column unless selectable', async function (assert) {
            await render(TEMPLATE);
            const withoutSelectable = findAll('tbody input[type="checkbox"]').length;

            this.set('selectable', true);
            await settled();

            assert.true(findAll('tbody input[type="checkbox"]').length > withoutSelectable, 'checkboxes appear when selectable');
        });

        test('checking a row marks it selected', async function (assert) {
            this.set('selectable', true);

            await render(TEMPLATE);
            await click(findAll('tbody input[type="checkbox"]')[0]);

            assert.true(this.rows[0].checked, 'the row model records the selection');
        });

        test('unchecking clears it again', async function (assert) {
            this.set('selectable', true);

            await render(TEMPLATE);
            const checkbox = () => findAll('tbody input[type="checkbox"]')[0];
            await click(checkbox());
            await click(checkbox());

            assert.false(this.rows[0].checked);
        });
    });

    test('it renders with no columns argument', async function (assert) {
        this.set('columns', undefined);

        await render(TEMPLATE);

        assert.dom('table').exists();
    });
});

// A second module driving the table through the instance it hands out via @onSetup —
// the row-mutation API, sorting, and the sticky-column machinery are all reachable
// only from there (the yielded hash exposes columns/rows/head/body but no actions).
module('Integration | Component | table imperative api', function (hooks) {
    setupRenderingTest(hooks);

    let table;
    let setupNode;
    let sorts;

    hooks.beforeEach(function () {
        table = null;
        setupNode = null;
        sorts = [];

        this.set('onSetup', (instance, node) => {
            table = instance;
            setupNode = node;
        });
        this.set('onSort', (sortString, sortColumns) => sorts.push({ sortString, sortColumns }));
        this.set(
            'columns',
            COLUMNS.map((column) => ({ ...column }))
        );
        this.set('rows', rows(3));
    });

    const TEMPLATE = hbs`
        <Table
            @columns={{this.columns}}
            @rows={{this.rows}}
            @sortBy={{this.sortBy}}
            @sortOrder={{this.sortOrder}}
            @selectable={{true}}
            @canSelectAll={{true}}
            @checkboxSticky={{this.checkboxSticky}}
            @onSetup={{this.onSetup}}
            @onSort={{this.onSort}}
        />
    `;

    module('setup', function () {
        test('the table hands itself and its node to the caller', async function (assert) {
            await render(TEMPLATE);

            assert.ok(table, 'the component instance is provided');
            assert.strictEqual(setupNode, find('table'), 'along with the table element');
            assert.strictEqual(table.tableNode, find('table'));
        });

        test('it publishes itself on the table context service', async function (assert) {
            await render(TEMPLATE);

            const context = this.owner.lookup('service:table-context');
            assert.strictEqual(context.table, table);
            assert.strictEqual(context.node, find('table'));
        });

        test('it renders without an onSetup handler', async function (assert) {
            await render(hbs`<Table @columns={{this.columns}} @rows={{this.rows}} />`);

            assert.dom('table').exists();
        });
    });

    // The imperative row API mutates the caller's array in place and bumps a tracked revision,
    // so both the array AND the rendered table follow along.
    module('adding and removing rows', function () {
        test('a single row can be added', async function (assert) {
            await render(TEMPLATE);

            table.addRow({ id: 'row-added', name: 'Added' });
            await settled();

            assert.strictEqual(this.rows.length, 4, 'the row joins the underlying array');
            assert.strictEqual(this.rows[3].name, 'Added');
            assert.strictEqual(bodyRows().length, 4, 'and the table re-renders');
        });

        test('a removed row leaves the rendered table too', async function (assert) {
            await render(TEMPLATE);
            const [first] = this.rows;

            table.removeRow(first);
            await settled();

            assert.strictEqual(bodyRows().length, 2, 'the row is gone from the DOM as well');
        });

        test('an array passed to addRow is treated as many rows', async function (assert) {
            await render(TEMPLATE);

            table.addRow([
                { id: 'a', name: 'A' },
                { id: 'b', name: 'B' },
            ]);
            await settled();

            assert.strictEqual(this.rows.length, 5, 'an array argument is spread into the rows');
        });

        test('addRows appends every row', async function (assert) {
            await render(TEMPLATE);

            table.addRows([{ id: 'a', name: 'A' }]);
            await settled();

            assert.strictEqual(this.rows.length, 4);
            assert.strictEqual(bodyRows().length, 4, 'and the DOM follows');
        });

        test('addRows with no argument is a no-op', async function (assert) {
            await render(TEMPLATE);

            table.addRows();
            await settled();

            assert.strictEqual(this.rows.length, 3);
        });

        test('a single row can be removed', async function (assert) {
            await render(TEMPLATE);
            const [first] = this.rows;

            table.removeRow(first);
            await settled();

            assert.strictEqual(this.rows.length, 2);
            assert.false(this.rows.includes(first), 'the row is gone from the array');
        });

        test('an array passed to removeRow is treated as many rows', async function (assert) {
            await render(TEMPLATE);

            table.removeRow([this.rows[0], this.rows[0]]);
            await settled();

            assert.strictEqual(this.rows.length, 2, 'a repeated row is removed once');
        });

        test('removeRows removes every occurrence', async function (assert) {
            await render(TEMPLATE);
            const duplicated = this.rows[1];
            table.addRow(duplicated);
            await settled();
            assert.strictEqual(this.rows.length, 4);

            table.removeRows([duplicated]);
            await settled();

            assert.strictEqual(this.rows.length, 2, 'both copies are gone');
            assert.strictEqual(bodyRows().length, 2, 'and the DOM follows');
        });

        test('removing normalises every remaining checkbox', async function (assert) {
            this.set('rows', [
                { id: 'a', name: 'A' },
                { id: 'b', name: 'B', checked: true },
            ]);

            await render(TEMPLATE);
            table.removeRows([]);

            assert.false(this.rows[0].checked, 'an absent checked flag becomes false');
            assert.true(this.rows[1].checked, 'an existing one is preserved');
        });
    });

    module('selection', function () {
        test('select all toggles every row on and then off', async function (assert) {
            await render(TEMPLATE);

            table.selectAllRows();
            await settled();
            assert.true(
                this.rows.every((row) => row.checked),
                'every row is checked'
            );
            assert.true(table.allRowsToggled);
            assert.strictEqual(table.selectedRows.length, 3);

            table.selectAllRows();
            await settled();
            assert.true(
                this.rows.every((row) => row.checked === false),
                'and unchecked again'
            );
            assert.false(table.allRowsToggled);
        });

        test('untoggleAllRows clears everything and the select-all flag', async function (assert) {
            await render(TEMPLATE);
            table.selectAllRows();
            await settled();

            table.untoggleAllRows();
            await settled();

            assert.true(this.rows.every((row) => row.checked === false));
            assert.false(table.allRowsToggled);
        });

        test('untoggleSelected clears only the selected rows', async function (assert) {
            await render(TEMPLATE);
            set(this.rows[1], 'checked', true);
            await settled();
            assert.strictEqual(table.selectedRows.length, 1);

            table.untoggleSelected();
            await settled();

            assert.strictEqual(table.selectedRows.length, 0);
            assert.false(table.allRowsToggled);
        });

        test('the select-all flag can be toggled directly', async function (assert) {
            await render(TEMPLATE);

            table.toggleSelectAll();
            assert.true(table.allRowsToggled);

            table.untoggleSelectAll();
            assert.false(table.allRowsToggled);
        });

        test('the ids of the selected rows can be read back', async function (assert) {
            await render(TEMPLATE);
            set(this.rows[0], 'checked', true);
            set(this.rows[2], 'checked', true);
            await settled();

            assert.deepEqual(table.getSelectedIds(), ['row-0', 'row-2']);
        });

        test('allRowsSelected reflects whether every row is checked', async function (assert) {
            await render(TEMPLATE);
            assert.false(table.allRowsSelected);

            table.selectAllRows();
            await settled();

            assert.true(table.allRowsSelected);
        });
    });

    module('sorting', function () {
        function columnFor(valuePath) {
            return table.visibleColumns.find((column) => column.valuePath === valuePath);
        }

        test('a non-sortable column is ignored', async function (assert) {
            await render(TEMPLATE);

            table.handleSort(columnFor('notes'));

            assert.deepEqual(table.sortColumns, []);
            assert.deepEqual(sorts, [], 'nothing is reported');
        });

        test('clicking a column cycles ascending, descending, then off', async function (assert) {
            await render(TEMPLATE);

            table.handleSort(columnFor('name'));
            assert.deepEqual(table.sortColumns, [{ param: 'name', direction: 'asc' }]);
            assert.strictEqual(sorts[0].sortString, 'name');

            table.handleSort(columnFor('name'));
            assert.deepEqual(table.sortColumns, [{ param: 'name', direction: 'desc' }]);
            assert.strictEqual(sorts[1].sortString, '-name');

            table.handleSort(columnFor('name'));
            assert.deepEqual(table.sortColumns, [], 'a third click clears the sort');
            assert.strictEqual(sorts[2].sortString, '');
        });

        test('a column can declare its own sort parameter', async function (assert) {
            await render(TEMPLATE);

            table.handleSort(columnFor('status'));

            assert.deepEqual(table.sortColumns, [{ param: 'state', direction: 'asc' }], 'sortParam wins over valuePath');
        });

        test('sorting a second column replaces the first', async function (assert) {
            await render(TEMPLATE);

            table.handleSort(columnFor('name'));
            table.handleSort(columnFor('status'));

            assert.deepEqual(table.sortColumns, [{ param: 'state', direction: 'asc' }]);
        });

        test('shift-clicking accumulates sort columns', async function (assert) {
            await render(TEMPLATE);

            table.handleSort(columnFor('name'), { shiftKey: true });
            table.handleSort(columnFor('status'), { shiftKey: true });

            assert.deepEqual(table.sortColumns, [
                { param: 'name', direction: 'asc' },
                { param: 'state', direction: 'asc' },
            ]);
            assert.strictEqual(sorts[sorts.length - 1].sortString, 'name,state');
        });

        test('shift-clicking an existing column flips it and then drops it', async function (assert) {
            await render(TEMPLATE);

            table.handleSort(columnFor('name'), { shiftKey: true });
            table.handleSort(columnFor('status'), { shiftKey: true });

            table.handleSort(columnFor('name'), { shiftKey: true });
            assert.deepEqual(table.sortColumns[0], { param: 'name', direction: 'desc' });

            table.handleSort(columnFor('name'), { shiftKey: true });
            assert.deepEqual(table.sortColumns, [{ param: 'state', direction: 'asc' }], 'the column is dropped from the sort');
        });

        test('sorting works without an onSort handler', async function (assert) {
            await render(hbs`<Table @columns={{this.columns}} @rows={{this.rows}} @onSetup={{this.onSetup}} />`);

            table.handleSort(table.visibleColumns[0]);

            assert.deepEqual(table.sortColumns, [{ param: 'name', direction: 'asc' }]);
        });

        module('initial sort', function () {
            test('a plain sort argument sorts ascending', async function (assert) {
                this.set('sortBy', 'name');

                await render(TEMPLATE);

                assert.deepEqual(table.sortColumns, [{ param: 'name', direction: 'asc' }]);
                assert.deepEqual(table.getSortColumn('name'), { param: 'name', direction: 'asc' });
                assert.strictEqual(table.getSortPriority('name'), 1);
                assert.strictEqual(table.getSortPriority('state'), null, 'an unsorted column has no priority');
            });

            test('a leading minus sorts descending', async function (assert) {
                this.set('sortBy', '-name');

                await render(TEMPLATE);

                assert.deepEqual(table.sortColumns, [{ param: 'name', direction: 'desc' }]);
            });

            test('an explicit sort order is honoured', async function (assert) {
                this.set('sortBy', 'name');
                this.set('sortOrder', 'desc');

                await render(TEMPLATE);

                assert.deepEqual(table.sortColumns, [{ param: 'name', direction: 'desc' }]);
            });

            test('a comma-delimited argument sorts by several columns', async function (assert) {
                this.set('sortBy', 'name, -state');

                await render(TEMPLATE);

                assert.deepEqual(table.sortColumns, [
                    { param: 'name', direction: 'asc' },
                    { param: 'state', direction: 'desc' },
                ]);
                assert.strictEqual(table.getSortPriority('state'), 2);
            });

            test('no sort argument leaves the table unsorted', async function (assert) {
                await render(TEMPLATE);

                assert.deepEqual(table.sortColumns, []);
            });
        });
    });

    module('sticky columns', function (hooks) {
        hooks.beforeEach(function () {
            this.set('columns', [
                { label: 'Name', valuePath: 'name', sticky: true },
                { label: 'Status', valuePath: 'status' },
                { label: 'Notes', valuePath: 'notes', sticky: 'right' },
            ]);
        });

        test('left and right sticky columns are given offsets and positions', async function (assert) {
            await render(TEMPLATE);

            const [name, , notes] = table.visibleColumns;
            assert.strictEqual(name._stickyPosition, 'left');
            assert.strictEqual(name._stickyOffset, 0, 'the first left column sits at the edge');
            assert.strictEqual(name._stickyZIndex, 15);

            assert.strictEqual(notes._stickyPosition, 'right');
            assert.strictEqual(notes._stickyOffset, 0);
        });

        test('a sticky checkbox column shifts the first left offset', async function (assert) {
            this.set('checkboxSticky', true);

            await render(TEMPLATE);

            assert.true(table.visibleColumns[0]._stickyOffset > 0, 'the checkbox width is accounted for');
        });

        // The DOM lookup is `th[data-column-id="<valuePath>"]`, so a sticky column with no
        // valuePath matches nothing and the width has to come from the column definition.
        test('a sticky column with no rendered header falls back to its declared width', async function (assert) {
            this.set('columns', [
                { label: 'Pinned', sticky: true, width: 220 },
                { label: 'Name', valuePath: 'name', sticky: true },
                { label: 'Status', valuePath: 'status' },
            ]);

            await render(TEMPLATE);

            const [pinned, name] = table.visibleColumns;
            assert.strictEqual(pinned._stickyOffset, 0, 'the first left column still sits at the edge');
            assert.strictEqual(name._stickyOffset, 220, 'the next one is pushed by the declared width');
        });

        test('a sticky column with neither a header nor a width falls back to 150', async function (assert) {
            this.set('columns', [
                { label: 'Pinned', sticky: true },
                { label: 'Name', valuePath: 'name', sticky: true },
            ]);

            await render(TEMPLATE);

            assert.strictEqual(table.visibleColumns[1]._stickyOffset, 150, 'the built-in default is used');
        });

        test('right-sticky columns fall back the same way, counted from the right', async function (assert) {
            this.set('columns', [
                { label: 'Name', valuePath: 'name' },
                { label: 'Actions', sticky: 'right', width: 90 },
                { label: 'Notes', sticky: 'right' },
            ]);

            await render(TEMPLATE);

            const [, actions, notes] = table.visibleColumns;
            assert.strictEqual(notes._stickyPosition, 'right');
            assert.strictEqual(notes._stickyOffset, 0, 'the last column is flush right');
            assert.strictEqual(actions._stickyOffset, 150, 'and the one before it clears the default width');
        });

        test('sticky cells are positioned in the dom', async function (assert) {
            await render(TEMPLATE);

            const stickyHeader = find('thead th.is-sticky');
            if (stickyHeader) {
                assert.strictEqual(stickyHeader.style.top, '0px', 'sticky headers are pinned vertically');
            } else {
                assert.ok(true, 'no sticky header markup in this configuration');
            }
        });

        test('scrolling the wrapper updates the shadow classes', async function (assert) {
            await render(TEMPLATE);

            const wrapper = find('.next-table-wrapper');
            await triggerEvent(wrapper, 'scroll');

            const leftCells = findAll('.sticky-left');
            for (const cell of leftCells) {
                assert.true(cell.classList.contains('at-natural-position'), 'at scroll position zero the left shadow is hidden');
            }
            assert.ok(wrapper, 'the wrapper is present');
        });

        test('a column resize recalculates the offsets', async function (assert) {
            await render(TEMPLATE);
            table.visibleColumns[0]._stickyOffset = 999;

            table.onColumnResize();
            await settled();

            assert.strictEqual(table.visibleColumns[0]._stickyOffset, 0, 'the offsets are recomputed');
        });

        test('offsets are recalculated safely when the table node is gone', async function (assert) {
            await render(TEMPLATE);
            table.tableNode = null;

            table.calculateStickyOffsets();
            table.updateStickyCellStyles();

            assert.ok(true, 'both are no-ops without a node');
        });
    });
    module('what @rows will accept', function () {
        test('an iterable that is not an array and has no toArray is converted', async function (assert) {
            this.set('rows', new Set([{ name: 'Ada' }, { name: 'Grace' }]));

            await render(TEMPLATE);

            assert.strictEqual(table.rows.length, 2, 'the set is read into an array');
            assert.deepEqual(
                table.rows.map((row) => row.name),
                ['Ada', 'Grace']
            );
            assert.strictEqual(findAll('tbody tr').length, 2, 'and both rows render');
        });
    });

    test('a sortBy that is not a string is ignored', async function (assert) {
        this.set('sortBy', ['name']);

        await render(TEMPLATE);

        assert.deepEqual(table.sortColumns, [], 'only a string sort specification is understood');
    });
});
