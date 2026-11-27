import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, fillIn, focus, triggerKeyEvent, findAll } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import { setupShellStubs, stubModulePages } from '../../../../helpers/shell-stubs';

function pageTitles() {
    return findAll('.fb-dock-flyout-page').map((page) => page.textContent.trim());
}

module('Integration | Component | layout/dock/flyout', function (hooks) {
    setupRenderingTest(hooks);
    setupShellStubs(hooks);

    hooks.beforeEach(function () {
        stubModulePages(this.owner, {
            panels: {
                'fleet-ops': [
                    {
                        title: 'Operations',
                        items: [
                            { title: 'Orders', route: 'console.fleet-ops.operations.orders', icon: 'box' },
                            { title: 'Scheduler', route: 'console.fleet-ops.operations.scheduler' },
                        ],
                    },
                    { title: 'Resources', items: [{ title: 'Drivers', route: 'console.virtual', slug: 'drivers', view: 'list' }] },
                ],
            },
        });
        this.entry = { id: 'fleet-ops', title: 'Fleet-Ops', color: '#3b82f6' };
        this.closes = [];
        this.onClose = () => this.closes.push('close');
    });

    test('closed and without a module, it is an empty, hidden flyout that still holds the adapter', async function (assert) {
        await render(hbs`<Layout::Dock::Flyout @open={{false}} />`);

        assert.dom('#fb-dock-flyout').hasAttribute('hidden').hasAttribute('aria-label', 'Module pages');
        assert.dom('.fb-dock-flyout-header').doesNotExist();
        assert.dom('#sidebar-menu-items').exists().hasAttribute('hidden');
    });

    test('it lists the module’s panels as groups with their pages', async function (assert) {
        await render(hbs`<Layout::Dock::Flyout @entry={{this.entry}} @open={{true}} @showsAdapter={{true}} />`);

        assert.dom('#fb-dock-flyout').doesNotHaveAttribute('hidden').hasAttribute('aria-label', 'Fleet-Ops pages');
        assert.deepEqual(
            findAll('.fb-dock-flyout-group-title').map((title) => title.textContent.trim()),
            ['Operations', 'Resources']
        );
        assert.deepEqual(pageTitles(), ['Orders', 'Scheduler', 'Drivers']);
        assert.dom('.fb-dock-flyout-group[role="group"]').exists({ count: 2 });
        assert.dom('.fb-dock-flyout-page svg').exists({ count: 1 }, 'only pages with an icon show one');
        assert.dom('#sidebar-menu-items').doesNotHaveAttribute('hidden');
        assert.dom('.fb-dock-flyout-filter-input').hasAttribute('aria-label', 'Jump to a Fleet-Ops page');
    });

    test('the current page is marked, including a virtual page by its view', async function (assert) {
        this.router.currentRouteName = 'console.virtual';
        this.router.currentRoute = { queryParams: { view: 'list' } };
        await render(hbs`<Layout::Dock::Flyout @entry={{this.entry}} @open={{true}} />`);

        assert.dom('.fb-dock-flyout-page[aria-current="page"]').hasText('Drivers');

        this.router.currentRoute = { queryParams: { view: 'map' } };
        await render(hbs`<Layout::Dock::Flyout @entry={{this.entry}} @open={{true}} />`);
        assert.dom('.fb-dock-flyout-page[aria-current="page"]').doesNotExist('another view of the same route is not current');

        this.router.currentRouteName = 'console.fleet-ops.operations.orders';
        this.router.currentRoute = null;
        await render(hbs`<Layout::Dock::Flyout @entry={{this.entry}} @open={{true}} />`);
        assert.dom('.fb-dock-flyout-page.is-current').hasText('Orders', 'a page without a view matches on its route');
    });

    test('the filter narrows the pages, says when nothing matches and resets for another module', async function (assert) {
        this.set('entry', this.entry);
        await render(hbs`<Layout::Dock::Flyout @entry={{this.entry}} @open={{true}} />`);

        await fillIn('.fb-dock-flyout-filter-input', 'sched');
        assert.deepEqual(pageTitles(), ['Scheduler']);
        assert.dom('.fb-dock-flyout-group-title').hasText('Operations');

        await fillIn('.fb-dock-flyout-filter-input', 'nothing like this');
        assert.dom('.fb-dock-flyout-page').doesNotExist();
        assert.dom('.fb-dock-flyout-empty').hasText('No Fleet-Ops page matches “nothing like this”.');

        this.set('entry', { id: 'ledger', title: 'Ledger' });
        assert.dom('.fb-dock-flyout-filter-input').hasValue('', 'the filter belongs to the module it was typed for');
        assert.dom('.fb-dock-flyout-empty').doesNotExist('a module with no pages and no query shows no message');
    });

    test('choosing a page navigates and closes, unless pinned', async function (assert) {
        await render(hbs`<Layout::Dock::Flyout @entry={{this.entry}} @open={{true}} @onClose={{this.onClose}} />`);
        await click(findAll('.fb-dock-flyout-page')[2]);

        assert.deepEqual(this.router.transitions, [['console.virtual', 'drivers', { queryParams: { view: 'list' } }]]);
        assert.deepEqual(this.closes, ['close']);

        await render(hbs`<Layout::Dock::Flyout @entry={{this.entry}} @open={{true}} @pinned={{true}} @onClose={{this.onClose}} />`);
        await click('.fb-dock-flyout-page');
        assert.deepEqual(this.closes, ['close'], 'a pinned rail stays open');
        assert.dom('#fb-dock-flyout').hasClass('is-pinned');
        assert.dom('.fb-dock-flyout-pin').hasAttribute('aria-pressed', 'true');
    });

    test('without handlers, choosing a page, pin, close and Escape are safe', async function (assert) {
        await render(hbs`<Layout::Dock::Flyout @entry={{this.entry}} @open={{true}} />`);
        await click('.fb-dock-flyout-pin');
        await click('.fb-dock-flyout-close');
        await click('.fb-dock-flyout-page');
        await triggerKeyEvent('#fb-dock-flyout', 'keydown', 'Escape');

        assert.strictEqual(this.router.transitions.length, 1);
        assert.dom('.fb-dock-flyout-pin').hasAttribute('aria-pressed', 'false').hasAttribute('aria-label', 'Pin pages as a rail');
    });

    test('↑ and ↓ move between the filter and the pages; Escape closes', async function (assert) {
        await render(hbs`<Layout::Dock::Flyout @entry={{this.entry}} @open={{true}} @onClose={{this.onClose}} />`);
        await focus('.fb-dock-flyout-filter-input');

        await triggerKeyEvent('.fb-dock-flyout-filter-input', 'keydown', 'ArrowDown');
        assert.dom('.fb-dock-flyout-page').isFocused();
        await triggerKeyEvent('.fb-dock-flyout-page', 'keydown', 'ArrowUp');
        assert.dom('.fb-dock-flyout-filter-input').isFocused();
        await triggerKeyEvent('.fb-dock-flyout-filter-input', 'keydown', 'ArrowUp');
        assert.strictEqual(document.activeElement.textContent.trim(), 'Drivers', 'it wraps to the last page');

        await triggerKeyEvent('#fb-dock-flyout', 'keydown', 'Enter');
        assert.deepEqual(this.closes, [], 'other keys are left to the page buttons');

        await triggerKeyEvent('#fb-dock-flyout', 'keydown', 'Escape');
        assert.deepEqual(this.closes, ['close']);
    });
});
