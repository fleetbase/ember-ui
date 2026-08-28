import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | layout/section/container', function (hooks) {
    setupRenderingTest(hooks);

    test('it wraps its block in the section container', async function (assert) {
        await render(hbs`<Layout::Section::Container><span class="inside">held</span></Layout::Section::Container>`);

        assert.dom('.next-view-section-container .inside').hasText('held');
    });

    test('it forwards splattributes', async function (assert) {
        await render(hbs`<Layout::Section::Container class="flex" data-test-container="yes" />`);

        assert.dom('.next-view-section-container').hasClass('flex');
        assert.dom('.next-view-section-container').hasAttribute('data-test-container', 'yes');
    });
});
