import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | modals/view-metadata', function (hooks) {
    setupRenderingTest(hooks);

    const TEMPLATE = hbs`<Modals::ViewMetadata @options={{this.options}} @onConfirm={{this.onConfirm}} @onDecline={{this.onDecline}} />`;

    test('it renders the metadata keys and values', async function (assert) {
        this.set('options', { metadata: { driver: 'Alex', attempts: 2 } });

        await render(TEMPLATE);

        assert.dom(this.element).containsText('driver');
        assert.dom(this.element).containsText('Alex');
        assert.dom(this.element).containsText('attempts');
    });

    test('a viewer class from the options is applied', async function (assert) {
        this.set('options', { metadata: { driver: 'Alex' }, viewerClass: 'my-viewer' });

        await render(TEMPLATE);

        assert.dom('.my-viewer').exists();
    });

    test('empty metadata renders the viewer without entries', async function (assert) {
        this.set('options', { metadata: {} });

        await render(TEMPLATE);

        assert.dom(this.element).doesNotContainText('undefined');
    });

    test('it renders with no options at all', async function (assert) {
        await render(hbs`<Modals::ViewMetadata />`);

        assert.dom(this.element).doesNotContainText('undefined');
    });
});
