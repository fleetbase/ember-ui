import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | modals/extension-details', function (hooks) {
    setupRenderingTest(hooks);

    test('it renders the modal frame with the supplied title', async function (assert) {
        this.set('options', { title: 'Fleet Ops' });

        await render(hbs`<Modals::ExtensionDetails @options={{this.options}} @onConfirm={{this.onConfirm}} @onDecline={{this.onDecline}} />`);

        assert.dom(this.element).containsText('Fleet Ops');
    });

    test('it renders with no options at all', async function (assert) {
        await render(hbs`<Modals::ExtensionDetails />`);

        assert.dom(this.element).doesNotContainText('undefined', 'nothing broken is shown');
    });
});
