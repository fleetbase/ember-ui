import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | modals/install-prompt', function (hooks) {
    setupRenderingTest(hooks);

    const TEMPLATE = hbs`<Modals::InstallPrompt @options={{this.options}} @onConfirm={{this.onConfirm}} @onDecline={{this.onDecline}} />`;

    test('it names the extension being installed and warns about access', async function (assert) {
        this.set('options', { extensionName: 'Fleet Ops' });

        await render(TEMPLATE);

        assert.dom(this.element).containsText('You are attempting to install the extension "Fleet Ops"');
        assert.dom(this.element).containsText('Some extensions require access to your resources.');
    });

    test('no progress bar is shown before the install starts', async function (assert) {
        this.set('options', { extensionName: 'Fleet Ops' });

        await render(TEMPLATE);

        assert.dom('.modal-body-container progress, .modal-body-container [role="progressbar"]').doesNotExist();
    });

    test('a progress bar appears while installing', async function (assert) {
        this.set('options', { extensionName: 'Fleet Ops', isInstalling: true, installProgress: 40 });

        await render(TEMPLATE);

        assert.true(this.element.querySelectorAll('.modal-body-container > div').length > 1, 'a progress row is added below the prompt');
    });

    test('it renders without an extension name', async function (assert) {
        this.set('options', {});

        await render(TEMPLATE);

        assert.dom(this.element).containsText('You are attempting to install the extension');
        assert.dom(this.element).doesNotContainText('undefined');
    });
});
