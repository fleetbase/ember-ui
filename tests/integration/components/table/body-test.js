import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | table/body', function (hooks) {
    setupRenderingTest(hooks);

    test('it renders', async function (assert) {
        // Set any properties with this.set('myProperty', 'value');
        // Handle any actions with this.set('myAction', function(val) { ... });

        await render(hbs`<Table::Body />`);

        assert.dom(this.element).hasText('');

        // Template block usage:
        await render(hbs`
      <Table::Body>
        template block text
      </Table::Body>
    `);

        assert.dom(this.element).hasText('template block text');
    });
});
