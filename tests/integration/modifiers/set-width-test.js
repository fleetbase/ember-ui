import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render, settled, find } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Modifier | set-width', function (hooks) {
    setupRenderingTest(hooks);

    test('it sets a pixel width from a number', async function (assert) {
        this.set('width', 120);

        await render(hbs`<div data-test-el {{set-width this.width}}></div>`);

        assert.strictEqual(find('[data-test-el]').style.width, '120px', 'inline width is set in pixels');
        assert.dom('[data-test-el]').hasStyle({ width: '120px' }, 'element actually renders 120px wide');
    });

    test('it sets a pixel width from unitless and px strings', async function (assert) {
        this.set('width', '150');

        await render(hbs`<div data-test-el {{set-width this.width}}></div>`);

        const element = find('[data-test-el]');
        assert.strictEqual(element.style.width, '150px', 'a unitless string is treated as pixels');

        this.set('width', '175px');
        await settled();

        assert.strictEqual(element.style.width, '175px', 'a px string keeps its pixel value');
    });

    test('it converts em, rem, pt and pc units to pixels', async function (assert) {
        this.set('width', '2em');

        await render(hbs`<div data-test-el {{set-width this.width}}></div>`);

        const element = find('[data-test-el]');
        assert.strictEqual(element.style.width, '32px', 'em is converted at 16px per em');

        this.set('width', '3rem');
        await settled();
        assert.strictEqual(element.style.width, '48px', 'rem is converted at 16px per rem');

        this.set('width', '4pt');
        await settled();
        assert.strictEqual(element.style.width, '5.32px', 'pt is converted at 1.33px per pt');

        this.set('width', '2pc');
        await settled();
        assert.strictEqual(element.style.width, '32px', 'pc is converted at 16px per pc');
    });

    test('it updates the width when the argument changes', async function (assert) {
        this.set('width', 100);

        await render(hbs`<div data-test-el {{set-width this.width}}></div>`);

        const element = find('[data-test-el]');
        assert.strictEqual(element.style.width, '100px', 'initial width applied');

        this.set('width', 260);
        await settled();

        assert.strictEqual(element.style.width, '260px', 'inline width tracks the updated argument');
        assert.dom('[data-test-el]').hasStyle({ width: '260px' }, 'rendered width tracks the updated argument');
    });

    test('it does nothing for undefined or null and still handles zero', async function (assert) {
        this.set('width', undefined);

        await render(hbs`<div data-test-el style="width: 80px;" {{set-width this.width}}></div>`);

        const element = find('[data-test-el]');
        assert.strictEqual(element.style.width, '80px', 'undefined leaves the existing width alone');

        this.set('width', null);
        await settled();
        assert.strictEqual(element.style.width, '80px', 'null leaves the existing width alone');

        this.set('width', 0);
        await settled();
        assert.strictEqual(element.style.width, '0px', 'zero is applied rather than skipped as falsy');
    });

    test('it handles very large values', async function (assert) {
        this.set('width', 100000);

        await render(hbs`<div data-test-el {{set-width this.width}}></div>`);

        assert.strictEqual(find('[data-test-el]').style.width, '100000px', 'very large widths are applied verbatim');
    });

    test('it rejects negative widths', async function (assert) {
        this.set('width', -50);

        await render(hbs`<div data-test-el {{set-width this.width}}></div>`);

        assert.strictEqual(find('[data-test-el]').style.width, '', 'a negative width is invalid css and is not applied');
    });

    // Viewport and percentage units cannot be converted to a pixel count here, so they are
    // handed to CSS untouched. Emitting the bare number as px is what turned the coordinates
    // picker's `100vw` fullscreen size into a 100-PIXEL overlay (DEFECTS.md #35).
    test('percentage and viewport units are passed through untouched', async function (assert) {
        for (const width of ['100vw', '50%', '75vh', '10vmin', '20vmax', '8ch', '3ex']) {
            this.set('width', width);

            await render(hbs`<div data-test-el {{set-width this.width}}></div>`);

            assert.strictEqual(find('[data-test-el]').style.width, width, `${width} survives verbatim`);
        }
    });

    test('absolute css units other than pt and pc are passed through too', async function (assert) {
        for (const width of ['5cm', '30mm', '2in']) {
            this.set('width', width);

            await render(hbs`<div data-test-el {{set-width this.width}}></div>`);

            assert.strictEqual(find('[data-test-el]').style.width, width);
        }
    });

    test('a keyword width is handed straight to css', async function (assert) {
        this.set('width', 'auto');

        await render(hbs`<div data-test-el {{set-width this.width}}></div>`);

        assert.strictEqual(find('[data-test-el]').style.width, 'auto');
    });

    test('a calc() expression is handed straight to css', async function (assert) {
        this.set('width', 'calc(100% - 20px)');

        await render(hbs`<div data-test-el {{set-width this.width}}></div>`);

        assert.true(find('[data-test-el]').style.width.startsWith('calc('), 'the expression reaches CSS intact');
    });
});
