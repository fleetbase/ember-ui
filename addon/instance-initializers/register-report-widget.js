export function initialize(appInstance) {
    let widgetService;

    try {
        widgetService = appInstance.lookup?.('service:universe/widget-service');
    } catch (_) {
        widgetService = null;
    }

    if (!widgetService) {
        return;
    }

    widgetService.registerWidgets('dashboard', {
        id: 'report-widget',
        name: 'Report',
        description: 'Display a saved report',
        icon: 'file-lines',
        component: 'widget/report',
        category: 'Reports',
        grid_options: { w: 10, h: 10, minW: 8, minH: 8 },
        options: { title: 'Report' },
    });
}

export default {
    initialize,
};
