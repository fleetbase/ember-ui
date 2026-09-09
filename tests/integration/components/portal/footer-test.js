import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | portal/footer', function (hooks) {
    setupRenderingTest(hooks);

    test('it renders an identified footer around its block', async function (assert) {
        await render(hbs`<Portal::Footer><span class="inside">footer</span></Portal::Footer>`);

        assert.dom('footer#portal-footer').exists();
        assert.dom('footer#portal-footer').hasClass('portal-footer');
        assert.dom('#portal-footer .inside').hasText('footer');
    });

    test('with no block it renders an empty footer', async function (assert) {
        await render(hbs`<Portal::Footer />`);

        assert.dom('#portal-footer').hasText('');
    });
});
