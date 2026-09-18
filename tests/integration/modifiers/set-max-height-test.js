import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render, settled, find } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Modifier | set-max-height', function (hooks) {
    setupRenderingTest(hooks);

    test('it sets a pixel max height from a number and actually constrains the element', async function (assert) {
        this.set('maxHeight', 60);

        await render(hbs`
            <div data-test-el style="overflow: hidden;" {{set-max-height this.maxHeight}}>
                <div style="height: 500px;"></div>
            </div>
        `);

        const element = find('[data-test-el]');
        assert.strictEqual(element.style.maxHeight, '60px', 'inline max-height is set in pixels');
        assert.strictEqual(element.offsetHeight, 60, 'the 500px tall child is clamped to the max height');
    });

    test('it sets a pixel max height from unitless and px strings', async function (assert) {
        this.set('maxHeight', '150');

        await render(hbs`<div data-test-el {{set-max-height this.maxHeight}}></div>`);

        const element = find('[data-test-el]');
        assert.strictEqual(element.style.maxHeight, '150px', 'a unitless string is treated as pixels');

        this.set('maxHeight', '175px');
        await settled();
        assert.strictEqual(element.style.maxHeight, '175px', 'a px string keeps its pixel value');
    });

    test('it converts em, rem, pt and pc units to pixels', async function (assert) {
        this.set('maxHeight', '2em');

        await render(hbs`<div data-test-el {{set-max-height this.maxHeight}}></div>`);

        const element = find('[data-test-el]');
        assert.strictEqual(element.style.maxHeight, '32px', 'em is converted at 16px per em');

        this.set('maxHeight', '3rem');
        await settled();
        assert.strictEqual(element.style.maxHeight, '48px', 'rem is converted at 16px per rem');

        this.set('maxHeight', '4pt');
        await settled();
        assert.strictEqual(element.style.maxHeight, '5.32px', 'pt is converted at 1.33px per pt');

        this.set('maxHeight', '2pc');
        await settled();
        assert.strictEqual(element.style.maxHeight, '32px', 'pc is converted at 16px per pc');
    });

    test('it updates the max height when the argument changes', async function (assert) {
        this.set('maxHeight', 100);

        await render(hbs`<div data-test-el {{set-max-height this.maxHeight}}></div>`);

        const element = find('[data-test-el]');
        assert.strictEqual(element.style.maxHeight, '100px', 'initial max height applied');

        this.set('maxHeight', 320);
        await settled();

        assert.strictEqual(element.style.maxHeight, '320px', 'inline max height tracks the updated argument');
        assert.dom('[data-test-el]').hasStyle({ maxHeight: '320px' }, 'computed max height tracks the updated argument');
    });

    test('it does nothing for undefined or null and still handles zero', async function (assert) {
        this.set('maxHeight', undefined);

        await render(hbs`<div data-test-el style="max-height: 40px;" {{set-max-height this.maxHeight}}></div>`);

        const element = find('[data-test-el]');
        assert.strictEqual(element.style.maxHeight, '40px', 'undefined leaves the existing max height alone');

        this.set('maxHeight', null);
        await settled();
        assert.strictEqual(element.style.maxHeight, '40px', 'null leaves the existing max height alone');

        this.set('maxHeight', 0);
        await settled();
        assert.strictEqual(element.style.maxHeight, '0px', 'zero is applied rather than skipped as falsy');
    });

    test('it rejects negative max heights', async function (assert) {
        this.set('maxHeight', -25);

        await render(hbs`<div data-test-el {{set-max-height this.maxHeight}}></div>`);

        assert.strictEqual(find('[data-test-el]').style.maxHeight, '', 'a negative max height is invalid css and is not applied');
        assert.dom('[data-test-el]').hasStyle({ maxHeight: 'none' }, 'element keeps the default max height');
    });
    test('a keyword max height is applied verbatim', async function (assert) {
        this.set('maxHeight', 'none');

        await render(hbs`<div data-test-el {{set-max-height this.maxHeight}}></div>`);

        assert.strictEqual(find('[data-test-el]').style.maxHeight, 'none', 'a value with no numeric part is passed straight through');
    });
    test('a percentage max height is applied verbatim', async function (assert) {
        this.set('maxHeight', '80%');

        await render(hbs`<div data-test-el {{set-max-height this.maxHeight}}></div>`);

        assert.strictEqual(find('[data-test-el]').style.maxHeight, '80%', 'a unit the modifier cannot convert is honoured, not turned into px');
    });
});
