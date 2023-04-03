import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Modifier | set-width', function (hooks) {
    setupRenderingTest(hooks);

    // Replace this with your real tests.
    test('it renders', async function (assert) {
        await render(hbs`<div {{set-width}}></div>`);

        assert.ok(true);
    });
});
