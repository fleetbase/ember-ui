import { module, test } from 'qunit';
import { setupTest } from 'dummy/tests/helpers';
import { settled } from '@ember/test-helpers';

class StubStore {
    records = new Map();
    nextId = 1;
    createdPayloads = [];
    queryRecords = [];

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

    peekAll() {
        return [];
    }
    unloadAll() {
        this.records.clear();
    }
    query() {
        return Promise.resolve(this.queryRecords);
    }
}

class StubWidgetService {
    widgets = [];
    slotDashboards = [];
    slotDefault = null;

    registerWidgets(_dashboardName, widgets) {
        this.widgets = widgets;
    }
    getWidgets() {
        return this.widgets;
    }
    getDefaultWidgets() {
        return this.widgets.filter((w) => w.default);
    }
    getDashboardsForSlot() {
        return this.slotDashboards;
    }
    getDefaultDashboardForSlot() {
        return this.slotDefault;
    }
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
        // The addon ships a real universe/widget-service; it must be unregistered before a
        // stub can take its place, otherwise the resolver-provided one is used.
        this.owner.unregister('service:universe/widget-service');
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
        let thrown = null;
        try {
            firstBatch = service._createDefaultDashboardWidgets('dashboard');
            secondBatch = service._createDefaultDashboardWidgets('dashboard');
        } catch (e) {
            thrown = e;
        }
        assert.strictEqual(thrown, null, 'no identity-map collision when materializing defaults twice');

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

    test('it loads multiple system dashboards for a slot and selects the configured slot default', async function (assert) {
        this.widgetService.slotDashboards = [
            { id: 'dashboard', name: 'Default Dashboard' },
            { id: 'alrashd', name: 'Al-Rashed KPI Dashboard' },
        ];
        this.widgetService.slotDefault = 'alrashd';

        const service = this.owner.lookup('service:dashboard');

        await service.loadDashboards.perform({
            defaultDashboardId: 'dashboard',
            defaultDashboardName: 'Default Dashboard',
            extension: 'core',
            slot: 'console.home',
        });

        assert.deepEqual(
            service.dashboards.map((dashboard) => dashboard.id),
            ['dashboard', 'alrashd'],
            'both system dashboards are materialized'
        );
        assert.strictEqual(service.currentDashboard.id, 'alrashd', 'slot default loads first when there is no saved dashboard default');
        assert.strictEqual(service.currentWidgetSourceDashboardId, 'alrashd', 'widget source follows the active system dashboard');
    });

    test('saved default dashboard still wins over slot default', async function (assert) {
        this.widgetService.slotDashboards = [
            { id: 'dashboard', name: 'Default Dashboard' },
            { id: 'alrashd', name: 'Al-Rashed KPI Dashboard' },
        ];
        this.widgetService.slotDefault = 'alrashd';
        this.store.queryRecords = [
            {
                id: 'saved-dashboard',
                name: 'My Dashboard',
                is_default: true,
                user_uuid: 'user-1',
                widgets: [],
                options: { widget_source_dashboard_id: 'dashboard' },
            },
        ];

        const service = this.owner.lookup('service:dashboard');

        await service.loadDashboards.perform({
            defaultDashboardId: 'dashboard',
            extension: 'core',
            slot: 'console.home',
        });

        assert.strictEqual(service.currentDashboard.id, 'saved-dashboard', 'persisted default dashboard takes precedence');
        assert.strictEqual(service.currentWidgetSourceDashboardId, 'dashboard', 'saved dashboard keeps its persisted widget catalog source');
    });
});

// A second module covering the parts of the service the original tests do not reach:
// dashboard selection, creation, deletion, the editing/adding flags and the widget
// source resolution. Kept separate so its stubs can record calls without complicating
// the fixtures above.
class RecordingFetch {
    posts = [];
    responses = new Map();
    failWith = null;

    post(path, body, options) {
        this.posts.push({ path, body, options });

        if (this.failWith) {
            return Promise.reject(this.failWith);
        }

        return Promise.resolve(this.responses.get(path) ?? null);
    }
}

class RecordingNotifications {
    successes = [];
    serverErrors = [];

    success(message) {
        this.successes.push(message);
    }
    serverError(error) {
        this.serverErrors.push(error);
    }
}

module('Unit | Service | dashboard selection and lifecycle', function (hooks) {
    setupTest(hooks);

    hooks.beforeEach(function () {
        this.store = new StubStore();
        this.widgetService = new StubWidgetService();
        this.fetch = new RecordingFetch();
        this.notifications = new RecordingNotifications();

        this.owner.register('service:store', this.store, { instantiate: false });
        this.owner.register('service:fetch', this.fetch, { instantiate: false });
        this.owner.register('service:notifications', this.notifications, { instantiate: false });
        this.owner.register('service:intl', { t: (key, values) => `${key}:${values?.dashboardName ?? ''}` }, { instantiate: false });
        this.owner.register('service:universe', new StubUniverse(), { instantiate: false });
        this.owner.unregister('service:universe/widget-service');
        this.owner.register('service:universe/widget-service', this.widgetService, { instantiate: false });

        this.service = this.owner.lookup('service:dashboard');
    });

    module('editing flags', function () {
        test('the editing flag can be raised and lowered', function (assert) {
            assert.false(this.service.isEditingDashboard);

            this.service.onChangeEdit();
            assert.true(this.service.isEditingDashboard, 'it defaults to enabling');

            this.service.onChangeEdit(false);
            assert.false(this.service.isEditingDashboard);
        });

        test('the adding-widget flag can be raised and lowered', function (assert) {
            assert.false(this.service.isAddingWidget);

            this.service.onAddingWidget();
            assert.true(this.service.isAddingWidget);

            this.service.onAddingWidget(false);
            assert.false(this.service.isAddingWidget);
        });
    });

    module('selecting a dashboard', function () {
        test('choosing a system dashboard resets the server default', async function (assert) {
            const dashboard = { id: 'dashboard', user_uuid: 'system' };

            await this.service.selectDashboard.perform(dashboard);

            assert.strictEqual(this.service.currentDashboard, dashboard);
            assert.deepEqual(
                this.fetch.posts.map((post) => post.path),
                ['dashboards/reset-default'],
                'the default is reset rather than switched'
            );
        });

        test('choosing a saved dashboard switches to it and adopts the response', async function (assert) {
            const saved = { id: 'dash_1', user_uuid: 'user_1' };
            const returned = { id: 'dash_1', name: 'From server' };
            this.fetch.responses.set('dashboards/switch', returned);

            await this.service.selectDashboard.perform(saved);

            assert.deepEqual(this.fetch.posts[0].body, { dashboard_uuid: 'dash_1' });
            assert.true(this.fetch.posts[0].options.normalizeToEmberData);
            assert.strictEqual(this.service.currentDashboard, returned, 'the server response becomes current');
        });

        test('a failed switch is reported and leaves the current dashboard alone', async function (assert) {
            const error = new Error('switch failed');
            this.fetch.failWith = error;
            this.service.currentDashboard = { id: 'unchanged' };

            await this.service.selectDashboard.perform({ id: 'dash_1', user_uuid: 'user_1' });

            assert.deepEqual(this.notifications.serverErrors, [error]);
            assert.strictEqual(this.service.currentDashboard.id, 'unchanged');
        });

        test('setCurrentDashboard switches and adopts the response', async function (assert) {
            const returned = { id: 'dash_2', name: 'Second' };
            this.fetch.responses.set('dashboards/switch', returned);

            await this.service.setCurrentDashboard.perform({ id: 'dash_2' });

            assert.strictEqual(this.service.currentDashboard, returned);
        });

        test('a failed setCurrentDashboard is reported', async function (assert) {
            const error = new Error('nope');
            this.fetch.failWith = error;

            await this.service.setCurrentDashboard.perform({ id: 'dash_2' });

            assert.deepEqual(this.notifications.serverErrors, [error]);
            assert.strictEqual(this.service.currentDashboard, undefined);
        });
    });

    module('creating a dashboard', function () {
        test('a created dashboard is announced, selected and added to the list', async function (assert) {
            this.store.createRecord = (modelName, data) => ({
                ...data,
                id: 'dash_new',
                save: () => Promise.resolve({ id: 'dash_new', name: data.name, user_uuid: 'user_1' }),
            });

            await this.service.createDashboard.perform('Operations');

            assert.deepEqual(this.notifications.successes, ['services.dashboard-service.create-dashboard-success-notification:Operations']);
            assert.deepEqual(
                this.service.dashboards.map((dashboard) => dashboard.id),
                ['dash_new'],
                'it joins the list'
            );
            assert.deepEqual(
                this.fetch.posts.map((post) => post.path),
                ['dashboards/switch'],
                'it is also selected'
            );
        });

        test('extra attributes are passed through to the new record', async function (assert) {
            let created;
            this.store.createRecord = (modelName, data) => {
                created = data;
                return { ...data, save: () => Promise.resolve({ id: 'dash_new', name: data.name }) };
            };

            await this.service.createDashboard.perform('Operations', { extension: 'fleet-ops' });

            assert.strictEqual(created.name, 'Operations');
            assert.true(created.is_default, 'new dashboards are created as the default');
            assert.strictEqual(created.extension, 'fleet-ops');
        });

        test('a failed save is reported and nothing is added', async function (assert) {
            const error = new Error('save failed');
            this.store.createRecord = () => ({ save: () => Promise.reject(error) });

            await this.service.createDashboard.perform('Operations');

            assert.deepEqual(this.notifications.serverErrors, [error]);
            assert.deepEqual(this.service.dashboards, []);
        });

        test('a save that resolves to nothing announces nothing', async function (assert) {
            this.store.createRecord = () => ({ save: () => Promise.resolve(null) });

            await this.service.createDashboard.perform('Operations');

            assert.deepEqual(this.notifications.successes, []);
            assert.deepEqual(this.service.dashboards, []);
        });
    });

    module('the widget source dashboard', function () {
        test('with nothing selected it falls back to the plain default', function (assert) {
            assert.strictEqual(this.service.currentWidgetSourceDashboardId, 'dashboard');
        });

        test('a system dashboard sources widgets from itself', function (assert) {
            this.service.currentDashboard = { id: 'fleet-ops', user_uuid: 'system' };

            assert.strictEqual(this.service.currentWidgetSourceDashboardId, 'fleet-ops');
        });

        test('a saved dashboard can pin its widget source', function (assert) {
            this.service.currentDashboard = { id: 'dash_1', user_uuid: 'user_1', options: { widget_source_dashboard_id: 'fleet-ops' } };

            assert.strictEqual(this.service.currentWidgetSourceDashboardId, 'fleet-ops');
        });

        test('an unpinned saved dashboard falls back to the last load scope', async function (assert) {
            this.store.queryRecords = [];
            await this.service.loadDashboards.perform({ defaultDashboardId: 'storefront', extension: 'storefront' });
            this.service.currentDashboard = { id: 'dash_1', user_uuid: 'user_1' };

            assert.strictEqual(this.service.currentWidgetSourceDashboardId, 'storefront');
        });
    });

    module('loading', function () {
        test('a non-array query result leaves the dashboards untouched', async function (assert) {
            this.store.query = () => Promise.resolve(null);

            await this.service.loadDashboards.perform();

            assert.deepEqual(this.service.dashboards, []);
            assert.strictEqual(this.service.currentDashboard, undefined);
        });

        test('the load options are remembered for later reloads', async function (assert) {
            await this.service.loadDashboards.perform({ defaultDashboardId: 'storefront', defaultDashboardName: 'Storefront', extension: 'storefront' });

            assert.deepEqual(this.service.lastLoadOptions, {
                defaultDashboardId: 'storefront',
                defaultDashboardName: 'Storefront',
                extension: 'storefront',
                slot: null,
            });
        });

        test('an empty dashboard leaves the widget panel closed by default', async function (assert) {
            await this.service.loadDashboards.perform();

            assert.false(this.service.isAddingWidget);
        });

        test('an empty dashboard opens the widget panel when the service is configured to', async function (assert) {
            this.service.showPanelWhenZeroWidgets = true;

            await this.service.loadDashboards.perform();

            assert.true(this.service.isAddingWidget, 'the panel opens for a dashboard with no widgets');
        });

        test('a store result exposing toArray is unwrapped', async function (assert) {
            const saved = { id: 'dash_1', user_uuid: 'user_1', is_default: false, widgets: [] };
            const resultSet = [saved];
            resultSet.toArray = () => [saved];
            this.store.query = () => Promise.resolve(resultSet);

            await this.service.loadDashboards.perform();

            assert.true(
                this.service.dashboards.some((dashboard) => dashboard.id === 'dash_1'),
                'the saved dashboard is included alongside the system one'
            );
        });
    });

    module('resetting', function () {
        test('reset clears the current dashboard and the list immediately', async function (assert) {
            this.service.currentDashboard = { id: 'dash_1' };
            this.service.dashboards = [{ id: 'dash_1' }];

            this.service.reset();

            assert.strictEqual(this.service.currentDashboard, null);
            assert.deepEqual(this.service.dashboards, []);

            // reset() defers the store unloads to the next runloop tick; let them run
            // inside the test rather than after the owner is torn down.
            await settled();
            assert.strictEqual(this.store.records.size, 0, 'the deferred unload also runs');
        });
    });

    module('deleting a dashboard', function () {
        function deletableDashboard(overrides = {}) {
            const dashboard = {
                id: 'custom',
                name: 'Custom Dashboard',
                user_uuid: 'user_1',
                is_default: true,
                destroyCount: 0,
                destroyRecord() {
                    dashboard.destroyCount++;
                    return Promise.resolve(dashboard);
                },
                ...overrides,
            };

            return dashboard;
        }

        test('it destroys the record and announces the deletion', async function (assert) {
            const dashboard = deletableDashboard();

            await this.service.deleteDashboard.perform(dashboard);

            assert.strictEqual(dashboard.destroyCount, 1, 'the record is destroyed');
            assert.deepEqual(
                this.notifications.successes,
                ['services.dashboard-service.delete-dashboard-success-notification:Custom Dashboard'],
                'the deletion is announced with the dashboard name'
            );
        });

        test('it reloads and reselects, then runs the caller callback', async function (assert) {
            const called = [];

            await this.service.deleteDashboard.perform(deletableDashboard(), { callback: (current) => called.push(current) });

            assert.strictEqual(called.length, 1, 'the callback runs once');
            assert.strictEqual(called[0], this.service.currentDashboard, 'it receives whatever is current afterwards');
        });

        test('deleting without any options does not throw', async function (assert) {
            await this.service.deleteDashboard.perform(deletableDashboard());

            assert.deepEqual(this.notifications.serverErrors, [], 'nothing is reported as an error');
        });

        test('a failed destroy reports the error and runs the caller onError', async function (assert) {
            const dashboard = deletableDashboard({ destroyRecord: () => Promise.reject(new Error('cannot delete')) });
            const errors = [];

            await this.service.deleteDashboard.perform(dashboard, { onError: (error, record) => errors.push({ error, record }) });

            assert.strictEqual(errors.length, 1, 'the caller is told about the failure');
            assert.strictEqual(errors[0].record, dashboard, 'the failing record travels with the error');
            assert.strictEqual(this.notifications.serverErrors.length, 1, 'the real failure is reported');
            assert.strictEqual(this.notifications.serverErrors[0].message, 'cannot delete');
            assert.deepEqual(this.notifications.successes, [], 'nothing is announced as deleted');
        });

        test('a failed destroy still reports even with no onError hook', async function (assert) {
            await this.service.deleteDashboard.perform(deletableDashboard({ destroyRecord: () => Promise.reject(new Error('nope')) }));

            assert.strictEqual(this.notifications.serverErrors.length, 1, 'the failure is surfaced');
            assert.deepEqual(this.notifications.successes, []);
        });
    });

    module('choosing the next dashboard', function () {
        test('a user default outranks every system dashboard', function (assert) {
            const service = this.service;
            service.dashboards = [
                { id: 'dashboard', user_uuid: 'system', is_default: false },
                { id: 'mine', user_uuid: 'user-1', is_default: true },
            ];

            assert.strictEqual(service._getNextDashboard({}).id, 'mine');
        });

        test('the slot default is preferred over the plain default', function (assert) {
            this.widgetService.slotDefault = 'alrashd';
            const service = this.service;
            service.dashboards = [
                { id: 'dashboard', user_uuid: 'system', is_default: false },
                { id: 'alrashd', user_uuid: 'system', is_default: false },
            ];

            assert.strictEqual(service._getNextDashboard({ slot: 'console.home' }).id, 'alrashd');
        });

        test('with no slot the configured default id is used', function (assert) {
            const service = this.service;
            service.dashboards = [
                { id: 'other', user_uuid: 'system', is_default: false },
                { id: 'dashboard', user_uuid: 'system', is_default: false },
            ];

            assert.strictEqual(service._getNextDashboard({}).id, 'dashboard');
        });

        test('anything else falls back to the first dashboard', function (assert) {
            const service = this.service;
            service.dashboards = [
                { id: 'first', user_uuid: 'user-1', is_default: false },
                { id: 'second', user_uuid: 'user-1', is_default: false },
            ];

            assert.strictEqual(service._getNextDashboard({}).id, 'first');
        });

        test('an empty dashboard list yields nothing', function (assert) {
            const service = this.service;
            service.dashboards = [];

            assert.strictEqual(service._getNextDashboard({}), undefined);
        });
    });

    module('the default dashboard record', function () {
        test('an existing usable record is reused rather than recreated', function (assert) {
            const service = this.service;
            const existing = { id: 'dashboard', name: 'Default Dashboard', isDeleted: false, isDestroying: false, isDestroyed: false };
            this.store.records.set('dashboard:dashboard', existing);

            const created = this.store.createdPayloads.length;

            assert.strictEqual(service._createDefaultDashboard('dashboard', 'Default Dashboard'), existing);
            assert.strictEqual(this.store.createdPayloads.length, created, 'no new record is created');
        });

        test('a deleted record is replaced', function (assert) {
            const service = this.service;
            this.store.records.set('dashboard:dashboard', { id: 'dashboard', isDeleted: true });
            this.store.createRecord = (modelName, data) => ({ ...data, replaced: true });

            const dashboard = service._createDefaultDashboard('dashboard', 'Default Dashboard');

            assert.true(dashboard.replaced, 'a fresh record is created over the deleted one');
            assert.strictEqual(dashboard.name, 'Default Dashboard');
            assert.strictEqual(dashboard.user_uuid, 'system');
        });

        test('an identity-map race is resolved by re-peeking', function (assert) {
            const service = this.service;
            const raced = { id: 'dashboard', name: 'Raced Dashboard' };

            this.store.createRecord = () => {
                // Mirror the race: the record appears between the peek and the create.
                this.store.records.set('dashboard:dashboard', raced);
                throw new Error("The id dashboard has already been used with another 'dashboard' record.");
            };

            assert.strictEqual(service._createDefaultDashboard('dashboard', 'Default Dashboard'), raced, 'the winner of the race is adopted');
        });

        test('any other creation failure is re-thrown', function (assert) {
            const service = this.service;
            this.store.createRecord = () => {
                throw new Error('database is on fire');
            };

            assert.throws(() => service._createDefaultDashboard('dashboard', 'Default Dashboard'), /database is on fire/);
        });
    });

    module('load state helpers', function () {
        test('the default dashboard is reported loaded only when present', function (assert) {
            const service = this.service;

            service.dashboards = [];
            assert.false(service._isDefaultDashboardLoaded('dashboard'));
            assert.true(service._isDefaultDashboardNotLoaded('dashboard'));

            service.dashboards = [{ id: 'dashboard' }];
            assert.true(service._isDefaultDashboardLoaded('dashboard'));
            assert.false(service._isDefaultDashboardNotLoaded('dashboard'));
        });

        test('a null entry in the list is tolerated', function (assert) {
            const service = this.service;
            service.dashboards = [null, { id: 'dashboard' }];

            assert.true(service._isDefaultDashboardLoaded('dashboard'), 'a null dashboard does not throw');
        });
    });
    // Six private entry points carry defaulted parameters, and every existing caller passes them
    // explicitly. Calling them bare is the only way those defaults run.
    module('called with no arguments', function () {
        test('the default dashboard is named and keyed from the built-in defaults', function (assert) {
            const service = this.owner.lookup('service:dashboard');

            const dashboard = service._createDefaultDashboard();

            assert.strictEqual(dashboard.id, 'dashboard');
            assert.strictEqual(dashboard.name, 'Default Dashboard');
            assert.strictEqual(dashboard.user_uuid, 'system');
        });

        test('the default widgets are built for the default dashboard', function (assert) {
            this.widgetService.widgets = [{ id: 'kpi', name: 'KPI', component: 'widget/kpi', default: true }];
            const service = this.owner.lookup('service:dashboard');

            assert.strictEqual(service._createDefaultDashboardWidgets().length, 1);
        });

        test('the system dashboards fall back to the single default', function (assert) {
            const service = this.owner.lookup('service:dashboard');

            const dashboards = service._createSystemDashboards();

            assert.strictEqual(dashboards.length, 1, 'with no slot there is nothing to expand');
            assert.strictEqual(dashboards[0].id, 'dashboard');
        });

        test('the load-state helpers answer for the default id', function (assert) {
            const service = this.owner.lookup('service:dashboard');
            service.dashboards = [];

            assert.false(service._isDefaultDashboardLoaded(), 'nothing is loaded yet');
            assert.true(service._isDefaultDashboardNotLoaded(), 'and the inverse agrees');

            service.dashboards = [{ id: 'dashboard' }];

            assert.true(service._isDefaultDashboardLoaded());
            assert.false(service._isDefaultDashboardNotLoaded());
        });

        test('the next dashboard is chosen against the default id', function (assert) {
            const service = this.owner.lookup('service:dashboard');
            service.dashboards = [
                { id: 'other', user_uuid: 'system' },
                { id: 'dashboard', user_uuid: 'system' },
            ];

            assert.strictEqual(service._getNextDashboard().id, 'dashboard');
        });
    });

    module('system dashboards registered against a slot', function () {
        test('a slot with no default of its own has one prepended', function (assert) {
            this.widgetService.slotDashboards = [{ dashboardId: 'fleet', name: 'Fleet' }];
            const service = this.owner.lookup('service:dashboard');

            const dashboards = service._createSystemDashboards({ slot: 'console' });

            assert.deepEqual(
                dashboards.map((dashboard) => dashboard.id),
                ['dashboard', 'fleet'],
                'the built-in default leads the list'
            );
            assert.strictEqual(dashboards[1].name, 'Fleet');
        });

        test('a slot that already declares the default is used as-is', function (assert) {
            this.widgetService.slotDashboards = [
                { dashboardId: 'dashboard', name: 'Main' },
                { dashboardId: 'fleet', name: 'Fleet' },
            ];
            const service = this.owner.lookup('service:dashboard');

            const dashboards = service._createSystemDashboards({ slot: 'console' });

            assert.deepEqual(
                dashboards.map((dashboard) => dashboard.id),
                ['dashboard', 'fleet'],
                'nothing is prepended'
            );
            assert.strictEqual(dashboards[0].name, 'Main', 'the slot definition wins over the built-in name');
        });

        test('a slot dashboard identified only by id, and with no name, keys on that id', function (assert) {
            this.widgetService.slotDashboards = [{ id: 'ops' }];
            const service = this.owner.lookup('service:dashboard');

            const dashboards = service._createSystemDashboards({ slot: 'console' });

            const ops = dashboards.find((dashboard) => dashboard.id === 'ops');
            assert.ok(ops, 'the id stands in for a missing dashboardId');
            assert.strictEqual(ops.name, 'ops', 'and for a missing name');
        });
    });

    test('an identity-map race that re-peeks to nothing re-throws', function (assert) {
        const service = this.owner.lookup('service:dashboard');
        this.store.createRecord = () => {
            throw new Error(`The id dashboard has already been used with another 'dashboard' record.`);
        };
        this.store.peekRecord = () => null;

        assert.throws(() => service._createDefaultDashboard(), /has already been used/, 'the error is not swallowed when there is nothing to recover');
    });
});
