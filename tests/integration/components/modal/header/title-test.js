import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | modal/header/title', function (hooks) {
    setupRenderingTest(hooks);

    test('it renders its block as a heading', async function (assert) {
        await render(hbs`<Modal::Header::Title>Delete order</Modal::Header::Title>`);

        assert.dom('h5.flb--modal-title').hasText('Delete order');
    });

    test('it forwards splattributes, including an id the dialog can label itself with', async function (assert) {
        await render(hbs`<Modal::Header::Title id="my-title" class="truncate">Title</Modal::Header::Title>`);

        assert.dom('.flb--modal-title').hasAttribute('id', 'my-title');
        assert.dom('.flb--modal-title').hasClass('truncate');
    });
});
