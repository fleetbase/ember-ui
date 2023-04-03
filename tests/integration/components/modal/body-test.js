import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | modal/body', function (hooks) {
    setupRenderingTest(hooks);

    test('it renders', async function (assert) {
        // Set any properties with this.set('myProperty', 'value');
        // Handle any actions with this.set('myAction', function(val) { ... });

        await render(hbs`<Modal::Body />`);

        assert.dom(this.element).hasText('');

        // Template block usage:
        await render(hbs`
      <Modal::Body>
        template block text
      </Modal::Body>
    `);

        assert.dom(this.element).hasText('template block text');
    });
});
