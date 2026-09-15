import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, settled, waitUntil } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

function attacher() {
    return document.querySelector('.ember-attacher');
}

function content() {
    return document.querySelector('.ember-attacher > div');
}

async function waitForShown() {
    await waitUntil(() => attacher()?.getAttribute('aria-hidden') === 'false', { timeout: 2000 });
    await settled();
}

module('Integration | Component | attach/popover', function (hooks) {
    setupRenderingTest(hooks);

    test('it renders its block once shown', async function (assert) {
        await render(hbs`<button type="button" id="target">Target <Attach::Popover @isShown={{true}}>popover text</Attach::Popover></button>`);
        await waitForShown();

        assert.dom(attacher()).includesText('popover text');
    });

    test('it applies @class to the floating element', async function (assert) {
        await render(hbs`<button type="button" id="target">Target <Attach::Popover @class="resource-hover-card" @classNames="inner-class" @isShown={{true}}>x</Attach::Popover></button>`);
        await waitForShown();

        assert.dom(attacher()).hasClass('ember-attacher');
        assert.dom(attacher()).hasClass('resource-hover-card');
        assert.dom(content()).hasClass('inner-class');
        assert.dom(content()).doesNotHaveClass('resource-hover-card');
    });
});
