import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, settled } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import { setupShellTheme, renderShell, eachShellTheme } from '@fleetbase/ember-ui/test-support';

const CANVAS_BG = { light: 'rgb(238, 241, 245)', dark: 'rgb(11, 18, 32)' };
const TEXT = { light: 'rgb(15, 23, 42)', dark: 'rgb(231, 236, 244)' };

// Test-only geometry is applied from JS: templates may not carry inline styles.
function applyStyle(element, styles) {
    for (const [property, value] of Object.entries(styles)) {
        element.style.setProperty(property, value);
    }
    return element;
}

module('Integration | Component | layout/canvas', function (hooks) {
    setupRenderingTest(hooks);
    setupShellTheme(hooks);

    test('by default it renders the dot-grid backdrop and the content layer, and no chrome layer', async function (assert) {
        await render(hbs`<Layout::Canvas><p class="page">Orders</p></Layout::Canvas>`);

        assert.dom('.fb-canvas').exists();
        assert.dom('.fb-canvas > [data-canvas-layer]').exists({ count: 2 }, 'only backdrop and content render without a chrome block');
        assert.dom('.fb-canvas-backdrop .fb-canvas-dot-grid').exists('the backdrop falls back to the dot grid');
        assert.dom('main.fb-canvas-content').exists('the content layer is the main landmark');
        assert.dom('main.fb-canvas-content .page').hasText('Orders');
        assert.dom('.fb-canvas-chrome').doesNotExist();
    });

    test('a backdrop block replaces the dot grid', async function (assert) {
        await render(hbs`
            <Layout::Canvas>
                <:backdrop><div class="live-map">map</div></:backdrop>
                <:default><p class="page">Orders</p></:default>
            </Layout::Canvas>
        `);

        assert.dom('.fb-canvas-backdrop .live-map').hasText('map');
        assert.dom('.fb-canvas-dot-grid').doesNotExist();
        assert.dom('.fb-canvas-content .page').hasText('Orders');
    });

    test('a chrome block renders the chrome layer above the content', async function (assert) {
        await render(hbs`
            <Layout::Canvas>
                <:chrome><nav class="dock" aria-label="Modules">dock</nav></:chrome>
            </Layout::Canvas>
        `);

        const layers = [...this.element.querySelectorAll('.fb-canvas > [data-canvas-layer]')];
        assert.deepEqual(
            layers.map((layer) => layer.dataset.canvasLayer),
            ['backdrop', 'content', 'chrome'],
            'layers render lowest first'
        );
        assert.deepEqual(
            layers.map((layer) => getComputedStyle(layer).zIndex),
            ['0', '1', '2'],
            'and stack backdrop < content < chrome'
        );
        assert.dom('.fb-canvas-chrome nav.dock').hasText('dock');
    });

    test('the chrome layer passes the pointer through except on its children', async function (assert) {
        this.contentClicks = 0;
        this.onContentClick = () => this.contentClicks++;

        await render(hbs`
            <Layout::Canvas>
                <:default><button type="button" class="under" {{on "click" this.onContentClick}}>content</button></:default>
                <:chrome><div class="tray">tray</div></:chrome>
            </Layout::Canvas>
        `);
        applyStyle(this.element.querySelector('.fb-canvas'), { width: '600px', height: '400px' });
        applyStyle(this.element.querySelector('.under'), { width: '100%', height: '100%' });
        applyStyle(this.element.querySelector('.tray'), { position: 'absolute', right: '0', top: '0', width: '40px', height: '40px' });

        assert.strictEqual(getComputedStyle(this.element.querySelector('.fb-canvas-chrome')).pointerEvents, 'none');
        assert.strictEqual(getComputedStyle(this.element.querySelector('.fb-canvas-chrome .tray')).pointerEvents, 'auto');

        const under = this.element.querySelector('.under').getBoundingClientRect();
        const hit = document.elementFromPoint(under.left + 20, under.top + 20);
        assert.true(hit.classList.contains('under'), 'a point covered only by the chrome layer reaches the content');

        await click('.under');
        assert.strictEqual(this.contentClicks, 1);
    });

    // offset* rather than getBoundingClientRect: the test container is scaled, offsets are not.
    test('the content layer sits inside the canvas insets', async function (assert) {
        await render(hbs`<Layout::Canvas />`);

        const canvas = applyStyle(this.element.querySelector('.fb-canvas'), { width: '1000px', height: '600px' });
        const content = this.element.querySelector('.fb-canvas-content');

        assert.strictEqual(content.offsetParent, canvas, 'content is positioned against the canvas');
        assert.strictEqual(content.offsetLeft, 82, 'left inset');
        assert.strictEqual(content.offsetTop, 64, 'top inset');
        assert.strictEqual(canvas.clientHeight - content.offsetTop - content.offsetHeight, 80, 'bottom inset');
        assert.strictEqual(canvas.clientWidth - content.offsetLeft - content.offsetWidth, 12, 'right inset');
    });

    test('the insets can be overridden with the token variables', async function (assert) {
        await render(hbs`<Layout::Canvas />`);
        applyStyle(this.element.querySelector('.fb-canvas'), { width: '1000px', height: '600px', '--fb-inset-left': '0px', '--fb-inset-top': '0px' });

        const content = this.element.querySelector('.fb-canvas-content');

        assert.strictEqual(content.offsetLeft, 0);
        assert.strictEqual(content.offsetTop, 0);
    });

    test('while mounted it puts the shell in the canvas layout', async function (assert) {
        const shell = this.owner.lookup('service:shell');
        this.show = true;

        await render(hbs`{{#if this.show}}<Layout::Canvas />{{/if}}`);
        assert.strictEqual(shell.layout, 'canvas');

        this.set('show', false);
        await settled();
        assert.strictEqual(shell.layout, 'classic');
    });

    test('it forwards splattributes and leaves data-theme to the page without @theme', async function (assert) {
        await render(hbs`<Layout::Canvas class="console-shell" data-test-canvas="yes" />`);

        assert.dom('.fb-canvas').hasClass('console-shell');
        assert.dom('.fb-canvas').hasAttribute('data-test-canvas', 'yes');
        assert.dom('.fb-canvas').doesNotHaveAttribute('data-theme');
    });

    eachShellTheme((theme) => {
        test(`it renders with the ${theme} tokens from the page theme`, async function (assert) {
            const canvas = await renderShell(hbs`<Layout::Canvas />`, { theme });

            assert.strictEqual(getComputedStyle(canvas).backgroundColor, CANVAS_BG[theme]);
            assert.strictEqual(getComputedStyle(canvas).color, TEXT[theme]);
        });

        test(`@theme="${theme}" scopes the ${theme} tokens to the canvas whatever the page theme`, async function (assert) {
            this.theme = theme;
            const other = theme === 'dark' ? 'light' : 'dark';

            const canvas = await renderShell(hbs`<Layout::Canvas @theme={{this.theme}} />`, { theme: other });

            assert.dom(canvas).hasAttribute('data-theme', theme);
            assert.strictEqual(getComputedStyle(canvas).backgroundColor, CANVAS_BG[theme]);
            assert.strictEqual(getComputedStyle(canvas.querySelector('.fb-canvas-dot-grid')).backgroundColor, CANVAS_BG[theme], 'the backdrop follows the canvas theme');
        });
    });
});
