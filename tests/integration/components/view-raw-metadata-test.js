import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | view-raw-metadata', function (hooks) {
    setupRenderingTest(hooks);

    test('it renders its block with no wrapper of its own', async function (assert) {
        await render(hbs`<div class="host"><ViewRawMetadata><span class="inside">raw</span></ViewRawMetadata></div>`);

        assert.dom('.host > .inside').hasText('raw', 'the block lands directly in the caller');
    });

    test('with no block it renders nothing', async function (assert) {
        await render(hbs`<div class="host"><ViewRawMetadata /></div>`);

        assert.dom('.host').hasText('');
    });
});
