import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

const ROW = 'tbody tr';

module('Integration | Component | table/row', function (hooks) {
    setupRenderingTest(hooks);

    let rowClicks;
    let clicks;

    hooks.beforeEach(function () {
        rowClicks = [];
        clicks = [];
        this.set('row', { id: 'row_1', name: 'Alex Driver' });
        this.set('onRowClick', (row) => rowClicks.push(row));
        this.set('onClick', (event, row) => clicks.push({ event, row }));
    });

    const TEMPLATE = hbs`
        <table><tbody>
            <Table::Row @row={{this.row}} @onRowClick={{this.onRowClick}} @onClick={{this.onClick}} data-test-row="yes">
                <td>cell</td>
            </Table::Row>
        </tbody></table>
    `;

    test('it renders a table row yielding its cells', async function (assert) {
        await render(TEMPLATE);

        assert.dom(ROW).exists();
        assert.dom(`${ROW} td`).hasText('cell');
        assert.dom(ROW).hasAttribute('data-test-row', 'yes', 'splattributes are forwarded');
    });

    test('clicking the row reports it through both handlers', async function (assert) {
        await render(TEMPLATE);
        await click(ROW);

        assert.deepEqual(rowClicks, [this.row], 'onRowClick receives the record');
        assert.strictEqual(clicks.length, 1, 'onClick receives the event and the record');
        assert.strictEqual(clicks[0].row, this.row);
        assert.strictEqual(clicks[0].event.row, this.row, 'the record is also attached to the event');
    });

    test('it clicks happily with only one handler', async function (assert) {
        await render(hbs`
            <table><tbody>
                <Table::Row @row={{this.row}} @onRowClick={{this.onRowClick}}><td>cell</td></Table::Row>
            </tbody></table>
        `);
        await click(ROW);

        assert.deepEqual(rowClicks, [this.row]);
        assert.deepEqual(clicks, []);
    });

    test('it clicks happily with no handlers at all', async function (assert) {
        await render(hbs`
            <table><tbody>
                <Table::Row @row={{this.row}}><td>cell</td></Table::Row>
            </tbody></table>
        `);
        await click(ROW);

        assert.dom(ROW).exists('the row survives');
    });
});
