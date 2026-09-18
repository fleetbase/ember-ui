import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, find } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import Component from '@glimmer/component';
import { hbs as templateOnly } from 'ember-cli-htmlbars';

const CELL = 'table tbody tr td';

module('Integration | Component | table/td', function (hooks) {
    setupRenderingTest(hooks);

    // The component walks up to its owning row, so it must live inside real table markup.
    const TEMPLATE = hbs`
        <table><tbody><tr>
            <Table::Td @column={{this.column}} @row={{this.row}} @value={{this.value}} @width={{this.width}} @sticky={{this.sticky}} />
        </tr></tbody></table>
    `;

    hooks.beforeEach(function () {
        this.set('row', { id: 'row_1', online: true });
        this.set('column', { valuePath: 'name' });
        this.set('value', 'Alex Driver');
    });

    module('rendering the value', function () {
        test('it renders the value in a table cell', async function (assert) {
            await render(TEMPLATE);

            assert.dom(CELL).exists();
            assert.dom(CELL).hasText('Alex Driver');
        });

        test('an empty value renders as a dash', async function (assert) {
            this.set('value', null);

            await render(TEMPLATE);

            assert.dom(CELL).hasText('-');
        });

        test('a humanizing column tidies the value', async function (assert) {
            this.set('column', { valuePath: 'status', humanize: true });
            this.set('value', 'in_transit');

            await render(TEMPLATE);

            assert.dom(CELL).hasText('In Transit');
        });

        test('the column can add classes to the cell', async function (assert) {
            this.set('column', { valuePath: 'name', cellClassNames: 'text-right' });

            await render(TEMPLATE);

            assert.dom(CELL).hasClass('text-right');
        });

        test('a block replaces the default rendering entirely', async function (assert) {
            await render(hbs`
                <table><tbody><tr>
                    <Table::Td @column={{this.column}} @row={{this.row}} @value={{this.value}}>
                        <span class="custom">Custom content</span>
                    </Table::Td>
                </tr></tbody></table>
            `);

            assert.dom('.custom').hasText('Custom content');
            assert.dom(CELL).doesNotContainText('Alex Driver');
        });

        test('a column can nominate its own cell component', async function (assert) {
            this.owner.register(
                'component:test-cell',
                class extends Component {
                    get shouted() {
                        return String(this.args.value).toUpperCase();
                    }
                }
            );
            this.owner.register('template:components/test-cell', templateOnly`<span class="shouted">{{this.shouted}}</span>`);
            this.set('column', { valuePath: 'name', cellComponent: 'test-cell' });

            await render(TEMPLATE);

            assert.dom('.shouted').hasText('ALEX DRIVER');
        });

        test('it forwards splattributes', async function (assert) {
            await render(hbs`
                <table><tbody><tr>
                    <Table::Td @column={{this.column}} @row={{this.row}} @value={{this.value}} data-test-cell="yes" />
                </tr></tbody></table>
            `);

            assert.dom(CELL).hasAttribute('data-test-cell', 'yes');
        });
    });

    module('sizing', function () {
        test('a numeric column width is applied as pixels', async function (assert) {
            this.set('column', { valuePath: 'name', width: 240 });

            await render(TEMPLATE);

            assert.strictEqual(find(CELL).style.width, '240px');
        });

        test('a css column width is applied verbatim', async function (assert) {
            this.set('column', { valuePath: 'name', width: '30%' });

            await render(TEMPLATE);

            assert.strictEqual(find(CELL).style.width, '30%');
        });

        test('an explicit width wins over the column width', async function (assert) {
            this.set('column', { valuePath: 'name', width: 240 });
            this.set('width', 100);

            await render(TEMPLATE);

            assert.strictEqual(find(CELL).style.width, '100px');
        });

        test('a css explicit width is applied verbatim', async function (assert) {
            this.set('width', '12rem');

            await render(TEMPLATE);

            assert.strictEqual(find(CELL).style.width, '12rem');
        });

        test('an unsized cell gets no inline width', async function (assert) {
            await render(TEMPLATE);

            assert.strictEqual(find(CELL).style.width, '');
        });
    });

    module('sticky columns', function () {
        test('an ordinary column is not stuck', async function (assert) {
            await render(TEMPLATE);

            assert.dom(CELL).doesNotHaveClass('is-sticky');
            assert.strictEqual(find(CELL).style.position, '');
        });

        test('a sticky column sticks to the left by default', async function (assert) {
            this.set('column', { valuePath: 'name', sticky: true });

            await render(TEMPLATE);

            const cell = find(CELL);
            assert.dom(cell).hasClass('is-sticky');
            assert.dom(cell).hasClass('sticky-left');
            assert.strictEqual(cell.style.position, 'sticky');
            assert.strictEqual(cell.style.left, '0px');
            assert.strictEqual(cell.style.zIndex, '15', 'body cells sit below header cells');
            assert.dom(cell).hasAttribute('data-column-id', 'name');
        });

        test('a right-sticky column sticks to the right', async function (assert) {
            this.set('column', { valuePath: 'actions', sticky: 'right' });

            await render(TEMPLATE);

            const cell = find(CELL);
            assert.dom(cell).hasClass('sticky-right');
            assert.strictEqual(cell.style.right, '0px');
        });

        test('a computed offset, position and z-index are honoured', async function (assert) {
            this.set('column', { valuePath: 'name', sticky: true, _stickyPosition: 'left', _stickyOffset: 48, _stickyZIndex: 30 });

            await render(TEMPLATE);

            const cell = find(CELL);
            assert.strictEqual(cell.style.left, '48px');
            assert.strictEqual(cell.style.zIndex, '30');
        });

        test('a sticky checkbox cell with no column sticks first on the left', async function (assert) {
            this.set('column', undefined);
            this.set('sticky', true);

            await render(TEMPLATE);

            const cell = find(CELL);
            assert.dom(cell).hasClass('is-sticky');
            assert.dom(cell).hasClass('sticky-left');
            assert.strictEqual(cell.style.left, '0px');
            assert.dom(cell).doesNotHaveAttribute('data-column-id', 'there is no column to identify');
        });

        test('a sticky column with no value path is not identified', async function (assert) {
            this.set('column', { sticky: true });

            await render(TEMPLATE);

            assert.dom(CELL).hasClass('is-sticky');
            assert.dom(CELL).doesNotHaveAttribute('data-column-id');
        });
    });
});
