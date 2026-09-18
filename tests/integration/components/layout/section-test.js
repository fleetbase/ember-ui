import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | layout/section', function (hooks) {
    setupRenderingTest(hooks);

    test('it renders a section around its block', async function (assert) {
        await render(hbs`<Layout::Section><span class="inside">body</span></Layout::Section>`);

        assert.dom('section.next-view-section .inside').hasText('body');
    });

    test('it forwards splattributes', async function (assert) {
        await render(hbs`<Layout::Section class="flex-1" data-test-section="yes" />`);

        assert.dom('section.next-view-section').hasClass('flex-1');
        assert.dom('section.next-view-section').hasAttribute('data-test-section', 'yes');
    });
});
