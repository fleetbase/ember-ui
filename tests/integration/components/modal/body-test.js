import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | modal/body', function (hooks) {
    setupRenderingTest(hooks);

    test('it wraps its block in the modal body', async function (assert) {
        await render(hbs`<Modal::Body><p class="inside">Are you sure?</p></Modal::Body>`);

        assert.dom('.flb--modal-body .inside').hasText('Are you sure?');
    });

    test('it forwards splattributes', async function (assert) {
        await render(hbs`<Modal::Body class="p-0" data-test-body="yes" />`);

        assert.dom('.flb--modal-body').hasClass('p-0');
        assert.dom('.flb--modal-body').hasAttribute('data-test-body', 'yes');
    });
});
