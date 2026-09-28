import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | layout/main', function (hooks) {
    setupRenderingTest(hooks);

    test('it renders a main landmark around its block', async function (assert) {
        await render(hbs`<Layout::Main><span class="inside">view</span></Layout::Main>`);

        assert.dom('main.next-view-container').exists('the view container is a <main> landmark');
        assert.dom('main.next-view-container .inside').hasText('view');
    });

    test('it forwards splattributes', async function (assert) {
        await render(hbs`<Layout::Main class="overflow-hidden" data-test-main="yes" />`);

        assert.dom('main.next-view-container').hasClass('overflow-hidden');
        assert.dom('main.next-view-container').hasAttribute('data-test-main', 'yes');
    });
});
