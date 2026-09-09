import Service from '@ember/service';

/**
 * Stub of the host console's `universe/widget-service`. All widget/dashboard registry lookups
 * return empty results; prime the backing maps for assertions if needed.
 */
export default class UniverseWidgetService extends Service {
    calls = [];

    /** Map of dashboardId -> widgets array. */
    widgets = {};

    /** Map of slot -> dashboards array. */
    slotDashboards = {};

    registerWidgets(dashboardId, ...widgets) {
        this.calls.push({ method: 'registerWidgets', args: [dashboardId, ...widgets] });
        this.widgets[dashboardId] = [...(this.widgets[dashboardId] ?? []), ...widgets.flat()];
    }

    getWidgets(dashboardId) {
        this.calls.push({ method: 'getWidgets', args: [dashboardId] });
        return this.widgets[dashboardId] ?? [];
    }

    getDefaultWidgets(dashboardId) {
        this.calls.push({ method: 'getDefaultWidgets', args: [dashboardId] });
        return this.widgets[dashboardId] ?? [];
    }

    getDashboardsForSlot(slot) {
        this.calls.push({ method: 'getDashboardsForSlot', args: [slot] });
        return this.slotDashboards[slot] ?? [];
    }

    getDefaultDashboardForSlot(slot) {
        this.calls.push({ method: 'getDefaultDashboardForSlot', args: [slot] });
        return null;
    }
}
