import { module, test } from 'qunit';
import { setupTest } from 'dummy/tests/helpers';

class StubStore {
    records = new Map();
    nextId = 1;
    createdPayloads = [];

    createRecord(modelName, data) {
        this.createdPayloads.push({ modelName, data });

        if (data.id !== undefined) {
            const key = `${modelName}:${data.id}`;
            if (this.records.has(key)) {
                // Mirror Ember Data's identity-map assertion so the test fails loudly
                // if the regression ever returns.
                throw new Error(`The id ${data.id} has already been used with another '${modelName}' record.`);
            }
            this.records.set(key, data);
            return data;
        }

        const generatedId = `client-${this.nextId++}`;
        const record = { id: generatedId, ...data };
        this.records.set(`${modelName}:${generatedId}`, record);
        return record;
    }

    peekRecord(modelName, id) {
        return this.records.get(`${modelName}:${id}`) ?? null;
    }

    peekAll() { return []; }
    unloadAll() { this.records.clear(); }
    query() { return Promise.resolve([]); }
}

class StubWidgetService {
    widgets = [];
    registerWidgets(_dashboardName, widgets) { this.widgets = widgets; }
    getWidgets() { return this.widgets; }
    getDefaultWidgets() { return this.widgets.filter((w) => w.default); }
}

class StubUniverse {
    registerDashboard() {}
}

module('Unit | Service | dashboard', function (hooks) {
    setupTest(hooks);

    hooks.beforeEach(function () {
        this.store = new StubStore();
        this.widgetService = new StubWidgetService();
        this.owner.register('service:store', this.store, { instantiate: false });
        this.owner.register('service:fetch', {}, { instantiate: false });
        this.owner.register('service:notifications', {}, { instantiate: false });
        this.owner.register('service:intl', { t: (k) => k }, { instantiate: false });
        this.owner.register('service:universe', new StubUniverse(), { instantiate: false });
        this.owner.register('service:universe/widget-service', this.widgetService, { instantiate: false });
    });

    test('it exists', function (assert) {
        const service = this.owner.lookup('service:dashboard');
        assert.ok(service);
    });

    test('default widget creation strips the registry slug so two dashboards do not collide', function (assert) {
        this.widgetService.widgets = [
            { id: 'fleet-ops-kpi-earnings-widget', name: 'Earnings', component: 'widget/kpi-earnings', grid_options: { w: 3, h: 6 }, default: true },
            { id: 'fleet-ops-revenue-trend-widget', name: 'Revenue Trend', component: 'widget/revenue-trend', grid_options: { w: 6, h: 9 }, default: true },
        ];

        const service = this.owner.lookup('service:dashboard');

        // Materialize the defaults twice; this used to throw because the registry
        // slug was used as the Ember Data record id. With the fix, both passes
        // succeed and each produces a fresh client-side UUID.
        let firstBatch;
        let secondBatch;
        assert.doesNotThrow(() => {
            firstBatch = service._createDefaultDashboardWidgets('dashboard');
            secondBatch = service._createDefaultDashboardWidgets('dashboard');
        });

        assert.strictEqual(firstBatch.length, 2);
        assert.strictEqual(secondBatch.length, 2);

        const ids = [...firstBatch, ...secondBatch].map((r) => r.id);
        assert.strictEqual(new Set(ids).size, 4, 'each record gets its own client UUID');

        ids.forEach((id) => assert.notStrictEqual(id, 'fleet-ops-kpi-earnings-widget', 'no record carries the registry slug as its id'));

        // Slug is preserved in options.widget_key
        firstBatch.forEach((r) => assert.ok(r.options.widget_key, 'widget_key is stashed in options'));
        assert.strictEqual(firstBatch[0].options.widget_key, 'fleet-ops-kpi-earnings-widget');
        assert.strictEqual(firstBatch[1].options.widget_key, 'fleet-ops-revenue-trend-widget');
    });
});
