import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, fillIn, findAll } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | modals/tip-tap-editor-insert-youtube', function (hooks) {
    setupRenderingTest(hooks);

    const TEMPLATE = hbs`<Modals::TipTapEditorInsertYoutube @options={{this.options}} @onConfirm={{this.onConfirm}} @onDecline={{this.onDecline}} />`;

    test('it asks for a url and the embed dimensions', async function (assert) {
        this.set('options', { url: 'https://youtu.be/abc', height: 320, width: 480 });

        await render(TEMPLATE);

        const inputs = findAll('input');
        assert.strictEqual(inputs.length, 3);
        assert.dom(inputs[0]).hasValue('https://youtu.be/abc');
        assert.dom(inputs[1]).hasValue('320');
        assert.dom(inputs[2]).hasValue('480');
        assert.dom(this.element).containsText('Youtube Video URL');
        assert.dom(this.element).containsText('Height');
        assert.dom(this.element).containsText('Width');
    });

    test('each field explains itself', async function (assert) {
        this.set('options', {});

        await render(TEMPLATE);

        assert.dom(this.element).containsText('The URL to the Youtube video you want to insert');
        assert.dom(this.element).containsText('The Height of the Youtube video');
        assert.dom(this.element).containsText('The Width of the Youtube video');
    });

    test('editing writes the values back to the options', async function (assert) {
        const options = { url: '', height: 320, width: 480 };
        this.set('options', options);

        await render(TEMPLATE);
        const inputs = findAll('input');
        await fillIn(inputs[0], 'https://youtu.be/xyz');
        await fillIn(inputs[1], '180');

        assert.strictEqual(options.url, 'https://youtu.be/xyz');
        assert.strictEqual(options.height, '180');
    });

    test('it renders with no options at all', async function (assert) {
        await render(hbs`<Modals::TipTapEditorInsertYoutube />`);

        assert.strictEqual(findAll('input').length, 3);
    });
});
