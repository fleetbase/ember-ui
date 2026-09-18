import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, find } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | table/expandable-row/content', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        this.set('row', { id: 'ord_1', name: 'Order 123' });
    });

    test('it renders a full-width row yielding the record', async function (assert) {
        await render(hbs`
            <table><tbody>
                <Table::ExpandableRow::Content @row={{this.row}} @colspan={{3}} as |row|>
                    <span class="name">{{row.name}}</span>
                </Table::ExpandableRow::Content>
            </tbody></table>
        `);

        assert.dom('tr.expanded-row').exists();
        assert.dom('tr.expanded-row .name').hasText('Order 123');
        assert.strictEqual(find('tr.expanded-row td').getAttribute('colspan'), '4', 'the colspan covers the extra expand column');
    });

    test('a missing colspan still renders the row', async function (assert) {
        await render(hbs`<table><tbody><Table::ExpandableRow::Content @row={{this.row}}>body</Table::ExpandableRow::Content></tbody></table>`);

        assert.dom('tr.expanded-row td').hasText('body');
    });
});
