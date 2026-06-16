import { module, test } from 'qunit';
import { initialize } from 'dummy/instance-initializers/register-report-widget';

module('Unit | Instance Initializer | register-report-widget', function () {
    test('it registers the shared report widget for the dashboard registry', function (assert) {
        assert.expect(10);

        const registrations = [];
        const appInstance = {
            lookup(name) {
                assert.strictEqual(name, 'service:universe/widget-service');
                return {
                    registerWidgets(dashboardName, widget) {
                        registrations.push({ dashboardName, widget });
                    },
                };
            },
        };

        initialize(appInstance);

        assert.strictEqual(registrations.length, 1);
        assert.strictEqual(registrations[0].dashboardName, 'dashboard');

        const widget = registrations[0].widget;
        assert.strictEqual(widget.id, 'report-widget');
        assert.strictEqual(widget.name, 'Report');
        assert.strictEqual(widget.component, 'widget/report');
        assert.strictEqual(widget.category, 'Reports');
        assert.deepEqual(widget.grid_options, { w: 10, h: 10, minW: 8, minH: 8 });
        assert.deepEqual(widget.options, { title: 'Report' });
        assert.notOk(widget.default, 'the shared report widget is not auto-added by default');
    });
});
