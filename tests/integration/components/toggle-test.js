import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { click, render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | toggle', function (hooks) {
    setupRenderingTest(hooks);

    test('it renders', async function (assert) {
        // Set any properties with this.set('myProperty', 'value');
        // Handle any actions with this.set('myAction', function(val) { ... });

        await render(hbs`<Toggle />`);

        assert.dom(this.element).hasText('');

        // Template block usage:
        await render(hbs`
      <Toggle>
        template block text
      </Toggle>
    `);

        assert.dom(this.element).hasText('template block text');
    });

    test('it reflects controlled isToggled changes', async function (assert) {
        this.set('enabled', true);

        await render(hbs`<Toggle @isToggled={{this.enabled}} @onToggle={{fn (mut this.enabled)}} />`);

        assert.dom('[role="checkbox"]').hasAttribute('aria-checked', 'true');
        assert.dom('[role="checkbox"] span:first-child').hasClass('bg-green-400');

        this.set('enabled', false);

        assert.dom('[role="checkbox"]').hasAttribute('aria-checked', 'false');
        assert.dom('[role="checkbox"] span:first-child').hasClass('bg-gray-200');

        await click('[role="checkbox"]');

        assert.true(this.enabled);
        assert.dom('[role="checkbox"]').hasAttribute('aria-checked', 'true');
    });
});
