import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | table/cell/link-list', function (hooks) {
    setupRenderingTest(hooks);

    test('it renders', async function (assert) {
        // Set any properties with this.set('myProperty', 'value');
        // Handle any actions with this.set('myAction', function(val) { ... });

        await render(hbs`<Table::Cell::LinkList />`);

        assert.dom(this.element).hasText('');

        // Template block usage:
        await render(hbs`
      <Table::Cell::LinkList>
        template block text
      </Table::Cell::LinkList>
    `);

        assert.dom(this.element).hasText('template block text');
    });
});
