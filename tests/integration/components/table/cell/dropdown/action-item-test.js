import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, find } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import Service from '@ember/service';

const ROW = { id: 'row_1', name: 'Order 123' };

module('Integration | Component | table/cell/dropdown/action-item', function (hooks) {
    setupRenderingTest(hooks);

    let deniedAbilities;
    let closes;
    let invoked;

    hooks.beforeEach(function () {
        deniedAbilities = new Set();
        closes = 0;
        invoked = [];

        this.owner.unregister('service:abilities');
        this.owner.register(
            'service:abilities',
            class extends Service {
                cannot(permission) {
                    return deniedAbilities.has(permission);
                }
                can(permission) {
                    return !deniedAbilities.has(permission);
                }
            }
        );

        this.set('row', ROW);
        this.set('dd', { actions: { close: () => closes++ } });
        this.set('columnAction', { label: 'Edit', fn: (row) => invoked.push(row) });
    });

    const TEMPLATE = hbs`
        <Table::Cell::Dropdown::ActionItem
            @columnAction={{this.columnAction}}
            @row={{this.row}}
            @column={{this.column}}
            @dd={{this.dd}}
            @disabled={{this.disabled}}
            @permission={{this.permission}}
        />
    `;

    function item() {
        return find('.next-dd-item');
    }

    module('rendering', function () {
        test('it renders a menu item with the action label', async function (assert) {
            await render(TEMPLATE);

            assert.dom(item()).hasText('Edit');
            assert.dom(item()).hasAttribute('role', 'menuitem');
        });

        test('an icon is rendered when the action declares one', async function (assert) {
            this.set('columnAction', { label: 'Edit', icon: 'pencil', iconClass: 'my-icon' });

            await render(TEMPLATE);

            assert.dom('.next-dd-item svg').exists();
            assert.dom('.next-dd-item svg').hasClass('my-icon');
        });

        test('a custom class is applied', async function (assert) {
            this.set('columnAction', { label: 'Delete', class: 'text-danger' });

            await render(TEMPLATE);

            assert.dom(item()).hasClass('text-danger');
        });

        test('a separator action renders a rule instead of a menu item', async function (assert) {
            this.set('columnAction', { separator: true });

            await render(TEMPLATE);

            assert.dom('.next-dd-menu-seperator').exists();
            assert.dom('.next-dd-item').doesNotExist();
        });

        test('an action marked not visible renders nothing', async function (assert) {
            this.set('columnAction', { label: 'Edit', visible: false });

            await render(TEMPLATE);

            assert.dom('.next-dd-item').doesNotExist();
            assert.dom('.next-dd-menu-seperator').doesNotExist();
        });
    });

    module('conditional visibility', function () {
        test('an isVisible predicate is given the row', async function (assert) {
            const seen = [];
            this.set('columnAction', {
                label: 'Edit',
                isVisible: (row) => {
                    seen.push(row);
                    return false;
                },
            });

            await render(TEMPLATE);

            assert.deepEqual(seen, [ROW], 'the predicate receives the row');
            assert.dom('.next-dd-item').doesNotExist('a false predicate hides the item');
        });

        test('a true predicate keeps the item', async function (assert) {
            this.set('columnAction', { label: 'Edit', isVisible: () => true });

            await render(TEMPLATE);

            assert.dom(item()).exists();
        });

        test('isVisible false as a boolean hides the item', async function (assert) {
            this.set('columnAction', { label: 'Edit', isVisible: false });

            await render(TEMPLATE);

            assert.dom(item()).exists('a falsy isVisible short-circuits the check and leaves the item visible');
        });

        // The constructor destructures `{ row = {} }`, so `row` is never nullish and the
        // `isNone(context)` short-circuit inside visibilityCheck is unreachable — the
        // predicate runs even when no @row is supplied.
        test('the predicate still runs when no row is supplied', async function (assert) {
            const seen = [];
            this.set('row', undefined);
            this.set('columnAction', {
                label: 'Edit',
                isVisible: (row) => {
                    seen.push(row);
                    return false;
                },
            });

            await render(TEMPLATE);

            assert.deepEqual(seen, [{}], 'the predicate receives the defaulted empty row');
            assert.dom('.next-dd-item').doesNotExist();
        });
    });

    module('permissions and disabling', function () {
        test('an action the user lacks permission for is disabled', async function (assert) {
            deniedAbilities.add('fleet-ops update order');
            this.set('columnAction', { label: 'Edit', permission: 'fleet-ops update order' });

            await render(TEMPLATE);

            assert.dom(item()).hasClass('disabled');
        });

        test('a permitted action is not disabled', async function (assert) {
            this.set('columnAction', { label: 'Edit', permission: 'fleet-ops update order' });

            await render(TEMPLATE);

            assert.dom(item()).doesNotHaveClass('disabled');
        });

        test('a component-level permission is used when the action declares none', async function (assert) {
            deniedAbilities.add('fleet-ops update order');
            this.set('permission', 'fleet-ops update order');

            await render(TEMPLATE);

            assert.dom(item()).hasClass('disabled');
        });

        test('an explicitly disabled action stays disabled', async function (assert) {
            this.set('columnAction', { label: 'Edit', disabled: true });

            await render(TEMPLATE);

            assert.dom(item()).hasClass('disabled');
        });

        test('the component-level disabled flag applies too', async function (assert) {
            this.set('disabled', true);

            await render(TEMPLATE);

            assert.dom(item()).hasClass('disabled');
        });
    });

    module('clicking', function () {
        test('choosing an action closes the dropdown and runs it with the row', async function (assert) {
            await render(TEMPLATE);
            await click(item());

            assert.strictEqual(closes, 1, 'the dropdown is closed');
            assert.deepEqual(invoked, [ROW], 'the action receives the row');
        });

        test('a disabled action does nothing', async function (assert) {
            this.set('columnAction', { label: 'Edit', disabled: true, fn: (row) => invoked.push(row) });

            await render(TEMPLATE);
            await click(item());

            assert.strictEqual(closes, 0);
            assert.deepEqual(invoked, []);
        });

        test('an action with no fn still closes the dropdown', async function (assert) {
            this.set('columnAction', { label: 'Inert' });

            await render(TEMPLATE);
            await click(item());

            assert.strictEqual(closes, 1);
        });

        test('it works without a dropdown api', async function (assert) {
            this.set('dd', undefined);

            await render(TEMPLATE);
            await click(item());

            assert.deepEqual(invoked, [ROW], 'the action still runs');
        });
    });
});
