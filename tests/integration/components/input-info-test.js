import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

const INFO = '.ui-input-info';

module('Integration | Component | input-info', function (hooks) {
    setupRenderingTest(hooks);

    test('it renders the text beside a default info icon', async function (assert) {
        await render(hbs`<InputInfo @text="Enter a tracking number." />`);

        assert.dom(INFO).containsText('Enter a tracking number.');
        assert.dom(`${INFO} svg`).hasClass('fa-circle-info');
        assert.dom(INFO).hasClass('bg-opacity-100', 'full opacity is the default');
    });

    test('the icon can be replaced or hidden', async function (assert) {
        await render(hbs`<InputInfo @icon="triangle-exclamation" @text="Careful" />`);
        assert.dom(`${INFO} svg`).hasClass('fa-triangle-exclamation');

        await render(hbs`<InputInfo @hideIcon={{true}} @text="Careful" />`);
        assert.dom(`${INFO} svg`).doesNotExist();
    });

    test('example text is rendered as preformatted text', async function (assert) {
        await render(hbs`<InputInfo @text="Format" @exampleText="ABC-123" />`);

        assert.dom(`${INFO} pre`).hasText('ABC-123');
    });

    test('no example text renders no preformatted block', async function (assert) {
        await render(hbs`<InputInfo @text="Format" />`);

        assert.dom(`${INFO} pre`).doesNotExist();
    });

    test('a block replaces the text and example', async function (assert) {
        await render(hbs`<InputInfo @text="ignored" @exampleText="ignored"><b class="custom">Custom</b></InputInfo>`);

        assert.dom(`${INFO} .custom`).hasText('Custom');
        assert.dom(INFO).doesNotContainText('ignored');
        assert.dom(`${INFO} pre`).doesNotExist();
    });

    test('opacity, class hooks and splattributes are applied', async function (assert) {
        await render(hbs`<InputInfo @text="Text" @opacity={{50}} @iconClass="my-icon" @spanClass="my-span" @yieldClass="my-yield" data-test-info="yes" />`);

        assert.dom(INFO).hasClass('bg-opacity-50');
        assert.dom(INFO).hasAttribute('data-test-info', 'yes');
        assert.dom(`${INFO} svg`).hasClass('my-icon');
        assert.dom(`${INFO} > div`).hasClass('my-span');
        assert.dom(`${INFO} > div`).hasClass('my-yield');
    });
});
