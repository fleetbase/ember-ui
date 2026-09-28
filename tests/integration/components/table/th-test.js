import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, find } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

function tableContext(owner, table) {
    const service = owner.lookup('service:table-context');
    service.table = table;
    return service;
}

function stubTable(overrides = {}) {
    return {
        sortColumns: [],
        getSortColumn: () => null,
        getSortPriority: () => null,
        handleSort: () => {},
        ...overrides,
    };
}

module('Integration | Component | table/th', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        this.set('column', { label: 'Name', valuePath: 'name', sortable: true });
        tableContext(this.owner, stubTable());
    });

    const TEMPLATE = hbs`
        <table><thead><tr>
            <Table::Th @column={{this.column}} @sortable={{true}} @resizable={{this.resizable}} @width={{this.width}} @sticky={{this.sticky}}>Name</Table::Th>
        </tr></thead></table>
    `;

    test('it renders a header cell', async function (assert) {
        await render(TEMPLATE);

        assert.dom('th .th-content').hasText('Name');
        assert.dom('th').hasClass('is-sortable');
    });

    test('an unsorted column shows no direction', async function (assert) {
        await render(TEMPLATE);

        assert.dom('.sort-icon.is-ascending').doesNotExist();
        assert.dom('.sort-icon.is-descending').doesNotExist();
    });

    test('an ascending sort is marked from the table sort columns', async function (assert) {
        tableContext(this.owner, stubTable({ sortColumns: [{ param: 'name', direction: 'asc' }] }));

        await render(TEMPLATE);

        assert.dom('.sort-icon.is-ascending').exists();
        assert.dom('.sort-icon.is-descending').doesNotExist();
    });

    test('a descending sort is marked from the table sort columns', async function (assert) {
        tableContext(this.owner, stubTable({ sortColumns: [{ param: 'name', direction: 'desc' }] }));

        await render(TEMPLATE);

        assert.dom('.sort-icon.is-descending').exists();
        assert.dom('.sort-icon.is-ascending').doesNotExist();
    });

    test('getSortColumn alone marks the ascending direction', async function (assert) {
        tableContext(this.owner, stubTable({ getSortColumn: () => ({ param: 'name', direction: 'asc' }) }));

        await render(TEMPLATE);

        assert.dom('.sort-icon.is-ascending').exists('the forwarded @isAscending reaches the cell');
        assert.dom('.sort-icon.is-descending').doesNotExist();
    });

    test('getSortColumn alone marks the descending direction', async function (assert) {
        tableContext(this.owner, stubTable({ getSortColumn: () => ({ param: 'name', direction: 'desc' }) }));

        await render(TEMPLATE);

        assert.dom('.sort-icon.is-descending').exists('the forwarded @isDescending reaches the cell');
        assert.dom('.sort-icon.is-ascending').doesNotExist();
    });

    test('the sort priority badge appears only beyond the first sort', async function (assert) {
        tableContext(
            this.owner,
            stubTable({
                getSortColumn: () => ({ param: 'name', direction: 'asc' }),
                getSortPriority: () => 1,
            })
        );
        await render(TEMPLATE);
        assert.dom('.sort-priority-badge').doesNotExist('a single sort needs no priority');

        tableContext(
            this.owner,
            stubTable({
                getSortColumn: () => ({ param: 'name', direction: 'asc' }),
                getSortPriority: () => 3,
            })
        );
        await render(TEMPLATE);
        assert.dom('.sort-priority-badge').hasText('3');
    });

    test('a sortParam is preferred over the value path when asking the table', async function (assert) {
        const asked = [];
        this.set('column', { label: 'Name', valuePath: 'name', sortParam: 'driver.name', sortable: true });
        tableContext(
            this.owner,
            stubTable({
                getSortColumn: (param) => {
                    asked.push(param);
                    return null;
                },
            })
        );

        await render(TEMPLATE);

        assert.true(asked.includes('driver.name'), 'the explicit sort param is used');
        assert.false(asked.includes('name'), 'the value path is not used as well');
    });

    test('a header with no column asks the table for nothing', async function (assert) {
        const asked = [];
        this.set('column', undefined);
        tableContext(
            this.owner,
            stubTable({
                getSortColumn: (param) => {
                    asked.push(param);
                    return null;
                },
            })
        );

        await render(TEMPLATE);

        assert.deepEqual(asked, []);
        assert.dom('th').exists('the header still renders');
    });

    module('sizing', function () {
        test('a column width is applied to the cell', async function (assert) {
            this.set('column', { label: 'Name', valuePath: 'name', width: 220 });

            await render(TEMPLATE);

            assert.strictEqual(find('th').style.width, '220px');
        });

        test('a string column width is used verbatim', async function (assert) {
            this.set('column', { label: 'Name', valuePath: 'name', width: '40%' });

            await render(TEMPLATE);

            assert.strictEqual(find('th').style.width, '40%');
        });

        test('an explicit @width overrides the column width', async function (assert) {
            this.set('column', { label: 'Name', valuePath: 'name', width: 220 });
            this.set('width', 90);

            await render(TEMPLATE);

            assert.strictEqual(find('th').style.width, '90px');
        });

        test('a string @width is used verbatim', async function (assert) {
            this.set('width', '10rem');

            await render(TEMPLATE);

            assert.strictEqual(find('th').style.width, '10rem');
        });
    });

    module('sticky columns', function () {
        test('a sticky column is pinned left by default', async function (assert) {
            this.set('column', { label: 'Name', valuePath: 'name', sticky: true });

            await render(TEMPLATE);

            const th = find('th');
            assert.strictEqual(th.style.position, 'sticky');
            assert.strictEqual(th.style.top, '0px');
            assert.strictEqual(th.style.left, '0px');
            assert.dom(th).hasClass('is-sticky');
            assert.dom(th).hasClass('sticky-left');
            assert.dom(th).hasAttribute('data-column-id', 'name');
        });

        test('a right-pinned column is positioned from the right', async function (assert) {
            this.set('column', { label: 'Actions', valuePath: 'actions', sticky: 'right', _stickyOffset: 48 });

            await render(TEMPLATE);

            const th = find('th');
            assert.dom(th).hasClass('sticky-right');
            assert.strictEqual(th.style.right, '48px');
        });

        test('an explicit sticky position and z-index win', async function (assert) {
            this.set('column', { label: 'Name', valuePath: 'name', sticky: true, _stickyPosition: 'right', _stickyZIndex: 30 });

            await render(TEMPLATE);

            const th = find('th');
            assert.dom(th).hasClass('sticky-right');
            assert.strictEqual(th.style.zIndex, '35', 'header cells sit five above their body cells');
        });

        test('the header z-index defaults above the body default', async function (assert) {
            this.set('column', { label: 'Name', valuePath: 'name', sticky: true });

            await render(TEMPLATE);

            assert.strictEqual(find('th').style.zIndex, '20');
        });

        test('a checkbox column can be made sticky without a column definition', async function (assert) {
            this.set('column', undefined);
            this.set('sticky', true);

            await render(TEMPLATE);

            const th = find('th');
            assert.dom(th).hasClass('sticky-left');
            assert.strictEqual(th.style.left, '0px');
            assert.dom(th).doesNotHaveAttribute('data-column-id', 'there is no column to identify');
        });

        test('a non-sticky column is left alone', async function (assert) {
            await render(TEMPLATE);

            assert.dom('th').doesNotHaveClass('is-sticky');
            assert.strictEqual(find('th').style.position, '');
        });
    });
    // Every other test supplies a column; the sort-priority getter has its own guard for when one
    // is not passed at all.
    test('a header with no column at all still renders', async function (assert) {
        await render(hbs`<table><thead><tr><Table::Th>Plain</Table::Th></tr></thead></table>`);

        assert.dom('th').exists();
        assert.dom('th').containsText('Plain');
        assert.dom('th .sort-priority').doesNotExist('and claims no sort priority');
    });
});
