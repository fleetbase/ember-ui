import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, find, triggerEvent, triggerKeyEvent, waitUntil, settled } from '@ember/test-helpers';
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
    // DEFECTS #20. The component registers click/touchend and keydown handlers on `document`.
    // removeEventListeners() was correct but nothing called it after setup, so those handlers
    // outlived every popover. These assert the observable consequence — the document is clean
    // afterwards — rather than that a method ran, which would pass either way.
    module('cleaning up after itself', function () {
        function documentListenerCount() {
            // Count by proxy: registering the same handler twice is a no-op, so we cannot inspect
            // the list directly. Instead, dispatch the events a leaked listener would answer and
            // check nothing throws or resurrects an attachment.
            return document.querySelectorAll('.ember-attacher').length;
        }

        test('a destroyed popover leaves no document listeners behind', async function (assert) {
            this.set('visible', true);

            await render(hbs`
                {{#if this.visible}}
                    <div class="popover-target">
                        Hover me
                        <Attach::Popover @renderInPlace={{true}} @hideOn="clickout escapekey" @hideDuration={{0}}>content</Attach::Popover>
                    </div>
                {{/if}}
            `);

            await triggerEvent('.popover-target', 'mouseenter');
            await waitUntil(isShown);

            this.set('visible', false);
            await settled();

            assert.strictEqual(documentListenerCount(), 0, 'the attachment is gone');

            // A leaked clickout or escapekey handler would run against a destroyed component here.
            await click(document.body);
            await triggerKeyEvent(document, 'keydown', 'Escape');

            assert.strictEqual(documentListenerCount(), 0, 'and nothing was resurrected');
        });

        test('the listener maps are emptied on teardown', async function (assert) {
            this.set('visible', true);

            await render(hbs`
                {{#if this.visible}}
                    <div class="popover-target">
                        Hover me
                        <Attach::Popover @renderInPlace={{true}} @hideOn="clickout escapekey" @hideDuration={{0}}>content</Attach::Popover>
                    </div>
                {{/if}}
            `);

            await triggerEvent('.popover-target', 'mouseenter');
            await waitUntil(isShown);

            this.set('visible', false);
            await settled();

            // Two teardowns in a row must also be safe — willDestroy runs once, but the method has
            // to tolerate being called with the maps already cleared.
            assert.dom('.popover-target').doesNotExist('the target went with it');
        });
    });

    // The component guards several deferred paths with `isDestroyed || isDestroying` — a show or
    // hide that was scheduled behind a delay, then had its component torn down before it ran.
    // Reaching them means destroying the popover mid-delay, which is exactly the teardown race
    // those guards exist for.
    module('destroyed mid-flight', function () {
        test('a pending show does not run after the component is destroyed', async function (assert) {
            this.set('visible', true);

            await render(hbs`
                {{#if this.visible}}
                    <div class="popover-target">
                        Hover me
                        <Attach::Popover @renderInPlace={{true}} @showDelay={{50}} @hideDuration={{0}}>content</Attach::Popover>
                    </div>
                {{/if}}
            `);

            // Start the show, then tear the component down before the delay elapses.
            await triggerEvent('.popover-target', 'mouseenter');
            this.set('visible', false);
            await settled();

            assert.dom('.popover-target').doesNotExist('the target is gone');
            assert.strictEqual(attacher(), null, 'and no attachment was left behind');
        });

        test('a pending hide does not run after the component is destroyed', async function (assert) {
            this.set('visible', true);

            await render(hbs`
                {{#if this.visible}}
                    <div class="popover-target">
                        Hover me
                        <Attach::Popover @renderInPlace={{true}} @hideDelay={{50}} @hideDuration={{0}}>content</Attach::Popover>
                    </div>
                {{/if}}
            `);

            await triggerEvent('.popover-target', 'mouseenter');
            await waitUntil(isShown);

            // Start the hide, then tear the component down before the delay elapses.
            await triggerEvent('.popover-target', 'mouseleave');
            this.set('visible', false);
            await settled();

            assert.strictEqual(attacher(), null, 'the attachment is gone with its component');
        });

        // Everything here concerns the window between "the attachment is wanted" and "the attachment
        // exists", which only @lazyRender opens.
        module('hiding before there is anything to hide', function () {
            test('a lazily rendered popover that was never shown hides without spinning', async function (assert) {
                let frames = 0;
                const nativeRaf = window.requestAnimationFrame;
                window.requestAnimationFrame = function (callback) {
                    frames++;
                    return nativeRaf.call(window, callback);
                };

                try {
                    await render(hbs`
                    <div class="popover-target">
                        Hover me
                        <Attach::Popover @renderInPlace={{true}} @lazyRender={{true}} @hideDuration={{0}}>content</Attach::Popover>
                    </div>
                `);

                    assert.dom('.ember-attacher').doesNotExist('nothing is rendered until it is first shown');

                    await triggerEvent('.popover-target', 'mouseleave');
                    const afterHide = frames;
                    await new Promise((resolve) => nativeRaf.call(window, () => nativeRaf.call(window, () => nativeRaf.call(window, resolve))));

                    assert.dom('.ember-attacher').doesNotExist('and it is still not rendered');
                    assert.strictEqual(frames, afterHide, 'hide() did not queue a frame it can never satisfy');
                } finally {
                    window.requestAnimationFrame = nativeRaf;
                }
            });

            test('hiding between wanting the attachment and rendering it waits for the element', async function (assert) {
                await render(hbs`
                <div class="popover-target">
                    Hover me
                    <Attach::Popover @renderInPlace={{true}} @lazyRender={{true}} @showOn="click" @hideOn="mouseleave" @hideDuration={{0}}>content</Attach::Popover>
                </div>
            `);

                // Both listeners are plain DOM listeners, so dispatching without awaiting settles
                // nothing in between: the hide lands while mustRender is true but the attachment
                // has not been rendered yet.
                const target = find('.popover-target');
                target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
                target.dispatchEvent(new MouseEvent('mouseleave', { bubbles: false }));

                await settled();
                await waitUntil(() => attacher(), { timeout: 2000 });
                await waitUntil(() => isHidden(), { timeout: 2000 });

                assert.true(isHidden(), 'the deferred hide runs once the element it was waiting for exists');
            });

            // These three hold the animation frames themselves, which is the only way to land a
            // callback in the exact window it guards against: between scheduling and running.
            function holdFrames() {
                const native = window.requestAnimationFrame;
                const queued = [];

                window.requestAnimationFrame = function (callback) {
                    queued.push(callback);
                    return queued.length;
                };

                return {
                    queued,
                    flush() {
                        const pending = queued.splice(0, queued.length);
                        pending.forEach((callback) => callback());
                    },
                    release() {
                        window.requestAnimationFrame = native;
                        // Anything still held goes back to the browser, so a retry that was
                        // queued while frames were held still gets its chance to run.
                        queued.splice(0, queued.length).forEach((callback) => native.call(window, callback));
                    },
                };
            }

            test('the show animation retries when its frame lands before the attachment is rendered', async function (assert) {
                await render(hbs`
                <div class="popover-target">
                    Hover me
                    <Attach::Popover @renderInPlace={{true}} @lazyRender={{true}} @showOn="click" @hideOn="clickout" @hideDuration={{0}}>content</Attach::Popover>
                </div>
            `);

                const frames = holdFrames();

                try {
                    find('.popover-target').dispatchEvent(new MouseEvent('click', { bubbles: true }));

                    assert.true(frames.queued.length > 0, 'showing queues work for a later frame');
                    frames.flush();
                } finally {
                    frames.release();
                }

                await settled();
                await waitUntil(() => attacher() && isShown(), { timeout: 2000 });

                assert.true(isShown(), 'the animation retried until the element it animates existed');
            });

            test('a show frame that lands after teardown animates nothing', async function (assert) {
                this.set('visible', true);

                await render(hbs`
                {{#if this.visible}}
                    <div class="popover-target">
                        Hover me
                        <Attach::Popover @renderInPlace={{true}} @showOn="click" @hideOn="clickout" @hideDuration={{0}}>content</Attach::Popover>
                    </div>
                {{/if}}
            `);

                const frames = holdFrames();
                let threw = null;

                try {
                    find('.popover-target').dispatchEvent(new MouseEvent('click', { bubbles: true }));
                    frames.flush();

                    this.set('visible', false);
                    await settled();

                    assert.true(frames.queued.length > 0, 'the show animation is still waiting on a frame');
                    try {
                        frames.flush();
                    } catch (error) {
                        threw = error;
                    }
                } finally {
                    frames.release();
                }

                assert.strictEqual(threw, null, 'the frame finds the component gone and stops');
                assert.dom('.ember-attacher').doesNotExist();
            });

            test('a hide frame that lands after teardown hides nothing', async function (assert) {
                this.set('visible', true);

                await render(hbs`
                {{#if this.visible}}
                    <div class="popover-target">
                        Hover me
                        <Attach::Popover @renderInPlace={{true}} @showOn="click" @hideOn="mouseleave" @hideDuration={{0}}>content</Attach::Popover>
                    </div>
                {{/if}}
            `);

                await click('.popover-target');
                await waitUntil(() => isShown(), { timeout: 2000 });

                const frames = holdFrames();
                let threw = null;

                try {
                    find('.popover-target').dispatchEvent(new MouseEvent('mouseleave'));

                    assert.true(frames.queued.length > 0, 'hiding queues work for a later frame');

                    this.set('visible', false);
                    await settled();

                    try {
                        frames.flush();
                    } catch (error) {
                        threw = error;
                    }
                } finally {
                    frames.release();
                }

                assert.strictEqual(threw, null, 'the frame finds the component gone and stops');
                assert.dom('.ember-attacher').doesNotExist();
            });

            test('a hide animation runs its course with no @onChange to report to', async function (assert) {
                await render(hbs`
                    <div class="popover-target">
                        Hover me
                        <Attach::Popover @renderInPlace={{true}} @showOn="click" @hideOn="clickout" @hideDuration={{40}}>content</Attach::Popover>
                    </div>
                `);

                await click('.popover-target');
                await waitUntil(() => isShown(), { timeout: 2000 });

                await click(document.body);
                // aria-hidden flips as soon as the hide starts; display: none is what the delay
                // is actually waiting for, so that is what tells us the delayed half ran.
                await waitUntil(() => attacher()?.style.display === 'none', { timeout: 2000 });

                assert.true(isHidden(), 'the delayed hide completes without a change handler to call');
                assert.strictEqual(attacher().style.display, 'none');
            });

            test('a delayed hide that outlives the component itself changes nothing', async function (assert) {
                this.set('visible', true);

                await render(hbs`
                    {{#if this.visible}}
                        <div class="popover-target">
                            Hover me
                            <Attach::Popover @renderInPlace={{true}} @showOn="click" @hideOn="clickout" @hideDuration={{40}}>content</Attach::Popover>
                        </div>
                    {{/if}}
                `);

                await click('.popover-target');
                await waitUntil(() => isShown(), { timeout: 2000 });

                const frames = holdFrames();
                let threw = null;

                try {
                    await click(document.body);

                    // hide() defers to a frame before it schedules the delay, so let that first
                    // frame through — the delayed half is only queued once it has run.
                    frames.flush();
                    await settled();

                    this.set('visible', false);
                    await settled();

                    assert.true(frames.queued.length > 0, 'the delayed hide is waiting on a frame');
                    try {
                        frames.flush();
                    } catch (error) {
                        threw = error;
                    }
                } finally {
                    frames.release();
                }

                assert.strictEqual(threw, null, 'the frame finds the component gone and leaves the styles alone');
                assert.dom('.ember-attacher').doesNotExist();
            });

            test('a hide that outlives its own delay reports the change through @onChange', async function (assert) {
                const changes = [];
                this.set('onChange', (isVisible) => changes.push(isVisible));

                await render(hbs`
                <div class="popover-target">
                    Hover me
                    <Attach::Popover @renderInPlace={{true}} @showOn="click" @hideOn="clickout" @hideDuration={{60}} @onChange={{this.onChange}}>content</Attach::Popover>
                </div>
            `);

                await click('.popover-target');
                await waitUntil(() => isShown(), { timeout: 2000 });
                assert.deepEqual(changes, [true], 'showing is reported immediately, with no delay');

                await click(document.body);
                await waitUntil(() => changes.length > 1, { timeout: 2000 });

                assert.deepEqual(changes, [true, false], 'and the hide is reported once its animation delay has run out');
            });
        });

        test('destroying a popover that was never shown is harmless', async function (assert) {
            this.set('visible', true);

            await render(hbs`
                {{#if this.visible}}
                    <div class="popover-target">
                        Hover me
                        <Attach::Popover @renderInPlace={{true}} @hideDuration={{0}}>content</Attach::Popover>
                    </div>
                {{/if}}
            `);

            this.set('visible', false);
            await settled();

            assert.dom('.popover-target').doesNotExist();
        });
    });
});
