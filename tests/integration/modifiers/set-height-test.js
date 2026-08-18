import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render, settled, find } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Modifier | set-height', function (hooks) {
    setupRenderingTest(hooks);

    test('it sets a pixel height from a number', async function (assert) {
        this.set('height', 120);

        await render(hbs`<div data-test-el {{set-height this.height}}></div>`);

        assert.strictEqual(find('[data-test-el]').style.height, '120px', 'inline height is set in pixels');
        assert.dom('[data-test-el]').hasStyle({ height: '120px' }, 'element actually renders 120px tall');
    });

    test('it sets a pixel height from unitless and px strings', async function (assert) {
        this.set('height', '150');

        await render(hbs`<div data-test-el {{set-height this.height}}></div>`);

        const element = find('[data-test-el]');
        assert.strictEqual(element.style.height, '150px', 'a unitless string is treated as pixels');

        this.set('height', '175px');
        await settled();
        assert.strictEqual(element.style.height, '175px', 'a px string keeps its pixel value');
    });

    test('it converts em, rem, pt and pc units to pixels', async function (assert) {
        this.set('height', '2em');

        await render(hbs`<div data-test-el {{set-height this.height}}></div>`);

        const element = find('[data-test-el]');
        assert.strictEqual(element.style.height, '32px', 'em is converted at 16px per em');

        this.set('height', '3rem');
        await settled();
        assert.strictEqual(element.style.height, '48px', 'rem is converted at 16px per rem');

        this.set('height', '4pt');
        await settled();
        assert.strictEqual(element.style.height, '5.32px', 'pt is converted at 1.33px per pt');

        this.set('height', '2pc');
        await settled();
        assert.strictEqual(element.style.height, '32px', 'pc is converted at 16px per pc');
    });

    test('it passes the value straight through when calculated is true', async function (assert) {
        this.set('height', 'calc(100% - 20px)');

        await render(hbs`
            <div style="height: 200px;">
                <div data-test-el {{set-height this.height calculated=true}}></div>
            </div>
        `);

        const element = find('[data-test-el]');
        assert.strictEqual(element.style.height, 'calc(100% - 20px)', 'the calc expression is applied verbatim');
        assert.strictEqual(element.offsetHeight, 180, 'the calc expression resolves against the 200px parent');
    });

    test('it updates the height when the argument changes', async function (assert) {
        this.set('height', 100);

        await render(hbs`<div data-test-el {{set-height this.height}}></div>`);

        const element = find('[data-test-el]');
        assert.strictEqual(element.style.height, '100px', 'initial height applied');

        this.set('height', 260);
        await settled();

        assert.strictEqual(element.style.height, '260px', 'inline height tracks the updated argument');
        assert.dom('[data-test-el]').hasStyle({ height: '260px' }, 'rendered height tracks the updated argument');
    });

    test('it does nothing for undefined or null and still handles zero', async function (assert) {
        this.set('height', undefined);

        await render(hbs`<div data-test-el style="height: 80px;" {{set-height this.height}}></div>`);

        const element = find('[data-test-el]');
        assert.strictEqual(element.style.height, '80px', 'undefined leaves the existing height alone');

        this.set('height', null);
        await settled();
        assert.strictEqual(element.style.height, '80px', 'null leaves the existing height alone');

        this.set('height', 0);
        await settled();
        assert.strictEqual(element.style.height, '0px', 'zero is applied rather than skipped as falsy');
        assert.strictEqual(element.offsetHeight, 0, 'element collapses to zero height');
    });

    test('it rejects negative heights', async function (assert) {
        this.set('height', -50);

        await render(hbs`<div data-test-el {{set-height this.height}}></div>`);

        assert.strictEqual(find('[data-test-el]').style.height, '', 'a negative height is invalid css and is not applied');
    });
    test('a keyword height is applied verbatim', async function (assert) {
        this.set('height', 'auto');

        await render(hbs`<div data-test-el {{set-height this.height}}></div>`);

        assert.strictEqual(find('[data-test-el]').style.height, 'auto', 'a value with no numeric part is passed straight through');
    });

    test('a percentage height is applied verbatim', async function (assert) {
        this.set('height', '100%');

        await render(hbs`<div data-test-el {{set-height this.height}}></div>`);

        assert.strictEqual(find('[data-test-el]').style.height, '100%');
    });
});
