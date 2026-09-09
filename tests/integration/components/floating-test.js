import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, waitUntil, find } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | floating', function (hooks) {
    setupRenderingTest(hooks);

    module('rendering', function () {
        test('it renders in place when asked, with its role and placement', async function (assert) {
            await render(hbs`<Floating @renderInPlace={{true}} @ariaRole="tooltip" @placement="top" class="panel">Panel</Floating>`);

            assert.dom('.panel').hasText('Panel');
            assert.dom('.panel').hasAttribute('role', 'tooltip');
            assert.dom('.panel').hasAttribute('x-placement', 'top');
            assert.dom('.floating--parent-finder').doesNotExist('rendering in place skips the parent finder');
        });

        test('an in-place panel never renders an arrow', async function (assert) {
            await render(hbs`<Floating @renderInPlace={{true}} @arrow={{true}} class="panel">Panel</Floating>`);

            assert.dom('[x-arrow]').doesNotExist();
        });

        test('by default it finds its own parent and renders one level above it', async function (assert) {
            await render(hbs`<div class="host"><Floating class="panel">Panel</Floating></div>`);

            // findParent resolves the target as the finder's parent (.host); floatingContainer is
            // then that target's OWN parent, so the panel becomes a sibling of .host.
            assert.dom('.panel').hasText('Panel');
            assert.dom('.host > .panel').doesNotExist('the panel is lifted out of its immediate parent');
            assert.dom('.floating--parent-finder').doesNotExist('the finder removes itself once it has located the parent');
        });

        test('an arrow is rendered when requested', async function (assert) {
            await render(hbs`<div class="host"><Floating @arrow={{true}} class="panel">Panel</Floating></div>`);

            assert.dom('.panel [x-arrow]').exists();
        });

        test('a string container selector places the panel there', async function (assert) {
            await render(hbs`
                <div class="target">Target</div>
                <div id="floating-container"></div>
                <Floating @target=".target" @container="#floating-container" class="panel">Panel</Floating>
            `);

            assert.dom('#floating-container > .panel').hasText('Panel');
        });

        test('an element container places the panel there', async function (assert) {
            this.set('captureContainer', (element) => this.set('container', element));
            this.set('captureTarget', (element) => this.set('target', element));

            await render(hbs`
                <div class="target" {{did-insert this.captureTarget}}>Target</div>
                <div id="floating-container" {{did-insert this.captureContainer}}></div>
                {{#if this.container}}
                    <Floating @target={{this.target}} @container={{this.container}} class="panel">Panel</Floating>
                {{/if}}
            `);

            assert.dom('#floating-container > .panel').hasText('Panel', 'the panel renders into the supplied element');
        });

        test('an element target with no container renders into the target parent', async function (assert) {
            this.set('captureTarget', (element) => this.set('target', element));

            await render(hbs`
                <div class="host"><div class="target" {{did-insert this.captureTarget}}>Target</div></div>
                {{#if this.target}}
                    <Floating @target={{this.target}} class="panel">Panel</Floating>
                {{/if}}
            `);

            assert.dom('.host > .panel').hasText('Panel', 'the panel joins the target inside its parent');
        });
    });

    module('positioning', function (hooks) {
        // With a STRING @target and no @container the resolved container is document.body, so the
        // panel renders OUTSIDE the test root and has to be queried from the document.
        const panel = () => document.body.querySelector('.floating-panel-under-test');

        hooks.afterEach(function () {
            panel()?.remove();
        });

        test('it registers an API exposing the element, target and recompute hook', async function (assert) {
            let api;
            this.set('registerAPI', (value) => {
                api = value;
            });

            await render(hbs`
                <div class="target">Target</div>
                <Floating @target=".target" @registerAPI={{this.registerAPI}} class="floating-panel-under-test">Panel</Floating>
            `);

            assert.ok(api, 'the API is handed back');
            assert.strictEqual(api.floatingElement, panel());
            assert.strictEqual(api.floatingTarget, find('.target'));
            assert.strictEqual(typeof api.computePosition, 'function');
        });

        test('it reports the computed position', async function (assert) {
            const computed = [];
            this.set('onPositionComputed', (payload) => computed.push(payload));

            await render(hbs`
                <div class="target">Target</div>
                <Floating @target=".target" @onPositionComputed={{this.onPositionComputed}} class="floating-panel-under-test">Panel</Floating>
            `);
            await waitUntil(() => computed.length > 0);

            assert.strictEqual(computed.length, 1);
            assert.strictEqual(typeof computed[0].x, 'number');
            assert.strictEqual(typeof computed[0].y, 'number');
            assert.strictEqual(computed[0].floatingElement, panel());
        });

        test('the panel is absolutely positioned with a transform', async function (assert) {
            this.registerAPI = (api) => {
                this.api = api;
            };

            await render(hbs`
                <div class="target">Target</div>
                <Floating @target=".target" @registerAPI={{this.registerAPI}} class="floating-panel-under-test">Panel</Floating>
            `);
            await waitUntil(() => this.api?.floatingElement?.style.transform);

            const element = panel();
            assert.strictEqual(element.style.position, 'absolute');
            assert.strictEqual(element.style.top, '0px');
            assert.strictEqual(element.style.left, '0px');
            assert.ok(/translate3d/.test(element.style.transform));
        });

        test('a fixed strategy is honoured', async function (assert) {
            this.registerAPI = (api) => {
                this.api = api;
            };

            await render(hbs`
                <div class="target">Target</div>
                <Floating @target=".target" @strategy="fixed" @registerAPI={{this.registerAPI}} class="floating-panel-under-test">Panel</Floating>
            `);

            assert.ok(this.api, 'the panel positions without error under the fixed strategy');
        });

        test('custom middleware replaces the defaults', async function (assert) {
            const computed = [];
            this.set('middleware', []);
            this.set('onPositionComputed', (payload) => computed.push(payload));

            await render(hbs`
                <div class="target">Target</div>
                <Floating @target=".target" @middleware={{this.middleware}} @onPositionComputed={{this.onPositionComputed}} class="floating-panel-under-test">Panel</Floating>
            `);
            await waitUntil(() => computed.length > 0);

            assert.strictEqual(computed.length, 1, 'the position is still computed with no middleware at all');
        });

        test('shift options are passed through to the default middleware', async function (assert) {
            const computed = [];
            this.set('shiftOptions', { padding: 12 });
            this.set('onPositionComputed', (payload) => computed.push(payload));

            await render(hbs`
                <div class="target">Target</div>
                <Floating @target=".target" @shiftOptions={{this.shiftOptions}} @onPositionComputed={{this.onPositionComputed}} class="floating-panel-under-test">Panel</Floating>
            `);
            await waitUntil(() => computed.length > 0);

            assert.strictEqual(computed.length, 1);
        });

        test('it positions happily with no callbacks at all', async function (assert) {
            await render(hbs`<div class="target">Target</div><Floating @target=".target" class="floating-panel-under-test">Panel</Floating>`);

            assert.ok(panel(), 'neither registerAPI nor onPositionComputed is required');
        });

        // The arrow middleware reports only the cross-axis coordinate — x for top/bottom
        // placements, y for left/right — and the static side stays with the [x-placement] CSS.
        test('the arrow is placed against the target on the cross axis', async function (assert) {
            await render(hbs`
                <div class="target">Target</div>
                <Floating @target=".target" @arrow={{true}} class="floating-panel-under-test">Panel</Floating>
            `);

            const arrowNode = () => panel().querySelector('[x-arrow]');
            await waitUntil(() => arrowNode()?.style.left);

            assert.true(/px$/.test(arrowNode().style.left), 'the default bottom placement centers the arrow horizontally');
            assert.strictEqual(arrowNode().style.top, '', 'the vertical side is left to the stylesheet');
        });

        test('a horizontal placement places the arrow vertically instead', async function (assert) {
            await render(hbs`
                <div class="target">Target</div>
                <Floating @target=".target" @placement="right" @arrow={{true}} class="floating-panel-under-test">Panel</Floating>
            `);

            const arrowNode = () => panel().querySelector('[x-arrow]');
            await waitUntil(() => arrowNode()?.style.top);

            assert.true(/px$/.test(arrowNode().style.top), 'a right placement centers the arrow vertically');
            assert.strictEqual(arrowNode().style.left, '', 'the horizontal side is left to the stylesheet');
        });
    });

    test('offset does not accumulate when position is recomputed', async function (assert) {
        this.registerAPI = (api) => {
            this.api = api;
        };

        await render(hbs`
            <div class="floating-target">Target</div>
            <Floating
                @target=".floating-target"
                @placement="bottom-start"
                @offset={{8}}
                @registerAPI={{this.registerAPI}}
                class="floating-panel"
            >
                Panel
            </Floating>
        `);

        await waitUntil(() => this.api?.floatingElement?.style.transform);
        const initialTransform = this.api.floatingElement.style.transform;

        this.api.computePosition(this.api.floatingTarget, this.api.floatingElement);
        await waitForFrame();

        this.api.computePosition(this.api.floatingTarget, this.api.floatingElement);
        await waitForFrame();

        assert.strictEqual(this.api.floatingElement.style.transform, initialTransform, 'transform remains stable across repeated position calculations');
    });
});

function waitForFrame() {
    return new Promise((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(resolve));
    });
}
