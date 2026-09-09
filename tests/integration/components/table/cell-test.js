import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

function tableContext(owner, table) {
    const service = owner.lookup('service:table-context');
    service.table = table;
    return service;
}

module('Integration | Component | table/cell', function (hooks) {
    setupRenderingTest(hooks);

    module('body cells', function () {
        test('it renders a td around its block', async function (assert) {
            await render(hbs`<table><tbody><tr><Table::Cell>Alex</Table::Cell></tr></tbody></table>`);

            assert.dom('td').hasText('Alex');
            assert.dom('th').doesNotExist();
        });

        test('it forwards splattributes', async function (assert) {
            await render(hbs`<table><tbody><tr><Table::Cell class="truncate" data-test-cell="yes" /></tr></tbody></table>`);

            assert.dom('td').hasClass('truncate');
            assert.dom('td').hasAttribute('data-test-cell', 'yes');
        });
    });

    module('header cells', function (hooks) {
        let sorted;

        hooks.beforeEach(function () {
            sorted = [];
            this.set('column', { label: 'Name', valuePath: 'name', sortable: true });
            tableContext(this.owner, {
                sortColumns: [],
                handleSort: (column, event) => sorted.push({ column, event }),
            });
        });

        test('it renders a th around its block', async function (assert) {
            await render(hbs`<table><thead><tr><Table::Cell @inHead={{true}}>Name</Table::Cell></tr></thead></table>`);

            assert.dom('th .th-content').hasText('Name');
            assert.dom('th').doesNotHaveClass('is-sortable');
            assert.dom('.sort-icon-wrapper').doesNotExist('an unsortable column has no sort control');
        });

        test('a sortable column renders sort arrows', async function (assert) {
            await render(hbs`<table><thead><tr><Table::Cell @inHead={{true}} @sortable={{true}} @column={{this.column}}>Name</Table::Cell></tr></thead></table>`);

            assert.dom('th').hasClass('is-sortable');
            assert.dom('.sort-icon-wrapper').exists();
            assert.dom('.sort-icon.is-ascending').doesNotExist('nothing is sorted yet');
            assert.dom('.sort-icon.is-descending').doesNotExist();
        });

        test('clicking the sort control asks the table to sort', async function (assert) {
            await render(hbs`<table><thead><tr><Table::Cell @inHead={{true}} @sortable={{true}} @column={{this.column}}>Name</Table::Cell></tr></thead></table>`);
            await click('.sort-icon-wrapper');

            assert.strictEqual(sorted.length, 1);
            assert.strictEqual(sorted[0].column, this.column);
            assert.ok(sorted[0].event, 'the click event is handed on');
        });

        test('a column that is not itself sortable is never sorted', async function (assert) {
            this.set('column', { label: 'Name', valuePath: 'name', sortable: false });

            await render(hbs`<table><thead><tr><Table::Cell @inHead={{true}} @sortable={{true}} @column={{this.column}}>Name</Table::Cell></tr></thead></table>`);
            await click('.sort-icon-wrapper');

            assert.deepEqual(sorted, [], 'the column opts out of sorting');
        });

        test('sorting with no column at all is a no-op', async function (assert) {
            await render(hbs`<table><thead><tr><Table::Cell @inHead={{true}} @sortable={{true}}>Name</Table::Cell></tr></thead></table>`);
            await click('.sort-icon-wrapper');

            assert.deepEqual(sorted, []);
        });

        test('an ascending sort is marked on the up arrow', async function (assert) {
            tableContext(this.owner, { sortColumns: [{ param: 'name', direction: 'asc' }], handleSort: () => {} });

            await render(hbs`<table><thead><tr><Table::Cell @inHead={{true}} @sortable={{true}} @column={{this.column}}>Name</Table::Cell></tr></thead></table>`);

            assert.dom('.sort-icon.is-ascending').exists();
            assert.dom('.sort-icon.is-descending').doesNotExist();
        });

        test('a descending sort is marked on the down arrow', async function (assert) {
            tableContext(this.owner, { sortColumns: [{ param: 'name', direction: 'desc' }], handleSort: () => {} });

            await render(hbs`<table><thead><tr><Table::Cell @inHead={{true}} @sortable={{true}} @column={{this.column}}>Name</Table::Cell></tr></thead></table>`);

            assert.dom('.sort-icon.is-descending').exists();
            assert.dom('.sort-icon.is-ascending').doesNotExist();
        });

        test('an explicit sortParam is matched instead of the value path', async function (assert) {
            this.set('column', { label: 'Name', valuePath: 'name', sortParam: 'driver.name', sortable: true });
            tableContext(this.owner, { sortColumns: [{ param: 'driver.name', direction: 'asc' }], handleSort: () => {} });

            await render(hbs`<table><thead><tr><Table::Cell @inHead={{true}} @sortable={{true}} @column={{this.column}}>Name</Table::Cell></tr></thead></table>`);

            assert.dom('.sort-icon.is-ascending').exists();
        });

        test('a table with no sort state at all leaves both arrows plain', async function (assert) {
            tableContext(this.owner, undefined);

            await render(hbs`<table><thead><tr><Table::Cell @inHead={{true}} @sortable={{true}} @column={{this.column}}>Name</Table::Cell></tr></thead></table>`);

            assert.dom('.sort-icon.is-ascending').doesNotExist();
            assert.dom('.sort-icon.is-descending').doesNotExist();
        });

        test('the sort priority badge is shown on request', async function (assert) {
            await render(hbs`
                <table><thead><tr>
                    <Table::Cell @inHead={{true}} @sortable={{true}} @column={{this.column}} @showSortPriority={{true}} @sortPriority={{2}}>Name</Table::Cell>
                </tr></thead></table>
            `);

            assert.dom('.sort-priority-badge').hasText('2');
        });

        test('a resizable column renders a resizer', async function (assert) {
            await render(hbs`<table><thead><tr><Table::Cell @inHead={{true}} @resizable={{true}} @column={{this.column}}>Name</Table::Cell></tr></thead></table>`);

            assert.dom('th .table-cell-resizer, th .resizer').exists('a resize handle is rendered');
        });
    });
});
