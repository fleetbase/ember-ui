import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | modals/loading', function (hooks) {
    setupRenderingTest(hooks);

    const TEMPLATE = hbs`<Modals::Loading @options={{this.options}} @onConfirm={{this.onConfirm}} @onDecline={{this.onDecline}} />`;

    test('it renders a centred spinner', async function (assert) {
        this.set('options', {});

        await render(TEMPLATE);

        assert.dom('.modal-body-container').exists();
        assert.dom('.modal-body-container .fleetbase-loader').exists('a spinner is shown');
    });

    test('a loading message from the options is displayed', async function (assert) {
        this.set('options', { loadingMessage: 'Importing your orders' });

        await render(TEMPLATE);

        assert.dom(this.element).containsText('Importing your orders');
    });

    test('it renders without a loading message', async function (assert) {
        this.set('options', {});

        await render(TEMPLATE);

        assert.dom(this.element).doesNotContainText('undefined');
    });
});
