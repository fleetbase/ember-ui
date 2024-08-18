import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | table/cell/dropdown/action-item', function (hooks) {
    setupRenderingTest(hooks);

    test('it renders', async function (assert) {
        // Set any properties with this.set('myProperty', 'value');
        // Handle any actions with this.set('myAction', function(val) { ... });

        await render(hbs`<Table::Cell::Dropdown::ActionItem />`);

        assert.dom().hasText('');

        // Template block usage:
        await render(hbs`
      <Table::Cell::Dropdown::ActionItem>
        template block text
      </Table::Cell::Dropdown::ActionItem>
    `);

        assert.dom().hasText('template block text');
    });
});
