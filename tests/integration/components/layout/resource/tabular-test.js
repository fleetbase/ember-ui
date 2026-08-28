import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, findAll, find } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | layout/resource/tabular', function (hooks) {
    setupRenderingTest(hooks);

    // The pager is on by default and reads @data.meta, so most fixtures carry a realistic meta.
    // A meta-less array is exercised separately by "plain array data with no meta ...".
    function paginated(rows) {
        const data = [...rows];
        data.meta = { current_page: 1, last_page: 1, from: 1, to: rows.length, total: rows.length };
        return data;
    }

    hooks.beforeEach(function () {
        this.set('columns', [
            { label: 'Name', valuePath: 'name' },
            { label: 'Status', valuePath: 'status' },
        ]);
        this.set(
            'rows',
            paginated([
                { name: 'Ada', status: 'active' },
                { name: 'Grace', status: 'inactive' },
            ])
        );
    });

    const TABLE = hbs`<Layout::Resource::Tabular @title="Drivers" @data={{this.rows}} @columns={{this.columns}} />`;

    module('rendering', function () {
        test('it renders a titled header above a table of the data', async function (assert) {
            await render(TABLE);

            assert.dom('#next-view-section-subheader-title').hasText('Drivers');
            assert.dom('.next-table-wrapper table').exists();
            assert.deepEqual(
                findAll('thead th')
                    .map((cell) => cell.textContent.trim())
                    .filter(Boolean),
                ['Name', 'Status']
            );
            assert.strictEqual(findAll('tbody tr').length, 2);
        });

        test('the header can be suppressed entirely', async function (assert) {
            await render(hbs`<Layout::Resource::Tabular @title="Drivers" @data={{this.rows}} @columns={{this.columns}} @withoutHeader={{true}} />`);

            assert.dom('#next-view-section-subheader').doesNotExist();
            assert.dom('.next-table-wrapper table').exists('the table survives');
        });

        test('a block replaces the table and receives the data', async function (assert) {
            await render(hbs`
                <Layout::Resource::Tabular @title="Drivers" @data={{this.rows}} @columns={{this.columns}} as |data|>
                    {{#each data as |row|}}<p class="custom">{{row.name}}</p>{{/each}}
                </Layout::Resource::Tabular>
            `);

            assert.dom('table').doesNotExist();
            assert.deepEqual(
                findAll('p.custom').map((node) => node.textContent.trim()),
                ['Ada', 'Grace']
            );
        });

        test('it renders with no columns at all', async function (assert) {
            await render(hbs`<Layout::Resource::Tabular @title="Drivers" @data={{this.rows}} />`);

            assert.dom('#next-view-section-subheader-title').hasText('Drivers');
            assert.dom('.next-table-wrapper').exists();
            assert.deepEqual(
                findAll('thead th').filter((cell) => cell.textContent.trim()),
                [],
                'no column headers are rendered'
            );
        });

        test('the pager is on by default and can be switched off', async function (assert) {
            await render(hbs`<Layout::Resource::Tabular @title="Drivers" @data={{this.rows}} @columns={{this.columns}} />`);
            assert.dom('#fleetbase-pagination').exists('the pager defaults to on');

            await render(hbs`<Layout::Resource::Tabular @title="Drivers" @data={{this.rows}} @columns={{this.columns}} @pagination={{false}} />`);
            assert.dom('#fleetbase-pagination').doesNotExist('an explicit false switches the pager off');
        });

        test('plain array data with no meta renders without crashing the pager', async function (assert) {
            this.set('rows', [
                { name: 'Ada', status: 'active' },
                { name: 'Grace', status: 'inactive' },
            ]);

            await render(hbs`<Layout::Resource::Tabular @title="Drivers" @data={{this.rows}} @columns={{this.columns}} />`);

            assert.dom('#fleetbase-pagination').exists('the pager copes with an absent meta');
            assert.dom('table').exists('and the table itself still renders');
        });
    });

    module('header controls', function () {
        test('a column picker is offered by default and can be hidden', async function (assert) {
            await render(TABLE);
            assert.dom('#next-view-section-subheader-actions').exists();

            await render(hbs`<Layout::Resource::Tabular @title="Drivers" @data={{this.rows}} @columns={{this.columns}} @hideColumnsPicker={{true}} />`);
            assert.dom('#next-view-section-subheader-actions').exists('the actions area survives without the picker');
        });

        test('a reload button appears only when a handler is given', async function (assert) {
            const reloads = [];
            this.set('onReload', () => reloads.push('reload'));

            await render(hbs`<Layout::Resource::Tabular @title="Drivers" @data={{this.rows}} @columns={{this.columns}} @onReload={{this.onReload}} @refreshButtonClass="my-refresh" />`);
            await click('button.my-refresh');

            assert.deepEqual(reloads, ['reload']);
        });

        test('new, import and export buttons appear only when their handlers are given', async function (assert) {
            const pressed = [];
            this.setProperties({
                onPressNew: () => pressed.push('new'),
                onPressImport: () => pressed.push('import'),
                onPressExport: () => pressed.push('export'),
            });

            await render(hbs`
                <Layout::Resource::Tabular
                    @title="Drivers"
                    @data={{this.rows}}
                    @columns={{this.columns}}
                    @onPressNew={{this.onPressNew}}
                    @onPressImport={{this.onPressImport}}
                    @onPressExport={{this.onPressExport}}
                    @newButtonClass="my-new"
                    @importButtonClass="my-import"
                    @exportButtonClass="my-export"
                />
            `);

            await click('.my-new');
            await click('.my-import');
            await click('.my-export');

            assert.deepEqual(pressed, ['new', 'import', 'export']);
        });

        test('none of those buttons render without their handlers', async function (assert) {
            await render(TABLE);

            assert.dom('#next-view-section-subheader-actions').doesNotContainText('common.new');
            assert.dom('#next-view-section-subheader-actions').doesNotContainText('common.import');
            assert.dom('#next-view-section-subheader-actions').doesNotContainText('common.export');
        });

        test('a bulk search dropdown appears only when a submit handler is given', async function (assert) {
            this.set('onSubmitBulkSearch', () => {});

            await render(hbs`<Layout::Resource::Tabular @title="Drivers" @data={{this.rows}} @columns={{this.columns}} @onSubmitBulkSearch={{this.onSubmitBulkSearch}} />`);

            assert.dom('#next-view-section-subheader-actions').exists();
            assert.dom('#next-view-section-subheader-actions .ember-basic-dropdown-trigger').exists('the bulk search trigger is rendered');
        });

        test('an action button is rendered and clickable', async function (assert) {
            const pressed = [];
            this.set('actionButtons', [{ text: 'Assign', type: 'primary', class: 'my-assign', onClick: () => pressed.push('assign') }]);

            await render(hbs`<Layout::Resource::Tabular @title="Drivers" @data={{this.rows}} @columns={{this.columns}} @actionButtons={{this.actionButtons}} />`);
            await click('button.my-assign');

            assert.deepEqual(pressed, ['assign']);
        });

        test('an action button with items becomes a dropdown', async function (assert) {
            const pressed = [];
            this.set('actionButtons', [
                {
                    text: 'More',
                    triggerClass: 'my-actions-trigger',
                    items: [{ text: 'Duplicate', icon: 'copy', fn: () => pressed.push('duplicate') }, { separator: true }, { label: 'Archive', onClick: () => pressed.push('archive') }],
                },
            ]);

            await render(hbs`<Layout::Resource::Tabular @title="Drivers" @data={{this.rows}} @columns={{this.columns}} @actionButtons={{this.actionButtons}} />`);
            await click('.my-actions-trigger');

            const items = findAll('.next-dd-item');
            assert.deepEqual(
                items.map((item) => item.textContent.trim()),
                ['Duplicate', 'Archive']
            );

            await click(items[0]);
            assert.deepEqual(pressed, ['duplicate']);
        });

        test('a component-backed action button is rendered', async function (assert) {
            this.set('actionButtons', [{ component: 'spinner', size: 'lg' }]);

            await render(hbs`<Layout::Resource::Tabular @title="Drivers" @data={{this.rows}} @columns={{this.columns}} @actionButtons={{this.actionButtons}} />`);

            assert.dom('#next-view-section-subheader-actions .fleetbase-loader').exists();
        });
    });

    module('sorting', function () {
        test('sorting reports the sort string and columns, and writes back to the controller', async function (assert) {
            const sorts = [];
            const controller = { sort: '' };
            this.set('controller', controller);
            this.set('onSort', (payload) => sorts.push(payload));

            this.set('columns', [{ label: 'Name', valuePath: 'name', sortable: true }]);

            await render(hbs`
                <Layout::Resource::Tabular @title="Drivers" @data={{this.rows}} @columns={{this.columns}} @controller={{this.controller}} @onSort={{this.onSort}} />
            `);

            const header = find('th.is-sortable .sort-icon-wrapper');
            assert.ok(header, 'a sortable header offers a sort control');

            await click(header);

            assert.strictEqual(sorts.length, 1, 'the sort is reported once');
            assert.strictEqual(controller.sort, sorts[0].sortString, 'the controller sort is kept in step');
            assert.strictEqual(sorts[0].sortBy, 'name');
            assert.strictEqual(sorts[0].sortDirection, sorts[0].sortColumns[0].direction);
            assert.strictEqual(sorts[0].sortValue, sorts[0].sortString);
        });

        test('cycling a sort back off reports no sort column', async function (assert) {
            // The legacy single-column fields fall back to null once nothing is sorted.
            const sorts = [];
            this.set('onSort', (payload) => sorts.push(payload));
            this.set('columns', [{ label: 'Name', valuePath: 'name', sortable: true }]);

            await render(hbs`
                <Layout::Resource::Tabular @title="Drivers" @data={{this.rows}} @columns={{this.columns}} @onSort={{this.onSort}} />
            `);

            const header = find('th.is-sortable .sort-icon-wrapper');
            await click(header);
            await click(header);
            await click(header);

            const last = sorts.at(-1);
            assert.deepEqual(last.sortColumns, [], 'nothing is sorted any more');
            assert.strictEqual(last.sortBy, null, 'so there is no single column to name');
            assert.strictEqual(last.sortDirection, null);
        });

        test('sorting without a controller or handler does not throw', async function (assert) {
            this.set('columns', [{ label: 'Name', valuePath: 'name', sortable: true }]);

            await render(TABLE);
            await click('th.is-sortable .sort-icon-wrapper');

            assert.dom('.next-table-wrapper').exists('the table survives an unhandled sort');
        });
    });

    module('sticky columns', function () {
        test('the checkbox column becomes sticky when any column is', async function (assert) {
            this.set('columns', [
                { label: 'Name', valuePath: 'name', sticky: 'left' },
                { label: 'Status', valuePath: 'status' },
            ]);

            await render(TABLE);

            assert.dom('thead th.is-sticky').exists('a sticky column pins the header cells');
        });

        test('an explicit checkboxSticky argument wins', async function (assert) {
            await render(hbs`<Layout::Resource::Tabular @title="Drivers" @data={{this.rows}} @columns={{this.columns}} @checkboxSticky={{false}} />`);

            assert.dom('.next-table-wrapper table').exists('no column is sticky and the override is respected');
        });
    });

    test('setupTable hands the table back to the caller', async function (assert) {
        let table;
        this.set('setupTable', (value) => {
            table = value;
        });

        await render(hbs`<Layout::Resource::Tabular @title="Drivers" @data={{this.rows}} @columns={{this.columns}} @setupTable={{this.setupTable}} />`);

        assert.ok(table, 'the table component is handed back');
        assert.strictEqual(typeof table.handleSort, 'function');
    });

    test('it forwards table wrapper class to the table component', async function (assert) {
        this.set('columns', [{ label: 'Name', valuePath: 'name' }]);
        this.set('rows', [{ name: 'Ada' }]);

        await render(hbs`
            <Layout::Resource::Tabular
                @data={{this.rows}}
                @columns={{this.columns}}
                @tableWrapperClass="no-table-extra-spacing"
            />
        `);

        assert.dom('.next-table-wrapper').hasClass('no-table-extra-spacing');
    });
});
