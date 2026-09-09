import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

const ROW = 'tbody tr';

module('Integration | Component | table/expandable-row', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        this.set('row', { id: 'ord_1', expanded: false });
    });

    const TEMPLATE = hbs`
        <table><tbody>
            <Table::ExpandableRow @row={{this.row}} @colspan={{3}}><td>cell</td></Table::ExpandableRow>
        </tbody></table>
    `;

    test('it renders collapsed by default', async function (assert) {
        await render(TEMPLATE);

        assert.dom(ROW).hasClass('is-expandable');
        assert.dom(ROW).doesNotHaveClass('is-expanded');
        assert.dom(`${ROW} td`).hasText('cell');
    });

    test('clicking the row expands it and marks the record', async function (assert) {
        await render(TEMPLATE);
        await click(ROW);

        assert.dom(ROW).hasClass('is-expanded');
        assert.dom(ROW).hasClass('is-selected');
        assert.true(this.row.expanded, 'the record is flagged expanded');
    });

    test('clicking again collapses it', async function (assert) {
        await render(TEMPLATE);
        await click(ROW);
        await click(ROW);

        assert.dom(ROW).doesNotHaveClass('is-expanded');
        assert.false(this.row.expanded);
    });
});
