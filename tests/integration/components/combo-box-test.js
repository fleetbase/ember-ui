import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | combo-box', function (hooks) {
    setupRenderingTest(hooks);

    test('it renders', async function (assert) {
        // Set any properties with this.set('myProperty', 'value');
        // Handle any actions with this.set('myAction', function(val) { ... });

        await render(hbs`<ComboBox />`);

        assert.dom(this.element).hasText('');

        // Template block usage:
        await render(hbs`
      <ComboBox>
        template block text
      </ComboBox>
    `);

        assert.dom(this.element).hasText('template block text');
    });
});
