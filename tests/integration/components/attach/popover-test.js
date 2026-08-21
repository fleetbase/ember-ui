import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, triggerEvent, triggerKeyEvent, waitUntil } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

/** The floating element the popover renders and controls. */
function attacher() {
    return document.querySelector('#ember-testing .ember-attacher');
}

/** The inner element carrying the animation/arrow classes and computed style. */
function attachment() {
    return attacher()?.querySelector(':scope > div');
}

function isShown() {
    return attacher()?.getAttribute('aria-hidden') === 'false';
}

function isHidden() {
    return attacher()?.getAttribute('aria-hidden') === 'true';
}

module('Integration | Component | attach/popover', function (hooks) {
    setupRenderingTest(hooks);

    test('it renders the attachment for its parent target with the default options', async function (assert) {
        await render(hbs`
            <div class="popover-target">
                Hover me
                <Attach::Popover @renderInPlace={{true}}>Popover body</Attach::Popover>
            </div>
        `);

        assert.dom('.popover-target .ember-attacher').exists({ count: 1 }, 'the attachment renders eagerly next to its target');
        assert.dom('.popover-target .ember-attacher').hasAttribute('x-placement', 'top', 'the default placement is top');
        assert.dom('.popover-target .ember-attacher').hasAttribute('id', /-floating-ui$/, 'the attachment gets a generated floating id');
        assert.dom(attachment()).hasClass('ember-attacher-fill', 'the default animation is fill');
        assert.dom(attachment()).hasClass('ember-attacher-hide', 'the attachment starts in the hidden animation state');
        assert.dom(attachment()).hasClass('ember-attacher-without-arrow', 'no arrow by default');
        assert.dom(attachment()).hasText('Popover body', 'the block content is yielded into the attachment');
        assert.dom(attachment()).hasAttribute('style', /pointer-events: none/, 'a hidden attachment does not capture pointer events');
        assert.dom('.ember-attacher [x-circle]').exists('the fill animation renders its circle element');
        assert.dom('.ember-attacher [x-arrow]').doesNotExist();
    });

    test('it honors the animation, arrow and placement arguments', async function (assert) {
        await render(hbs`
            <div class="popover-target">
                Hover me
                <Attach::Popover @renderInPlace={{true}} @animation="scale" @arrow={{true}} @placement="bottom" @ariaRole="tooltip" @classNames="extra-class">content</Attach::Popover>
            </div>
        `);

        assert.dom('.ember-attacher').hasAttribute('x-placement', 'bottom');
        assert.dom('.ember-attacher').hasAttribute('role', 'tooltip', '@ariaRole is applied to the floating element');
        assert.dom(attachment()).hasClass('ember-attacher-scale');
        assert.dom(attachment()).hasClass('ember-attacher-with-arrow');
        assert.dom(attachment()).hasClass('extra-class', '@classNames is appended to the attachment');
        assert.dom('.ember-attacher [x-arrow]').exists('the arrow element renders when @arrow is true');
        assert.dom('.ember-attacher [x-circle]').doesNotExist('the fill circle is only rendered for the fill animation');
    });

    test('it shows on mouseenter and hides on mouseleave of the target', async function (assert) {
        const changes = [];
        this.set('onChange', (visible) => changes.push(visible));

        await render(hbs`
            <div class="popover-target">
                Hover me
                <Attach::Popover @renderInPlace={{true}} @hideDuration={{0}} @onChange={{this.onChange}}>content</Attach::Popover>
            </div>
        `);

        assert.deepEqual(changes, [], 'nothing is toggled before any interaction');

        await triggerEvent('.popover-target', 'mouseenter');
        await waitUntil(isShown);

        assert.deepEqual(changes, [true], '@onChange reports the attachment becoming visible');
        assert.dom(attachment()).hasClass('ember-attacher-show', 'the show animation class is applied');
        assert.dom(attachment()).doesNotHaveClass('ember-attacher-hide');
        assert.dom(attachment()).hasAttribute('style', /transition-duration: 300ms/, 'the show duration drives the transition');

        await triggerEvent('.popover-target', 'mouseleave');
        await waitUntil(isHidden);
        await waitUntil(() => attacher().style.display === 'none');

        assert.dom(attachment()).hasClass('ember-attacher-hide', 'the hide animation class is restored');
        assert.deepEqual(changes, [true, false], '@onChange reports the attachment being hidden again');
    });

    test('it hides when the escape key is pressed', async function (assert) {
        await render(hbs`
            <div class="popover-target">
                Hover me
                <Attach::Popover @renderInPlace={{true}} @hideDuration={{0}}>content</Attach::Popover>
            </div>
        `);

        await triggerEvent('.popover-target', 'mouseenter');
        await waitUntil(isShown);

        await triggerKeyEvent(document, 'keydown', 13);
        assert.true(isShown(), 'an unrelated key does not hide the attachment');

        await triggerKeyEvent(document, 'keydown', 27);
        await waitUntil(isHidden);

        assert.true(isHidden(), 'escape hides the attachment');
    });

    test('it supports custom @showOn and @hideOn events', async function (assert) {
        await render(hbs`
            <div class="outside-element">Elsewhere</div>
            <div class="popover-target">
                Click me
                <Attach::Popover @renderInPlace={{true}} @showOn="click" @hideOn="clickout" @hideDuration={{0}}>content</Attach::Popover>
            </div>
        `);

        await triggerEvent('.popover-target', 'mouseenter');

        assert.false(isShown(), 'mouseenter no longer shows the attachment when @showOn is click');

        await click('.popover-target');
        await waitUntil(isShown);

        assert.true(isShown(), 'clicking the target shows the attachment');

        await click('.outside-element');
        await waitUntil(isHidden);

        assert.true(isHidden(), 'clicking outside of the target hides the attachment');
    });

    test('it defers rendering the attachment until first shown when @lazyRender is set', async function (assert) {
        await render(hbs`
            <div class="popover-target">
                Hover me
                <Attach::Popover @renderInPlace={{true}} @lazyRender={{true}}>lazy content</Attach::Popover>
            </div>
        `);

        assert.dom('.ember-attacher').doesNotExist('nothing is rendered before the first show event');

        await triggerEvent('.popover-target', 'mouseenter');

        assert.dom('.ember-attacher').exists('the attachment is rendered once it needs to be shown');
        assert.dom(attachment()).hasText('lazy content');
    });

    test('it shows immediately when @isShown is true', async function (assert) {
        await render(hbs`
            <div class="popover-target">
                Always shown
                <Attach::Popover @renderInPlace={{true}} @isShown={{true}}>pinned</Attach::Popover>
            </div>
        `);

        await waitUntil(isShown);

        assert.true(isShown(), 'the attachment is visible without any user interaction');
        assert.dom(attachment()).hasAttribute('style', /pointer-events: auto/, 'a shown attachment accepts pointer events');
    });

    test('it renders into the configured floating container when not rendered in place', async function (assert) {
        await render(hbs`
            <div class="test-portal"></div>
            <div class="popover-target">
                Hover me
                <Attach::Popover @floatingContainer=".test-portal">portal content</Attach::Popover>
            </div>
        `);

        assert.dom('.test-portal > .ember-attacher').exists('the attachment is portaled into the floating container');
        assert.dom('.popover-target .ember-attacher').doesNotExist('the attachment is not left inside the target');
        assert.dom('.test-portal .ember-attacher').hasText('portal content');

        await triggerEvent('.popover-target', 'mouseenter');
        await waitUntil(isShown);

        assert.true(isShown(), 'the portaled attachment still reacts to events on its target');
    });

    // -------------------------------------------------------------------------
    // Appended coverage: hiding on a click outside, and the interactive
    // mousemove path that keeps the attachment open while the cursor is on it.
    // -------------------------------------------------------------------------

    module('hiding on a click outside', function () {
        const CLICKOUT_TEMPLATE = hbs`
            <div class="outside">Elsewhere</div>
            <div class="popover-target">
                Click me
                <Attach::Popover @renderInPlace={{true}} @showOn="click" @hideOn="clickout" @hideDuration={{0}} @onChange={{this.onChange}}>content</Attach::Popover>
            </div>
        `;

        test('a click outside the target hides the attachment', async function (assert) {
            const changes = [];
            this.set('onChange', (visible) => changes.push(visible));

            await render(CLICKOUT_TEMPLATE);

            await click('.popover-target');
            await waitUntil(isShown);
            assert.deepEqual(changes, [true], 'clicking the target shows it');

            await click('.outside');
            await waitUntil(isHidden);

            assert.deepEqual(changes, [true, false], 'clicking elsewhere hides it again');
        });

        test('a click on the target itself does not hide the attachment', async function (assert) {
            await render(CLICKOUT_TEMPLATE);

            await click('.popover-target');
            await waitUntil(isShown);

            await click('.popover-target');

            assert.true(isShown(), 'the attachment stays open while the target is clicked');
        });

        test('a click inside the attachment does not hide it', async function (assert) {
            await render(CLICKOUT_TEMPLATE);

            await click('.popover-target');
            await waitUntil(isShown);

            await click(attachment());

            assert.true(isShown(), 'clicking the attachment body keeps it open');
        });
    });

    module('an interactive attachment', function () {
        const INTERACTIVE_TEMPLATE = hbs`
            <div class="outside">Elsewhere</div>
            <div class="popover-target">
                Hover me
                <Attach::Popover @renderInPlace={{true}} @interactive={{true}} @hideDuration={{0}} @onChange={{this.onChange}}>content</Attach::Popover>
            </div>
        `;

        test('leaving the target does not hide it while the cursor is still on the attachment', async function (assert) {
            const changes = [];
            this.set('onChange', (visible) => changes.push(visible));

            await render(INTERACTIVE_TEMPLATE);

            await triggerEvent('.popover-target', 'mouseenter');
            await waitUntil(isShown);

            await triggerEvent('.popover-target', 'mouseleave');
            // The interactive path watches document mousemove; a move that lands on the
            // attachment must not close it.
            await triggerEvent(attachment(), 'mousemove');

            assert.true(isShown(), 'the attachment stays open so it can be interacted with');
            assert.deepEqual(changes, [true], 'nothing is reported as hidden');
        });

        test('moving the cursor away from both the target and the attachment hides it', async function (assert) {
            const changes = [];
            this.set('onChange', (visible) => changes.push(visible));

            await render(INTERACTIVE_TEMPLATE);

            await triggerEvent('.popover-target', 'mouseenter');
            await waitUntil(isShown);

            await triggerEvent('.popover-target', 'mouseleave');
            await triggerEvent(document.querySelector('#ember-testing .outside'), 'mousemove');
            await waitUntil(isHidden);

            assert.deepEqual(changes, [true, false], 'the attachment closes once the cursor leaves both');
        });
    });

    module('hiding on lost focus', function () {
        const TEMPLATE = hbs`
            <div class="popover-target" tabindex="0">
                Focus me
                <input type="text" class="inside-target" />
                <Attach::Popover @renderInPlace={{true}} @hideDuration={{0}} @showOn="focus" @hideOn="focusout">content</Attach::Popover>
            </div>
            <button type="button" class="outside">Elsewhere</button>
        `;

        test('focus shows the attachment and blurring away hides it', async function (assert) {
            await render(TEMPLATE);

            await triggerEvent('.popover-target', 'focus');
            await waitUntil(isShown, { timeout: 2000 });
            assert.true(isShown(), 'focus shows it');

            await triggerEvent('.popover-target', 'focusout', { relatedTarget: document.querySelector('.outside') });
            await waitUntil(isHidden, { timeout: 2000 });
            assert.true(isHidden(), 'focus moving outside the target hides it');
        });

        test('focus moving to a child of the target keeps it open', async function (assert) {
            await render(TEMPLATE);

            await triggerEvent('.popover-target', 'focus');
            await waitUntil(isShown, { timeout: 2000 });

            await triggerEvent('.popover-target', 'focusout', { relatedTarget: document.querySelector('.inside-target') });

            assert.true(isShown(), 'focus staying inside the target does not hide it');
        });

        test('focus lost to nothing at all hides it', async function (assert) {
            await render(TEMPLATE);

            await triggerEvent('.popover-target', 'focus');
            await waitUntil(isShown, { timeout: 2000 });

            await triggerEvent('.popover-target', 'focusout', { relatedTarget: null });
            await waitUntil(isHidden, { timeout: 2000 });

            assert.true(isHidden(), 'a null relatedTarget is treated as leaving');
        });

        test('an interactive attachment survives focus moving into it', async function (assert) {
            await render(hbs`
                <div class="popover-target" tabindex="0">
                    Focus me
                    <Attach::Popover @renderInPlace={{true}} @interactive={{true}} @hideDuration={{0}} @showOn="focus" @hideOn="focusout">
                        <button type="button" class="inside-attachment">Act</button>
                    </Attach::Popover>
                </div>
            `);

            await triggerEvent('.popover-target', 'focus');
            await waitUntil(isShown, { timeout: 2000 });

            await triggerEvent('.popover-target', 'focusout', { relatedTarget: document.querySelector('.inside-attachment') });

            assert.true(isShown(), 'focus landing inside the attachment keeps an interactive popover open');
        });
    });

    module('hiding on the escape key', function () {
        test('escape hides a shown attachment', async function (assert) {
            await render(hbs`
                <div class="popover-target">
                    Hover me
                    <Attach::Popover @renderInPlace={{true}} @hideDuration={{0}}>content</Attach::Popover>
                </div>
            `);

            await triggerEvent('.popover-target', 'mouseenter');
            await waitUntil(isShown, { timeout: 2000 });

            await triggerKeyEvent(document, 'keydown', 27);
            await waitUntil(isHidden, { timeout: 2000 });

            assert.true(isHidden(), 'escape closes it');
        });

        test('another key leaves it open', async function (assert) {
            await render(hbs`
                <div class="popover-target">
                    Hover me
                    <Attach::Popover @renderInPlace={{true}} @hideDuration={{0}}>content</Attach::Popover>
                </div>
            `);

            await triggerEvent('.popover-target', 'mouseenter');
            await waitUntil(isShown, { timeout: 2000 });

            await triggerKeyEvent(document, 'keydown', 13);

            assert.true(isShown(), 'enter does not close it');
        });
    });

    module('click as both the show and the hide event', function () {
        test('a second click hides what the first click showed', async function (assert) {
            await render(hbs`
                <div class="popover-target">
                    Click me
                    <Attach::Popover @renderInPlace={{true}} @showOn="click" @hideOn="click" @hideDuration={{0}}>content</Attach::Popover>
                </div>
            `);

            await click('.popover-target');
            await waitUntil(isShown, { timeout: 2000 });
            assert.true(isShown(), 'the first click opens it');

            await click('.popover-target');
            await waitUntil(isHidden, { timeout: 2000 });
            assert.true(isHidden(), 'the second click closes it');
        });

        test('click to show with clickout to hide works as intended', async function (assert) {
            await render(hbs`
                <div class="popover-target">
                    Click me
                    <Attach::Popover @renderInPlace={{true}} @showOn="click" @hideOn="clickout" @hideDuration={{0}}>content</Attach::Popover>
                </div>
                <button type="button" class="outside">Elsewhere</button>
            `);

            await click('.popover-target');
            await waitUntil(isShown, { timeout: 2000 });
            assert.true(isShown(), 'the click opens it');

            await click('.outside');
            await waitUntil(isHidden, { timeout: 2000 });
            assert.true(isHidden(), 'a click elsewhere closes it');
        });

        // `addListenersForHideEvents` swaps the show-on-click listener for the hide-on-click one,
        // but only if a show-on-click listener was ever registered. With a different show event
        // there is nothing to swap out.
        test('hiding on click works when the show event is something else', async function (assert) {
            await render(hbs`
                <div class="popover-target">
                    Hover me
                    <Attach::Popover @renderInPlace={{true}} @showOn="mouseenter" @hideOn="click" @hideDuration={{0}}>content</Attach::Popover>
                </div>
            `);

            await triggerEvent('.popover-target', 'mouseenter');
            await waitUntil(isShown, { timeout: 2000 });
            assert.true(isShown(), 'hovering opens it');

            await click('.popover-target');
            await waitUntil(isHidden, { timeout: 2000 });
            assert.true(isHidden(), 'and clicking closes it');
        });
    });

    module('switching the trigger events off entirely', function () {
        test('a null @showOn leaves the attachment unopenable', async function (assert) {
            await render(hbs`
                <div class="popover-target">
                    Hover me
                    <Attach::Popover @renderInPlace={{true}} @showOn={{null}} @hideDuration={{0}}>content</Attach::Popover>
                </div>
            `);

            await triggerEvent('.popover-target', 'mouseenter');
            await triggerEvent('.popover-target', 'focus');

            assert.false(isShown(), 'no show listeners are registered at all');
        });

        test('a null @hideOn leaves an opened attachment open', async function (assert) {
            await render(hbs`
                <div class="popover-target">
                    Hover me
                    <Attach::Popover @renderInPlace={{true}} @hideOn={{null}} @hideDuration={{0}}>content</Attach::Popover>
                </div>
            `);

            await triggerEvent('.popover-target', 'mouseenter');
            await waitUntil(isShown, { timeout: 2000 });

            await triggerEvent('.popover-target', 'mouseleave');
            await triggerKeyEvent(document, 'keydown', 27);

            assert.true(isShown(), 'neither leaving nor escape closes it');
        });
    });

    module('an interactive attachment, dismissed by clicking or focus', function () {
        test('a click inside an interactive attachment does not dismiss it', async function (assert) {
            await render(hbs`
                <div class="popover-target">
                    Click me
                    <Attach::Popover @renderInPlace={{true}} @interactive={{true}} @showOn="click" @hideOn="clickout" @hideDuration={{0}}>
                        <button type="button" class="inside-attachment">Act</button>
                    </Attach::Popover>
                </div>
                <button type="button" class="outside">Elsewhere</button>
            `);

            await click('.popover-target');
            await waitUntil(isShown, { timeout: 2000 });

            await click('.inside-attachment');
            assert.true(isShown(), 'the attachment can be interacted with');

            await click('.outside');
            await waitUntil(isHidden, { timeout: 2000 });
            assert.true(isHidden(), 'but a click right outside still closes it');
        });

        test('focus leaving an interactive attachment entirely dismisses it', async function (assert) {
            await render(hbs`
                <div class="popover-target" tabindex="0">
                    Focus me
                    <Attach::Popover @renderInPlace={{true}} @interactive={{true}} @hideDuration={{0}} @showOn="focus" @hideOn="focusout">
                        <button type="button" class="inside-attachment">Act</button>
                    </Attach::Popover>
                </div>
                <button type="button" class="outside">Elsewhere</button>
            `);

            await triggerEvent('.popover-target', 'focus');
            await waitUntil(isShown, { timeout: 2000 });

            await triggerEvent('.popover-target', 'focusout', { relatedTarget: document.querySelector('.outside') });
            await waitUntil(isHidden, { timeout: 2000 });

            assert.true(isHidden(), 'focus reaching neither the target nor the attachment closes it');
        });

        // The document-level mousemove watcher is installed on the first mouseleave and must not
        // be installed a second time when the cursor leaves again.
        test('leaving the target twice installs the mousemove watcher only once', async function (assert) {
            await render(hbs`
                <div class="outside">Elsewhere</div>
                <div class="popover-target">
                    Hover me
                    <Attach::Popover @renderInPlace={{true}} @interactive={{true}} @hideDuration={{0}}>content</Attach::Popover>
                </div>
            `);

            await triggerEvent('.popover-target', 'mouseenter');
            await waitUntil(isShown, { timeout: 2000 });

            await triggerEvent('.popover-target', 'mouseleave');
            await triggerEvent(attachment(), 'mousemove');
            await triggerEvent('.popover-target', 'mouseleave');

            assert.true(isShown(), 'the attachment is still open');

            await triggerEvent(document.querySelector('#ember-testing .outside'), 'mousemove');
            await waitUntil(isHidden, { timeout: 2000 });

            assert.true(isHidden(), 'and one move away from both still closes it exactly once');
        });
    });

    module('on a touch device', function () {
        // `clickout` listens for `touchend` instead of `click` when the browser reports touch
        // support, which is decided once, when the hide listeners are attached.
        test('clickout listens for touchend', async function (assert) {
            const hadTouch = 'ontouchstart' in window;
            window.ontouchstart = null;

            try {
                await render(hbs`
                    <div class="popover-target">
                        Click me
                        <Attach::Popover @renderInPlace={{true}} @showOn="click" @hideOn="clickout" @hideDuration={{0}}>content</Attach::Popover>
                    </div>
                    <button type="button" class="outside">Elsewhere</button>
                `);

                await click('.popover-target');
                await waitUntil(isShown, { timeout: 2000 });

                await triggerEvent('.outside', 'touchend');
                await waitUntil(isHidden, { timeout: 2000 });

                assert.true(isHidden(), 'a touch outside closes the attachment');
            } finally {
                if (!hadTouch) {
                    delete window.ontouchstart;
                }
            }
        });
    });
});
