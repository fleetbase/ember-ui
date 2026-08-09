import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, find, findAll, settled } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

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
});
