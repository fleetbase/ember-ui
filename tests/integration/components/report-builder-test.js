import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, findAll, find } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

const SCHEMA = {
    tables: [
        {
            name: 'orders',
            label: 'Orders',
            columns: [
                { name: 'id', label: 'ID', type: 'string' },
                { name: 'status', label: 'Status', type: 'string' },
            ],
        },
    ],
};

function report(overrides = {}) {
    return {
        title: 'Weekly orders',
        description: 'Orders grouped by day',
        query_config: null,
        result_columns: null,
        data: null,
        meta: null,
        filled: [],
        fillResult(result) {
            this.filled.push(result);
        },
        ...overrides,
    };
}

module('Integration | Component | report-builder', function (hooks) {
    setupRenderingTest(hooks);

    let fetch;
    let notifications;

    hooks.beforeEach(function () {
        fetch = this.owner.lookup('service:fetch');
        fetch.responses['reports/tables'] = SCHEMA;
        notifications = this.owner.lookup('service:notifications');
        notifications.calls = [];
        this.set('report', report());
    });

    module('rendering', function () {
        test('it renders the report details bound to the record', async function (assert) {
            await render(hbs`<ReportBuilder @report={{this.report}} />`);

            assert.dom('.form-wrapper').exists();
            assert.dom(this.element).containsText('Report Details');

            const values = findAll('input').map((input) => input.value);
            assert.true(values.includes('Weekly orders'), 'the title is bound to the record');
            assert.true(values.includes('Orders grouped by day'), 'the description is bound to the record');
        });

        test('it offers a configuration and a preview tab', async function (assert) {
            await render(hbs`<ReportBuilder @report={{this.report}} />`);

            const tabs = findAll('[role="tab"]').map((tab) => tab.textContent.trim());
            assert.true(tabs.includes('Configuration'));
            assert.true(tabs.includes('Preview'));
        });

        test('the preview is empty until the report is executed', async function (assert) {
            await render(hbs`<ReportBuilder @report={{this.report}} />`);

            assert.dom(this.element).containsText('No report preview');
            assert.dom(this.element).containsText('press the execute button');
        });

        test('it forwards splattributes', async function (assert) {
            await render(hbs`<ReportBuilder @report={{this.report}} data-test-builder="yes" />`);

            assert.dom('.form-wrapper').hasAttribute('data-test-builder', 'yes');
        });

        test('it renders with no report at all', async function (assert) {
            await render(hbs`<ReportBuilder />`);

            assert.dom('.form-wrapper').exists();
            assert.dom(this.element).containsText('Report Details');
        });
    });

    module('loading the schema', function () {
        test('the data sources are fetched on insert', async function (assert) {
            await render(hbs`<ReportBuilder @report={{this.report}} />`);

            const call = fetch.calls.find((entry) => entry.args[0] === 'reports/tables');
            assert.ok(call, 'the schema is requested');
            assert.deepEqual(call.args[1], {}, 'no extension or category is sent by default');
        });

        test('an extension and category narrow the request', async function (assert) {
            await render(hbs`<ReportBuilder @report={{this.report}} @extension="fleet-ops" @category="orders" />`);

            const call = fetch.calls.find((entry) => entry.args[0] === 'reports/tables');
            assert.deepEqual(call.args[1], { extension: 'fleet-ops', category: 'orders' });
        });

        test('a schema without tables leaves the table list empty', async function (assert) {
            fetch.responses['reports/tables'] = {};

            await render(hbs`<ReportBuilder @report={{this.report}} />`);

            assert.dom('.form-wrapper').exists('the builder still renders');
        });

        test('a failed schema load is reported to the user', async function (assert) {
            fetch.get = () => Promise.reject(new Error('boom'));

            await render(hbs`<ReportBuilder @report={{this.report}} />`);

            assert.deepEqual(
                notifications.calls.filter((call) => call.method === 'error').map((call) => call.args[0]),
                ['Failed to load data sources']
            );
        });
    });

    module('existing results', function () {
        test('a report with saved result columns renders them straight away', async function (assert) {
            this.set(
                'report',
                report({
                    result_columns: [
                        { name: 'id', label: 'ID' },
                        { name: 'status', label: 'Status' },
                    ],
                    data: [{ id: 'ord_1', status: 'created' }],
                    meta: { total: 1 },
                })
            );

            await render(hbs`<ReportBuilder @report={{this.report}} />`);

            assert.deepEqual(
                findAll('.next-table-wrapper thead th').map((cell) => cell.textContent.trim()),
                ['ID', 'Status']
            );
            assert.deepEqual(
                findAll('.next-table-wrapper tbody td').map((cell) => cell.textContent.trim()),
                ['ord_1', 'created']
            );
            assert.dom(this.element).doesNotContainText('No report preview');
        });

        test('a saved query config seeds the builder', async function (assert) {
            this.set('report', report({ query_config: { table: 'orders', columns: ['id'] } }));

            await render(hbs`<ReportBuilder @report={{this.report}} />`);

            assert.dom('.form-wrapper').exists('the saved configuration is adopted without error');
        });

        test('missing data and meta default to empty', async function (assert) {
            this.set('report', report({ result_columns: [{ name: 'id', label: 'ID' }] }));

            await render(hbs`<ReportBuilder @report={{this.report}} />`);

            assert.deepEqual(findAll('.next-table-wrapper tbody tr'), [], 'no rows are rendered');
            assert.dom('.next-table-wrapper thead th').hasText('ID');
        });
    });

    module('executing', function () {
        test('executing posts the query config and shows the results', async function (assert) {
            fetch.responses['reports/execute-query'] = {
                columns: [{ name: 'id', label: 'ID' }],
                data: [{ id: 'ord_9' }],
                meta: { total: 1 },
            };

            await render(hbs`<ReportBuilder @report={{this.report}} />`);
            await click(find('[data-test-tab-actions] button, .btn-magic') ?? find('button.btn'));

            const call = fetch.calls.find((entry) => entry.args[0] === 'reports/execute-query');
            assert.ok(call, 'the query is executed');
            assert.deepEqual(Object.keys(call.args[1]), ['query_config']);

            assert.dom('.next-table-wrapper tbody td').hasText('ord_9');
            assert.strictEqual(this.report.filled.length, 1, 'the result is written back to the record');
        });

        test('a validation failure is surfaced as errors and warnings', async function (assert) {
            fetch.post = () =>
                Promise.reject({
                    validation_errors: ['Pick at least one column'],
                    validation_warnings: ['This query has no limit'],
                });

            await render(hbs`<ReportBuilder @report={{this.report}} />`);
            await click('.btn-magic');

            assert.dom(this.element).containsText('Pick at least one column');
            assert.dom(this.element).containsText('This query has no limit');
            assert.dom('.ui-input-info-block.danger').exists();
            assert.dom('.ui-input-info-block.warning').exists();
        });

        test('a plain error is reported to the user', async function (assert) {
            fetch.post = () => Promise.reject(new Error('Query timed out'));

            await render(hbs`<ReportBuilder @report={{this.report}} />`);
            await click('.btn-magic');

            assert.deepEqual(
                notifications.calls.filter((call) => call.method === 'error').map((call) => call.args[0]),
                ['Query timed out']
            );
            assert.dom('.ui-input-info-block.danger').doesNotExist('no validation errors to show');
        });

        test('an error with no message falls back to the server error handler', async function (assert) {
            fetch.post = () => Promise.reject({ status: 500 });

            await render(hbs`<ReportBuilder @report={{this.report}} />`);
            await click('.btn-magic');

            assert.true(
                notifications.calls.some((call) => call.method === 'serverError'),
                'the raw server error is reported'
            );
        });

        test('executing without a report record does not throw', async function (assert) {
            fetch.responses['reports/execute-query'] = { columns: [{ name: 'id', label: 'ID' }], data: [] };

            await render(hbs`<ReportBuilder />`);
            await click('.btn-magic');

            assert.ok(
                fetch.calls.find((entry) => entry.args[0] === 'reports/execute-query'),
                'the query still runs'
            );
        });
    });

    test('a query config change is written back and reported', async function (assert) {
        const changes = [];
        this.set('onQueryConfigChanged', (config) => changes.push(config));
        fetch.responses['reports/execute-query'] = { columns: [], data: [] };

        await render(hbs`<ReportBuilder @report={{this.report}} @onQueryConfigChanged={{this.onQueryConfigChanged}} />`);

        assert.true(changes.length >= 1, 'the builder reports its initial configuration');
        assert.strictEqual(this.report.query_config, changes[changes.length - 1], 'the record is kept in step');
    });
});
