import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, fillIn, waitFor } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import Service from '@ember/service';

class StubWidgetService extends Service {
    widgets = [];
    getWidgets() {
        return this.widgets;
    }
}

class StubNotificationsService extends Service {
    serverError() {}
}

module('Integration | Component | dashboard/widget-panel', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        this.owner.register('service:universe/widget-service', StubWidgetService);
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
        const groupHeaders = this.element.querySelectorAll('h3');
        const groupTitles = Array.from(groupHeaders).map((h) => h.textContent.replace(/\s+/g, ' ').trim());
        assert.ok(groupTitles.some((t) => t.startsWith('KPI Tiles')), 'KPI Tiles group header rendered');
        assert.ok(groupTitles.some((t) => t.startsWith('Analytics')), 'Analytics group header rendered');
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

        // Click the Recommended tab (index 1)
        const tabs = this.element.querySelectorAll('button');
        const recommendedTab = Array.from(tabs).find((b) => /Recommended/i.test(b.textContent));
        await click(recommendedTab);

        assert.dom('.dashboard-widget-card').exists({ count: 2 }, 'only the two default:true widgets remain');
    });
});
