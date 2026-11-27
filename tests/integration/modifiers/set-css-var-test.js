import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, find } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Modifier | set-css-var', function (hooks) {
    setupRenderingTest(hooks);

    test('it sets the custom property, updates it and removes it for null and undefined', async function (assert) {
        this.set('color', '#3b82f6');
        await render(hbs`<div data-test-el {{set-css-var "--fb-module-color" this.color}}></div>`);
        const element = find('[data-test-el]');

        assert.strictEqual(element.style.getPropertyValue('--fb-module-color'), '#3b82f6');

        this.set('color', 'red');
        assert.strictEqual(element.style.getPropertyValue('--fb-module-color'), 'red');

        this.set('color', null);
        assert.strictEqual(element.style.getPropertyValue('--fb-module-color'), '');

        this.set('color', 'blue');
        this.set('color', undefined);
        assert.strictEqual(element.style.getPropertyValue('--fb-module-color'), '');
    });
});
