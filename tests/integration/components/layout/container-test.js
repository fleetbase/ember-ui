import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | layout/container', function (hooks) {
    setupRenderingTest(hooks);

    test('it wraps its block in the app container', async function (assert) {
        await render(hbs`<Layout::Container><span class="inside">app</span></Layout::Container>`);

        assert.dom('.fleetbase-next-container .inside').hasText('app');
    });

    test('it forwards splattributes', async function (assert) {
        await render(hbs`<Layout::Container class="h-full" data-test-container="yes" />`);

        assert.dom('.fleetbase-next-container').hasClass('h-full');
        assert.dom('.fleetbase-next-container').hasAttribute('data-test-container', 'yes');
    });
});
