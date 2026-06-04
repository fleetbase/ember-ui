import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Helper | format-duration', function (hooks) {
    setupRenderingTest(hooks);

    test('it renders', async function (assert) {
        this.set('inputValue', '1234');

        await render(hbs`{{format-duration this.inputValue}}`);

        assert.dom(this.element).hasText('20m 34s');
    });
});
