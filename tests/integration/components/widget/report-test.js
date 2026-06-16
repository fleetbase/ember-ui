import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { click, render, settled, waitUntil } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

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

        this.owner.register('service:store', this.store, { instantiate: false });
        this.owner.register('service:modals-manager', this.modalsManager, { instantiate: false });
        this.owner.register('service:notifications', this.notifications, { instantiate: false });
    });

    test('it renders an empty state when no report is selected', async function (assert) {
        await render(hbs`<Widget::Report />`);

        assert.dom().includesText('No report');
        assert.dom('[data-test-widget-report-select]').exists();
        assert.strictEqual(this.store.findRecordCalls.length, 0, 'does not load without a report id');
    });

    test('it loads and renders a selected report', async function (assert) {
        this.store.report = {
            id: 'report-1',
            title: 'Revenue',
            result_columns: [{ label: 'Total', name: 'total' }],
            data: [{ total: '$42.00' }],
        };
        this.set('options', { reportId: 'report-1' });

        await render(hbs`<Widget::Report @options={{this.options}} />`);
        await waitUntil(() => this.store.findRecordCalls.length === 1);

        assert.deepEqual(this.store.findRecordCalls[0], { modelName: 'report', id: 'report-1' });
        assert.dom('table').exists();
        assert.dom().includesText('Total');
        assert.dom().includesText('$42.00');
    });

    test('it saves the selected report id to widget options', async function (assert) {
        assert.expect(6);

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
