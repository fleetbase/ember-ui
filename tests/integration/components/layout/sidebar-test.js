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
        this.set('items', [{ label: 'Orders', icon: 'box' }]);

        await render(hbs`
            <Layout::Sidebar as |Sidebar|>
                <Sidebar.Navigator @items={{this.items}} />
            </Layout::Sidebar>
        `);

        assert.dom('.next-sidebar-navigator').exists();
        assert.dom('.next-sidebar-navigator-item').hasText('Orders');
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
});
