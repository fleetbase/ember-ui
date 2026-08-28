import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, fillIn, waitFor } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import Service from '@ember/service';
import { ExtensionComponent } from '@fleetbase/ember-core/contracts';

class StubWidgetService extends Service {
    widgets = [];
    catalogs = {};
    requested = [];

    getWidgets(dashboardName) {
        this.requested.push(dashboardName);

        return this.catalogs[dashboardName] ?? this.widgets;
    }
}

class StubNotificationsService extends Service {
    serverError() {}
}

module('Integration | Component | dashboard/widget-panel', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        // The addon ships a real universe/widget-service; owner.register loses to a
        // resolver-provided factory unless the existing registration is removed first.
        this.owner.unregister('service:universe/widget-service');
        this.owner.register('service:universe/widget-service', StubWidgetService);
        this.owner.unregister('service:notifications');
        this.owner.register('service:notifications', StubNotificationsService);

        this.widgetService = this.owner.lookup('service:universe/widget-service');
        this.widgetService.widgets = [
            { id: 'fleet-ops-kpi-earnings-widget', name: 'Earnings', description: 'Revenue', icon: 'sack-dollar', category: 'KPI Tiles', default: true },
            { id: 'fleet-ops-kpi-distance-widget', name: 'Distance', description: 'Distance travelled', icon: 'route', category: 'KPI Tiles', default: false },
            { id: 'fleet-ops-revenue-trend-widget', name: 'Revenue Trend', description: 'Revenue over time', icon: 'chart-line', category: 'Analytics', default: true },
        ];

        this.dashboard = {
            widgets: [
                { id: 'uuid-1', options: { widget_key: 'fleet-ops-kpi-earnings-widget' } },
                { id: 'uuid-2', options: { widget_key: 'fleet-ops-kpi-earnings-widget' } },
            ],
            addWidget: () => Promise.resolve(),
        };
    });

    test('it renders widgets grouped by category', async function (assert) {
        await render(hbs`<Dashboard::WidgetPanel @isOpen={{true}} @dashboard={{this.dashboard}} @defaultDashboardId="dashboard" />`);
        await waitFor('.dashboard-widget-card');

        assert.dom('.dashboard-widget-card').exists({ count: 3 }, 'all 3 registry widgets render');
        const groupTitles = Array.from(this.element.querySelectorAll('span')).map((node) => node.textContent.replace(/\s+/g, ' ').trim());
        assert.ok(
            groupTitles.some((t) => t.startsWith('KPI Tiles')),
            'KPI Tiles group header rendered'
        );
        assert.ok(
            groupTitles.some((t) => t.startsWith('Analytics')),
            'Analytics group header rendered'
        );
    });

    test('it shows an "on dashboard" badge with the count when a widget is already added', async function (assert) {
        await render(hbs`<Dashboard::WidgetPanel @isOpen={{true}} @dashboard={{this.dashboard}} @defaultDashboardId="dashboard" />`);
        await waitFor('.dashboard-widget-card');

        const earningsCard = this.element.querySelector('[data-widget-key="fleet-ops-kpi-earnings-widget"]');
        assert.ok(earningsCard, 'earnings card rendered');
        assert.ok(earningsCard.textContent.includes('×2'), 'shows "On dashboard ×2" because the widget appears twice');

        const distanceCard = this.element.querySelector('[data-widget-key="fleet-ops-kpi-distance-widget"]');
        assert.notOk(distanceCard.textContent.includes('On dashboard'), 'unrelated widget does not show added badge');
    });

    test('search filters across name, description, and category', async function (assert) {
        await render(hbs`<Dashboard::WidgetPanel @isOpen={{true}} @dashboard={{this.dashboard}} @defaultDashboardId="dashboard" />`);
        await waitFor('.dashboard-widget-card');

        await fillIn('input[type="text"]', 'analytics');
        assert.dom('.dashboard-widget-card').exists({ count: 1 }, 'category search narrows to Analytics widgets');

        await fillIn('input[type="text"]', 'earn');
        assert.dom('.dashboard-widget-card').exists({ count: 1 }, 'name search picks the earnings card');
    });

    test('Recommended tab filters to widgets where default=true', async function (assert) {
        await render(hbs`<Dashboard::WidgetPanel @isOpen={{true}} @dashboard={{this.dashboard}} @defaultDashboardId="dashboard" />`);
        await waitFor('.dashboard-widget-card');

        // Tab labels are rendered through {{t}}, so pick the tab by its position in the
        // tab strip rather than by its translated text. Each tab shows a count badge, so
        // match on the count rather than on the label.
        const tabStrip = this.element.querySelector('.flex.bg-gray-100.rounded-md, .flex.rounded-md');
        const tabButtons = Array.from(tabStrip.querySelectorAll('button'));
        assert.strictEqual(tabButtons.length, 3, 'all three tabs are offered');
        await click(tabButtons[1]);

        assert.dom('.dashboard-widget-card').exists({ count: 2 }, 'only the two default:true widgets remain');
    });

    test('it can render widgets from an explicit widget source dashboard', async function (assert) {
        this.widgetService.catalogs = {
            dashboard: [{ id: 'fleetbase-blog', name: 'Fleetbase Blog', description: 'News', icon: 'newspaper', category: 'Core', default: true }],
            alrashd: [{ id: 'alrashd-kpi-total-trucks', name: 'Total Trucks', description: 'Fleet size', icon: 'truck', category: 'KPI Tiles', default: true }],
        };

        await render(hbs`<Dashboard::WidgetPanel @isOpen={{true}} @dashboard={{this.dashboard}} @defaultDashboardId="dashboard" @widgetSourceDashboardId="alrashd" />`);
        await waitFor('.dashboard-widget-card');

        assert.dom('[data-widget-key="alrashd-kpi-total-trucks"]').exists('renders the selected widget source catalog');
        assert.dom('[data-widget-key="fleetbase-blog"]').doesNotExist('does not fall back to the default dashboard catalog when an explicit source is present');
    });
    module('adding a widget', function (hooks) {
        hooks.beforeEach(function () {
            this.added = [];
            this.dashboard.addWidget = (payload) => {
                this.added.push(payload);

                return Promise.resolve();
            };
        });

        test('clicking a card hands a copy of the registry definition to the dashboard', async function (assert) {
            await render(hbs`<Dashboard::WidgetPanel @isOpen={{true}} @dashboard={{this.dashboard}} @defaultDashboardId="dashboard" />`);
            await waitFor('.dashboard-widget-card');
            await click('[data-widget-key="fleet-ops-revenue-trend-widget"]');

            assert.strictEqual(this.added.length, 1, 'the dashboard is asked to add exactly one widget');
            assert.strictEqual(this.added[0].id, 'fleet-ops-revenue-trend-widget');
            assert.notStrictEqual(this.added[0], this.widgetService.widgets[2], 'the registry definition itself is not handed over');
        });

        test('a component class is reduced to its name before it is stored', async function (assert) {
            class RevenueTrendWidget {}
            this.widgetService.widgets = [{ id: 'w-1', name: 'Trend', category: 'Analytics', component: RevenueTrendWidget }];

            await render(hbs`<Dashboard::WidgetPanel @isOpen={{true}} @dashboard={{this.dashboard}} @defaultDashboardId="dashboard" />`);
            await waitFor('.dashboard-widget-card');
            await click('[data-widget-key="w-1"]');

            assert.strictEqual(this.added[0].component, 'RevenueTrendWidget', 'a class cannot be serialised, so its name is stored');
        });

        test('an extension component contract is reduced to its string form', async function (assert) {
            const contract = new ExtensionComponent('@fleetbase/fleetops-engine', 'components/widget/metrics');
            this.widgetService.widgets = [{ id: 'w-2', name: 'Metrics', category: 'Analytics', component: contract }];

            await render(hbs`<Dashboard::WidgetPanel @isOpen={{true}} @dashboard={{this.dashboard}} @defaultDashboardId="dashboard" />`);
            await waitFor('.dashboard-widget-card');
            await click('[data-widget-key="w-2"]');

            assert.strictEqual(typeof this.added[0].component, 'string', 'the contract is flattened');
            assert.strictEqual(this.added[0].component, contract.toString());
        });

        test('a dashboard that refuses the widget reports the error rather than throwing', async function (assert) {
            const reported = [];
            this.owner.lookup('service:notifications').serverError = (error) => reported.push(error);
            this.dashboard.addWidget = () => Promise.reject(new Error('dashboard is full'));

            await render(hbs`<Dashboard::WidgetPanel @isOpen={{true}} @dashboard={{this.dashboard}} @defaultDashboardId="dashboard" />`);
            await waitFor('.dashboard-widget-card');
            await click('[data-widget-key="fleet-ops-kpi-earnings-widget"]');

            assert.strictEqual(reported.length, 1, 'the failure is surfaced');
            assert.strictEqual(reported[0].message, 'dashboard is full');
            assert.dom('.dashboard-widget-card').exists({ count: 3 }, 'and the panel stays usable');
        });
    });

    module('filtering', function () {
        test('the On Dashboard tab keeps only widgets already placed', async function (assert) {
            await render(hbs`<Dashboard::WidgetPanel @isOpen={{true}} @dashboard={{this.dashboard}} @defaultDashboardId="dashboard" />`);
            await waitFor('.dashboard-widget-card');

            const tabButtons = Array.from(this.element.querySelector('.flex.bg-gray-100.rounded-md, .flex.rounded-md').querySelectorAll('button'));
            await click(tabButtons[2]);

            assert.dom('.dashboard-widget-card').exists({ count: 1 }, 'only the added widget remains');
            assert.dom('[data-widget-key="fleet-ops-kpi-earnings-widget"]').exists();
        });

        test('the clear button empties the search', async function (assert) {
            await render(hbs`<Dashboard::WidgetPanel @isOpen={{true}} @dashboard={{this.dashboard}} @defaultDashboardId="dashboard" />`);
            await waitFor('.dashboard-widget-card');

            await fillIn('input[type="text"]', 'earn');
            assert.dom('.dashboard-widget-card').exists({ count: 1 });

            await click('[aria-label="Clear search"]');

            assert.dom('.dashboard-widget-card').exists({ count: 3 }, 'every widget is offered again');
            assert.dom('[aria-label="Clear search"]').doesNotExist('and the clear button goes away with the query');
        });

        // A registry entry is free to omit everything but an id; searching used to read straight
        // through `name`, `description` and `category`.
        test('a widget with no name, description or category is searchable and grouped', async function (assert) {
            this.widgetService.widgets = [{ id: 'bare-widget' }];

            await render(hbs`<Dashboard::WidgetPanel @isOpen={{true}} @dashboard={{this.dashboard}} @defaultDashboardId="dashboard" />`);
            await waitFor('.dashboard-widget-card');

            assert.ok(
                Array.from(this.element.querySelectorAll('span')).some((node) => node.textContent.trim() === 'General'),
                'it lands in the General group'
            );

            await fillIn('input[type="text"]', 'zzz');

            assert.dom('.dashboard-widget-card').doesNotExist('and a query it cannot match filters it out');
        });

        test('an empty registry renders the empty state', async function (assert) {
            this.widgetService.getWidgets = () => null;

            await render(hbs`<Dashboard::WidgetPanel @isOpen={{true}} @dashboard={{this.dashboard}} @defaultDashboardId="dashboard" />`);

            assert.dom('.dashboard-widget-card').doesNotExist();
            const tabCounts = Array.from(this.element.querySelectorAll('.flex.rounded-md button span:last-child')).map((node) => node.textContent.trim());
            assert.deepEqual(tabCounts, ['0', '0', '1'], 'the tab counts survive a registry that answers with nothing');
        });
    });

    module('counting what is already on the dashboard', function () {
        test('a placed widget with no widget_key is not counted', async function (assert) {
            this.dashboard.widgets = [...this.dashboard.widgets, { id: 'uuid-3', options: {} }, { id: 'uuid-4' }];

            await render(hbs`<Dashboard::WidgetPanel @isOpen={{true}} @dashboard={{this.dashboard}} @defaultDashboardId="dashboard" />`);
            await waitFor('.dashboard-widget-card');

            const earningsCard = this.element.querySelector('[data-widget-key="fleet-ops-kpi-earnings-widget"]');
            assert.ok(earningsCard.textContent.includes('\u00d72'), 'the keyless entries are ignored');

            const tabCounts = Array.from(this.element.querySelectorAll('.flex.rounded-md button span:last-child')).map((node) => node.textContent.trim());
            assert.strictEqual(tabCounts[2], '1', 'and the On Dashboard tab counts one distinct widget');
        });

        test('with no dashboard at all nothing is counted', async function (assert) {
            await render(hbs`<Dashboard::WidgetPanel @isOpen={{true}} @defaultDashboardId="dashboard" />`);
            await waitFor('.dashboard-widget-card');

            assert.dom('.dashboard-widget-card').exists({ count: 3 }, 'the registry still renders');
            assert.notOk(this.element.textContent.includes('On dashboard'), 'and no card claims to be placed');
        });
    });

    test('with no dashboard id argument the registry is asked for the default scope', async function (assert) {
        await render(hbs`<Dashboard::WidgetPanel @isOpen={{true}} @dashboard={{this.dashboard}} />`);
        await waitFor('.dashboard-widget-card');

        assert.deepEqual([...new Set(this.widgetService.requested)], ['dashboard'], 'it falls back to the "dashboard" scope');
    });

    test('the close button is safe without an onClose handler', async function (assert) {
        await render(hbs`<Dashboard::WidgetPanel @isOpen={{true}} @dashboard={{this.dashboard}} @defaultDashboardId="dashboard" />`);
        await waitFor('.dashboard-widget-card');

        await click('.next-view-header-right button');

        assert.dom('.dashboard-widget-card').exists({ count: 3 }, 'the panel is left alone');
    });

    test('the close button reports a press when a handler is given', async function (assert) {
        const closes = [];
        this.set('onClose', () => closes.push('closed'));

        await render(hbs`<Dashboard::WidgetPanel @isOpen={{true}} @dashboard={{this.dashboard}} @defaultDashboardId="dashboard" @onClose={{this.onClose}} />`);
        await waitFor('.dashboard-widget-card');

        await click('.next-view-header-right button');

        assert.deepEqual(closes, ['closed']);
    });
});
