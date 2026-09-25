import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | table/column-group', function (hooks) {
    setupRenderingTest(hooks);

    test('it renders only its block', async function (assert) {
        await render(hbs`
            <Table::ColumnGroup>
                <Table::Column><span class="a">A</span></Table::Column>
                <Table::Column><span class="b">B</span></Table::Column>
            </Table::ColumnGroup>
        `);

        assert.dom('.a').hasText('A');
        assert.dom('.b').hasText('B');
    });

    test('with no block it renders nothing', async function (assert) {
        await render(hbs`<div class="host"><Table::ColumnGroup /></div>`);

        assert.dom('.host').hasText('');
    });
});
