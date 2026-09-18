import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { click, render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import Service from '@ember/service';
import { setupWindowMock } from 'ember-window-mock/test-support';
import window from 'ember-window-mock';

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
    setupWindowMock(hooks);

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
        // Each <Button> renders inside its own wrapper, so `button:last-child` matches both.
        // Select by the action-specific classes instead.
        assert.dom('.next-table-empty-state-primary-action').hasClass('btn-md');

        await click('.next-table-empty-state-secondary-action');
        await click('.next-table-empty-state-primary-action');

        assert.verifySteps(['refresh', 'create']);
    });

    test('with no title of its own it says there are no records yet', async function (assert) {
        await render(hbs`<Table::EmptyState @icon="truck" />`);

        assert.dom('.next-table-empty-state-title').hasText('No records yet');
    });

    // Host apps that do not install the docs panel get a service without an `open` method; the
    // link then behaves like an ordinary external link.
    test('without a docs panel the guide opens in a window instead', async function (assert) {
        const opened = [];
        this.owner.unregister('service:docs-panel');
        this.owner.register('service:docs-panel', class extends Service {});
        window.open = (...args) => opened.push(args);

        await render(hbs`<Table::EmptyState @icon="truck" @title="Add your first vehicle" @docsUrl="https://fleetbase.io/docs/vehicles" />`);
        await click('.next-table-empty-state-docs-action');

        assert.deepEqual(opened, [['https://fleetbase.io/docs/vehicles', '_docs']], 'the target is opened in the docs window');
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
                @note="Records appear here once created."
                @filteredNote="Try a broader search."
                @icon="inbox"
                @filteredIcon="magnifying-glass"
            />
        `);

        assert.dom('.next-table-empty-state').includesText('No records match your search');
        assert.dom('.next-table-empty-state').includesText('Adjust search or filters.');
        assert.dom('.next-table-empty-state').doesNotIncludeText('Create the first record.');
        assert.dom('.next-table-empty-state').includesText('Try a broader search.', 'the filtered note replaces the default');
        assert.dom('.next-table-empty-state').doesNotIncludeText('Records appear here once created.');
        assert.dom('.next-table-empty-state svg').hasClass('fa-magnifying-glass', 'and the filtered icon replaces the default');
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
    test('a context flagged as filtered uses the filtered copy without a search term', async function (assert) {
        this.set('context', { isFiltered: true });

        await render(hbs`
            <Table::EmptyState @context={{this.context}} @title="No records" @filteredTitle="Nothing matches those filters" />
        `);

        assert.dom('.next-table-empty-state').includesText('Nothing matches those filters');
    });

    test('the docs link falls back to its own defaults', async function (assert) {
        // Every other docs case passes explicit text, title and source.
        await render(hbs`<Table::EmptyState @title="Add your first vehicle" @docsSlug="fleet-ops/vehicles" />`);

        assert.dom('.next-table-empty-state-docs-action').hasText('Read guide', 'the default link text');

        await click('.next-table-empty-state-docs-action');

        const docsPanel = this.owner.lookup('service:docs-panel');
        assert.strictEqual(docsPanel.lastTarget, 'fleet-ops/vehicles');
        assert.deepEqual(docsPanel.lastOptions, { title: 'Add your first vehicle', source: 'table-empty-state' }, 'title falls back to the empty-state title, source to the component name');
    });
});
