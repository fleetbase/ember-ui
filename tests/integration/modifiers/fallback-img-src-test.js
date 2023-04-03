import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Modifier | fallback-img-src', function (hooks) {
    setupRenderingTest(hooks);

    // Replace this with your real tests.
    test('it renders', async function (assert) {
        await render(hbs`<div {{fallback-img-src}}></div>`);

        assert.ok(true);
    });
});
