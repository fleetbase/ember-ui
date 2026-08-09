import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, settled, triggerEvent } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | layout/sidebar', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        this.sidebarService = this.owner.lookup('service:sidebar');
    });

    function useInlineSidebarWidth(sidebar) {
        sidebar.getBoundingClientRect = () => {
            return {
                width: Number.parseFloat(sidebar.style.width) || 220,
            };
        };
    }

    async function waitForResizeFrame() {
        await new Promise((resolve) => requestAnimationFrame(resolve));
    }

    function dispatchMouseup(clientX) {
        document.dispatchEvent(new MouseEvent('mouseup', { clientX, bubbles: true }));
    }

    function renderSidebarInViewContainer() {
        return render(hbs`
            <main class="next-view-container">
                <Layout::Sidebar @collapseBelowWidth={{160}} @minResizeWidth={{200}} />
                <section class="next-view-section"></section>
            </main>
        `);
    }

    test('it registers with the sidebar service and initializes visible state', async function (assert) {
        await render(hbs`<Layout::Sidebar />`);

        assert.true(this.sidebarService.hasContext);
        assert.true(this.sidebarService.isVisible);
        assert.false(this.sidebarService.isHidden);
        assert.dom('nav.next-sidebar').doesNotHaveClass('sidebar-hidden');
    });

    test('it yields contextual sidebar components', async function (assert) {
        // sidebar-navigator's normalizeItems() drops any item with no route, url, onClick or
        // children — a navigable target is what makes an item renderable.
        this.set('items', [{ label: 'Orders', icon: 'box', route: 'console.orders' }]);

        await render(hbs`
            <Layout::Sidebar as |Sidebar|>
                <Sidebar.Navigator @items={{this.items}} />
            </Layout::Sidebar>
        `);

        assert.dom('.next-sidebar-navigator').exists();
        assert.dom('.next-sidebar-navigator-item').includesText('Orders');
    });

    test('a yielded navigator drops items with no navigable target', async function (assert) {
        this.set('items', [
            { label: 'Orders', icon: 'box', route: 'console.orders' },
            { label: 'Unreachable', icon: 'ban' },
        ]);

        await render(hbs`
            <Layout::Sidebar as |Sidebar|>
                <Sidebar.Navigator @items={{this.items}} />
            </Layout::Sidebar>
        `);

        assert.dom('.next-sidebar-navigator').doesNotContainText('Unreachable', 'a targetless item is filtered out');
        assert.dom('.next-sidebar-navigator').includesText('Orders', 'the navigable one survives');
    });

    test('it keeps the resize gutter overlaid on the sidebar edge', async function (assert) {
        await render(hbs`<Layout::Sidebar />`);

        const sidebar = this.element.querySelector('nav.next-sidebar');
        const content = this.element.querySelector('.next-sidebar-content');
        const contentInner = this.element.querySelector('.next-sidebar-content-inner');
        const gutter = this.element.querySelector('.next-sidebar-content + .gutter');
        const sidebarStyles = window.getComputedStyle(sidebar);
        const contentInnerStyles = window.getComputedStyle(contentInner);
        const gutterStyles = window.getComputedStyle(gutter);
        const gutterIndicatorStyles = window.getComputedStyle(gutter, '::before');

        assert.strictEqual(sidebarStyles.overflowY, 'hidden', 'outer sidebar does not own vertical scrolling');
        assert.strictEqual(contentInnerStyles.overflowY, 'auto', 'inner content owns vertical scrolling');
        assert.strictEqual(gutterStyles.position, 'absolute', 'gutter overlays instead of consuming flex width');
        assert.strictEqual(gutterStyles.right, '0px', 'gutter sits on the outside resize edge');
        assert.strictEqual(gutterStyles.backgroundColor, 'rgba(0, 0, 0, 0)', 'gutter hit area is visually transparent');
        assert.strictEqual(gutterStyles.backgroundImage, 'none', 'gutter clears the global splitter background image');
        assert.strictEqual(gutterStyles.borderRightWidth, '0px', 'gutter does not create a wide visual border');
        assert.strictEqual(gutterStyles.boxShadow, 'none', 'gutter does not create a visual lane');
        assert.strictEqual(gutterIndicatorStyles.width, '2px', 'gutter indicator is a narrow hover edge');
        assert.strictEqual(gutterIndicatorStyles.backgroundColor, 'rgba(0, 0, 0, 0)', 'gutter indicator is hidden until hover or resize');
        assert.ok(content.getBoundingClientRect().width <= sidebar.getBoundingClientRect().width, 'content remains within the sidebar shell');
    });

    test('it uses the light theme sidebar edge color', async function (assert) {
        const originalTheme = document.body.dataset.theme;
        document.body.dataset.theme = 'light';

        await render(hbs`<Layout::Sidebar />`);

        const sidebar = this.element.querySelector('nav.next-sidebar');
        const edgeStyles = window.getComputedStyle(sidebar, '::after');

        assert.strictEqual(edgeStyles.width, '1px');
        assert.strictEqual(edgeStyles.backgroundColor, 'rgb(229, 231, 235)');

        if (originalTheme) {
            document.body.dataset.theme = originalTheme;
        } else {
            delete document.body.dataset.theme;
        }
    });

    test('it uses the dark theme sidebar edge color', async function (assert) {
        const originalTheme = document.body.dataset.theme;
        document.body.dataset.theme = 'dark';

        await render(hbs`<Layout::Sidebar />`);

        const sidebar = this.element.querySelector('nav.next-sidebar');
        const edgeStyles = window.getComputedStyle(sidebar, '::after');

        assert.strictEqual(edgeStyles.width, '1px');
        assert.strictEqual(edgeStyles.backgroundColor, 'rgb(55, 65, 81)');

        if (originalTheme) {
            document.body.dataset.theme = originalTheme;
        } else {
            delete document.body.dataset.theme;
        }
    });

    test('it shrinks the shell while pushing the minimum-width drawer during collapse drag', async function (assert) {
        await renderSidebarInViewContainer();

        const sidebar = this.element.querySelector('nav.next-sidebar');
        const viewContainer = this.element.querySelector('.next-view-container');
        const content = this.element.querySelector('.next-sidebar-content');
        const contentInner = this.element.querySelector('.next-sidebar-content-inner');
        const gutter = this.element.querySelector('.next-sidebar-content + .gutter');

        sidebar.style.width = '220px';
        useInlineSidebarWidth(sidebar);

        await triggerEvent(gutter, 'mousedown', { clientX: 220 });
        await triggerEvent(document, 'mousemove', { clientX: 140 });
        await waitForResizeFrame();

        assert.dom('nav.next-sidebar').hasClass('sidebar-is-resizing');
        assert.dom(viewContainer).hasClass('sidebar-is-resizing');
        assert.dom(document.body).hasClass('next-sidebar-is-resizing');
        assert.dom('nav.next-sidebar').hasClass('sidebar-resizing-to-collapse');
        assert.strictEqual(sidebar.style.width, '140px', 'shell slot keeps tracking below the release threshold');
        assert.strictEqual(sidebar.style.getPropertyValue('--sidebar-drawer-width'), '200px', 'drawer keeps the minimum readable width');
        assert.strictEqual(sidebar.style.getPropertyValue('--sidebar-collapse-offset'), '-60px', 'drawer is pushed inside the shrinking shell');
        assert.ok(Number(sidebar.style.getPropertyValue('--sidebar-collapse-progress')) < 1, 'collapse progress does not reach full fade at the release threshold');
        assert.strictEqual(window.getComputedStyle(sidebar).transitionDuration, '0s', 'active resize does not lag behind cursor movement');
        assert.strictEqual(window.getComputedStyle(sidebar).transform, 'none', 'collapse transform is not applied to the shell');
        assert.notStrictEqual(window.getComputedStyle(content).transform, 'none', 'collapse transform is applied to the drawer');
        assert.ok(Number(window.getComputedStyle(contentInner).opacity) > 0, 'content remains visible while shell is wider than 50px');

        dispatchMouseup(140);

        assert.true(this.sidebarService.isHidden);
        assert.dom('nav.next-sidebar').doesNotHaveClass('sidebar-is-resizing');
        assert.dom(viewContainer).doesNotHaveClass('sidebar-is-resizing');
        assert.dom(document.body).doesNotHaveClass('next-sidebar-is-resizing');
        assert.dom('nav.next-sidebar').hasClass('sidebar-hide');
        assert.strictEqual(sidebar.style.width, '140px', 'width is not restored before the hide transition starts');
        assert.strictEqual(sidebar.style.getPropertyValue('--sidebar-collapse-offset'), '-60px', 'collapse offset remains during the hide transition');

        await settled();

        assert.dom('nav.next-sidebar').hasClass('sidebar-hidden');
        assert.strictEqual(sidebar.style.width, '220px', 'comfortable width is restored only after the sidebar is hidden');
        assert.strictEqual(sidebar.style.getPropertyValue('--sidebar-collapse-offset'), '', 'collapse state is cleared after hidden width restore');
    });

    test('it keeps a one pixel active rail when collapse drag overshoots past zero', async function (assert) {
        await renderSidebarInViewContainer();

        const sidebar = this.element.querySelector('nav.next-sidebar');
        const viewContainer = this.element.querySelector('.next-view-container');
        const content = this.element.querySelector('.next-sidebar-content');
        const gutter = this.element.querySelector('.next-sidebar-content + .gutter');

        sidebar.style.width = '220px';
        useInlineSidebarWidth(sidebar);

        await triggerEvent(gutter, 'mousedown', { clientX: 220 });
        await triggerEvent(document, 'mousemove', { clientX: -20 });
        await waitForResizeFrame();

        assert.strictEqual(sidebar.style.width, '1px', 'shell keeps a stable active rail while the cursor overshoots');
        assert.strictEqual(sidebar.style.getPropertyValue('--sidebar-collapse-offset'), '-199px', 'drawer offset clamps to the active rail');
        assert.strictEqual(sidebar.style.getPropertyValue('--sidebar-collapse-progress'), '1');
        assert.notStrictEqual(window.getComputedStyle(content).transform, 'none');
        assert.dom(viewContainer).hasClass('sidebar-is-resizing');

        await triggerEvent(document, 'mouseup', { clientX: -20 });

        assert.true(this.sidebarService.isHidden);
        assert.dom(viewContainer).doesNotHaveClass('sidebar-is-resizing');
        assert.dom(document.body).doesNotHaveClass('next-sidebar-is-resizing');
    });

    test('it prevents horizontal document autoscroll during resize overshoot', async function (assert) {
        await renderSidebarInViewContainer();

        const sidebar = this.element.querySelector('nav.next-sidebar');
        const viewContainer = this.element.querySelector('.next-view-container');
        const gutter = this.element.querySelector('.next-sidebar-content + .gutter');

        sidebar.style.width = '220px';
        useInlineSidebarWidth(sidebar);

        await triggerEvent(gutter, 'mousedown', { clientX: 220 });

        document.documentElement.scrollLeft = 40;
        document.body.scrollLeft = 30;
        viewContainer.scrollLeft = 20;

        await triggerEvent(document, 'mousemove', { clientX: -80 });
        await waitForResizeFrame();

        assert.strictEqual(document.documentElement.scrollLeft, 0, 'document element horizontal scroll is reset during drag');
        assert.strictEqual(document.body.scrollLeft, 0, 'body horizontal scroll is reset during drag');
        assert.strictEqual(viewContainer.scrollLeft, 0, 'view container horizontal scroll is reset during drag');
        assert.dom(document.body).hasClass('next-sidebar-is-resizing');

        await triggerEvent(document, 'mouseup', { clientX: -80 });

        assert.dom(document.body).doesNotHaveClass('next-sidebar-is-resizing');
    });

    test('it reaches full fade near 50px of visible shell width', async function (assert) {
        await render(hbs`<Layout::Sidebar @collapseBelowWidth={{160}} @minResizeWidth={{200}} />`);

        const sidebar = this.element.querySelector('nav.next-sidebar');
        const contentInner = this.element.querySelector('.next-sidebar-content-inner');
        const gutter = this.element.querySelector('.next-sidebar-content + .gutter');

        sidebar.style.width = '220px';
        useInlineSidebarWidth(sidebar);

        await triggerEvent(gutter, 'mousedown', { clientX: 220 });
        await triggerEvent(document, 'mousemove', { clientX: 50 });
        await waitForResizeFrame();

        assert.strictEqual(sidebar.style.width, '50px', 'shell slot keeps tracking to the fade endpoint');
        assert.strictEqual(sidebar.style.getPropertyValue('--sidebar-collapse-offset'), '-150px');
        assert.strictEqual(sidebar.style.getPropertyValue('--sidebar-collapse-progress'), '1');
        assert.strictEqual(window.getComputedStyle(contentInner).opacity, '0');

        await triggerEvent(document, 'mouseup', { clientX: 50 });

        assert.true(this.sidebarService.isHidden);
    });

    test('it restores the minimum visible width when released during push-out above the collapse threshold', async function (assert) {
        await renderSidebarInViewContainer();

        const sidebar = this.element.querySelector('nav.next-sidebar');
        const viewContainer = this.element.querySelector('.next-view-container');
        const gutter = this.element.querySelector('.next-sidebar-content + .gutter');

        sidebar.style.width = '220px';
        useInlineSidebarWidth(sidebar);

        await triggerEvent(gutter, 'mousedown', { clientX: 220 });
        await triggerEvent(document, 'mousemove', { clientX: 180 });
        await waitForResizeFrame();

        assert.strictEqual(sidebar.style.width, '180px', 'shell slot follows the drag during push-out');
        assert.strictEqual(sidebar.style.getPropertyValue('--sidebar-drawer-width'), '200px');
        assert.strictEqual(sidebar.style.getPropertyValue('--sidebar-collapse-offset'), '-20px');

        await triggerEvent(document, 'mouseup', { clientX: 180 });

        assert.true(this.sidebarService.isVisible);
        assert.dom(viewContainer).doesNotHaveClass('sidebar-is-resizing');
        assert.dom(document.body).doesNotHaveClass('next-sidebar-is-resizing');
        assert.dom('nav.next-sidebar').doesNotHaveClass('sidebar-hidden');
        assert.dom('nav.next-sidebar').doesNotHaveClass('sidebar-hide');
        assert.dom('nav.next-sidebar').doesNotHaveClass('sidebar-resizing-to-collapse');
        assert.strictEqual(sidebar.style.width, '200px');
        assert.strictEqual(sidebar.style.getPropertyValue('--sidebar-drawer-width'), '');
        assert.strictEqual(sidebar.style.getPropertyValue('--sidebar-collapse-offset'), '');
    });

    test('it restores the last comfortable width after resize collapse', async function (assert) {
        await render(hbs`<Layout::Sidebar @collapseBelowWidth={{160}} @minResizeWidth={{200}} />`);

        const sidebar = this.element.querySelector('nav.next-sidebar');
        const gutter = this.element.querySelector('.next-sidebar-content + .gutter');

        sidebar.style.width = '240px';
        useInlineSidebarWidth(sidebar);

        await triggerEvent(gutter, 'mousedown', { clientX: 240 });
        await triggerEvent(document, 'mousemove', { clientX: 120 });
        await triggerEvent(document, 'mouseup', { clientX: 120 });

        this.sidebarService.show();

        assert.strictEqual(sidebar.style.width, '240px');
        assert.true(this.sidebarService.isVisible);
    });

    test('it initializes hidden state when rendered with @hide', async function (assert) {
        await render(hbs`<Layout::Sidebar @hide={{true}} />`);

        assert.true(this.sidebarService.isHidden);
        assert.dom('nav.next-sidebar').hasClass('sidebar-hidden');
    });

    test('it initializes hidden state when the sidebar service is disabled', async function (assert) {
        this.sidebarService.disable();

        await render(hbs`<Layout::Sidebar />`);

        assert.true(this.sidebarService.isDisabled);
        assert.true(this.sidebarService.isHidden);
        assert.dom('nav.next-sidebar').hasClass('sidebar-hidden');
    });

    test('service-driven state changes stay aligned with DOM classes', async function (assert) {
        await render(hbs`<Layout::Sidebar />`);

        this.sidebarService.minimize();
        assert.true(this.sidebarService.isMinimized);
        assert.dom('nav.next-sidebar').hasClass('sidebar-minimized');
        assert.dom('nav.next-sidebar').doesNotHaveClass('sidebar-hidden');

        this.sidebarService.show();
        assert.true(this.sidebarService.isVisible);
        assert.dom('nav.next-sidebar').doesNotHaveClass('sidebar-minimized');
        assert.dom('nav.next-sidebar').doesNotHaveClass('sidebar-hidden');

        this.sidebarService.hideNow();
        assert.true(this.sidebarService.isHidden);
        assert.dom('nav.next-sidebar').hasClass('sidebar-hidden');

        this.sidebarService.show();
        this.sidebarService.hide();
        assert.true(this.sidebarService.isHidden, 'service updates immediately during animated hide');
        assert.dom('nav.next-sidebar').hasClass('sidebar-hide');

        await settled();

        assert.dom('nav.next-sidebar').hasClass('sidebar-hidden');
        assert.dom('nav.next-sidebar').doesNotHaveClass('sidebar-hide');
    });

    test('it clears the registered context on teardown', async function (assert) {
        this.set('isRendered', true);

        await render(hbs`
          {{#if this.isRendered}}
            <Layout::Sidebar />
          {{/if}}
        `);

        assert.true(this.sidebarService.hasContext);

        this.set('isRendered', false);
        await settled();

        assert.false(this.sidebarService.hasContext);
    });

    module('the sidebar context', function () {
        function contextFrom(context) {
            let received;
            context.set('onSetup', (value) => {
                received = value;
            });

            return () => received;
        }

        test('onSetup receives a context exposing the sidebar controls', async function (assert) {
            const read = contextFrom(this);

            await render(hbs`<Layout::Sidebar @onSetup={{this.onSetup}} />`);

            const context = read();
            assert.ok(context, 'a context is handed back');
            assert.strictEqual(typeof context.hide, 'function');
            assert.strictEqual(typeof context.hideNow, 'function');
            assert.strictEqual(typeof context.show, 'function');
            assert.strictEqual(typeof context.minimize, 'function');
            assert.ok(context.component, 'the component itself is reachable through the context');
        });

        test('the same context is registered with the sidebar service', async function (assert) {
            const read = contextFrom(this);

            await render(hbs`<Layout::Sidebar @onSetup={{this.onSetup}} />`);

            assert.strictEqual(this.sidebarService.context, read(), 'the service holds the very same context');
            assert.true(this.sidebarService.hasContext);
        });

        test('the context can hide, minimize and show the sidebar', async function (assert) {
            const read = contextFrom(this);

            await render(hbs`<Layout::Sidebar @onSetup={{this.onSetup}} />`);
            const context = read();

            context.hideNow();
            await settled();
            assert.dom('nav.next-sidebar').hasClass('sidebar-hidden', 'hideNow hides it immediately');

            context.minimize();
            await settled();
            assert.dom('nav.next-sidebar').hasClass('sidebar-minimized');
            assert.dom('nav.next-sidebar').doesNotHaveClass('sidebar-hidden');

            context.show();
            await settled();
            assert.dom('nav.next-sidebar').doesNotHaveClass('sidebar-minimized');
            assert.dom('nav.next-sidebar').doesNotHaveClass('sidebar-hidden');
        });

        test('a sidebar rendered with @hide starts hidden', async function (assert) {
            await render(hbs`<Layout::Sidebar @hide={{true}} />`);

            assert.dom('nav.next-sidebar').hasClass('sidebar-hidden');
        });

        test('a sidebar starts hidden when the service says so', async function (assert) {
            this.sidebarService.setVisualState('hidden');

            await render(hbs`<Layout::Sidebar />`);

            assert.dom('nav.next-sidebar').hasClass('sidebar-hidden');
        });

        test('a sidebar starts minimized when the service says so', async function (assert) {
            this.sidebarService.setVisualState('minimized');

            await render(hbs`<Layout::Sidebar />`);

            assert.dom('nav.next-sidebar').hasClass('sidebar-minimized');
        });

        test('a disabled sidebar starts hidden whatever the visual state says', async function (assert) {
            this.sidebarService.setVisualState('visible');
            this.sidebarService.setEnabled(false);

            await render(hbs`<Layout::Sidebar />`);

            assert.dom('nav.next-sidebar').hasClass('sidebar-hidden');
        });

        test('an @onSidebarSetup argument is called with the nav element', async function (assert) {
            const nodes = [];
            this.set('onSidebarSetup', (node) => nodes.push(node));

            await render(hbs`<Layout::Sidebar @onSidebarSetup={{this.onSidebarSetup}} />`);

            assert.strictEqual(nodes.length, 1, 'the caller hook fires once');
            assert.strictEqual(nodes[0], this.element.querySelector('nav.next-sidebar'), 'it receives the nav element');
        });

        test('it renders without any setup hooks at all', async function (assert) {
            await render(hbs`<Layout::Sidebar />`);

            assert.dom('nav.next-sidebar').exists('no hooks are required');
        });
    });

    // The drags above always widen or collapse against explicit width arguments and without any
    // resize callbacks. These cover the other half: the reported callbacks, the built-in width
    // defaults, and a drag that grows the sidebar rather than collapsing it.
    module('resize reporting and the default width limits', function () {
        function sidebarAndGutter(root) {
            return [root.querySelector('nav.next-sidebar'), root.querySelector('.gutter')];
        }

        test('a widening drag reports through every resize callback', async function (assert) {
            const stages = [];
            this.set('onResizeStart', ({ sidebarNode }) => stages.push(['start', sidebarNode.tagName]));
            this.set('onResize', ({ sidebarNode }) => stages.push(['resize', sidebarNode.tagName]));
            this.set('onResizeEnd', ({ sidebarNode }) => stages.push(['end', sidebarNode.tagName]));

            await render(hbs`
                <main class="next-view-container">
                    <Layout::Sidebar @onResizeStart={{this.onResizeStart}} @onResize={{this.onResize}} @onResizeEnd={{this.onResizeEnd}} />
                </main>
            `);

            const [sidebar, gutter] = sidebarAndGutter(this.element);
            sidebar.style.width = '220px';
            useInlineSidebarWidth(sidebar);

            await triggerEvent(gutter, 'mousedown', { clientX: 220 });
            await triggerEvent(document, 'mousemove', { clientX: 300 });
            await waitForResizeFrame();

            // No @minResizeWidth/@maxResizeWidth were supplied, so the built-in 200/330 apply.
            assert.strictEqual(sidebar.style.width, '300px', 'the sidebar grows with the cursor');
            assert.dom(sidebar).doesNotHaveClass('sidebar-resizing-to-collapse', 'growing is not a collapse');

            dispatchMouseup(300);
            await settled();

            assert.deepEqual(
                stages.map((stage) => stage[0]),
                ['start', 'resize', 'end'],
                'every stage of the drag is reported'
            );
            assert.strictEqual(stages[0][1], 'NAV', 'and each one is handed the sidebar element');
            assert.false(this.sidebarService.isHidden, 'releasing above the collapse threshold leaves it visible');
        });

        test('a drag past the built-in maximum stops widening there', async function (assert) {
            await render(hbs`
                <main class="next-view-container">
                    <Layout::Sidebar />
                </main>
            `);

            const [sidebar, gutter] = sidebarAndGutter(this.element);
            sidebar.style.width = '220px';
            useInlineSidebarWidth(sidebar);

            await triggerEvent(gutter, 'mousedown', { clientX: 220 });
            await triggerEvent(document, 'mousemove', { clientX: 600 });
            await waitForResizeFrame();

            assert.strictEqual(sidebar.style.width, '330px', 'the default maximum width caps the drag');

            dispatchMouseup(600);
            await settled();
        });

        test('two moves inside one frame apply only the last position', async function (assert) {
            await render(hbs`
                <main class="next-view-container">
                    <Layout::Sidebar />
                </main>
            `);

            const [sidebar, gutter] = sidebarAndGutter(this.element);
            sidebar.style.width = '220px';
            useInlineSidebarWidth(sidebar);

            await triggerEvent(gutter, 'mousedown', { clientX: 220 });

            // Dispatched synchronously so no animation frame can run between them: the second
            // move must reuse the frame the first one scheduled.
            document.dispatchEvent(new MouseEvent('mousemove', { clientX: 260, bubbles: true }));
            document.dispatchEvent(new MouseEvent('mousemove', { clientX: 300, bubbles: true }));

            await waitForResizeFrame();
            await settled();

            assert.strictEqual(sidebar.style.width, '300px', 'the last position in the frame wins');

            dispatchMouseup(300);
            await settled();
        });
    });

    module('resizing switched off', function () {
        test('@disableResize refuses to start a drag at all', async function (assert) {
            await render(hbs`
                <main class="next-view-container">
                    <Layout::Sidebar @disableResize={{true}} />
                </main>
            `);

            const sidebar = this.element.querySelector('nav.next-sidebar');
            const gutter = this.element.querySelector('.gutter');
            sidebar.style.width = '220px';
            useInlineSidebarWidth(sidebar);

            await triggerEvent(gutter, 'mousedown', { clientX: 220 });

            assert.dom(sidebar).doesNotHaveClass('sidebar-is-resizing', 'the drag never starts');
            assert.dom(document.body).doesNotHaveClass('next-sidebar-is-resizing');

            await triggerEvent(document, 'mousemove', { clientX: 300 });
            await waitForResizeFrame();

            assert.strictEqual(sidebar.style.width, '220px', 'and moving the mouse changes nothing');
        });

        test('disabling resize mid-drag stops the sidebar following the cursor', async function (assert) {
            this.set('disableResize', false);

            await render(hbs`
                <main class="next-view-container">
                    <Layout::Sidebar @disableResize={{this.disableResize}} />
                </main>
            `);

            const sidebar = this.element.querySelector('nav.next-sidebar');
            const gutter = this.element.querySelector('.gutter');
            sidebar.style.width = '220px';
            useInlineSidebarWidth(sidebar);

            await triggerEvent(gutter, 'mousedown', { clientX: 220 });
            await triggerEvent(document, 'mousemove', { clientX: 300 });
            await waitForResizeFrame();
            assert.strictEqual(sidebar.style.width, '300px', 'the drag is under way');

            this.set('disableResize', true);
            await settled();

            await triggerEvent(document, 'mousemove', { clientX: 400 });
            await waitForResizeFrame();

            assert.strictEqual(sidebar.style.width, '300px', 'further movement is ignored');
        });
    });

    module('a hide that is still animating', function () {
        test('showing again cancels the pending hide', async function (assert) {
            let context;
            this.set('onSetup', (value) => {
                context = value;
            });

            await render(hbs`<Layout::Sidebar @onSetup={{this.onSetup}} />`);

            // The non-immediate hide adds the animating class and arms a 500ms timer to finish
            // the job; `settled()` would otherwise wait that timer out.
            context.hide();

            assert.dom('nav.next-sidebar').hasClass('sidebar-hide', 'the hide animation has started');

            context.show();
            await settled();

            assert.dom('nav.next-sidebar').doesNotHaveClass('sidebar-hidden', 'the pending hide never lands');
            assert.dom('nav.next-sidebar').doesNotHaveClass('sidebar-hide');
            assert.false(this.sidebarService.isHidden, 'and the service is back to visible');
        });

        test('an inline transition survives the width restore after a collapse', async function (assert) {
            await renderSidebarInViewContainer();

            const sidebar = this.element.querySelector('nav.next-sidebar');
            const gutter = this.element.querySelector('.gutter');

            sidebar.style.width = '220px';
            sidebar.style.transition = 'width 1s ease';
            // Read it back: the browser normalises `ease` away, so compare against what it stored.
            const originalTransition = sidebar.style.transition;
            useInlineSidebarWidth(sidebar);

            await triggerEvent(gutter, 'mousedown', { clientX: 220 });
            await triggerEvent(document, 'mousemove', { clientX: 140 });
            await waitForResizeFrame();

            dispatchMouseup(140);
            await settled();

            assert.dom('nav.next-sidebar').hasClass('sidebar-hidden', 'the collapse completes');
            assert.strictEqual(sidebar.style.transition, originalTransition, 'the restore puts the caller’s transition back');
        });
    });
});
