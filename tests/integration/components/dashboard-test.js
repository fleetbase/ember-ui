import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import Service from '@ember/service';
import { helper } from '@ember/component/helper';

class DashboardStubService extends Service {
    currentDashboard = { id: 'dashboard', name: 'Test Dashboard', user_uuid: 'system', widgets: [] };
    dashboards = [this.currentDashboard];
    isEditingDashboard = false;
    isAddingWidget = false;
    showPanelWhenZeroWidgets = false;
    loadDashboards = { perform() {} };

    reset() {}
    onAddingWidget() {}
    onChangeEdit() {}
}

class IntlStubService extends Service {
    t(key) {
        return key;
    }
}

module('Integration | Component | dashboard', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        this.owner.register('service:dashboard', DashboardStubService);
        this.owner.register('service:intl', IntlStubService);
        this.owner.register('service:store', class extends Service {});
        this.owner.register('service:notifications', class extends Service {});
        this.owner.register('service:modals-manager', class extends Service {});
        this.owner.register('service:fetch', class extends Service {});
        this.owner.register(
            'helper:t',
            helper(([key]) => key)
        );
    });

    test('it renders', async function (assert) {
        await render(hbs`<Dashboard />`);

        assert.dom('.fleetbase-dashboard-grid').exists();

        // Template block usage:
        await render(hbs`
      <Dashboard>
        template block text
      </Dashboard>
    `);

        assert.dom().includesText('template block text');
    });

    test('it supports an opt-in sticky header class', async function (assert) {
        await render(hbs`<Dashboard @stickyHeader={{true}} />`);

        assert.dom('.fleetbase-dashboard-grid').hasClass('fleetbase-dashboard-grid--sticky');

        await render(hbs`<Dashboard />`);

        assert.dom('.fleetbase-dashboard-grid').doesNotHaveClass('fleetbase-dashboard-grid--sticky');
    });
});
