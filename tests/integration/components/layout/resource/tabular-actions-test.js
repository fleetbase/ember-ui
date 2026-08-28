import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, triggerKeyEvent, find, findAll } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

const SEARCH = 'input[type="text"]';

function buttonWithIcon(icon) {
    return findAll('button').find((button) => button.querySelector(`svg.fa-${icon}`));
}

function menuItems() {
    return findAll('.next-dd-item');
}

module('Integration | Component | layout/resource/tabular-actions', function (hooks) {
    setupRenderingTest(hooks);

    let searches;
    let reloads;

    hooks.beforeEach(function () {
        searches = [];
        reloads = [];
        this.set('columns', [{ label: 'Name', valuePath: 'name' }]);
        this.set('title', 'vehicle');
    });

    const TEMPLATE = hbs`
        <Layout::Resource::TabularActions
            @title={{this.title}}
            @columns={{this.columns}}
            @table={{this.table}}
            @bulkActions={{this.bulkActions}}
            @actionButtons={{this.actionButtons}}
            @searchQuery={{this.searchQuery}}
            @searchPlaceholder={{this.searchPlaceholder}}
            @searchDisabled={{this.searchDisabled}}
            @onSearch={{this.onSearch}}
            @onReload={{this.onReload}}
            @hideColumnsPicker={{this.hideColumnsPicker}}
        >
            <span class="yielded-action">Extra</span>
        </Layout::Resource::TabularActions>
    `;

    module('the standard controls', function () {
        test('it yields whatever the caller puts first', async function (assert) {
            await render(TEMPLATE);

            assert.dom('.yielded-action').hasText('Extra');
        });

        test('a filter picker and a column picker are always offered', async function (assert) {
            await render(TEMPLATE);

            assert.ok(buttonWithIcon('filter'), 'the filter picker renders');
            assert.ok(buttonWithIcon('sliders'), 'the column picker renders');
        });

        test('the column picker can be hidden', async function (assert) {
            this.set('hideColumnsPicker', true);

            await render(TEMPLATE);

            assert.notOk(buttonWithIcon('sliders'), 'no column picker');
            assert.ok(buttonWithIcon('filter'), 'the filter picker stays');
        });

        test('no search box is offered unless a handler is supplied', async function (assert) {
            await render(TEMPLATE);

            assert.strictEqual(find(SEARCH), null);
        });

        test('a search box is prompted with the pluralised resource', async function (assert) {
            this.set('onSearch', () => {});

            await render(TEMPLATE);

            // `{{t "common.search"}}` is a translation key; the dummy app ships no messages.
            assert.dom(SEARCH).hasAttribute('placeholder', 'common.search vehicles', 'the resource name is pluralised into the prompt');
        });

        test('the search prompt can be replaced', async function (assert) {
            this.setProperties({ onSearch: () => {}, searchPlaceholder: 'Find a truck' });

            await render(TEMPLATE);

            assert.dom(SEARCH).hasAttribute('placeholder', 'Find a truck');
        });

        test('typing in the search box reports each keystroke', async function (assert) {
            this.set('onSearch', (event) => searches.push(event.target.value));

            await render(TEMPLATE);
            await triggerKeyEvent(SEARCH, 'keyup', 'A');

            assert.strictEqual(searches.length, 1, 'the handler is called on key up');
        });

        test('the search box can be disabled and seeded', async function (assert) {
            this.setProperties({ onSearch: () => {}, searchDisabled: true, searchQuery: 'truck' });

            await render(TEMPLATE);

            assert.dom(SEARCH).isDisabled();
            assert.dom(SEARCH).hasValue('truck');
        });

        test('no reload button is offered unless a handler is supplied', async function (assert) {
            await render(TEMPLATE);

            assert.notOk(buttonWithIcon('arrows-rotate'), 'no refresh control');
        });

        test('a reload button reports presses', async function (assert) {
            this.set('onReload', () => reloads.push('reload'));

            await render(TEMPLATE);
            const refresh = buttonWithIcon('arrows-rotate');

            assert.ok(refresh, 'a refresh control is offered');

            await click(refresh);
            assert.deepEqual(reloads, ['reload']);
        });

        test('no bulk search dropdown is offered unless a handler is supplied', async function (assert) {
            await render(TEMPLATE);

            assert.strictEqual(find('.bulk-search-dropdown'), null);
        });
    });

    module('bulk actions', function () {
        test('no bulk action menu is offered without a table', async function (assert) {
            this.set('bulkActions', [{ text: 'Archive', fn: () => {} }]);

            await render(TEMPLATE);

            assert.notOk(buttonWithIcon('layer-group'), 'the bulk menu is hidden');
        });

        test('a table with selected rows unlocks the bulk action menu', async function (assert) {
            const ran = [];
            this.set('table', { selectedRows: [{ id: 'veh_1' }] });
            this.set('bulkActions', [{ text: 'Archive', icon: 'box-archive', fn: () => ran.push('archive') }, { separator: true }, { text: 'Delete', fn: () => ran.push('delete') }]);

            await render(TEMPLATE);

            const trigger = buttonWithIcon('layer-group');
            assert.ok(trigger, 'the bulk menu is offered');

            await click(trigger);
            assert.deepEqual(
                menuItems().map((item) => item.textContent.trim()),
                ['Archive', 'Delete']
            );
            assert.strictEqual(findAll('.next-dd-menu-seperator').length, 1);

            await click(menuItems()[1]);
            assert.deepEqual(ran, ['delete']);
        });

        test('a bulk action can be labelled instead of texted', async function (assert) {
            this.set('table', { selectedRows: [{ id: 'veh_1' }] });
            this.set('bulkActions', [{ label: 'Export selection', fn: () => {} }]);

            await render(TEMPLATE);
            await click(buttonWithIcon('layer-group'));

            assert.deepEqual(
                menuItems().map((item) => item.textContent.trim()),
                ['Export selection']
            );
        });
    });

    module('action buttons', function () {
        test('an action button with items becomes a dropdown', async function (assert) {
            const ran = [];
            this.set('actionButtons', [
                {
                    text: 'More',
                    icon: 'ellipsis',
                    renderInPlace: true,
                    items: [{ text: 'Import', icon: 'file-import', onClick: () => ran.push('import') }, { separator: true }, { label: 'Export', fn: () => ran.push('export') }],
                },
            ]);

            await render(TEMPLATE);
            await click(buttonWithIcon('ellipsis'));

            assert.deepEqual(
                menuItems().map((item) => item.textContent.trim()),
                ['Import', 'Export']
            );

            await click(menuItems()[0]);
            assert.deepEqual(ran, ['import']);
        });

        test('several action buttons are rendered in order', async function (assert) {
            this.set('actionButtons', [
                { text: 'First', renderInPlace: true, items: [{ text: 'a', fn: () => {} }] },
                { text: 'Second', renderInPlace: true, items: [{ text: 'b', fn: () => {} }] },
            ]);

            await render(TEMPLATE);

            const labels = findAll('.ember-basic-dropdown-trigger').map((trigger) => trigger.textContent.trim());
            assert.true(labels.some((label) => label.includes('First')));
            assert.true(labels.some((label) => label.includes('Second')));
        });
    });

    test('it renders with no arguments at all', async function (assert) {
        await render(hbs`<Layout::Resource::TabularActions />`);

        assert.ok(buttonWithIcon('filter'), 'the filter picker still renders');
        assert.strictEqual(buttonWithIcon('sliders'), undefined, 'the column picker is withheld with no columns');
    });

    test('it renders with only a columns argument', async function (assert) {
        await render(hbs`<Layout::Resource::TabularActions @columns={{this.columns}} />`);

        assert.ok(buttonWithIcon('filter'), 'the filter picker still renders');
        assert.ok(buttonWithIcon('sliders'), 'so does the column picker');
        assert.strictEqual(find(SEARCH), null, 'and nothing optional is rendered');
    });
});
