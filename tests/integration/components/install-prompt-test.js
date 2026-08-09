import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | install-prompt', function (hooks) {
    setupRenderingTest(hooks);

    test('it renders its block with no wrapper of its own', async function (assert) {
        await render(hbs`<div class="host"><InstallPrompt><button type="button" class="install">Install</button></InstallPrompt></div>`);

        assert.dom('.host > button.install').hasText('Install');
    });

    test('with no block it renders nothing', async function (assert) {
        await render(hbs`<div class="host"><InstallPrompt /></div>`);

        assert.dom('.host').hasText('');
    });
});
