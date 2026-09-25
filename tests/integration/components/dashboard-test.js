import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, findAll } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';

/**
 * Stand-in for the `dashboard` service. Every task is replaced with a `{ perform }`
 * spy so the component's delegation contract can be asserted without touching the
 * store, and the state the template reads is tracked so DOM updates are observable.
 */
class DashboardStubService extends Service {
    calls = [];

    @tracked dashboards = [];
    @tracked currentDashboard = null;
    @tracked isEditingDashboard = false;
    @tracked isAddingWidget = false;
    @tracked showPanelWhenZeroWidgets = false;

    currentWidgetSourceDashboardId = 'widget-source-dashboard';

    _spyTask(method) {
        return {
            isRunning: false,
            perform: (...args) => {
                this.calls.push({ method, args });
                return Promise.resolve();
            },
        };
    }

    loadDashboards = this._spyTask('loadDashboards');
    selectDashboard = this._spyTask('selectDashboard');
    createDashboard = this._spyTask('createDashboard');
    deleteDashboard = this._spyTask('deleteDashboard');
    setCurrentDashboard = this._spyTask('setCurrentDashboard');

    reset() {
        this.calls.push({ method: 'reset', args: [] });
    }

    onAddingWidget(state = true) {
        this.calls.push({ method: 'onAddingWidget', args: [state] });
        this.isAddingWidget = state;
    }

    onChangeEdit(state = true) {
        this.calls.push({ method: 'onChangeEdit', args: [state] });
        this.isEditingDashboard = state;
    }
}

class ModalsManagerStubService extends Service {
    calls = [];

    show(name, options = {}) {
        this.calls.push({ method: 'show', args: [name, options] });
        return Promise.resolve();
    }

    confirm(options = {}) {
        this.calls.push({ method: 'confirm', args: [options] });
        return Promise.resolve();
    }
}

function ddItems() {
    return findAll('.next-dd-item');
}

function ddItem(text) {
    return ddItems().find((element) => element.textContent.trim() === text);
}

function makeDashboard(id, name, userUuid = 'user_1') {
    return { id, name, user_uuid: userUuid, widgets: [] };
}

module('Integration | Component | dashboard', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        this.owner.register('service:dashboard', DashboardStubService);
        this.owner.register('service:modals-manager', ModalsManagerStubService);

        this.dashboardService = this.owner.lookup('service:dashboard');
        this.modalsManager = this.owner.lookup('service:modals-manager');
        this.notifications = this.owner.lookup('service:notifications');
    });

    test('it renders the header with the current dashboard name and passes @stickyHeader through', async function (assert) {
        this.dashboardService.currentDashboard = makeDashboard('d1', 'Operations');
        this.dashboardService.dashboards = [this.dashboardService.currentDashboard];

        await render(hbs`<Dashboard @stickyHeader={{true}} @leftHeaderWrapperClass="left-custom" @rightHeaderWrapperClass="right-custom" data-test-dashboard />`);

        assert.dom('.fleetbase-dashboard-grid').hasClass('fleetbase-dashboard-grid--sticky');
        assert.dom('.fleetbase-dashboard-grid').hasAttribute('data-test-dashboard', '', '...attributes land on the header wrapper');
        assert.dom('.fleetbase-dashboard-grid .left-section h1').hasText('Operations');
        assert.dom('.fleetbase-dashboard-grid .left-section').hasClass('left-custom');
        assert.dom('.fleetbase-dashboard-actions').hasClass('right-custom');
    });

    test('it omits the sticky modifier class by default', async function (assert) {
        this.dashboardService.currentDashboard = makeDashboard('d1', 'Operations');

        await render(hbs`<Dashboard />`);

        assert.dom('.fleetbase-dashboard-grid').doesNotHaveClass('fleetbase-dashboard-grid--sticky');
    });

    test('it resets the service and loads dashboards with the supplied options', async function (assert) {
        await render(hbs`<Dashboard @defaultDashboardId="fleet-ops" @defaultDashboardName="Fleet Ops" @extension="fleet-ops" @slot="operations" @showPanelWhenZeroWidgets={{true}} />`);

        const reset = this.dashboardService.calls.filter((call) => call.method === 'reset');
        const load = this.dashboardService.calls.filter((call) => call.method === 'loadDashboards');

        assert.strictEqual(reset.length, 1, 'reset() runs once on construction');
        assert.strictEqual(load.length, 1, 'loadDashboards is performed once');
        assert.deepEqual(load[0].args[0], {
            defaultDashboardId: 'fleet-ops',
            defaultDashboardName: 'Fleet Ops',
            extension: 'fleet-ops',
            slot: 'operations',
        });
        assert.true(this.dashboardService.showPanelWhenZeroWidgets, '@showPanelWhenZeroWidgets is forwarded to the service');
    });

    test('it falls back to the documented default load options', async function (assert) {
        await render(hbs`<Dashboard />`);

        const load = this.dashboardService.calls.find((call) => call.method === 'loadDashboards');

        assert.deepEqual(load.args[0], {
            defaultDashboardId: 'dashboard',
            defaultDashboardName: 'Default Dashboard',
            extension: 'core',
            slot: null,
        });
        assert.false(this.dashboardService.showPanelWhenZeroWidgets, 'the panel stays closed for zero widgets by default');
    });

    test('it labels the dashboard picker with the current dashboard name', async function (assert) {
        this.dashboardService.currentDashboard = makeDashboard('d1', 'Operations');

        await render(hbs`<Dashboard />`);

        assert.dom('.ember-basic-dropdown-trigger button').hasAttribute('title', 'Operations');
    });

    test('it labels the dashboard picker with the select-dashboard translation when nothing is selected', async function (assert) {
        this.dashboardService.currentDashboard = null;

        await render(hbs`<Dashboard />`);

        assert.dom('.ember-basic-dropdown-trigger button').hasAttribute('title', 'component.dashboard.select-dashboard');
        assert.dom('.fleetbase-dashboard-grid .left-section h1').hasText('');
    });

    test('it lists every dashboard and check-marks the current one', async function (assert) {
        const first = makeDashboard('d1', 'Operations');
        const second = makeDashboard('d2', 'Analytics');
        this.dashboardService.dashboards = [first, second];
        this.dashboardService.currentDashboard = second;

        await render(hbs`<Dashboard />`);
        await click(findAll('.ember-basic-dropdown-trigger')[0]);

        const items = ddItems();
        assert.strictEqual(items.length, 2, 'one entry per dashboard');
        assert.dom(items[0]).containsText('Operations');
        assert.dom(items[1]).containsText('Analytics');
        assert.dom(items[0].querySelector('.text-green-500')).doesNotExist('non-current dashboards have no check');
        assert.dom(items[1].querySelector('.text-green-500')).exists('the current dashboard is check-marked');
    });

    test('it performs selectDashboard when a dashboard entry is clicked', async function (assert) {
        const first = makeDashboard('d1', 'Operations');
        const second = makeDashboard('d2', 'Analytics');
        this.dashboardService.dashboards = [first, second];
        this.dashboardService.currentDashboard = first;

        await render(hbs`<Dashboard />`);
        await click(findAll('.ember-basic-dropdown-trigger')[0]);
        await click(ddItems()[1]);

        const call = this.dashboardService.calls.find((entry) => entry.method === 'selectDashboard');
        assert.strictEqual(call.args[0], second, 'the clicked dashboard is passed through');
        assert.dom('.next-dd-item').doesNotExist('the dropdown closes after selecting');
    });

    test('it hides the edit affordances for a system dashboard and shows the hint instead', async function (assert) {
        this.dashboardService.currentDashboard = makeDashboard('dashboard', 'Default Dashboard', 'system');
        this.dashboardService.dashboards = [this.dashboardService.currentDashboard];

        await render(hbs`<Dashboard />`);
        await click(findAll('.ember-basic-dropdown-trigger')[1]);

        assert.dom(ddItem('component.dashboard.create-new-dashboard')).exists('creating a dashboard stays available');
        assert.strictEqual(ddItems().length, 1, 'edit / add-widget / delete are all suppressed');
        assert.dom('.ember-basic-dropdown-content').containsText('component.dashboard.create-to-customize-hint');
    });

    test('it shows edit, add-widget and delete for a user owned dashboard', async function (assert) {
        this.dashboardService.currentDashboard = makeDashboard('d1', 'Operations');
        this.dashboardService.dashboards = [this.dashboardService.currentDashboard];

        await render(hbs`<Dashboard />`);
        await click(findAll('.ember-basic-dropdown-trigger')[1]);

        assert.strictEqual(ddItems().length, 4, 'create + edit + add-widgets + delete');
        assert.dom(ddItem('component.dashboard.edit-layout')).exists();
        assert.dom(ddItem('component.dashboard.add-widgets')).exists();
        assert.dom(ddItem('component.dashboard.delete-dashboard')).exists();
        assert.dom('.ember-basic-dropdown-content').doesNotContainText('component.dashboard.create-to-customize-hint');
    });

    test('it enters edit mode and renders a save button that leaves it', async function (assert) {
        this.dashboardService.currentDashboard = makeDashboard('d1', 'Operations');
        this.dashboardService.dashboards = [this.dashboardService.currentDashboard];

        await render(hbs`<Dashboard />`);

        assert.dom('.fleetbase-dashboard-actions .btn-magic').doesNotExist('no save button until editing');

        await click(findAll('.ember-basic-dropdown-trigger')[1]);
        await click(ddItem('component.dashboard.edit-layout'));

        assert.deepEqual(
            this.dashboardService.calls.filter((call) => call.method === 'onChangeEdit').map((call) => call.args),
            [[true]]
        );
        assert.dom('.fleetbase-dashboard-actions .btn-magic').exists('the save button appears while editing');

        await click('.fleetbase-dashboard-actions .btn-magic');

        assert.deepEqual(
            this.dashboardService.calls.filter((call) => call.method === 'onChangeEdit').map((call) => call.args),
            [[true], [false]],
            'the save button turns editing back off'
        );
        assert.dom('.fleetbase-dashboard-actions .btn-magic').doesNotExist();
    });

    test('it toggles the widget selector panel and closes it again', async function (assert) {
        this.dashboardService.currentDashboard = makeDashboard('d1', 'Operations');
        this.dashboardService.dashboards = [this.dashboardService.currentDashboard];

        await render(hbs`<div id="application-root-wormhole"></div><Dashboard />`);

        assert.dom('#application-root-wormhole .next-content-overlay').doesNotExist('the panel is not rendered while closed');

        await click(findAll('.ember-basic-dropdown-trigger')[1]);
        await click(ddItem('component.dashboard.add-widgets'));

        assert.deepEqual(
            this.dashboardService.calls.filter((call) => call.method === 'onAddingWidget').map((call) => call.args),
            [[true]]
        );
        assert.dom('#application-root-wormhole .next-content-overlay').exists('the widget panel is wormholed to the application root');

        await click('#application-root-wormhole .next-view-header-right button');

        assert.deepEqual(
            this.dashboardService.calls.filter((call) => call.method === 'onAddingWidget').map((call) => call.args),
            [[true], [false]],
            'the panel close button turns adding-widget back off'
        );
        assert.dom('#application-root-wormhole .next-content-overlay').doesNotExist();
    });

    test('it opens the create-dashboard modal and delegates the confirm handler to the service', async function (assert) {
        this.dashboardService.currentDashboard = makeDashboard('d1', 'Operations');
        this.dashboardService.dashboards = [this.dashboardService.currentDashboard];

        await render(hbs`<Dashboard @extension="fleet-ops" />`);
        await click(findAll('.ember-basic-dropdown-trigger')[1]);
        await click(ddItem('component.dashboard.create-new-dashboard'));

        const show = this.modalsManager.calls.find((call) => call.method === 'show');
        assert.strictEqual(show.args[0], 'modals/create-dashboard');
        assert.strictEqual(show.args[1].title, 'component.dashboard.create-a-new-dashboard');
        assert.strictEqual(show.args[1].acceptButtonText, 'component.dashboard.confirm-create-dashboard');

        let loadingStarted = false;
        let doneCalled = false;
        await show.args[1].confirm(
            {
                startLoading: () => (loadingStarted = true),
                getOptions: () => ({ name: 'New Dashboard' }),
            },
            () => (doneCalled = true)
        );

        const created = this.dashboardService.calls.find((call) => call.method === 'createDashboard');
        assert.true(loadingStarted, 'the modal is put into a loading state first');
        assert.deepEqual(created.args, ['New Dashboard', { extension: 'fleet-ops', options: { widget_source_dashboard_id: 'widget-source-dashboard' } }]);
        assert.true(doneCalled, 'done() closes the modal once the task resolves');
    });

    test('it refuses to delete the last remaining dashboard', async function (assert) {
        this.dashboardService.currentDashboard = makeDashboard('d1', 'Operations');
        this.dashboardService.dashboards = [this.dashboardService.currentDashboard];

        await render(hbs`<Dashboard />`);
        await click(findAll('.ember-basic-dropdown-trigger')[1]);
        await click(ddItem('component.dashboard.delete-dashboard'));

        assert.deepEqual(
            this.notifications.calls.map((call) => call.args[0]),
            ['component.dashboard.you-cannot-delete-this-dashboard']
        );
        assert.strictEqual(this.modalsManager.calls.filter((call) => call.method === 'confirm').length, 0, 'no confirmation modal is opened');
    });

    test('it confirms deletion when more than one dashboard exists', async function (assert) {
        const first = makeDashboard('d1', 'Operations');
        const second = makeDashboard('d2', 'Analytics');
        this.dashboardService.dashboards = [first, second];
        this.dashboardService.currentDashboard = first;

        await render(hbs`<Dashboard />`);
        await click(findAll('.ember-basic-dropdown-trigger')[1]);
        await click(ddItem('component.dashboard.delete-dashboard'));

        const confirmModal = this.modalsManager.calls.find((call) => call.method === 'confirm');
        assert.strictEqual(confirmModal.args[0].title, 'component.dashboard.are-you-sure-you-want-delete-dashboard');
        assert.strictEqual(this.notifications.calls.length, 0, 'nothing is rejected outright');

        let doneCalled = false;
        await confirmModal.args[0].confirm({ startLoading: () => {} }, () => (doneCalled = true));

        const deleted = this.dashboardService.calls.find((call) => call.method === 'deleteDashboard');
        assert.strictEqual(deleted.args[0], first, 'the current dashboard is the one deleted');
        assert.true(doneCalled);
    });

    test('it renders the default, actions and body blocks', async function (assert) {
        this.dashboardService.currentDashboard = makeDashboard('d1', 'Operations');

        await render(hbs`
            <Dashboard @createWrapperClass="create-wrapper">
                <:default><span class="yielded-default">default-content</span></:default>
                <:actions><span class="yielded-actions">actions-content</span></:actions>
                <:body><span class="yielded-body">body-content</span></:body>
            </Dashboard>
        `);

        assert.dom('.fleetbase-dashboard-actions .yielded-default').hasText('default-content');
        assert.dom('.fleetbase-dashboard-actions .yielded-actions').hasText('actions-content');
        assert.dom('.create-wrapper .yielded-body').hasText('body-content');
    });

    test('it does not put a system dashboard into editable mode', async function (assert) {
        this.dashboardService.currentDashboard = makeDashboard('dashboard', 'Default Dashboard', 'system');
        this.dashboardService.dashboards = [this.dashboardService.currentDashboard];
        this.dashboardService.isEditingDashboard = true;

        await render(hbs`<Dashboard />`);

        assert.dom('.fleetbase-dashboard-actions .btn-magic').exists('the save button still reflects the editing flag');
        assert.dom('.grid-stack').exists('the create grid still renders');
        assert.dom('.grid-stack .btn-default').doesNotExist('but no per-widget remove buttons are enabled for a system dashboard');
    });
});
