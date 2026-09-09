import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, findAll, find } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import Service from '@ember/service';

const ROW = { id: 'row_1', name: 'Order 123' };

// The component walks up to its owning <td> to manage overflow and z-index, so it has to
// be rendered inside a real table cell.
const IN_CELL = hbs`
    <table><tbody><tr>
        <td class="owner-cell">
            <Table::Cell::Dropdown @column={{this.column}} @row={{this.row}} />
        </td>
    </tr></tbody></table>
`;

function cell() {
    return find('.owner-cell');
}

function trigger() {
    return find('.ember-basic-dropdown-trigger');
}

module('Integration | Component | table/cell/dropdown', function (hooks) {
    setupRenderingTest(hooks);

    let invoked;

    hooks.beforeEach(function () {
        invoked = [];

        this.owner.unregister('service:abilities');
        this.owner.register(
            'service:abilities',
            class extends Service {
                cannot() {
                    return false;
                }
                can() {
                    return true;
                }
            }
        );

        this.set('row', ROW);
        this.set('column', { actions: [{ label: 'Edit', fn: (row) => invoked.push(row) }] });
    });

    module('rendering', function () {
        test('it renders a dropdown button labelled Actions by default', async function (assert) {
            await render(IN_CELL);

            assert.dom('.cell-dropdown-button').exists();
            assert.dom(trigger()).containsText('Actions');
        });

        test('with no column at all it still labels itself', async function (assert) {
            this.set('column', undefined);

            await render(IN_CELL);

            assert.dom(trigger()).containsText('Actions', 'the default label survives a missing column');
        });

        test('the button text can be overridden', async function (assert) {
            this.set('column', { ddButtonText: 'More', actions: [] });

            await render(IN_CELL);

            assert.dom(trigger()).containsText('More');
        });

        test('button text false renders an icon-only trigger', async function (assert) {
            this.set('column', { ddButtonText: false, ddButtonIcon: 'ellipsis', actions: [] });

            await render(IN_CELL);

            assert.dom(trigger()).doesNotContainText('Actions');
        });

        test('a wrapper class from the column is applied', async function (assert) {
            this.set('column', { wrapperClass: 'my-wrapper', actions: [] });

            await render(IN_CELL);

            assert.dom('.cell-dropdown-button').hasClass('my-wrapper');
        });

        test('it makes the owning table cell overflow visible', async function (assert) {
            await render(IN_CELL);

            assert.dom(cell()).hasStyle({ overflow: 'visible' }, 'so the menu is not clipped by the cell');
        });

        test('outside a table cell it still renders', async function (assert) {
            await render(hbs`<Table::Cell::Dropdown @column={{this.column}} @row={{this.row}} />`);

            assert.dom('.cell-dropdown-button').exists();
        });

        test('outside a table cell, opening and closing has no cell to restack', async function (assert) {
            // onOpen/onClose bump the owning cell's z-index; with no owning cell both must
            // return early rather than throw. Rendering alone does not reach them — the
            // dropdown has to actually open.
            await render(hbs`<Table::Cell::Dropdown @column={{this.column}} @row={{this.row}} />`);

            await click(trigger());
            assert.dom('.next-dd-menu').exists('the menu opens with no owning cell');

            await click(trigger());
            assert.dom('.next-dd-menu').doesNotExist('and closes again');
        });
    });

    module('the menu', function () {
        test('it renders an item per column action', async function (assert) {
            this.set('column', {
                actions: [
                    { label: 'Edit', fn: () => {} },
                    { label: 'Delete', fn: () => {} },
                ],
            });

            await render(IN_CELL);
            await click(trigger());

            assert.deepEqual(
                findAll('.next-dd-item').map((item) => item.textContent.trim()),
                ['Edit', 'Delete']
            );
        });

        test('a menu label and its separator are rendered when configured', async function (assert) {
            this.set('column', { ddMenuLabel: 'Row actions', ddMenuLabelClass: 'my-label', actions: [{ label: 'Edit', fn: () => {} }] });

            await render(IN_CELL);
            await click(trigger());

            assert.dom('.next-dd-menu-label').hasText('Row actions');
            assert.dom('.next-dd-menu-label').hasClass('my-label');
            assert.dom('.next-dd-menu-seperator').exists();
        });

        test('no label means no label container', async function (assert) {
            await render(IN_CELL);
            await click(trigger());

            assert.dom('.next-dd-menu-label').doesNotExist();
        });

        test('choosing an action runs it with the row', async function (assert) {
            await render(IN_CELL);
            await click(trigger());
            await click('.next-dd-item');

            assert.deepEqual(invoked, [ROW]);
        });

        test('a column with no actions renders an empty menu', async function (assert) {
            this.set('column', {});

            await render(IN_CELL);
            await click(trigger());

            assert.strictEqual(findAll('.next-dd-item').length, 0);
        });
    });

    module('positioning', function () {
        test('a custom calculatePosition on the column is used', async function (assert) {
            const calls = [];
            this.set('column', {
                actions: [{ label: 'Edit', fn: () => {} }],
                calculatePosition(trigger, content) {
                    calls.push({ trigger, content });
                    return { style: { left: 10, top: 20 } };
                },
            });

            await render(IN_CELL);
            await click(trigger());

            assert.strictEqual(calls.length, 1, 'the column calculator is consulted');
            assert.ok(calls[0].trigger, 'it receives the trigger element');
            assert.dom('.ember-basic-dropdown-content').hasStyle({ left: '10px', top: '20px' }, 'and its result positions the menu');
        });

        test('without a custom calculator the menu is placed to the left of the trigger', async function (assert) {
            await render(IN_CELL);
            await click(trigger());

            const content = find('.ember-basic-dropdown-content');
            assert.dom(content).hasStyle({ position: 'fixed' });
            assert.strictEqual(content.style.marginTop, '0px');

            const triggerRect = trigger().getBoundingClientRect();
            const contentWidth = content.getBoundingClientRect().width || 224;
            assert.strictEqual(content.style.left, `${triggerRect.left - contentWidth - 3}px`, 'the menu is offset to the left of the trigger');
            assert.strictEqual(content.style.top, `${triggerRect.top}px`);
        });
    });

    module('render in place', function () {
        test('the menu renders inside the cell by default', async function (assert) {
            await render(IN_CELL);
            await click(trigger());

            assert.ok(cell().querySelector('.ember-basic-dropdown-content'), 'the menu stays within the table cell');
        });

        test('renderInPlace false moves the menu out of the cell', async function (assert) {
            this.set('column', { renderInPlace: false, actions: [{ label: 'Edit', fn: () => {} }] });

            await render(IN_CELL);
            await click(trigger());

            assert.notOk(cell().querySelector('.ember-basic-dropdown-content'), 'the menu is rendered elsewhere');
            assert.ok(find('.ember-basic-dropdown-content'), 'but it is still rendered');
        });
    });

    module('stacking', function () {
        test('opening raises the cell above its neighbours and closing restores it', async function (assert) {
            await render(IN_CELL);
            const before = cell().style.zIndex;

            await click(trigger());
            assert.strictEqual(cell().style.zIndex, '1', 'the cell is raised while the menu is open');

            await click(trigger());

            // Normalised outside the assertion: an unset z-index reads back as ''.
            const restored = before || '0';
            assert.strictEqual(cell().style.zIndex, restored, 'and lowered again on close');
        });
    });
});
