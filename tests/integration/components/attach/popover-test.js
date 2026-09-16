import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, triggerEvent, triggerKeyEvent, settled, waitUntil } from '@ember/test-helpers';
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

async function waitForHidden() {
    await waitUntil(() => attacher()?.getAttribute('aria-hidden') === 'true', { timeout: 2000 });
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

    test('an interactive popover opened by hover accepts pointer events and can be entered', async function (assert) {
        await render(hbs`
            <button type="button" id="target">Target
                <Attach::Popover @interactive={{true}} @hideDelay={{0}} @hideDuration={{0}} @showDuration={{0}}>
                    <span id="inside">inside</span>
                </Attach::Popover>
            </button>
        `);

        assert.notOk(attacher()?.getAttribute('aria-hidden') === 'false', 'hidden before hover');

        await triggerEvent('#target', 'mouseenter');
        await waitForShown();

        assert.strictEqual(getComputedStyle(content()).pointerEvents, 'auto', 'the content accepts pointer events while shown');
        assert.strictEqual(attacher().style.pointerEvents, 'auto', 'the floating element accepts pointer events while shown');

        // Leave the target and move onto the popover: it must stay open.
        await triggerEvent('#target', 'mouseleave');
        await triggerEvent('#inside', 'mousemove');
        assert.strictEqual(attacher().getAttribute('aria-hidden'), 'false', 'still shown while the pointer is over the popover');

        // Move away from both: it hides, and pointer events go back to none.
        await triggerEvent(document.body, 'mousemove');
        await waitForHidden();
        assert.strictEqual(getComputedStyle(content()).pointerEvents, 'none', 'transparent to the pointer once hidden');
        assert.strictEqual(attacher().style.pointerEvents, 'none');
    });

    test('a non-interactive popover stays transparent to the pointer while shown', async function (assert) {
        await render(hbs`<button type="button" id="target">Target <Attach::Popover @isShown={{true}} @showDuration={{0}}>x</Attach::Popover></button>`);
        await waitForShown();

        assert.strictEqual(getComputedStyle(content()).pointerEvents, 'none');
        assert.strictEqual(attacher().style.pointerEvents, 'none');
    });

    test('it hides on escape and follows later changes to @isShown', async function (assert) {
        this.set('shown', false);
        await render(
            hbs`<button type="button" id="target">Target <Attach::Popover @isShown={{this.shown}} @lazyRender={{true}} @showDuration={{0}} @hideDuration={{0}}>x</Attach::Popover></button>`
        );

        assert.notOk(attacher(), 'lazy popover renders nothing until it is shown');

        this.set('shown', true);
        await waitForShown();
        assert.strictEqual(attacher().getAttribute('aria-hidden'), 'false', 'shown after @isShown becomes true');

        this.set('shown', false);
        await waitForHidden();
        assert.strictEqual(attacher().getAttribute('aria-hidden'), 'true', 'hidden after @isShown becomes false');

        this.set('shown', true);
        await waitForShown();
        await triggerKeyEvent(document, 'keydown', 'Escape');
        await waitForHidden();
        assert.strictEqual(attacher().getAttribute('aria-hidden'), 'true', 'hidden after escape');
    });

    test('setting @isShown to false before anything rendered is a no-op', async function (assert) {
        this.set('shown', undefined);
        await render(hbs`<button type="button" id="target">Target <Attach::Popover @isShown={{this.shown}} @lazyRender={{true}}>x</Attach::Popover></button>`);

        this.set('shown', false);
        await settled();

        assert.notOk(attacher(), 'nothing rendered and nothing thrown');
    });
});
