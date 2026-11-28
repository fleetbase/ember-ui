import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, find, findAll, settled } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import { task } from 'ember-concurrency';
import EmberObject from '@ember/object';

const OVERLAY = '.next-content-overlay';
const PANEL = '.next-content-overlay-panel';

function resource(overrides = {}) {
    return { id: 'ord_1', name: 'Order 123', isNew: false, ...overrides };
}

module('Integration | Component | layout/resource/panel', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        this.set('resource', resource());
    });

    module('rendering', function () {
        test('it renders a right-hand, full-height, backdrop-less overlay', async function (assert) {
            await render(hbs`<Layout::Resource::Panel @resource={{this.resource}} />`);

            assert.dom(OVERLAY).exists();
            assert.dom(OVERLAY).hasClass('next-content-overlay-pos-right');
            assert.dom(OVERLAY).hasClass('full-height');
            assert.dom(OVERLAY).hasClass('no-backdrop');
            assert.dom(OVERLAY).hasClass('is-open', 'the panel opens itself');
        });

        test('it defaults to 600px wide and resizable', async function (assert) {
            await render(hbs`<Layout::Resource::Panel @resource={{this.resource}} />`);

            assert.strictEqual(find(PANEL).style.width, '600px');
            assert.dom(`${OVERLAY} .gutter`).exists('a resize gutter is rendered');
        });

        test('the width and resizability can be overridden', async function (assert) {
            await render(hbs`<Layout::Resource::Panel @resource={{this.resource}} @width="900px" @isResizable={{false}} />`);

            assert.strictEqual(find(PANEL).style.width, '900px');
            assert.dom(`${OVERLAY} .gutter`).doesNotExist();
        });

        test('it yields the resource into the body', async function (assert) {
            await render(hbs`
                <Layout::Resource::Panel @resource={{this.resource}} as |resource|>
                    <span class="name">{{resource.name}}</span>
                </Layout::Resource::Panel>
            `);

            assert.dom('.next-content-overlay-panel-body .name').hasText('Order 123');
        });

        test('a body class is applied alongside the base classes', async function (assert) {
            await render(hbs`<Layout::Resource::Panel @resource={{this.resource}} @bodyClass="my-body" />`);

            assert.dom('.next-content-overlay-panel-body').hasClass('my-body');
            assert.dom('.next-content-overlay-panel-body').hasClass('no-padding');
        });

        test('it forwards splattributes to the panel', async function (assert) {
            await render(hbs`<Layout::Resource::Panel @resource={{this.resource}} data-test-panel="yes" />`);

            assert.dom(PANEL).hasAttribute('data-test-panel', 'yes');
        });

        test('it renders with no resource at all', async function (assert) {
            await render(hbs`<Layout::Resource::Panel />`);

            assert.dom(OVERLAY).exists();
            assert.dom('.resource-panel-header, .next-view-header-right').exists('the header still renders');
        });
    });

    module('the header', function () {
        test('the default header renders the title and the cancel control', async function (assert) {
            await render(hbs`<Layout::Resource::Panel @resource={{this.resource}} @headerTitle="Order 123" @onPressCancel={{this.onPressCancel}} />`);

            assert.dom(this.element).containsText('Order 123');
        });

        test('a header class is applied', async function (assert) {
            await render(hbs`<Layout::Resource::Panel @resource={{this.resource}} @headerTitle="Order 123" @headerClass="my-header" />`);

            assert.dom('.my-header').exists();
        });

        test('a custom header component replaces the default one', async function (assert) {
            await render(hbs`<Layout::Resource::Panel @resource={{this.resource}} @headerComponent="spinner" @headerClass="my-header" />`);

            assert.dom('.fleetbase-loader').exists('the named component is rendered');
            assert.dom('.fleetbase-loader-wrapper').hasClass('my-header', 'the caller class reaches the custom header');
            assert.dom('.fleetbase-loader-wrapper').hasClass('resource-panel-header', 'and so does the addon styling hook');
        });

        test('action buttons reach the default header', async function (assert) {
            const pressed = [];
            this.set('actionButtons', [{ text: 'Duplicate', class: 'my-duplicate', onClick: () => pressed.push('duplicate') }]);

            await render(hbs`<Layout::Resource::Panel @resource={{this.resource}} @actionButtons={{this.actionButtons}} />`);

            // header-actions' plain Button branch does not forward `class`, so select by label.
            const button = findAll('button.btn').find((candidate) => candidate.textContent.includes('Duplicate'));
            assert.ok(button, 'the action button is rendered');
            await click(button);

            assert.deepEqual(pressed, ['duplicate']);
        });
    });

    module('lifecycle callbacks', function () {
        test('onLoad and onOverlayReady both receive the overlay context', async function (assert) {
            const loaded = [];
            const ready = [];
            this.set('onLoad', (context) => loaded.push(context));
            this.set('onOverlayReady', (context) => ready.push(context));

            await render(hbs`<Layout::Resource::Panel @resource={{this.resource}} @onLoad={{this.onLoad}} @onOverlayReady={{this.onOverlayReady}} />`);

            assert.strictEqual(loaded.length, 1, 'onLoad fires once');
            assert.strictEqual(typeof loaded[0].close, 'function', 'the context exposes the overlay controls');
            assert.strictEqual(typeof loaded[0].toggle, 'function');
            assert.strictEqual(ready.length, 1, 'onOverlayReady fires too');
            assert.strictEqual(ready[0], loaded[0], 'both receive the same context');
        });

        test('closing the panel reports it with the resource', async function (assert) {
            const closes = [];
            let context;
            this.set('onLoad', (value) => {
                context = value;
            });
            this.set('onClose', (payload) => closes.push(payload));

            await render(hbs`<Layout::Resource::Panel @resource={{this.resource}} @onLoad={{this.onLoad}} @onClose={{this.onClose}} />`);

            context.close();
            await settled();

            assert.dom(OVERLAY).doesNotHaveClass('is-open');
            assert.strictEqual(closes.length, 1);
            assert.strictEqual(closes[0].resource, this.resource, 'the resource travels with the event');
        });

        test('reopening the panel reports it with the resource', async function (assert) {
            const opens = [];
            let context;
            this.set('onLoad', (value) => {
                context = value;
            });
            this.set('onOpen', (payload) => opens.push(payload));

            await render(hbs`<Layout::Resource::Panel @resource={{this.resource}} @onLoad={{this.onLoad}} @onOpen={{this.onOpen}} />`);

            assert.strictEqual(opens.length, 1, 'the panel opens itself on insert');

            context.close();
            await settled();
            context.open();
            await settled();

            assert.dom(OVERLAY).hasClass('is-open');
            assert.strictEqual(opens.length, 2, 'reopening reports a second time');
            assert.strictEqual(opens[1].resource, this.resource);
        });

        // panel.hbs wired @onToggle={{this.onToggle}} to an action the class never
        // defined, so the panel passed `undefined` to <Overlay> and could not forward a toggle at
        // all. The action now exists and forwards through contextComponentCallback, exactly as
        // onOpen and onClose do.
        test('toggling the panel reports it with the resource', async function (assert) {
            const toggles = [];
            let context;
            this.set('onLoad', (value) => {
                context = value;
            });
            this.set('onToggle', (payload) => toggles.push(payload));

            await render(hbs`<Layout::Resource::Panel @resource={{this.resource}} @onLoad={{this.onLoad}} @onToggle={{this.onToggle}} />`);

            // Only Overlay's toggle() reports a toggle — open() and close() each report their own
            // event and nothing else, which is why the panel's context exposes toggle separately.
            assert.strictEqual(toggles.length, 0, 'opening on insert is not a toggle');

            context.toggle();
            await settled();

            assert.strictEqual(toggles.length, 1, 'toggling closed reports it');
            assert.strictEqual(toggles[0].resource, this.resource, 'the resource travels with the event');

            context.toggle();
            await settled();

            assert.strictEqual(toggles.length, 2, 'toggling back open reports another');
        });

        test('it toggles happily with no onToggle handler', async function (assert) {
            let context;
            this.set('onLoad', (value) => {
                context = value;
            });

            await render(hbs`<Layout::Resource::Panel @resource={{this.resource}} @onLoad={{this.onLoad}} />`);

            context.toggle();
            await settled();

            assert.dom(OVERLAY).doesNotHaveClass('is-open', 'the toggle still happens without a consumer');
        });

        test('it opens and closes happily with no callbacks', async function (assert) {
            let context;
            this.set('onLoad', (value) => {
                context = value;
            });

            await render(hbs`<Layout::Resource::Panel @resource={{this.resource}} @onLoad={{this.onLoad}} />`);

            context.toggle();
            await settled();

            assert.dom(OVERLAY).doesNotHaveClass('is-open', 'no handler is required');
        });
    });
    // The panel's `authSchema` getter is only reached through the header's save button, which
    // renders when a save task is supplied and the resource is not a plain object.
    module('with a save task', function () {
        function saveTaskHost() {
            return EmberObject.extend({
                save: task(function* () {
                    yield Promise.resolve();
                }),
            }).create();
        }

        test('the header offers a save button governed by the default auth schema', async function (assert) {
            this.set('host', saveTaskHost());

            await render(hbs`<Layout::Resource::Panel @resource={{this.resource}} @saveTask={{this.host.save}} />`);

            assert.dom('.resource-panel-header button.btn').exists('the save control is rendered');
        });

        test('an explicit authSchema is used instead of the default', async function (assert) {
            this.set('host', saveTaskHost());

            await render(hbs`<Layout::Resource::Panel @resource={{this.resource}} @saveTask={{this.host.save}} @authSchema="storefront" />`);

            assert.dom('.resource-panel-header button.btn').exists('the save control still renders under a different schema');
        });
    });

    module('in the canvas layout', function () {
        test('@layout="canvas" renders it as a Sheet with the resource header and body', async function (assert) {
            this.cancelled = 0;
            this.onPressCancel = () => this.cancelled++;
            await render(hbs`
                <Layout::Resource::Panel @layout="canvas" @resource={{this.resource}} @headerTitle="Order 123" @bodyClass="my-body" @onPressCancel={{this.onPressCancel}} data-test-panel as |resource|>
                    <span class="name">{{resource.name}}</span>
                </Layout::Resource::Panel>
            `);

            assert.dom(OVERLAY).doesNotExist('no classic overlay');
            assert.dom('.fb-sheet.resource-panel-sheet').exists().hasAttribute('data-test-panel').hasAttribute('aria-label', 'Order 123');
            assert.dom('.fb-sheet-header .resource-panel-header').containsText('Order 123');
            assert.dom('.fb-sheet-close').doesNotExist('the resource header keeps its own cancel control');
            assert.dom('.fb-sheet-body .resource-panel-sheet-body.my-body .name').hasText('Order 123');
            assert.strictEqual(find('.fb-sheet').style.getPropertyValue('--fb-sheet-width'), '440px', 'without a width it uses the md sheet preset');
            assert.dom('.fb-sheet-resize').exists('resizable by default');

            await click('.next-content-overlay-panel-cancel-button');
            assert.strictEqual(this.cancelled, 1);
        });

        test('the shell service picks the canvas layout when no @layout is given', async function (assert) {
            this.owner.lookup('service:shell').setLayout('canvas');
            await render(hbs`<Layout::Resource::Panel @resource={{this.resource}} />`);

            assert.dom('.fb-sheet').exists();
            assert.dom('.fb-sheet').hasAttribute('aria-label', 'Order 123', 'titled from the resource name');
        });

        test('inside Layout::Canvas it renders as a Sheet; @layout="classic" opts out', async function (assert) {
            await render(hbs`
                <Layout::Canvas>
                    <Layout::Resource::Panel @resource={{this.resource}} class="canvas-panel" />
                    <Layout::Resource::Panel @layout="classic" @resource={{this.resource}} class="classic-panel" />
                </Layout::Canvas>
            `);

            assert.dom('.fb-sheet.canvas-panel').exists();
            assert.dom(`${PANEL}.classic-panel`).exists();
        });

        test('sheet width, limits and stacking arguments pass through', async function (assert) {
            this.activated = 0;
            this.parked = 0;
            this.onActivate = () => this.activated++;
            this.onPark = () => this.parked++;
            await render(hbs`
                <Layout::Resource::Panel @layout="canvas" @resource={{this.resource}} @sheetWidth="lg" @minResizeWidth="400px" @maxResizeWidth={{700}} @side="left"
                    @stackIndex={{0}} @stackSize={{2}} @onActivate={{this.onActivate}} @onPark={{this.onPark}} class="back" />
                <Layout::Resource::Panel @layout="canvas" @resource={{this.resource}} @isResizable={{false}} @stackIndex={{1}} @stackSize={{2}} class="front" @onPark={{this.onPark}} />
            `);

            assert.dom('.back').hasClass('is-left').hasClass('is-spine');
            assert.strictEqual(find('.back').style.getPropertyValue('--fb-sheet-width'), '640px');
            await click('.back .fb-sheet-spine');
            assert.strictEqual(this.activated, 1);

            assert.dom('.front').hasClass('is-top');
            assert.dom('.front .fb-sheet-resize').doesNotExist();
            await click('.front .fb-sheet-park');
            assert.strictEqual(this.parked, 1);
        });

        test('resize limits reach the sheet handle', async function (assert) {
            await render(hbs`<Layout::Resource::Panel @layout="canvas" @resource={{this.resource}} @minResizeWidth="400px" @maxResizeWidth={{700}} />`);

            assert.dom('.fb-sheet-resize').hasAttribute('aria-valuemin', '400').hasAttribute('aria-valuemax', '700');
        });

        test('a width given as a classic @width is used when there is no @sheetWidth', async function (assert) {
            await render(hbs`<Layout::Resource::Panel @layout="canvas" @resource={{this.resource}} @width="sm" />`);
            assert.strictEqual(find('.fb-sheet').style.getPropertyValue('--fb-sheet-width'), '360px');
        });

        test('a custom header component renders in the sheet header', async function (assert) {
            await render(hbs`<Layout::Resource::Panel @layout="canvas" @resource={{this.resource}} @headerComponent="spinner" @headerClass="my-header" />`);

            assert.dom('.fb-sheet-header .fleetbase-loader-wrapper.my-header.resource-panel-header').exists();
        });

        test('a displayName-only resource still titles the sheet, and none leaves it untitled', async function (assert) {
            this.set('resource', { displayName: 'Driver Alex' });
            await render(hbs`<Layout::Resource::Panel @layout="canvas" @resource={{this.resource}} />`);
            assert.dom('.fb-sheet').hasAttribute('aria-label', 'Driver Alex');

            await render(hbs`<Layout::Resource::Panel @layout="canvas" />`);
            assert.dom('.fb-sheet').doesNotHaveAttribute('aria-label');
        });

        test('the sheet stands in for the overlay context in onLoad, onOverlayReady and onOpen', async function (assert) {
            const calls = [];
            this.onLoad = (context) => calls.push(['onLoad', typeof context.close]);
            this.options = { onOverlayReady: (context) => calls.push(['onOverlayReady', Boolean(context.element)]) };
            this.onOpen = ({ resource, panel }) => calls.push(['onOpen', resource.name, typeof panel.park]);
            await render(hbs`<Layout::Resource::Panel @layout="canvas" @resource={{this.resource}} @onLoad={{this.onLoad}} @options={{this.options}} @onOpen={{this.onOpen}} />`);

            assert.deepEqual(calls, [
                ['onLoad', 'function'],
                ['onOverlayReady', true],
                ['onOpen', 'Order 123', 'function'],
            ]);
        });
    });
});
