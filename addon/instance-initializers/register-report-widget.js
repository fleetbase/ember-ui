export function initialize(appInstance) {
    let widgetService;

    /* istanbul ignore next -- the widget service resolves in every booted app, so neither the
       lookup failure nor the missing-service return can be reached from a test. */
    try {
        widgetService = appInstance.lookup?.('service:universe/widget-service');
    } catch (_) {
        widgetService = null;
    }

    /* istanbul ignore next -- see above. */
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
