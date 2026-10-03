import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, find, findAll, settled } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import Component from '@glimmer/component';
import { setComponentTemplate } from '@ember/component';
import { setupResourceView, setupExtensionEngine } from 'dummy/tests/helpers/resource-view-stubs';

const headerTexts = () =>
    findAll('thead th')
        .map((th) => th.textContent.trim())
        .filter(Boolean);
const buttonWithIcon = (icon) => findAll('button').find((button) => button.querySelector(`svg.fa-${icon}`));
const buttonWithText = (text) => findAll('button').find((button) => button.textContent.includes(text));

async function clickFound(assert, element, what) {
    assert.ok(element, `${what} is rendered`);
    await click(element);
}
const menuItems = () => findAll('.next-dd-menu .next-dd-item');

function paginated(rows) {
    const data = [...rows];
    data.meta = { current_page: 1, last_page: 1, from: 1, to: rows.length, total: rows.length };
    return data;
}

module('Integration | Component | layout/resource registries', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        this.set('rows', paginated([{ id: 1, name: 'Ada', status: 'active' }]));
        this.set('columns', [
            { id: 'name', label: 'Name', valuePath: 'name' },
            { id: 'status', label: 'Status', valuePath: 'status' },
            { label: '', cellComponent: 'table/cell/dropdown', ddButtonText: false, ddButtonIcon: 'ellipsis-h', actions: [{ id: 'view', label: 'View' }] },
        ]);
    });

    module('Layout::Resource::Tabular', function () {
        test('without a registry nothing is looked up or merged', async function (assert) {
            const views = setupResourceView(this.owner);
            views.add('fleet-ops:table:driver:columns', { id: 'score', label: 'Score' });

            await render(hbs`<Layout::Resource::Tabular @data={{this.rows}} @columns={{this.columns}} />`);

            assert.deepEqual(headerTexts(), ['Name', 'Status']);
            assert.deepEqual(views.calls, []);
        });

        test('without a registry the bulk actions are used as given, even with the service present', async function (assert) {
            const views = setupResourceView(this.owner);
            views.add('fleet-ops:table:driver:bulk-actions', { id: 'export', label: 'Export to Acme', fn: () => {} });
            this.set('bulkActions', [{ label: 'Delete', fn: () => {} }]);

            await render(hbs`<Layout::Resource::Tabular @data={{this.rows}} @columns={{this.columns}} @bulkActions={{this.bulkActions}} />`);
            await clickFound(assert, find('tbody input[type="checkbox"]'), 'the row checkbox');
            await clickFound(assert, buttonWithIcon('layer-group'), 'the bulk menu trigger');

            assert.deepEqual(
                menuItems().map((item) => item.textContent.trim()),
                ['Delete']
            );
            assert.deepEqual(views.calls, [], 'nothing is merged without a registry');
        });

        test('without the registry service the view renders as given', async function (assert) {
            await render(hbs`<Layout::Resource::Tabular @registry="fleet-ops:table:driver" @data={{this.rows}} @columns={{this.columns}} />`);

            assert.deepEqual(headerTexts(), ['Name', 'Status']);
        });

        test('registered columns, row actions, toolbar buttons and bulk actions are merged', async function (assert) {
            const views = setupResourceView(this.owner);
            const clicked = [];
            views.add('fleet-ops:table:driver:columns', { id: 'score', label: 'Score', valuePath: 'status' });
            views.add('fleet-ops:table:driver:row-actions', { id: 'sync', label: 'Sync to Acme', fn: (row) => clicked.push(['sync', row.name]) });
            views.add('fleet-ops:table:driver:actions', { id: 'import', text: 'Import from Acme', onClick: () => clicked.push(['import']) });
            views.add('fleet-ops:table:driver:bulk-actions', { id: 'export', label: 'Export to Acme', fn: () => clicked.push(['export']) });
            this.set('bulkActions', [{ label: 'Delete', fn: () => {} }]);
            this.set('controller', { sort: null });

            await render(hbs`
                <Layout::Resource::Tabular
                    @registry="fleet-ops:table:driver"
                    @data={{this.rows}}
                    @columns={{this.columns}}
                    @bulkActions={{this.bulkActions}}
                    @controller={{this.controller}}
                />
            `);

            assert.deepEqual(headerTexts(), ['Name', 'Status', 'Score'], 'the registered column is rendered');

            await clickFound(assert, find('.cell-dropdown-button button'), 'the row menu trigger');
            assert.deepEqual(
                menuItems().map((item) => item.textContent.trim()),
                ['View', 'Sync to Acme'],
                'the registered row action is in the row menu'
            );
            await click(menuItems()[1]);

            await clickFound(assert, buttonWithText('Import from Acme'), 'the registered toolbar button');

            // The bulk menu appears once a row is selected.
            await clickFound(assert, find('tbody input[type="checkbox"]'), 'the row checkbox');
            await clickFound(assert, buttonWithIcon('layer-group'), 'the bulk menu trigger');
            assert.deepEqual(
                menuItems().map((item) => item.textContent.trim()),
                ['Delete', 'Export to Acme'],
                'the registered bulk action is in the bulk menu'
            );
            await click(menuItems()[1]);

            assert.deepEqual(clicked, [['sync', 'Ada'], ['import'], ['export']]);

            const slots = [...new Set(views.calls.map((call) => `${call.prefix}:${call.slot}`))].sort();
            assert.deepEqual(slots, ['fleet-ops:table:driver:actions', 'fleet-ops:table:driver:bulk-actions', 'fleet-ops:table:driver:columns', 'fleet-ops:table:driver:row-actions']);

            const { context } = views.calls.find((call) => call.slot === 'bulk-actions');
            assert.strictEqual(context.controller, this.controller, 'handlers get the controller');
            assert.ok(context.table, 'and the table, once it is set up');
            assert.ok(Array.isArray(context.getSelectedRows()), 'and the current selection');
        });

        test('the context works before the table is set up', async function (assert) {
            const views = setupResourceView(this.owner);

            await render(
                hbs`<Layout::Resource::Tabular @registry="fleet-ops:table:driver" @data={{this.rows}} @columns={{this.columns}} as |data|>{{data.length}}</Layout::Resource::Tabular>`
            );

            const { context } = views.calls[0];
            assert.strictEqual(context.table, undefined, 'a block replaces the table, so none is ever set up');
            assert.deepEqual(context.getSelectedRows(), []);
        });

        test('a column registered after the first render appears', async function (assert) {
            const views = setupResourceView(this.owner);

            await render(hbs`<Layout::Resource::Tabular @registry="fleet-ops:table:driver" @data={{this.rows}} @columns={{this.columns}} />`);
            assert.deepEqual(headerTexts(), ['Name', 'Status']);

            views.add('fleet-ops:table:driver:columns', { id: 'score', label: 'Score' });
            await settled();

            assert.deepEqual(headerTexts(), ['Name', 'Status', 'Score']);
        });

        test('a column the user hid stays hidden when the columns are recomputed', async function (assert) {
            const views = setupResourceView(this.owner);
            views.add('fleet-ops:table:driver:columns', { id: 'score', label: 'Score' });

            await render(hbs`<Layout::Resource::Tabular @registry="fleet-ops:table:driver" @data={{this.rows}} @columns={{this.columns}} />`);

            await click(buttonWithIcon('sliders'));
            const toggles = findAll('.customize-columns-dropdown-body input[type="checkbox"]');
            await click(toggles[2]);
            assert.deepEqual(headerTexts(), ['Name', 'Status'], 'the registered column is hidden');

            views.add('fleet-ops:table:driver:columns', { id: 'rank', label: 'Rank' });
            await settled();

            assert.deepEqual(headerTexts(), ['Name', 'Status', 'Rank'], 'the registered column stays hidden while a new one appears');
        });

        test('a column picked while the controller rebuilds its columns stays picked', async function (assert) {
            await render(hbs`<Layout::Resource::Tabular @data={{this.rows}} @columns={{this.columns}} />`);

            await click(buttonWithIcon('sliders'));
            await click(findAll('.customize-columns-dropdown-body input[type="checkbox"]')[1]);
            assert.deepEqual(headerTexts(), ['Name']);

            // A controller getter hands over fresh column objects.
            this.set('columns', [
                { id: 'name', label: 'Name', valuePath: 'name' },
                { id: 'status', label: 'Status', valuePath: 'status' },
            ]);

            assert.deepEqual(headerTexts(), ['Name'], 'the choice is kept by column key');
        });
    });

    module('Layout::Resource::TabularActions', function () {
        test('registered toolbar buttons and bulk actions are merged', async function (assert) {
            const views = setupResourceView(this.owner);
            views.add('iam:table:user:actions', { id: 'import', text: 'Import from Acme' });
            views.add('iam:table:user:bulk-actions', { id: 'export', label: 'Export to Acme', fn: () => {} });
            this.set('table', { selectedRows: [{ id: 1 }] });

            await render(hbs`<Layout::Resource::TabularActions @registry="iam:table:user" @columns={{this.columns}} @table={{this.table}} />`);

            assert.ok(
                findAll('button').some((button) => button.textContent.includes('Import from Acme')),
                'the registered toolbar button renders'
            );
            await click(buttonWithIcon('layer-group'));
            assert.deepEqual(
                menuItems().map((item) => item.textContent.trim()),
                ['Export to Acme']
            );

            const { context } = views.calls.find((call) => call.slot === 'bulk-actions');
            assert.strictEqual(context.table, this.table);
            assert.deepEqual(context.getSelectedRows(), [{ id: 1 }]);
        });

        test('without a table the selection is empty and no bulk menu is offered', async function (assert) {
            const views = setupResourceView(this.owner);
            views.add('iam:table:user:bulk-actions', { id: 'export', label: 'Export to Acme', fn: () => {} });

            await render(hbs`<Layout::Resource::TabularActions @registry="iam:table:user" @columns={{this.columns}} />`);

            assert.notOk(buttonWithIcon('layer-group'), 'there is nothing to act on');
            const { context } = views.calls.find((call) => call.slot === 'actions');
            assert.strictEqual(context.table, undefined);
            assert.deepEqual(context.getSelectedRows(), []);
        });

        test('without a registry the given buttons are used as they are', async function (assert) {
            const views = setupResourceView(this.owner);
            this.set('actionButtons', [{ text: 'Refresh' }]);

            await render(hbs`<Layout::Resource::TabularActions @columns={{this.columns}} @actionButtons={{this.actionButtons}} />`);

            assert.ok(findAll('button').some((button) => button.textContent.includes('Refresh')));
            assert.deepEqual(views.calls, []);
        });
    });

    module('Layout::Resource::Panel', function () {
        test('registered header buttons and menu items join the existing dropdown', async function (assert) {
            const views = setupResourceView(this.owner);
            views.add('ledger:details:invoice:actions', { id: 'print', text: 'Print label' });
            views.add('ledger:details:invoice:menu', { id: 'acme', label: 'Send to Acme' });
            this.set('resource', { id: 'inv_1' });
            this.set('actionButtons', [{ id: 'more', icon: 'ellipsis-h', items: [{ id: 'void', label: 'Void' }] }]);

            await render(hbs`<Layout::Resource::Panel @registry="ledger:details:invoice" @resource={{this.resource}} @actionButtons={{this.actionButtons}} />`);

            assert.ok(
                findAll('button').some((button) => button.textContent.includes('Print label')),
                'the registered header button renders'
            );
            await clickFound(assert, buttonWithIcon('ellipsis'), 'the dropdown trigger');
            assert.deepEqual(
                menuItems().map((item) => item.textContent.trim()),
                ['Void', 'Send to Acme']
            );

            const { context } = views.calls.find((call) => call.slot === 'menu');
            assert.strictEqual(context.resource, this.resource);
            assert.ok('panel' in context, 'the overlay is available to handlers');
            assert.ok(context.panel, 'once the overlay has loaded');
        });

        test('registered menu items get a dropdown of their own when there is none', async function (assert) {
            const views = setupResourceView(this.owner);
            views.add('ledger:details:invoice:menu', { id: 'acme', label: 'Send to Acme' });

            await render(hbs`<Layout::Resource::Panel @registry="ledger:details:invoice" @resource={{this.resource}} />`);

            await clickFound(assert, buttonWithIcon('ellipsis'), 'the dropdown trigger');
            assert.deepEqual(
                menuItems().map((item) => item.textContent.trim()),
                ['Send to Acme']
            );
        });

        test('no dropdown is added when nothing is registered for the menu', async function (assert) {
            setupResourceView(this.owner);

            await render(hbs`<Layout::Resource::Panel @registry="ledger:details:invoice" @resource={{this.resource}} />`);

            assert.notOk(buttonWithIcon('ellipsis'));
        });

        test('a custom header component receives the merged buttons', async function (assert) {
            const views = setupResourceView(this.owner);
            views.add('ledger:details:invoice:actions', { id: 'print', text: 'Print label' });
            this.owner.register(
                'component:test-panel-header',
                setComponentTemplate(hbs`<div class="custom-header">{{#each @actionButtons as |b|}}<span class="custom-button">{{b.text}}</span>{{/each}}</div>`, class extends Component {})
            );

            await render(hbs`<Layout::Resource::Panel @registry="ledger:details:invoice" @headerComponent="test-panel-header" />`);

            assert.dom('.custom-header .custom-button').hasText('Print label');
        });
    });

    module('extension components', function (nestedHooks) {
        nestedHooks.beforeEach(function () {
            setupExtensionEngine(this.owner, {
                'cell/score': setComponentTemplate(hbs`<span class="acme-cell">{{@row.name}}: {{@value}}</span>`, class extends Component {}),
                'filter/score': setComponentTemplate(hbs`<input class="acme-filter" placeholder={{@placeholder}} />`, class extends Component {}),
                'button/sync': setComponentTemplate(hbs`<button type="button" class="acme-button">{{@text}}</button>`, class extends Component {}),
            });
        });

        test('a cell component from an extension engine renders in the table', async function (assert) {
            this.set('columns', [{ id: 'score', label: 'Score', valuePath: 'status', cellComponent: { engine: '@acme/engine', path: 'cell/score' } }]);

            await render(hbs`<Table @rows={{this.rows}} @columns={{this.columns}} />`);

            assert.dom('.acme-cell').hasText('Ada: active');
        });

        test('a filter component from an extension engine renders in the filters picker', async function (assert) {
            this.set('columns', [
                { id: 'score', label: 'Score', valuePath: 'status', filterable: true, filterParam: 'score', filterComponent: { engine: '@acme/engine', path: 'filter/score' } },
            ]);

            await render(hbs`<FiltersPicker @columns={{this.columns}} />`);
            await click('.ember-basic-dropdown-trigger');

            assert.dom('.acme-filter').hasAttribute('placeholder', 'Score');
        });

        test('a button component from an extension engine renders among the action buttons', async function (assert) {
            this.set('buttons', [
                { id: 'sync', text: 'Sync', component: { engine: '@acme/engine', path: 'button/sync' } },
                { id: 'plain', text: 'Plain', component: 'button' },
            ]);

            await render(hbs`<Layout::Resource::ActionButtons @buttons={{this.buttons}} />`);

            assert.dom('.acme-button').hasText('Sync');
            assert.ok(
                findAll('button').some((button) => button.textContent.includes('Plain')),
                'a string component still renders directly'
            );
        });
    });

    module('Layout::Resource::ActionButtons', function () {
        test('a dropdown item without a handler renders and does nothing', async function (assert) {
            this.set('buttons', [{ id: 'more', icon: 'ellipsis-h', items: [{ label: 'Nothing yet' }] }]);

            await render(hbs`<Layout::Resource::ActionButtons @buttons={{this.buttons}} />`);
            await clickFound(assert, buttonWithIcon('ellipsis'), 'the dropdown trigger');
            await click('.next-dd-item');

            assert.ok(true, 'clicking it does not throw');
        });

        test('disabled dropdown items are marked disabled', async function (assert) {
            this.set('buttons', [{ id: 'more', icon: 'ellipsis-h', items: [{ label: 'Void', disabled: true }] }]);

            await render(hbs`<Layout::Resource::ActionButtons @buttons={{this.buttons}} @dropdownSize="sm" />`);
            await clickFound(assert, buttonWithIcon('ellipsis'), 'the dropdown trigger');

            assert.dom('.next-dd-item').hasClass('disabled');
        });
    });
});
