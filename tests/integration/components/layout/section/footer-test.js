import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, find } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | layout/section/footer', function (hooks) {
    setupRenderingTest(hooks);

    test('it renders its block', async function (assert) {
        await render(hbs`<Layout::Section::Footer><span class="inside">footer</span></Layout::Section::Footer>`);

        assert.dom('.next-view-section-footer .inside').hasText('footer');
    });

    test('a vertical offset is applied to the bottom edge', async function (assert) {
        await render(hbs`<Layout::Section::Footer @verticalOffset={{48}} />`);

        assert.strictEqual(find('.next-view-section-footer').style.bottom, '48px');
    });

    test('a footer component can be rendered alongside the block', async function (assert) {
        await render(hbs`<Layout::Section::Footer @footerComponent="spinner"><span class="inside">and yield</span></Layout::Section::Footer>`);

        assert.dom('.next-view-section-footer .fleetbase-loader').exists('the named component renders');
        assert.dom('.next-view-section-footer .inside').hasText('and yield');
    });

    test('it forwards splattributes', async function (assert) {
        await render(hbs`<Layout::Section::Footer class="sticky" data-test-footer="yes" />`);

        assert.dom('.next-view-section-footer').hasClass('sticky');
        assert.dom('.next-view-section-footer').hasAttribute('data-test-footer', 'yes');
    });
});
