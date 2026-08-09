import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, find, findAll } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

const COLUMNS = [{ name: 'public_id', label: 'ID' }, { name: 'status' }];

const ROWS = [
    { public_id: 'ord_1', status: 'pending' },
    { public_id: 'ord_2', status: null },
];

function headerLabels() {
    return findAll('thead th').map((th) => th.textContent.trim());
}

function bodyCells() {
    return findAll('tbody td').map((td) => td.textContent.trim());
}

module('Integration | Component | report-builder/results-table', function (hooks) {
    setupRenderingTest(hooks);

    let sorts;

    hooks.beforeEach(function () {
        sorts = [];
        this.set('columns', COLUMNS);
        this.set('data', ROWS);
        this.set('pagination', { page: 1, limit: 100, total: 2 });
        this.set('onSort', (name) => sorts.push(name));
    });

    const TEMPLATE = hbs`
        <ReportBuilder::ResultsTable
            @columns={{this.columns}}
            @data={{this.data}}
            @pagination={{this.pagination}}
            @isRunning={{this.isRunning}}
            @error={{this.error}}
            @onSort={{this.onSort}}
            @onPageChange={{this.onPageChange}}
        />
    `;

    module('states', function () {
        test('a running query shows a progress message', async function (assert) {
            this.set('isRunning', true);

            await render(TEMPLATE);

            assert.dom('.results-table').containsText('Executing query...');
            assert.strictEqual(find('table'), null, 'no results are shown yet');
        });

        test('a failed query shows the error message', async function (assert) {
            this.set('error', { message: 'Unknown column "foo"' });

            await render(TEMPLATE);

            assert.dom('.results-table').containsText('Unknown column "foo"');
            assert.dom('.results-table svg').hasClass('fa-triangle-exclamation');
            assert.strictEqual(find('table'), null);
        });

        test('a running query wins over an error', async function (assert) {
            this.setProperties({ isRunning: true, error: { message: 'boom' } });

            await render(TEMPLATE);

            assert.dom('.results-table').containsText('Executing query...');
            assert.dom('.results-table').doesNotContainText('boom');
        });

        test('an empty result set explains itself', async function (assert) {
            this.setProperties({ data: [], pagination: { page: 1, limit: 100, total: 0 } });

            await render(TEMPLATE);

            assert.dom('.results-table').containsText('No results found');
            assert.dom('.results-table').containsText('Try adjusting your query filters');
            assert.strictEqual(find('table'), null);
        });
    });

    module('the results', function () {
        test('it renders a column per definition, labelled or named', async function (assert) {
            await render(TEMPLATE);

            assert.deepEqual(headerLabels(), ['ID', 'status'], 'a column without a label falls back to its name');
        });

        test('every header offers to sort', async function (assert) {
            await render(TEMPLATE);

            assert.strictEqual(findAll('thead th svg.fa-sort').length, 2);
        });

        test('it renders a row per record', async function (assert) {
            await render(TEMPLATE);

            assert.strictEqual(findAll('tbody tr').length, 2);
            assert.deepEqual(bodyCells(), ['ord_1', 'pending', 'ord_2', '—'], 'an empty cell renders a dash');
        });

        test('clicking a header reports the sort', async function (assert) {
            await render(TEMPLATE);
            await click(findAll('thead th')[1]);

            assert.deepEqual(sorts, ['status'], 'the column name is reported, not its label');
        });

        test('a result set with no columns renders empty rows', async function (assert) {
            this.set('columns', []);

            await render(TEMPLATE);

            assert.deepEqual(headerLabels(), []);
            assert.strictEqual(findAll('tbody tr').length, 2, 'the rows still render');
            assert.deepEqual(bodyCells(), []);
        });

        test('clicking a header without an onSort handler is a no-op', async function (assert) {
            await render(hbs`
                <ReportBuilder::ResultsTable @columns={{this.columns}} @data={{this.data}} @pagination={{this.pagination}} />
            `);

            await click(findAll('thead th')[1]);

            assert.strictEqual(findAll('tbody tr').length, 2, 'the table survives the click');
        });
    });

    module('pagination', function () {
        test('no pagination is shown while everything fits on one page', async function (assert) {
            await render(TEMPLATE);

            assert.strictEqual(find('#fleetbase-pagination'), null);
        });

        test('a second page renders a pager describing the range', async function (assert) {
            this.set('pagination', { page: 1, limit: 2, total: 5 });

            await render(TEMPLATE);

            assert.dom('#fleetbase-pagination').exists('the pager renders instead of throwing');
            assert.dom('.fleetbase-pagination').containsText('5', 'the total is reported');
            assert.deepEqual(
                findAll('.page-item').map((button) => button.textContent.trim()),
                ['1', '2', '3'],
                'three pages of two are offered'
            );
        });

        test('the pager reports the page the reader chose', async function (assert) {
            const pages = [];
            this.set('pagination', { page: 1, limit: 2, total: 5 });
            this.set('onPageChange', (page) => pages.push(page));

            await render(hbs`
                <ReportBuilder::ResultsTable
                    @columns={{this.columns}}
                    @data={{this.data}}
                    @pagination={{this.pagination}}
                    @onPageChange={{this.onPageChange}}
                />
            `);

            await click(findAll('.page-item')[2]);

            assert.deepEqual(pages, [3]);
        });

        test('the pager starts on the page the caller asked for', async function (assert) {
            this.set('pagination', { page: 2, limit: 2, total: 5 });

            await render(TEMPLATE);

            assert.dom(findAll('.page-item')[1]).hasClass('active', 'page two is the active one');
        });
    });
});
