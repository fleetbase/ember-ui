import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, triggerEvent, triggerKeyEvent, fillIn, findAll, find, focus } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import { setupShellStubs } from '../../../helpers/shell-stubs';
import { modifierKeyLabel } from '@fleetbase/ember-ui/utils/shell';

const ROW = (id) => `[data-dock-row="${id}"]`;

function dockRows() {
    return findAll('[data-dock-row]').map((row) => row.dataset.dockRow);
}

function availableRows() {
    return findAll('[data-available-row]').map((row) => row.dataset.availableRow);
}

module('Integration | Component | layout/dock-customizer', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        this.preferences = this.owner.lookup('service:dock-preferences');
        this.preferences.reset();
        this.closes = 0;
        this.onClose = () => this.closes++;
    });

    module('without the dock service', function (hooks) {
        setupShellStubs(hooks);

        test('it explains that modules need a newer Fleetbase and keeps the behaviour toggles', async function (assert) {
            await render(hbs`<Layout::DockCustomizer @onClose={{this.onClose}} />`);

            assert.dom('.fb-dock-customizer-unavailable').exists();
            assert.dom('[data-dock-row]').doesNotExist();
            assert.dom('.fb-dock-customizer-role').doesNotExist();
            assert.dom('.fb-dock-customizer-reset').doesNotExist();
            assert.dom('.fb-switch').exists({ count: 3 });

            await click('.fb-dock-customizer-done');
            assert.strictEqual(this.closes, 1, 'Done just closes');
        });
    });

    module('with the dock service', function (hooks) {
        setupShellStubs(hooks, { dock: true });

        hooks.beforeEach(function () {
            this.dock = this.owner.lookup('service:dock');
        });

        test('it is a labelled modal dialog that takes focus', async function (assert) {
            await render(hbs`<Layout::DockCustomizer @onClose={{this.onClose}} class="extra" />`);

            const dialog = find('[role="dialog"]');
            assert.dom(dialog).hasAttribute('aria-modal', 'true').hasClass('extra');
            assert.dom(`#${dialog.getAttribute('aria-labelledby')}`).hasText('Customize dock');
            assert.dom('.fb-dock-customizer-subtitle').hasText('Just for you');
            assert.dom('.fb-dock-customizer-close').isFocused();
        });

        test('it lists the dock in order with shortcuts, then "All apps"', async function (assert) {
            await render(hbs`<Layout::DockCustomizer />`);
            const mod = modifierKeyLabel();

            assert.deepEqual(dockRows(), ['fleet-ops', 'storefront', 'ledger']);
            assert.deepEqual(
                findAll('.fb-dock-customizer-kbd').map((kbd) => kbd.textContent.trim()),
                [`${mod}1`, `${mod}2`, `${mod}3`]
            );
            assert.dom(`${ROW('fleet-ops')} .fb-dock-customizer-note`).hasText('2 stale GPS');
            assert.strictEqual(find(ROW('fleet-ops')).style.getPropertyValue('--fb-module-color'), '#3b82f6');
            assert.deepEqual(availableRows(), ['pallet', 'iam']);
            assert.dom('.fb-dock-customizer-hint').containsText(`${mod}1`).containsText(`${mod}0`);
            assert.dom(`${ROW('fleet-ops')} .fb-dock-customizer-move[aria-label="Move Fleet-Ops up"]`).isDisabled();
            assert.dom(`${ROW('ledger')} .fb-dock-customizer-move[aria-label="Move Ledger down"]`).isDisabled();
            assert.dom('.fb-dock-customizer-lock').doesNotExist('people cannot lock modules for themselves');
        });

        test('only the first nine modules show a shortcut', async function (assert) {
            this.dock.items = Array.from({ length: 10 }, (_, index) => ({ id: `m${index}`, title: `M${index}` }));
            await render(hbs`<Layout::DockCustomizer />`);

            assert.dom('.fb-dock-customizer-kbd').exists({ count: 9 });
        });

        test('reorder with the buttons and with Alt+↑/↓, then Done saves the order', async function (assert) {
            await render(hbs`<Layout::DockCustomizer @onClose={{this.onClose}} />`);

            await click(`${ROW('ledger')} [aria-label="Move Ledger up"]`);
            assert.deepEqual(dockRows(), ['fleet-ops', 'ledger', 'storefront']);

            await click(`${ROW('fleet-ops')} [aria-label="Move Fleet-Ops down"]`);
            assert.deepEqual(dockRows(), ['ledger', 'fleet-ops', 'storefront']);

            await triggerKeyEvent(ROW('storefront'), 'keydown', 'ArrowUp', { altKey: true });
            assert.deepEqual(dockRows(), ['ledger', 'storefront', 'fleet-ops']);
            await triggerKeyEvent(ROW('ledger'), 'keydown', 'ArrowDown', { altKey: true });
            assert.deepEqual(dockRows(), ['storefront', 'ledger', 'fleet-ops']);

            await triggerKeyEvent(ROW('ledger'), 'keydown', 'ArrowDown');
            await triggerKeyEvent(ROW('ledger'), 'keydown', 'Enter', { altKey: true });
            assert.deepEqual(dockRows(), ['storefront', 'ledger', 'fleet-ops'], 'only Alt+↑/↓ move a row');

            await triggerKeyEvent(ROW('storefront'), 'keydown', 'ArrowUp', { altKey: true });
            assert.deepEqual(dockRows(), ['storefront', 'ledger', 'fleet-ops'], 'the first row cannot move up');

            assert.deepEqual(this.dock.calls, [], 'nothing is saved before Done');
            await click('.fb-dock-customizer-done');
            assert.deepEqual(this.dock.calls, [['reorder', ['storefront', 'ledger', 'fleet-ops']]]);
            assert.strictEqual(this.closes, 1);
        });

        test('drag a row onto another to reorder', async function (assert) {
            await render(hbs`<Layout::DockCustomizer />`);

            const dataTransfer = new DataTransfer();
            await triggerEvent(ROW('fleet-ops'), 'dragstart', { dataTransfer });
            assert.dom(ROW('fleet-ops')).hasClass('is-dragging');
            assert.strictEqual(dataTransfer.getData('text/plain'), 'fleet-ops');
            await triggerEvent(ROW('ledger'), 'dragover');
            await triggerEvent(ROW('ledger'), 'drop');
            assert.deepEqual(dockRows(), ['storefront', 'ledger', 'fleet-ops'], 'dragged down, it lands after the target');

            await triggerEvent(ROW('fleet-ops'), 'dragstart');
            await triggerEvent(ROW('storefront'), 'drop');
            assert.deepEqual(dockRows(), ['fleet-ops', 'storefront', 'ledger'], 'dragged up, it lands before the target');

            await triggerEvent(ROW('ledger'), 'dragstart');
            await triggerEvent(ROW('ledger'), 'drop');
            assert.deepEqual(dockRows(), ['fleet-ops', 'storefront', 'ledger'], 'dropped on itself, nothing moves');

            await triggerEvent(ROW('storefront'), 'drop');
            assert.deepEqual(dockRows(), ['fleet-ops', 'storefront', 'ledger'], 'a drop with no drag does nothing');

            await triggerEvent(ROW('ledger'), 'dragstart');
            await triggerEvent(ROW('ledger'), 'dragend');
            assert.dom('.is-dragging').doesNotExist('an abandoned drag clears');
        });

        test('remove to "All apps" and add back; Done shows, hides and reorders', async function (assert) {
            await render(hbs`<Layout::DockCustomizer @onClose={{this.onClose}} />`);

            await click(`${ROW('storefront')} .fb-dock-customizer-remove`);
            assert.deepEqual(dockRows(), ['fleet-ops', 'ledger']);
            assert.deepEqual(availableRows(), ['storefront', 'pallet', 'iam']);

            await click('[data-available-row="pallet"] .fb-dock-customizer-add');
            assert.deepEqual(dockRows(), ['fleet-ops', 'ledger', 'pallet']);

            await click('.fb-dock-customizer-done');
            assert.deepEqual(this.dock.calls, [
                ['show', 'pallet'],
                ['hide', 'storefront'],
                ['reorder', ['fleet-ops', 'ledger', 'pallet']],
            ]);
        });

        test('a module locked by an admin cannot be removed', async function (assert) {
            this.dock.lockedIds = ['fleet-ops'];
            await render(hbs`<Layout::DockCustomizer />`);

            assert.dom(`${ROW('fleet-ops')} .fb-dock-customizer-remove`).isDisabled();
            assert.dom(`${ROW('fleet-ops')} .fb-dock-customizer-locked`).containsText('Locked by your admin');
            assert.dom(`${ROW('storefront')} .fb-dock-customizer-locked`).doesNotExist();

            find(`${ROW('fleet-ops')} .fb-dock-customizer-remove`).disabled = false;
            await click(`${ROW('fleet-ops')} .fb-dock-customizer-remove`);
            assert.deepEqual(dockRows(), ['fleet-ops', 'storefront', 'ledger'], 'the lock holds even if the button is forced');
        });

        test('Cancel, the close button and Escape discard the draft', async function (assert) {
            await render(hbs`<Layout::DockCustomizer @onClose={{this.onClose}} />`);
            await click(`${ROW('storefront')} .fb-dock-customizer-remove`);

            await click('.fb-dock-customizer-cancel');
            await click('.fb-dock-customizer-close');
            await triggerKeyEvent('[role="dialog"]', 'keydown', 'Escape');
            await triggerKeyEvent('[role="dialog"]', 'keydown', 'Enter');

            assert.strictEqual(this.closes, 3);
            assert.deepEqual(this.dock.calls, []);
        });

        test('without @onClose, closing is safe', async function (assert) {
            await render(hbs`<Layout::DockCustomizer />`);
            await click('.fb-dock-customizer-cancel');

            assert.dom('[role="dialog"]').exists('the caller decides whether it is rendered');
        });

        test('the behaviour toggles apply immediately', async function (assert) {
            await render(hbs`<Layout::DockCustomizer />`);

            assert.dom('[data-preference="showBadges"]').hasAttribute('role', 'switch').hasAttribute('aria-checked', 'true');
            await click('[data-preference="showBadges"]');
            await click('[data-preference="openOnHover"]');
            await click('[data-preference="pinRail"]');
            assert.dom('[data-preference="showBadges"]').hasAttribute('aria-checked', 'false');
            assert.dom('[data-preference="openOnHover"]').hasAttribute('aria-checked', 'true');
            assert.dom('[data-preference="pinRail"]').hasAttribute('aria-checked', 'true');

            await click('[role="radiogroup"][aria-label="Position"] [role="radio"]:nth-of-type(3)');
            await click('[role="radiogroup"][aria-label="Size"] [role="radio"]:nth-of-type(1)');
            assert.dom('[role="radiogroup"][aria-label="Position"] [aria-checked="true"]').hasText('Auto-hide');
            assert.dom('[role="radiogroup"][aria-label="Size"] [aria-checked="true"]').hasText('Compact');
            assert.deepEqual(this.preferences.toJSON(), { showBadges: false, openOnHover: true, pinRail: true, position: 'auto-hide', size: 'compact' });
        });

        test('"Reset to company default" appears when the dock can reset, and reloads the draft', async function (assert) {
            this.dock.resetToDefault = () => {
                this.dock.calls.push(['resetToDefault']);
                this.dock.items = this.dock.items.slice(0, 1);
            };
            await render(hbs`<Layout::DockCustomizer />`);
            await click('.fb-dock-customizer-reset');

            assert.deepEqual(this.dock.calls, [['resetToDefault']]);
            assert.deepEqual(dockRows(), ['fleet-ops']);
        });

        test('a dock with nothing hidden and no item lists', async function (assert) {
            this.dock.items = undefined;
            this.dock.hiddenItems = undefined;
            this.dock.lockedIds = undefined;
            await render(hbs`<Layout::DockCustomizer />`);

            assert.dom('[data-dock-row]').doesNotExist();
            assert.dom('[data-available-row]').doesNotExist();
        });

        module('for admins', function (hooks) {
            hooks.beforeEach(function () {
                this.dock.canManageRoles = true;
                this.dock.defaultsByRole = {
                    dispatcher: { order: ['fleet-ops', 'pallet', 'unknown-module'], locked: ['fleet-ops', 'unknown-module'] },
                };
                this.roles = [
                    { id: 'dispatcher', name: 'Dispatcher' },
                    { id: 'accountant', name: 'Accountant' },
                ];
            });

            test('the role picker switches the draft to a role’s default dock, with lock toggles', async function (assert) {
                await render(hbs`<Layout::DockCustomizer @roles={{this.roles}} @onClose={{this.onClose}} />`);

                assert.deepEqual(
                    findAll('.fb-dock-customizer-role-select option').map((option) => option.textContent.trim()),
                    ['Just for me', 'Role: Dispatcher', 'Role: Accountant']
                );

                await fillIn('.fb-dock-customizer-role-select', 'dispatcher');
                assert.dom('.fb-dock-customizer-subtitle').hasText('Default dock for this role');
                assert.deepEqual(dockRows(), ['fleet-ops', 'pallet'], 'modules the dock does not know are left out');
                assert.deepEqual(availableRows(), ['storefront', 'ledger', 'iam']);
                assert
                    .dom(`${ROW('fleet-ops')} .fb-dock-customizer-lock`)
                    .hasAttribute('aria-pressed', 'true')
                    .hasClass('is-locked');
                assert.dom(`${ROW('pallet')} .fb-dock-customizer-lock`).hasAttribute('aria-pressed', 'false');
                assert.dom(`${ROW('fleet-ops')} .fb-dock-customizer-remove`).isNotDisabled('admins can remove locked modules from a role');
                assert.dom('.fb-dock-customizer-reset').doesNotExist('reset is for a person’s own dock');

                await click(`${ROW('pallet')} .fb-dock-customizer-lock`);
                await click(`${ROW('fleet-ops')} .fb-dock-customizer-lock`);
                await click('[data-available-row="ledger"] .fb-dock-customizer-add');
                await click(`${ROW('ledger')} .fb-dock-customizer-lock`);
                await click(`${ROW('ledger')} .fb-dock-customizer-remove`);
                await click('[data-available-row="ledger"] .fb-dock-customizer-add');

                await click('.fb-dock-customizer-done');
                assert.deepEqual(this.dock.calls, [['setRoleDefaults', 'dispatcher', { order: ['fleet-ops', 'pallet', 'ledger'], locked: ['pallet'] }]], 'removing a module drops its lock');
                assert.strictEqual(this.closes, 1);
            });

            test('a role with no saved defaults starts empty; switching back restores the person’s dock', async function (assert) {
                await render(hbs`<Layout::DockCustomizer @roles={{this.roles}} />`);

                await fillIn('.fb-dock-customizer-role-select', 'accountant');
                assert.deepEqual(dockRows(), []);
                assert.deepEqual(availableRows(), ['fleet-ops', 'storefront', 'ledger', 'pallet', 'iam']);

                await fillIn('.fb-dock-customizer-role-select', 'personal');
                assert.deepEqual(dockRows(), ['fleet-ops', 'storefront', 'ledger']);
            });

            test('roles default to the dock’s own list, and a dock without roleDefaults degrades', async function (assert) {
                this.dock.roles = [{ id: 'dispatcher', name: 'Dispatcher' }];
                this.dock.roleDefaults = undefined;
                this.dock.defaultsByRole = {};
                await render(hbs`<Layout::DockCustomizer />`);

                assert.dom('.fb-dock-customizer-role-select option').exists({ count: 2 });
                await fillIn('.fb-dock-customizer-role-select', 'dispatcher');
                assert.deepEqual(dockRows(), []);
            });

            test('a role default without lists', async function (assert) {
                this.dock.defaultsByRole = { dispatcher: {} };
                await render(hbs`<Layout::DockCustomizer @roles={{this.roles}} />`);
                await fillIn('.fb-dock-customizer-role-select', 'dispatcher');

                assert.deepEqual(dockRows(), []);
            });

            test('no roles at all', async function (assert) {
                this.dock.roles = undefined;
                await render(hbs`<Layout::DockCustomizer />`);
                await focus('.fb-dock-customizer-role-select');

                assert.dom('.fb-dock-customizer-role-select option').exists({ count: 1 });
            });
        });
    });
});
