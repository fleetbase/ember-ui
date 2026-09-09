import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | overlay/footer', function (hooks) {
    setupRenderingTest(hooks);

    test('it renders its block with no wrapper of its own', async function (assert) {
        await render(hbs`<div class="host"><Overlay::Footer><button type="button" class="save">Save</button></Overlay::Footer></div>`);

        assert.dom('.host > button.save').hasText('Save', 'the block is rendered directly into the caller');
    });

    test('with no block it renders nothing', async function (assert) {
        await render(hbs`<div class="host"><Overlay::Footer /></div>`);

        assert.dom('.host').hasText('');
    });
});
