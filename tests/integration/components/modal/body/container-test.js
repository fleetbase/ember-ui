import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | modal/body/container', function (hooks) {
    setupRenderingTest(hooks);

    test('it wraps its block in the modal body container', async function (assert) {
        await render(hbs`<Modal::Body::Container><span class="inside">held</span></Modal::Body::Container>`);

        assert.dom('.modal--body-container .inside').hasText('held');
    });

    test('with no block it renders an empty container', async function (assert) {
        await render(hbs`<Modal::Body::Container />`);

        assert.dom('.modal--body-container').exists();
        assert.dom('.modal--body-container').hasText('');
    });
});
