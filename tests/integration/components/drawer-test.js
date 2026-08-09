import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, triggerEvent, settled, find } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

function drawer() {
    return find('.next-drawer');
}

function panel() {
    return find('.next-drawer-panel');
}

module('Integration | Component | drawer', function (hooks) {
    setupRenderingTest(hooks);

    let loaded;

    hooks.beforeEach(function () {
        loaded = [];
        this.set('onLoad', (context) => loaded.push(context));
    });

    hooks.afterEach(async function () {
        // A resize attaches document-level listeners that are only removed on mouseup;
        // make sure no test can leak one into the rest of the suite.
        await triggerEvent(document, 'mouseup', {});
    });

    module('rendering', function () {
        test('it renders an open, backdrop-less dialog by default', async function (assert) {
            await render(hbs`<Drawer @onLoad={{this.onLoad}} />`);

            assert.dom('.next-drawer').hasAttribute('role', 'dialog');
            assert.dom('.next-drawer').hasAttribute('aria-modal', 'true');
            assert.dom(drawer()).hasClass('drawer-is-open');
            assert.dom(drawer()).hasClass('drawer-no-backdrop');
            assert.dom(drawer()).doesNotHaveClass('drawer-is-minimized');
            assert.dom(drawer()).doesNotHaveClass('drawer-is-resizing');
        });

        test('the panel only appears once the deferred setup has run', async function (assert) {
            await render(hbs`<Drawer />`);

            assert.dom('.next-drawer-panel-container').exists();
            assert.dom('.next-drawer-panel').exists();
        });

        test('each state argument is reflected as a class', async function (assert) {
            await render(hbs`<Drawer @isOpen={{false}} @isMinimized={{true}} @noBackdrop={{false}} @fullHeight={{true}} />`);

            assert.dom(drawer()).doesNotHaveClass('drawer-is-open');
            assert.dom(drawer()).hasClass('drawer-is-minimized');
            assert.dom(drawer()).doesNotHaveClass('drawer-no-backdrop');
            assert.dom(drawer()).hasClass('drawer-full-height');
        });

        test('overlay and container classes are applied', async function (assert) {
            await render(hbs`<Drawer @overlayClass="my-overlay" @containerClass="my-container" />`);

            assert.dom(drawer()).hasClass('my-overlay');
            assert.dom('.next-drawer-panel-container').hasClass('my-container');
        });

        test('the panel takes the requested height and forwards splattributes', async function (assert) {
            await render(hbs`<Drawer @height={{420}} data-test-drawer="yes" />`);

            assert.dom(panel()).hasStyle({ height: '420px' });
            assert.dom(panel()).hasAttribute('data-test-drawer', 'yes');
        });

        test('a resizable drawer shows a gutter, a non-resizable one does not', async function (assert) {
            await render(hbs`<Drawer />`);
            assert.dom('.gutter').exists('resizable by default');

            await render(hbs`<Drawer @isResizable={{false}} />`);
            assert.dom('.gutter').doesNotExist();
        });

        test('the notch is opt-in', async function (assert) {
            await render(hbs`<Drawer />`);
            assert.dom('.notch').doesNotExist();

            await render(hbs`<Drawer @notchEnabled={{true}} />`);
            assert.dom('.notch').exists();
            assert.strictEqual(document.querySelectorAll('.notch .bar').length, 3);
        });
    });

    module('the yielded context', function () {
        const TEMPLATE = hbs`
            <Drawer @onOpen={{this.onOpen}} @onClose={{this.onClose}} as |drawer|>
                <button type="button" class="do-toggle" {{on "click" drawer.toggle}}>toggle</button>
                <button type="button" class="do-open" {{on "click" drawer.open}}>open</button>
                <button type="button" class="do-close" {{on "click" drawer.close}}>close</button>
                <button type="button" class="do-minimize" {{on "click" drawer.minimize}}>minimize</button>
                <button type="button" class="do-maximize" {{on "click" drawer.maximize}}>maximize</button>
                <button type="button" class="do-toggle-minimize" {{on "click" drawer.toggleMinimize}}>toggle minimize</button>
            </Drawer>
        `;

        test('close and open flip the open state and fire their callbacks', async function (assert) {
            const events = [];
            this.set('onOpen', (context) => events.push(['open', context]));
            this.set('onClose', (context) => events.push(['close', context]));

            await render(TEMPLATE);

            await click('.do-close');
            assert.dom(drawer()).doesNotHaveClass('drawer-is-open');
            assert.strictEqual(events[0][0], 'close');
            assert.strictEqual(typeof events[0][1].toggle, 'function', 'the callback receives a control context');

            await click('.do-open');
            assert.dom(drawer()).hasClass('drawer-is-open');
            assert.strictEqual(events[1][0], 'open');
        });

        test('the yielded state stays live as the drawer changes', async function (assert) {
            await render(hbs`
                <Drawer as |drawer|>
                    <span class="reported-open">{{if drawer.isOpen "open" "shut"}}</span>
                    <span class="reported-minimized">{{if drawer.isMinimized "minimized" "full"}}</span>
                    <button type="button" class="do-close" {{on "click" drawer.close}}>close</button>
                    <button type="button" class="do-minimize" {{on "click" drawer.minimize}}>minimize</button>
                </Drawer>
            `);

            assert.dom('.reported-open').hasText('open');
            assert.dom('.reported-minimized').hasText('full');

            await click('.do-close');
            assert.dom('.reported-open').hasText('shut', 'the yielded isOpen follows the drawer');

            await click('.do-minimize');
            assert.dom('.reported-minimized').hasText('minimized', 'and so does isMinimized');
        });

        test('toggle flips the open state both ways without any callback', async function (assert) {
            await render(TEMPLATE);

            await click('.do-toggle');
            assert.dom(drawer()).doesNotHaveClass('drawer-is-open');

            await click('.do-toggle');
            assert.dom(drawer()).hasClass('drawer-is-open');
        });

        test('minimize and maximize flip the minimized state', async function (assert) {
            await render(TEMPLATE);

            await click('.do-minimize');
            assert.dom(drawer()).hasClass('drawer-is-minimized');

            await click('.do-maximize');
            assert.dom(drawer()).doesNotHaveClass('drawer-is-minimized');
        });

        test('toggleMinimize alternates between the two', async function (assert) {
            await render(TEMPLATE);

            await click('.do-toggle-minimize');
            assert.dom(drawer()).hasClass('drawer-is-minimized');

            await click('.do-toggle-minimize');
            assert.dom(drawer()).doesNotHaveClass('drawer-is-minimized');
        });

        test('double-clicking the notch toggles minimization', async function (assert) {
            await render(hbs`<Drawer @notchEnabled={{true}} />`);

            await triggerEvent('.notch', 'dblclick');
            assert.dom(drawer()).hasClass('drawer-is-minimized');

            await triggerEvent('.notch', 'dblclick');
            assert.dom(drawer()).doesNotHaveClass('drawer-is-minimized');
        });
    });

    module('the onLoad context', function () {
        test('onLoad receives working controls', async function (assert) {
            await render(hbs`<Drawer @onLoad={{this.onLoad}} />`);

            assert.strictEqual(loaded.length, 1, 'onLoad fires once');
            const context = loaded[0];
            for (const key of ['toggle', 'open', 'close', 'toggleMinimize', 'minimize', 'maximize']) {
                assert.strictEqual(typeof context[key], 'function', `${key} is provided`);
            }

            context.close();
            await settled();
            assert.dom(drawer()).doesNotHaveClass('drawer-is-open', 'the handed-out controls drive the real drawer');
        });

        test('the context reports the state at the time it was built', async function (assert) {
            await render(hbs`<Drawer @onLoad={{this.onLoad}} />`);

            loaded[0].minimize();
            await settled();

            assert.true(loaded[0].isMinimized === false, 'the snapshot is not live; callers must re-read via a fresh callback');
            assert.dom(drawer()).hasClass('drawer-is-minimized', 'the drawer itself did update');
        });

        test('minimize, maximize and toggleMinimize each accept their own callback', async function (assert) {
            const fired = [];
            await render(hbs`<Drawer @onLoad={{this.onLoad}} />`);
            const context = loaded[0];

            context.minimize({ onMinimize: (ctx) => fired.push(['minimize', ctx]) });
            context.maximize({ onMaximize: (ctx) => fired.push(['maximize', ctx]) });
            context.toggleMinimize({ onToggle: (ctx) => fired.push(['toggle', ctx]) });
            await settled();

            assert.deepEqual(
                fired.map(([name]) => name),
                ['minimize', 'maximize', 'toggle']
            );
            assert.strictEqual(typeof fired[0][1].open, 'function', 'each callback receives a context');
        });

        test('it renders without any callbacks at all', async function (assert) {
            await render(hbs`<Drawer />`);

            assert.dom('.next-drawer').exists();
        });
    });

    module('resizing', function () {
        async function startResize(clientY = 500) {
            await triggerEvent('.gutter', 'mousedown', { clientX: 0, clientY });
        }

        test('a mousedown on the gutter begins a resize and reports it', async function (assert) {
            let started;
            this.set('onResizeStart', (info) => (started = info));

            await render(hbs`<Drawer @onResizeStart={{this.onResizeStart}} />`);
            await startResize();

            assert.dom(drawer()).hasClass('drawer-is-resizing');
            assert.ok(started.event, 'the originating event is forwarded');
            assert.strictEqual(started.drawerPanelNode, panel());
            assert.strictEqual(typeof started.context.toggle, 'function');

            await triggerEvent(document, 'mouseup', {});
        });

        test('dragging upward grows the panel and reports each step', async function (assert) {
            const sizes = [];
            this.set('onResize', (info) => sizes.push(info.drawerPanelNode.style.height));

            await render(hbs`<Drawer @height={{300}} @onResize={{this.onResize}} />`);
            await startResize(500);
            await triggerEvent(document, 'mousemove', { clientY: 450 });

            assert.strictEqual(sizes.length, 1, 'the move is reported');
            assert.dom(panel()).hasStyle({ userSelect: 'none' }, 'text selection is suppressed while dragging');
            assert.strictEqual(document.body.style.cursor, 'row-resize');

            await triggerEvent(document, 'mouseup', {});
        });

        test('the panel is clamped to the maximum height', async function (assert) {
            await render(hbs`<Drawer @height={{300}} @maxResizeHeight={{320}} />`);
            await startResize(500);
            await triggerEvent(document, 'mousemove', { clientY: 100 });

            assert.dom(panel()).hasStyle({ height: '320px' });

            await triggerEvent(document, 'mouseup', {});
        });

        test('the panel is clamped to the minimum height', async function (assert) {
            await render(hbs`<Drawer @height={{300}} @minResizeHeight={{120}} />`);
            await startResize(100);
            await triggerEvent(document, 'mousemove', { clientY: 900 });

            assert.dom(panel()).hasStyle({ height: '120px' });

            await triggerEvent(document, 'mouseup', {});
        });

        test('mouseup ends the resize and cleans up', async function (assert) {
            let ended;
            this.set('onResizeEnd', (info) => (ended = info));

            await render(hbs`<Drawer @onResizeEnd={{this.onResizeEnd}} />`);
            await startResize();
            await triggerEvent(document, 'mousemove', { clientY: 450 });
            await triggerEvent(document, 'mouseup', {});

            assert.dom(drawer()).doesNotHaveClass('drawer-is-resizing');
            assert.dom(panel()).hasStyle({ userSelect: 'auto' });
            assert.strictEqual(document.body.style.cursor, '', 'the row-resize cursor is released');
            assert.ok(ended, 'the end of the drag is reported');
        });

        test('further mouse movement after mouseup is ignored', async function (assert) {
            const sizes = [];
            this.set('onResize', (info) => sizes.push(info.drawerPanelNode.style.height));

            await render(hbs`<Drawer @onResize={{this.onResize}} />`);
            await startResize();
            await triggerEvent(document, 'mousemove', { clientY: 450 });
            await triggerEvent(document, 'mouseup', {});

            const afterRelease = sizes.length;
            await triggerEvent(document, 'mousemove', { clientY: 400 });

            assert.strictEqual(sizes.length, afterRelease, 'the listener was removed');
        });

        test('disableResize refuses to start a drag', async function (assert) {
            let started = false;
            this.set('onResizeStart', () => (started = true));

            await render(hbs`<Drawer @disableResize={{true}} @onResizeStart={{this.onResizeStart}} />`);
            await startResize();

            assert.false(started);
            assert.dom(drawer()).doesNotHaveClass('drawer-is-resizing');
        });

        test('dragging a minimized drawer restores it instead of resizing', async function (assert) {
            let started = false;
            this.set('onResizeStart', () => (started = true));

            await render(hbs`<Drawer @isMinimized={{true}} @onResizeStart={{this.onResizeStart}} />`);
            await startResize();

            assert.dom(drawer()).doesNotHaveClass('drawer-is-minimized', 'the drag maximizes it');
            assert.dom(drawer()).doesNotHaveClass('drawer-is-resizing', 'and does not begin a resize');
            assert.false(started);
        });

        test('it resizes without any resize callbacks', async function (assert) {
            await render(hbs`<Drawer @height={{300}} />`);
            await startResize(500);
            await triggerEvent(document, 'mousemove', { clientY: 450 });
            await triggerEvent(document, 'mouseup', {});

            assert.dom(drawer()).doesNotHaveClass('drawer-is-resizing', 'the drag completes cleanly');
        });
    });
});
