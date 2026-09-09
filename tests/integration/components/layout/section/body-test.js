import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | layout/section/body', function (hooks) {
    setupRenderingTest(hooks);

    test('it renders its block unpadded by default', async function (assert) {
        await render(hbs`<Layout::Section::Body><span class="inside">body</span></Layout::Section::Body>`);

        assert.dom('.next-view-section-body .inside').hasText('body');
        assert.dom('.next-view-section-body').doesNotHaveClass('py-4');
    });

    test('padding can be opted into', async function (assert) {
        await render(hbs`<Layout::Section::Body @padded={{true}} />`);

        assert.dom('.next-view-section-body').hasClass('py-4');
        assert.dom('.next-view-section-body').hasClass('px-4');
    });

    test('it forwards splattributes', async function (assert) {
        await render(hbs`<Layout::Section::Body class="overflow-y-scroll" data-test-body="yes" />`);

        assert.dom('.next-view-section-body').hasClass('overflow-y-scroll');
        assert.dom('.next-view-section-body').hasAttribute('data-test-body', 'yes');
    });
});
