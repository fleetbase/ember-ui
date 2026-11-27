import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, focus, blur, triggerEvent, triggerKeyEvent, findAll, find, settled, waitUntil } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import { setupShellStubs, stubHeaderMenuItems, stubModulePages } from '../../../helpers/shell-stubs';
import { modifierKeyLabel } from '@fleetbase/ember-ui/utils/shell';

const ITEM = (id) => `[data-dock-item="${id}"]`;
const MOD = modifierKeyLabel();

function dockIds() {
    return findAll('.fb-dock-items [data-dock-item]').map((element) => element.dataset.dockItem);
}

async function pressCommand(key, extra = {}) {
    await triggerKeyEvent(document, 'keydown', key, { metaKey: true, ...extra });
}

module('Integration | Component | layout/dock', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        this.preferences = this.owner.lookup('service:dock-preferences');
        this.preferences.reset();
    });

    module('without the dock service', function (hooks) {
        setupShellStubs(hooks);

        test('it falls back to the header menu items, leaving out shortcuts', async function (assert) {
            stubHeaderMenuItems(this.owner, [
                { id: 'fleet-ops', title: 'Fleet-Ops', route: 'console.fleet-ops' },
                { id: 'fleet-ops-sc-orders', title: 'Orders', _isShortcut: true },
                { id: 'iam', title: 'IAM', route: 'console.iam' },
            ]);
            await render(hbs`<Layout::Dock />`);

            assert.deepEqual(dockIds(), ['fleet-ops', 'iam', '__all-apps']);
            assert.dom(ITEM('iam')).hasAttribute('aria-label', 'IAM').hasAttribute('aria-keyshortcuts', 'Meta+2 Control+2');
        });

        test('@items overrides the source', async function (assert) {
            stubHeaderMenuItems(this.owner, [{ id: 'iam', title: 'IAM' }]);
            this.items = [{ id: 'ledger', title: 'Ledger', route: 'console.ledger' }];
            await render(hbs`<Layout::Dock @items={{this.items}} />`);

            assert.deepEqual(dockIds(), ['ledger', '__all-apps']);
        });

        test('with no modules only "All apps" renders, and it takes the tab stop', async function (assert) {
            stubHeaderMenuItems(this.owner, []);
            await render(hbs`<Layout::Dock />`);

            assert.deepEqual(dockIds(), ['__all-apps']);
            assert.dom(ITEM('__all-apps')).hasAttribute('tabindex', '0');
        });

        test('the customizer explains it needs the dock service', async function (assert) {
            stubHeaderMenuItems(this.owner, []);
            await render(hbs`<Layout::Dock />`);
            await click(ITEM('__all-apps'));

            assert.dom('.fb-dock-customizer-unavailable').exists();
        });
    });

    module('with the dock service', function (hooks) {
        setupShellStubs(hooks, { dock: true });

        hooks.beforeEach(function () {
            this.dock = this.owner.lookup('service:dock');
            stubModulePages(this.owner, {
                panels: { 'fleet-ops': [{ title: 'Operations', items: [{ title: 'Orders', route: 'console.fleet-ops.operations.orders', icon: 'box' }] }] },
                items: { 'fleet-ops': [{ title: 'Settings', route: 'console.fleet-ops.settings' }] },
            });
        });

        test('it renders one icon button per module, in dock order, then "All apps"', async function (assert) {
            await render(hbs`<Layout::Dock class="extra" />`);

            assert.dom('nav.fb-dock').hasAttribute('aria-label', 'Modules').hasClass('extra').hasClass('is-left').hasClass('is-default').hasClass('shows-badges');
            assert.deepEqual(dockIds(), ['fleet-ops', 'storefront', 'ledger', '__all-apps']);
            assert.dom(ITEM('fleet-ops')).hasAttribute('aria-label', 'Fleet-Ops, 2 stale GPS', 'the status is part of the accessible name');
            assert.dom(ITEM('fleet-ops')).hasAttribute('aria-keyshortcuts', 'Meta+1 Control+1').hasAttribute('aria-controls', 'fb-dock-flyout');
            assert.dom(ITEM('fleet-ops')).hasClass('has-color');
            assert.dom(ITEM('ledger')).doesNotHaveClass('has-color');
            assert.strictEqual(find(ITEM('fleet-ops')).style.getPropertyValue('--fb-module-color'), '#3b82f6');
            assert.dom(ITEM('fleet-ops')).hasAttribute('tabindex', '0', 'with nothing active the first module is the tab stop');
            assert.dom(ITEM('storefront')).hasAttribute('tabindex', '-1');
            assert.dom(ITEM('__all-apps')).hasAttribute('tabindex', '-1');
        });

        test('badges and status dots, unless turned off', async function (assert) {
            await render(hbs`<Layout::Dock />`);

            assert.dom(`${ITEM('fleet-ops')} .fb-dock-badge.is-warn`).hasText('2');
            assert.dom(`${ITEM('ledger')} .fb-dock-status-dot.is-error`).exists('a status without a badge shows a dot');
            assert.dom(`${ITEM('storefront')} .fb-dock-badge, ${ITEM('storefront')} .fb-dock-status-dot`).doesNotExist();

            this.dock.items = [{ id: 'x', title: 'X', badge: 3 }];
            await settled();
            assert.dom('.fb-dock-badge.is-info').hasText('3', 'a badge without a status is informational');

            this.preferences.update('showBadges', false);
            await settled();
            assert.dom('.fb-dock-badge').doesNotExist();
            assert.dom('nav.fb-dock').doesNotHaveClass('shows-badges');
        });

        test('the current module is filled, marked current and carries the indicator', async function (assert) {
            this.router.currentRouteName = 'console.storefront.orders';
            await render(hbs`<Layout::Dock />`);

            assert.dom(ITEM('storefront')).hasClass('is-active').hasAttribute('aria-current', 'page').hasAttribute('tabindex', '0');
            assert.dom(`${ITEM('storefront')} .fb-dock-indicator`).exists();
            assert.dom('.fb-dock-indicator').exists({ count: 1 });
            assert.dom(ITEM('fleet-ops')).doesNotHaveAttribute('aria-current');
        });

        test('a tooltip with name, shortcut and status shows on hover', async function (assert) {
            await render(hbs`<Layout::Dock />`);
            await triggerEvent(ITEM('fleet-ops'), 'mouseenter');

            assert.dom('[role="tooltip"]').exists({ count: 1 });
            assert.dom('.fb-dock-tooltip-name').hasText('Fleet-Ops');
            assert.dom('.fb-dock-tooltip-kbd').hasText(`${MOD}1`);
            assert.dom('.fb-dock-tooltip-status.is-warn').hasText('2 stale GPS');
            assert.dom(ITEM('fleet-ops')).hasAttribute('aria-describedby', find('[role="tooltip"]').id);

            const item = find(ITEM('fleet-ops')).getBoundingClientRect();
            const tooltip = find('[role="tooltip"]');
            assert.strictEqual(tooltip.style.left, `${item.right + 10}px`, 'to the right of the item');
            assert.strictEqual(tooltip.style.top, `${item.top + item.height / 2}px`, 'centred on it');

            await triggerEvent(ITEM('fleet-ops'), 'mouseleave');
            assert.dom('[role="tooltip"]').doesNotExist();
            assert.dom(ITEM('fleet-ops')).doesNotHaveAttribute('aria-describedby');
        });

        test('the tooltip also shows on keyboard focus, and follows it', async function (assert) {
            await render(hbs`<Layout::Dock />`);
            await focus(ITEM('storefront'));

            assert.dom('.fb-dock-tooltip-name').hasText('Storefront');
            assert.dom('.fb-dock-tooltip-status').doesNotExist('no status, no status line');
            assert.dom(ITEM('storefront')).hasAttribute('tabindex', '0', 'the focused module becomes the tab stop');

            await focus(ITEM('ledger'));
            assert.dom('.fb-dock-tooltip-name').hasText('Ledger');

            await blur(ITEM('ledger'));
            assert.dom('[role="tooltip"]').doesNotExist();
        });

        test('blurring a module does not hide another module’s tooltip', async function (assert) {
            await render(hbs`<Layout::Dock />`);
            await focus(ITEM('storefront'));
            await triggerEvent(ITEM('ledger'), 'mouseenter');
            await blur(ITEM('storefront'));

            assert.dom('.fb-dock-tooltip-name').hasText('Ledger');
        });

        test('a module past the ninth has no shortcut in its tooltip', async function (assert) {
            this.dock.items = Array.from({ length: 10 }, (_, index) => ({ id: `m${index}`, title: `Module ${index}` }));
            await render(hbs`<Layout::Dock />`);
            await triggerEvent(ITEM('m9'), 'mouseenter');

            assert.dom('.fb-dock-tooltip-kbd').doesNotExist();
            assert.dom(ITEM('m9')).doesNotHaveAttribute('aria-keyshortcuts');
        });

        test('↑, ↓, Home and End move focus between modules and wrap', async function (assert) {
            await render(hbs`<Layout::Dock />`);
            await focus(ITEM('fleet-ops'));

            await triggerKeyEvent(ITEM('fleet-ops'), 'keydown', 'ArrowDown');
            assert.dom(ITEM('storefront')).isFocused();
            await triggerKeyEvent(ITEM('storefront'), 'keydown', 'End');
            assert.dom(ITEM('__all-apps')).isFocused('"All apps" is part of the sequence');
            await triggerKeyEvent(ITEM('__all-apps'), 'keydown', 'ArrowDown');
            assert.dom(ITEM('fleet-ops')).isFocused('it wraps');
            await triggerKeyEvent(ITEM('fleet-ops'), 'keydown', 'ArrowUp');
            assert.dom(ITEM('__all-apps')).isFocused();
            await triggerKeyEvent(ITEM('__all-apps'), 'keydown', 'Home');
            assert.dom(ITEM('fleet-ops')).isFocused();
        });

        test('choosing a module navigates to it and opens its flyout; choosing it again closes the flyout', async function (assert) {
            await render(hbs`<Layout::Dock />`);
            assert.dom('#fb-dock-flyout').exists().hasAttribute('hidden');

            await click(ITEM('fleet-ops'));
            assert.deepEqual(this.router.transitions, [['console.fleet-ops', { queryParams: {} }]]);
            assert.dom('#fb-dock-flyout').doesNotHaveAttribute('hidden').hasAttribute('aria-label', 'Fleet-Ops pages');
            assert.dom(ITEM('fleet-ops')).hasAttribute('aria-expanded', 'true').hasClass('is-expanded');
            assert.dom('.fb-dock-flyout-title').hasText('Fleet-Ops');
            assert.dom('.fb-dock-flyout-group-title').hasText('Operations');
            assert.deepEqual(
                findAll('.fb-dock-flyout-page').map((page) => page.textContent.trim()),
                ['Orders', 'Settings']
            );

            await click(ITEM('fleet-ops'));
            assert.dom('#fb-dock-flyout').hasAttribute('hidden');
            assert.dom(ITEM('fleet-ops')).hasAttribute('aria-expanded', 'false');
        });

        test('→ opens the focused module’s flyout without navigating; Escape closes it and returns focus', async function (assert) {
            await render(hbs`<Layout::Dock />`);
            await focus(ITEM('fleet-ops'));
            await triggerKeyEvent(ITEM('fleet-ops'), 'keydown', 'ArrowRight');

            assert.dom('#fb-dock-flyout').doesNotHaveAttribute('hidden');
            assert.dom('[role="tooltip"]').doesNotExist('the tooltip gives way to the flyout');
            assert.deepEqual(this.router.transitions, []);

            await triggerKeyEvent(ITEM('fleet-ops'), 'keydown', 'Escape');
            assert.dom('#fb-dock-flyout').hasAttribute('hidden');
            assert.dom(ITEM('fleet-ops')).isFocused();
        });

        test('→ on "All apps" and other keys do nothing; Escape with no flyout only hides the tooltip', async function (assert) {
            await render(hbs`<Layout::Dock />`);
            await focus(ITEM('__all-apps'));
            await triggerKeyEvent(ITEM('__all-apps'), 'keydown', 'ArrowRight');
            await triggerKeyEvent(ITEM('__all-apps'), 'keydown', 'A');
            assert.dom('#fb-dock-flyout').hasAttribute('hidden');

            await focus(ITEM('ledger'));
            assert.dom('[role="tooltip"]').exists();
            await triggerKeyEvent(ITEM('ledger'), 'keydown', 'Escape');
            assert.dom('[role="tooltip"]').doesNotExist();
            assert.dom('#fb-dock-flyout').hasAttribute('hidden');
        });

        test('the flyout’s close button returns focus to its module', async function (assert) {
            await render(hbs`<Layout::Dock />`);
            await click(ITEM('storefront'));
            await click('.fb-dock-flyout-close');

            assert.dom('#fb-dock-flyout').hasAttribute('hidden');
            assert.dom(ITEM('storefront')).isFocused();
        });

        test('a page in the flyout navigates and closes the flyout', async function (assert) {
            await render(hbs`<Layout::Dock />`);
            await click(ITEM('fleet-ops'));
            await click('.fb-dock-flyout-page');

            assert.deepEqual(this.router.transitions[1], ['console.fleet-ops.operations.orders', { queryParams: {} }]);
            assert.dom('#fb-dock-flyout').hasAttribute('hidden');
        });

        test('pinned, the flyout stays open on the current module as a rail', async function (assert) {
            this.router.currentRouteName = 'console.fleet-ops.operations.orders';
            await render(hbs`<Layout::Dock />`);
            assert.dom('#fb-dock-flyout').hasAttribute('hidden', '', 'closed until opened or pinned');

            await click(ITEM('fleet-ops'));
            await click('.fb-dock-flyout-pin');
            assert.true(this.preferences.pinRail, 'pinning is remembered');
            assert.dom('.fb-dock-flyout-pin').hasAttribute('aria-pressed', 'true').hasAttribute('aria-label', 'Unpin pages rail');

            await click(ITEM('fleet-ops'));
            assert.dom('#fb-dock-flyout').hasClass('is-pinned').doesNotHaveAttribute('hidden', 'choosing the module again leaves the rail open');

            await click('.fb-dock-flyout-page');
            assert.dom('#fb-dock-flyout').doesNotHaveAttribute('hidden', 'opening a page leaves the rail open');

            await click(ITEM('storefront'));
            assert.dom('.fb-dock-flyout-title').hasText('Storefront', 'another module opens over the rail');
            await click('.fb-dock-flyout-close');
            assert.dom('.fb-dock-flyout-title').hasText('Fleet-Ops', 'closing it goes back to the rail');

            await click('.fb-dock-flyout-close');
            assert.false(this.preferences.pinRail, 'closing the rail unpins it');
            assert.dom('#fb-dock-flyout').hasAttribute('hidden');
            assert.dom(ITEM('fleet-ops')).isFocused();
        });

        test('pinned with no current module, the rail stays closed', async function (assert) {
            this.preferences.update('pinRail', true);
            await render(hbs`<Layout::Dock />`);

            assert.dom('#fb-dock-flyout').hasAttribute('hidden');
            assert.dom('.fb-dock-flyout-title').doesNotExist();
            assert.dom('#fb-dock-flyout').hasAttribute('aria-label', 'Module pages');
        });

        test('the adapter element is always present, and shown only on the current module', async function (assert) {
            this.router.currentRouteName = 'console.fleet-ops';
            await render(hbs`<Layout::Dock /><Layout::YieldSidebar><a class="engine-link">Legacy page</a></Layout::YieldSidebar>`);

            assert.dom('#fb-dock-flyout #sidebar-menu-items').exists({ count: 1 }).hasAttribute('hidden');
            assert.dom('#sidebar-menu-items .engine-link').hasText('Legacy page', 'Layout::YieldSidebar lands inside the flyout');

            await click(ITEM('fleet-ops'));
            assert.dom('#sidebar-menu-items').doesNotHaveAttribute('hidden', 'open on the current module');

            await click(ITEM('storefront'));
            assert.dom('#sidebar-menu-items').hasAttribute('hidden', '', 'another module’s flyout does not show the current engine’s sidebar');
        });

        test('a flyout whose module disappears closes', async function (assert) {
            await render(hbs`<Layout::Dock />`);
            await click(ITEM('ledger'));
            this.dock.items = this.dock.items.filter((item) => item.id !== 'ledger');
            await settled();

            assert.dom('#fb-dock-flyout').hasAttribute('hidden');
        });

        test('open on hover opens the flyout after a short rest, and leaving cancels it', async function (assert) {
            this.preferences.update('openOnHover', true);
            await render(hbs`<Layout::Dock />`);

            // Not awaited: settling would wait out the delay.
            triggerEvent(ITEM('storefront'), 'mouseenter');
            await triggerEvent(ITEM('storefront'), 'mouseleave');
            assert.dom('#fb-dock-flyout').hasAttribute('hidden', '', 'leaving before the delay cancels it');

            triggerEvent(ITEM('ledger'), 'mouseenter');
            await waitUntil(() => !find('#fb-dock-flyout').hidden);
            assert.dom('.fb-dock-flyout-title').hasText('Ledger');
            assert.deepEqual(this.router.transitions, [], 'hovering never navigates');
        });

        test('without open on hover, hovering never opens the flyout', async function (assert) {
            await render(hbs`<Layout::Dock />`);
            await triggerEvent(ITEM('ledger'), 'mouseenter');

            assert.dom('#fb-dock-flyout').hasAttribute('hidden');
        });

        test('⌘1–⌘9 jump to modules in dock order and ⌘0 opens "All apps"', async function (assert) {
            await render(hbs`<Layout::Dock />`);

            await pressCommand('2');
            assert.deepEqual(this.router.transitions, [['console.storefront', { queryParams: {} }]]);

            await triggerKeyEvent(document, 'keydown', '3', { ctrlKey: true });
            assert.deepEqual(this.router.transitions[1], ['console.ledger', { queryParams: {} }], 'Ctrl works too');

            await pressCommand('9');
            await pressCommand('1', { shiftKey: true });
            await pressCommand('1', { altKey: true });
            await pressCommand('K');
            await triggerKeyEvent(document, 'keydown', '1');
            assert.strictEqual(this.router.transitions.length, 2, 'no module, other modifiers, other keys and no modifier are ignored');

            await pressCommand('0');
            assert.dom('[role="dialog"].fb-dock-customizer').exists();
            assert.dom(ITEM('__all-apps')).hasAttribute('aria-expanded', 'true');

            await click('.fb-dock-customizer-cancel');
            assert.dom('.fb-dock-customizer').doesNotExist();
        });

        test('it stops listening for shortcuts when destroyed', async function (assert) {
            this.set('show', true);
            await render(hbs`{{#if this.show}}<Layout::Dock />{{/if}}`);
            this.set('show', false);
            await pressCommand('1');

            assert.deepEqual(this.router.transitions, []);
        });

        test('position and size preferences restyle the dock', async function (assert) {
            this.preferences.update('position', 'right');
            this.preferences.update('size', 'compact');
            this.router.currentRouteName = 'console.fleet-ops';
            await render(hbs`<Layout::Dock />`);

            assert.dom('nav.fb-dock').hasClass('is-right').hasClass('is-compact');
            assert.strictEqual(getComputedStyle(find('nav.fb-dock')).width, '48px');
            assert.strictEqual(getComputedStyle(find(ITEM('fleet-ops'))).width, '36px');
        });

        test('the dock is sized to its items and floats below the context bar', async function (assert) {
            await render(hbs`<Layout::Canvas><:chrome><Layout::Dock /></:chrome></Layout::Canvas>`);
            const dock = find('nav.fb-dock');

            assert.strictEqual(getComputedStyle(dock).width, '56px');
            assert.strictEqual(getComputedStyle(dock).top, '64px', 'the canvas top inset');
            assert.strictEqual(getComputedStyle(find(ITEM('fleet-ops'))).height, '44px', '44px targets');
        });

        test('locked modules are flagged for the customizer', async function (assert) {
            this.dock.lockedIds = ['fleet-ops'];
            await render(hbs`<Layout::Dock />`);
            await click(ITEM('__all-apps'));

            assert.dom('[data-dock-row="fleet-ops"] .fb-dock-customizer-remove').isDisabled();
        });
    });
});
