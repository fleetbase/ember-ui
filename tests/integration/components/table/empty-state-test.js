import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { click, render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import Service from '@ember/service';

class StubDocsPanelService extends Service {
    lastTarget = null;
    lastOptions = null;

    open(target, options) {
        this.lastTarget = target;
        this.lastOptions = options;
    }
}

module('Integration | Component | table/empty-state', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        this.owner.register('service:docs-panel', StubDocsPanelService);
    });

    test('it renders a centered empty state with actions', async function (assert) {
        this.set('createRecord', () => {
            assert.step('create');
        });

        this.set('refreshRecords', () => {
            assert.step('refresh');
        });

        await render(hbs`
            <Table::EmptyState
                @icon="truck"
                @title="Add your first vehicle"
                @description="Vehicles connect assignments, live tracking, fleet capacity, maintenance, and compliance history."
                @primaryText="New vehicle"
                @primaryIcon="plus"
                @primaryAction={{this.createRecord}}
                @secondaryText="Refresh"
                @secondaryIcon="refresh"
                @secondaryAction={{this.refreshRecords}}
            />
        `);

        assert.dom('.next-table-empty-state').exists();
        assert.dom('.next-table-empty-state-title').hasText('Add your first vehicle');
        assert.dom('.next-table-empty-state-description').includesText('Vehicles connect assignments');
        assert.dom('.next-table-empty-state-description').hasStyle({ 'text-align': 'center' });
        assert.dom('.next-table-empty-state-actions button:last-child').hasClass('btn-md');

        await click('.next-table-empty-state-actions button');
        await click('.next-table-empty-state-actions button:last-child');

        assert.verifySteps(['refresh', 'create']);
    });

    test('it renders filtered copy when context includes search', async function (assert) {
        this.set('context', { searchQuery: 'alpha' });

        await render(hbs`
            <Table::EmptyState
                @context={{this.context}}
                @title="No records"
                @description="Create the first record."
                @filteredTitle="No records match your search"
                @filteredDescription="Adjust search or filters."
            />
        `);

        assert.dom('.next-table-empty-state').includesText('No records match your search');
        assert.dom('.next-table-empty-state').includesText('Adjust search or filters.');
        assert.dom('.next-table-empty-state').doesNotIncludeText('Create the first record.');
    });

    test('it renders the compact variant', async function (assert) {
        this.set('refreshRecords', () => {});

        await render(hbs`
            <Table::EmptyState
                @variant="compact"
                @icon="bolt"
                @title="No device events"
                @description="Events appear after connected devices report activity."
                @primaryText="Refresh"
                @primaryIcon="refresh"
                @primaryAction={{this.refreshRecords}}
            />
        `);

        assert.dom('.next-table-empty-state-compact').exists();
        assert.dom('.next-table-empty-state-compact').includesText('No device events');
        assert.dom('.next-table-empty-state-compact .next-table-empty-state-actions button').hasClass('btn-sm');
    });

    test('it opens documentation in the docs panel from a slug', async function (assert) {
        await render(hbs`
            <Table::EmptyState
                @icon="truck"
                @title="Add your first vehicle"
                @docsSlug="fleet-ops/resources/vehicles/overview"
                @docsTitle="Vehicles guide"
                @docsText="Vehicle guide"
                @docsSource="fleet-ops-empty-vehicles"
            />
        `);

        assert.dom('.next-table-empty-state-docs .btn-wrapper').doesNotExist();

        await click('.next-table-empty-state-docs-action');

        const docsPanel = this.owner.lookup('service:docs-panel');

        assert.strictEqual(docsPanel.lastTarget, 'fleet-ops/resources/vehicles/overview');
        assert.deepEqual(docsPanel.lastOptions, {
            title: 'Vehicles guide',
            source: 'fleet-ops-empty-vehicles',
        });
    });
});
