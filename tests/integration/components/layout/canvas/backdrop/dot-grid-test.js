import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import { setupShellTheme, renderShell, eachShellTheme } from '@fleetbase/ember-ui/test-support';

const COLORS = {
    light: { bg: 'rgb(238, 241, 245)', dot: 'rgb(184, 195, 209)' },
    dark: { bg: 'rgb(11, 18, 32)', dot: 'rgb(38, 52, 79)' },
};

module('Integration | Component | layout/canvas/backdrop/dot-grid', function (hooks) {
    setupRenderingTest(hooks);
    setupShellTheme(hooks);

    test('it is decorative and fills its container', async function (assert) {
        await render(hbs`<div style="position: relative; width: 300px; height: 200px"><Layout::Canvas::Backdrop::DotGrid /></div>`);

        assert.dom('.fb-canvas-dot-grid').hasAttribute('aria-hidden', 'true');
        const grid = this.element.querySelector('.fb-canvas-dot-grid');
        assert.strictEqual(grid.offsetWidth, 300);
        assert.strictEqual(grid.offsetHeight, 200);
    });

    test('it repeats the dot every 22px', async function (assert) {
        await render(hbs`<Layout::Canvas::Backdrop::DotGrid />`);

        assert.strictEqual(getComputedStyle(this.element.querySelector('.fb-canvas-dot-grid')).backgroundSize, '22px 22px');
    });

    test('it forwards splattributes, so the grid size can be overridden', async function (assert) {
        await render(hbs`<Layout::Canvas::Backdrop::DotGrid class="dense" style="--fb-canvas-grid: 11px" />`);

        assert.dom('.fb-canvas-dot-grid').hasClass('dense');
        assert.strictEqual(getComputedStyle(this.element.querySelector('.fb-canvas-dot-grid')).backgroundSize, '11px 11px');
    });

    eachShellTheme((theme) => {
        test(`it paints the ${theme} canvas and dot colours`, async function (assert) {
            await renderShell(hbs`<Layout::Canvas::Backdrop::DotGrid />`, { theme });

            const style = getComputedStyle(this.element.querySelector('.fb-canvas-dot-grid'));
            assert.strictEqual(style.backgroundColor, COLORS[theme].bg);
            assert.true(style.backgroundImage.startsWith('radial-gradient('), 'dots are a radial gradient');
            assert.true(style.backgroundImage.includes(COLORS[theme].dot), `dots use the ${theme} dot colour`);
        });
    });
});
