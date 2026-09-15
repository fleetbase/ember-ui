import Service from '@ember/service';

/**
 * Stub of the host console's `universe/widget-service`. Widget registrations
 * are recorded and lookups return empty arrays.
 */
export default class UniverseWidgetService extends Service {
    calls = [];
    widgets = {};

    registerWidgets(dashboardId, widgets) {
        this.calls.push({ method: 'registerWidgets', args: [dashboardId, widgets] });
        this.widgets[dashboardId] = [...(this.widgets[dashboardId] ?? []), ...(Array.isArray(widgets) ? widgets : [widgets])];
    }

    getWidgets(dashboardId) {
        return this.widgets[dashboardId] ?? [];
    }

    getDefaultWidgets() {
        return [];
    }
}
