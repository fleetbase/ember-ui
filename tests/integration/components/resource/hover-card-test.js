import { module, test } from 'qunit';
import { setupRenderingTest, setupPointerDevice } from 'dummy/tests/helpers';
import { render, triggerEvent, settled, waitUntil, find } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import { registerResourceDescriptor } from '@fleetbase/ember-ui/utils/resource-registry';

const ANCHOR = '[data-test-resource-hover-card-anchor]';
const CARD = '.resource-hover-card';

function card() {
    return document.querySelector(CARD);
}

async function waitForCard() {
    await waitUntil(() => card()?.getAttribute('aria-hidden') === 'false', { timeout: 3000 });
    await settled();
}

module('Integration | Component | resource/hover-card', function (hooks) {
    setupRenderingTest(hooks);
    setupPointerDevice(hooks);

    hooks.beforeEach(function () {
        this.owner.register('template:components/widget/summary', hbs`<span data-test-widget-summary>{{@resource.name}}</span>`);
        registerResourceDescriptor(this.owner, { key: 'widget', modelNames: ['widget'], title: (record) => record.name });
        this.set('record', { resourceType: 'widget', name: 'Widget One' });
    });

    const TEMPLATE = hbs`
        <div class="hover-target">
            Hover me
            <Resource::HoverCard @resource={{this.record}} @resourceType="widget" @armDelay={{1}} @hideDelay={{0}} />
        </div>
    `;

    module('arming', function () {
        test('nothing is rendered until the target is hovered', async function (assert) {
            await render(TEMPLATE);

            assert.dom(ANCHOR).exists('the hidden anchor is in place');
            assert.strictEqual(card(), null, 'but no popover yet');
        });

        test('hovering the target arms and shows the summary', async function (assert) {
            await render(TEMPLATE);

            await triggerEvent('.hover-target', 'mouseenter');
            await waitForCard();

            assert.dom('[data-test-widget-summary]', document.body).hasText('Widget One');
        });

        test('focus arms it too', async function (assert) {
            await render(TEMPLATE);

            await triggerEvent('.hover-target', 'focusin');
            await waitForCard();

            assert.ok(card(), 'the card is shown for keyboard users as well');
        });

        test('leaving before the delay elapses never arms it', async function (assert) {
            await render(hbs`
                <div class="hover-target">
                    Hover me
                    <Resource::HoverCard @resource={{this.record}} @resourceType="widget" @armDelay={{5000}} />
                </div>
            `);

            // Dispatched directly: awaiting a test helper settles the run loop, which would
            // run the very arm timer this test is checking gets cancelled.
            const target = find('.hover-target');
            target.dispatchEvent(new MouseEvent('mouseenter'));
            target.dispatchEvent(new MouseEvent('mouseleave'));

            assert.strictEqual(card(), null, 'the pending arm was cancelled');
        });

        test('focusout cancels a pending arm as well', async function (assert) {
            await render(hbs`
                <div class="hover-target">
                    Hover me
                    <Resource::HoverCard @resource={{this.record}} @resourceType="widget" @armDelay={{5000}} />
                </div>
            `);

            const target = find('.hover-target');
            target.dispatchEvent(new FocusEvent('focusin'));
            target.dispatchEvent(new FocusEvent('focusout'));

            assert.strictEqual(card(), null);
        });

        test('a second hover while already armed does not arm twice', async function (assert) {
            await render(TEMPLATE);

            await triggerEvent('.hover-target', 'mouseenter');
            await waitForCard();

            await triggerEvent('.hover-target', 'mouseenter');

            assert.strictEqual(document.querySelectorAll(CARD).length, 1, 'still exactly one card');
        });
    });

    module('when it is disabled', function () {
        test('@disabled never arms', async function (assert) {
            await render(hbs`
                <div class="hover-target">
                    Hover me
                    <Resource::HoverCard @resource={{this.record}} @resourceType="widget" @armDelay={{1}} @disabled={{true}} />
                </div>
            `);

            await triggerEvent('.hover-target', 'mouseenter');

            assert.strictEqual(card(), null);
        });

        test('no resource never arms', async function (assert) {
            await render(hbs`
                <div class="hover-target">
                    Hover me
                    <Resource::HoverCard @resourceType="widget" @armDelay={{1}} />
                </div>
            `);

            await triggerEvent('.hover-target', 'mouseenter');

            assert.strictEqual(card(), null);
        });

        test('a resource with no summary component never arms', async function (assert) {
            registerResourceDescriptor(this.owner, { key: 'plain', modelNames: ['plain'] });
            this.set('record', { resourceType: 'plain', name: 'Plain' });

            await render(hbs`
                <div class="hover-target">
                    Hover me
                    <Resource::HoverCard @resource={{this.record}} @resourceType="plain" @armDelay={{1}} />
                </div>
            `);

            await triggerEvent('.hover-target', 'mouseenter');

            assert.strictEqual(card(), null);
        });

        test('a touch device never arms', async function (assert) {
            const nativeMatchMedia = window.matchMedia;
            window.matchMedia = (query) => ({ matches: query === '(hover: none)' });

            try {
                await render(TEMPLATE);
                await triggerEvent('.hover-target', 'mouseenter');

                assert.strictEqual(card(), null, 'hover cards are a pointer affordance');
            } finally {
                window.matchMedia = nativeMatchMedia;
            }
        });

        test('a matchMedia that throws is treated as a pointer device', async function (assert) {
            const nativeMatchMedia = window.matchMedia;
            window.matchMedia = () => {
                throw new Error('not supported');
            };

            try {
                await render(TEMPLATE);
                await triggerEvent('.hover-target', 'mouseenter');
                await waitForCard();

                assert.ok(card(), 'it arms rather than failing');
            } finally {
                window.matchMedia = nativeMatchMedia;
            }
        });
    });

    module('choosing the target', function () {
        test('@targetSelector picks an ancestor', async function (assert) {
            await render(hbs`
                <div class="outer-target">
                    <span class="inner">
                        Hover me
                        <Resource::HoverCard @resource={{this.record}} @resourceType="widget" @targetSelector=".outer-target" @armDelay={{1}} />
                    </span>
                </div>
            `);

            await triggerEvent('.outer-target', 'mouseenter');
            await waitForCard();

            assert.ok(card(), 'the named ancestor is what is listened on');
        });

        test('@targetSelector falls back to a sibling when there is no such ancestor', async function (assert) {
            await render(hbs`
                <div class="wrapper">
                    <span class="sibling-target">Hover me</span>
                    <Resource::HoverCard @resource={{this.record}} @resourceType="widget" @targetSelector=".sibling-target" @armDelay={{1}} />
                </div>
            `);

            await triggerEvent('.sibling-target', 'mouseenter');
            await waitForCard();

            assert.ok(card(), 'a matching sibling is used');
        });

        test('a @targetSelector that matches nothing binds nothing', async function (assert) {
            await render(hbs`
                <div class="hover-target">
                    Hover me
                    <Resource::HoverCard @resource={{this.record}} @resourceType="widget" @targetSelector=".nowhere" @armDelay={{1}} />
                </div>
            `);

            await triggerEvent('.hover-target', 'mouseenter');

            assert.strictEqual(card(), null, 'with no target there is nothing to hover');
        });

        test('with no selector the parent element is the target', async function (assert) {
            await render(TEMPLATE);

            await triggerEvent('.hover-target', 'mouseenter');
            await waitForCard();

            assert.ok(card());
        });
    });

    test('@summaryComponent names the card contents outright', async function (assert) {
        this.owner.register('template:components/custom-summary', hbs`<span data-test-custom-summary>Custom</span>`);

        await render(hbs`
            <div class="hover-target">
                Hover me
                <Resource::HoverCard @resource={{this.record}} @summaryComponent="custom-summary" @armDelay={{1}} />
            </div>
        `);

        await triggerEvent('.hover-target', 'mouseenter');
        await waitForCard();

        assert.dom('[data-test-custom-summary]', document.body).exists();
    });

    test('it disarms back to stage 0 once the pointer leaves for good', async function (assert) {
        await render(TEMPLATE);

        await triggerEvent('.hover-target', 'mouseenter');
        await waitForCard();

        await triggerEvent('.hover-target', 'mouseleave');
        await triggerEvent(document.body, 'mousemove');
        await waitUntil(() => !card(), { timeout: 3000 });

        assert.strictEqual(card(), null, 'the popover is torn down again');
        assert.dom(ANCHOR).exists('and the anchor is back on watch');
    });

    test('tearing the host down while armed leaves no card behind', async function (assert) {
        this.set('visible', true);

        await render(hbs`
            {{#if this.visible}}
                <div class="hover-target">
                    Hover me
                    <Resource::HoverCard @resource={{this.record}} @resourceType="widget" @armDelay={{1}} @hideDelay={{0}} />
                </div>
            {{/if}}
        `);

        await triggerEvent('.hover-target', 'mouseenter');
        await waitForCard();

        this.set('visible', false);
        await settled();

        assert.strictEqual(find(ANCHOR), null, 'the anchor is gone');
        assert.strictEqual(card(), null, 'and so is the card');
    });

    test('tearing the host down before it arms cancels the pending timer', async function (assert) {
        this.set('visible', true);

        await render(hbs`
            {{#if this.visible}}
                <div class="hover-target">
                    Hover me
                    <Resource::HoverCard @resource={{this.record}} @resourceType="widget" @armDelay={{5000}} />
                </div>
            {{/if}}
        `);

        find('.hover-target').dispatchEvent(new MouseEvent('mouseenter'));

        this.set('visible', false);
        await settled();

        assert.strictEqual(card(), null, 'nothing armed after the component went away');
    });
});
