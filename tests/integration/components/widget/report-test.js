import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { click, clearRender, render, settled, waitUntil } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import WidgetReportComponent from '@fleetbase/ember-ui/components/widget/report';

class StoreStub {
    report = null;
    findRecordCalls = [];
    findRecordError = null;

    async findRecord(modelName, id) {
        this.findRecordCalls.push({ modelName, id });

        if (this.findRecordError) {
            throw this.findRecordError;
        }

        return this.report;
    }
}

class FetchStub {
    posts = [];
    response = { success: true, results: [], columns: [], meta: {} };
    error = null;

    async post(url, data) {
        this.posts.push({ url, data });

        if (this.error) {
            throw this.error;
        }

        return this.response;
    }
}

class ModalsManagerStub {
    shown = [];

    show(name, options) {
        this.shown.push({ name, options });
    }
}

class NotificationsStub {
    errors = [];

    serverError(error) {
        this.errors.push(error);
    }
}

module('Integration | Component | widget/report', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        this.store = new StoreStub();
        this.modalsManager = new ModalsManagerStub();
        this.notifications = new NotificationsStub();
        this.fetch = new FetchStub();

        this.owner.register('service:store', this.store, { instantiate: false });
        this.owner.register('service:modals-manager', this.modalsManager, { instantiate: false });
        this.owner.register('service:notifications', this.notifications, { instantiate: false });
        this.owner.register('service:fetch', this.fetch, { instantiate: false });
    });

    test('it renders an empty state when no report is selected', async function (assert) {
        await render(hbs`<Widget::Report />`);

        assert.dom().includesText('No report');
        assert.dom('[data-test-widget-report-select]').exists();
        assert.strictEqual(this.store.findRecordCalls.length, 0, 'does not load without a report id');
    });

    test('it loads a selected report and runs it live', async function (assert) {
        this.store.report = {
            id: 'report-1',
            title: 'Revenue',
            result_columns: [{ label: 'Total', name: 'total' }],
            data: [{ total: '$42.00' }],
        };
        this.fetch.response = { success: true, results: [{ total: '$99.00' }], columns: [{ name: 'total', label: 'Live Total' }], meta: { total_rows: 1 } };
        this.set('options', { reportId: 'report-1' });

        await render(hbs`<Widget::Report @options={{this.options}} />`);
        await waitUntil(() => this.store.findRecordCalls.length === 1);
        await settled();

        assert.deepEqual(this.store.findRecordCalls[0], { modelName: 'report', id: 'report-1' });
        assert.deepEqual(this.fetch.posts, [{ url: 'reports/report-1/execute', data: undefined }], 'executes the report');
        assert.dom('table').exists();
        assert.dom().includesText('Live Total');
        assert.dom().includesText('$99.00');
        assert.dom().doesNotIncludeText('$42.00', 'the stored results are not shown');
        assert.dom('[data-test-widget-report-last-run]').exists('shows when it last ran');
        assert.dom('[data-test-widget-report-error]').doesNotExist();
    });

    test('a record that can execute itself is run through its own method', async function (assert) {
        let executions = 0;
        this.store.report = {
            id: 'report-1',
            async execute() {
                executions++;
                return { success: true, results: [{ n: 7 }], columns: ['n'] };
            },
        };
        this.set('options', { reportId: 'report-1' });

        await render(hbs`<Widget::Report @options={{this.options}} />`);

        assert.strictEqual(executions, 1);
        assert.strictEqual(this.fetch.posts.length, 0, 'fetch is not called directly');
        assert.dom('table').includesText('7');
    });

    test('a failed run is shown inline and falls back to the stored results', async function (assert) {
        this.store.report = {
            id: 'report-1',
            result_columns: [{ label: 'Total', name: 'total' }],
            data: [{ total: '$42.00' }],
        };
        this.fetch.error = new Error('Query timed out');
        this.set('options', { reportId: 'report-1' });

        await render(hbs`<Widget::Report @options={{this.options}} />`);

        assert.dom('[data-test-widget-report-error]').includesText('Query timed out');
        assert.dom('[data-test-widget-report-error]').includesText('Showing saved results');
        assert.dom().includesText('$42.00');
        assert.dom('[data-test-widget-report-stored]').exists();
        assert.deepEqual(this.notifications.errors, [], 'the failure is not a toast');

        this.fetch.error = null;
        this.fetch.response = { success: true, results: [{ total: '$50.00' }], columns: [{ name: 'total', label: 'Total' }] };
        await click('[data-test-widget-report-refresh]');

        assert.strictEqual(this.fetch.posts.length, 2, 'refresh runs the report again');
        assert.dom('[data-test-widget-report-error]').doesNotExist('a good run clears the error');
        assert.dom().includesText('$50.00');
    });

    test('a live result over the row cap is truncated', async function (assert) {
        this.store.report = { id: 'report-1' };
        this.fetch.response = {
            success: true,
            results: Array.from({ length: 150 }, (_, i) => ({ n: i })),
            columns: ['n'],
        };
        this.set('options', { reportId: 'report-1' });

        await render(hbs`<Widget::Report @options={{this.options}} />`);

        assert.dom('tbody tr').exists({ count: 100 });
        assert.dom('[data-test-widget-report-truncated]').includesText('Showing first 100 of 150 rows');
    });

    test('an unsuccessful run keeps the last good result and says so', async function (assert) {
        this.store.report = { id: 'report-1' };
        this.fetch.response = { success: true, results: [{ total: '$10.00' }], columns: [{ name: 'total', label: 'Total' }] };
        this.set('options', { reportId: 'report-1' });

        await render(hbs`<Widget::Report @options={{this.options}} />`);

        assert.dom().includesText('$10.00');

        this.fetch.response = { success: false, error: 'Report is invalid' };
        await click('[data-test-widget-report-refresh]');

        assert.dom('[data-test-widget-report-error]').includesText('Report is invalid');
        assert.dom('[data-test-widget-report-error]').includesText('Showing the last successful run');
        assert.dom().includesText('$10.00', 'the previous live result stays on screen');
    });

    test('polling is off by default', async function (assert) {
        let instance;
        this.owner.register(
            'component:widget/report',
            class extends WidgetReportComponent {
                constructor() {
                    super(...arguments);
                    instance = this;
                }
            }
        );
        this.store.report = { id: 'report-1' };
        this.set('options', { reportId: 'report-1' });

        await render(hbs`<Widget::Report @options={{this.options}} />`);

        assert.strictEqual(instance.refreshInterval, 0);
        assert.false(instance.pollReport.isRunning, 'no polling task is started');
        assert.strictEqual(this.fetch.posts.length, 1, 'the report runs once');
    });

    test('a configured interval polls no faster than five minutes and stops when destroyed', async function (assert) {
        let instance;
        const delays = [];
        this.owner.register(
            'component:widget/report',
            class extends WidgetReportComponent {
                constructor() {
                    super(...arguments);
                    instance = this;
                }

                pollDelay(interval) {
                    delays.push(interval);
                    // Let two intervals pass immediately, then wait forever.
                    return delays.length <= 2 ? Promise.resolve() : new Promise(() => {});
                }
            }
        );
        this.store.report = { id: 'report-1' };
        this.set('options', { reportId: 'report-1', refreshInterval: 1 });

        await render(hbs`<Widget::Report @options={{this.options}} />`);
        await waitUntil(() => this.fetch.posts.length === 3 && delays.length === 3);

        assert.deepEqual(delays, [300000, 300000, 300000], 'the interval is raised to five minutes');
        assert.true(instance.pollReport.isRunning, 'the polling task is waiting for the next interval');

        await clearRender();
        assert.false(instance.pollReport.isRunning, 'destroying the widget stops the polling');
    });

    test('a selection without an id is not run', async function (assert) {
        this.set('widget', { options: {} });

        await render(hbs`<Widget::Report @widget={{this.widget}} />`);
        await click('[data-test-widget-report-select]');

        const modalOptions = this.modalsManager.shown[0].options;
        modalOptions.onChange([{ title: 'Unsaved' }]);
        await modalOptions.confirm({ startLoading() {}, done() {} });
        await settled();

        assert.strictEqual(this.fetch.posts.length, 0, 'nothing is executed without an id');
    });

    test('a loaded report can be changed, with the current one preselected', async function (assert) {
        this.store.report = {
            id: 'report-1',
            title: 'Revenue',
            result_columns: [{ label: 'Total', name: 'total' }],
            data: [{ total: '$42.00' }],
        };
        this.set('options', { reportId: 'report-1' });

        await render(hbs`<Widget::Report @options={{this.options}} />`);
        await waitUntil(() => this.store.findRecordCalls.length === 1);
        await settled();

        assert.dom('[data-test-widget-report-select]').doesNotExist('the empty-state control is gone');
        await click('[data-test-widget-report-change]');

        assert.strictEqual(this.modalsManager.shown.length, 1, 'the picker opens from the loaded state');
        assert.strictEqual(this.modalsManager.shown[0].name, 'modals/find-select-report');
        assert.deepEqual(this.modalsManager.shown[0].options.selected, [this.store.report], 'the current report is preselected');
    });

    test('it saves the selected report id to widget options', async function (assert) {
        assert.expect(7);

        const selectedReport = { id: 'report-2', title: 'Utilization' };
        const widget = {
            options: { widget_key: 'report-widget' },
            setProperties(properties) {
                this.options = properties.options;
            },
            async save() {
                assert.step('save');
            },
        };
        this.set('widget', widget);

        await render(hbs`<Widget::Report @widget={{this.widget}} />`);
        await click('[data-test-widget-report-select]');

        assert.strictEqual(this.modalsManager.shown.length, 1, 'opens the report selector modal');
        assert.strictEqual(this.modalsManager.shown[0].name, 'modals/find-select-report');

        const modalOptions = this.modalsManager.shown[0].options;
        modalOptions.onChange([selectedReport]);

        let didStartLoading = false;
        let didClose = false;
        await modalOptions.confirm({
            startLoading() {
                didStartLoading = true;
            },
            done() {
                didClose = true;
            },
        });
        await settled();

        assert.true(didStartLoading, 'starts modal loading state');
        assert.true(didClose, 'closes modal after save');
        assert.deepEqual(widget.options, { widget_key: 'report-widget', reportId: 'report-2' });
        assert.verifySteps(['save']);
    });

    test('dismissing the selector without a pick leaves nothing to save', async function (assert) {
        this.set('widget', { options: {} });

        await render(hbs`<Widget::Report @widget={{this.widget}} />`);
        await click('[data-test-widget-report-select]');

        const modalOptions = this.modalsManager.shown[0].options;
        assert.deepEqual(modalOptions.selected, [], 'nothing is preselected while there is no report');

        // Dismissing the picker calls back with no argument at all.
        modalOptions.onChange();
        await settled();
        assert.dom().includesText('No report', 'the widget stays in its empty state');

        modalOptions.onChange([]);
        await settled();
        assert.dom().includesText('No report', 'and an empty selection reads the same way');

        await modalOptions.confirm({ startLoading() {}, done() {} });
        assert.deepEqual(this.widget.options, {}, 'with no report id there is nothing to write');
    });

    test('a widget with no options and no ember-data methods is still updated', async function (assert) {
        const widget = {};
        this.set('widget', widget);

        await render(hbs`<Widget::Report @widget={{this.widget}} />`);
        await click('[data-test-widget-report-select]');

        const modalOptions = this.modalsManager.shown[0].options;
        modalOptions.onChange([{ id: 'report-3', title: 'Idle Time' }]);
        await modalOptions.confirm({ startLoading() {}, done() {} });
        await settled();

        assert.deepEqual(widget.options, { reportId: 'report-3' }, 'the options object is created and assigned directly');
        assert.deepEqual(this.notifications.errors, [], 'and a widget that cannot save is not an error');
    });

    test('a save that fails is reported and the modal is left open', async function (assert) {
        const error = new Error('Could not save');
        const widget = {
            options: {},
            async save() {
                throw error;
            },
        };
        this.set('widget', widget);

        await render(hbs`<Widget::Report @widget={{this.widget}} />`);
        await click('[data-test-widget-report-select]');

        const modalOptions = this.modalsManager.shown[0].options;
        modalOptions.onChange([{ id: 'report-4', title: 'Fuel' }]);

        let didClose = false;
        await modalOptions.confirm({
            startLoading() {},
            done() {
                didClose = true;
            },
        });
        await settled();

        assert.strictEqual(this.notifications.errors[0], error, 'the failure is reported');
        assert.false(didClose, 'and the modal stays open so the choice is not lost');
    });

    test('it reports load errors and returns to the empty state', async function (assert) {
        const error = new Error('Missing report');
        this.store.findRecordError = error;
        this.set('options', { reportId: 'deleted-report' });

        await render(hbs`<Widget::Report @options={{this.options}} />`);
        await waitUntil(() => this.notifications.errors.length === 1);

        assert.strictEqual(this.notifications.errors[0], error);
        assert.dom().includesText('No report');
    });
});
