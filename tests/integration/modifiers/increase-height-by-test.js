import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render, settled, find } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

// The measured element is given an explicit 100px height so offsetHeight is deterministic.
module('Integration | Modifier | increase-height-by', function (hooks) {
    setupRenderingTest(hooks);

    test('it increases the measured height by a numeric amount', async function (assert) {
        this.set('increaseBy', 50);

        await render(hbs`<div data-test-el style="box-sizing: border-box; height: 100px;" {{increase-height-by this.increaseBy}}></div>`);

        assert.strictEqual(find('[data-test-el]').style.height, '150px', 'height is the original offsetHeight plus the increase');
        assert.dom('[data-test-el]').hasStyle({ height: '150px' }, 'the element actually renders taller');
    });

    test('it increases the height by unitless and px string amounts', async function (assert) {
        this.set('increaseBy', '50');

        await render(hbs`<div data-test-el style="box-sizing: border-box; height: 100px;" {{increase-height-by this.increaseBy}}></div>`);

        assert.strictEqual(find('[data-test-el]').style.height, '150px', 'a unitless string is added numerically, not concatenated');
    });

    test('it treats a px string as pixels', async function (assert) {
        this.set('increaseBy', '25px');

        await render(hbs`<div data-test-el style="box-sizing: border-box; height: 100px;" {{increase-height-by this.increaseBy}}></div>`);

        assert.strictEqual(find('[data-test-el]').style.height, '125px', 'a px string is added numerically');
    });

    test('it converts em, rem, pt and pc units before increasing the height', async function (assert) {
        this.set('increaseBy', '2em');

        await render(hbs`<div data-test-el style="box-sizing: border-box; height: 100px;" {{increase-height-by this.increaseBy}}></div>`);

        const element = find('[data-test-el]');
        assert.strictEqual(element.style.height, '132px', 'em is converted at 16px per em');

        // each re-run measures the already-increased element, so reset it between assertions
        element.style.height = '100px';
        this.set('increaseBy', '3rem');
        await settled();
        assert.strictEqual(element.style.height, '148px', 'rem is converted at 16px per rem');

        element.style.height = '100px';
        this.set('increaseBy', '4pt');
        await settled();
        assert.strictEqual(element.style.height, '105.32px', 'pt is converted at 1.33px per pt');

        element.style.height = '100px';
        this.set('increaseBy', '2pc');
        await settled();
        assert.strictEqual(element.style.height, '132px', 'pc is converted at 16px per pc');
    });

    test('it does nothing for undefined and null', async function (assert) {
        this.set('increaseBy', undefined);

        await render(hbs`<div data-test-el style="box-sizing: border-box; height: 100px;" {{increase-height-by this.increaseBy}}></div>`);

        const element = find('[data-test-el]');
        assert.strictEqual(element.style.height, '100px', 'undefined leaves the height untouched');

        this.set('increaseBy', null);
        await settled();
        assert.strictEqual(element.style.height, '100px', 'null leaves the height untouched');
    });

    test('it never produces NaN or a malformed height for garbage input', async function (assert) {
        this.set('increaseBy', 'not-a-number');

        await render(hbs`<div data-test-el style="box-sizing: border-box; height: 100px;" {{increase-height-by this.increaseBy}}></div>`);

        const element = find('[data-test-el]');
        assert.strictEqual(element.style.height, '100px', 'a non numeric string increases the height by zero');
        assert.notOk(element.style.height.includes('NaN'), 'no NaN is written to the style');
    });

    test('it re-measures and re-applies when the amount changes', async function (assert) {
        this.set('increaseBy', 50);

        await render(hbs`<div data-test-el style="box-sizing: border-box; height: 100px;" {{increase-height-by this.increaseBy}}></div>`);

        const element = find('[data-test-el]');
        assert.strictEqual(element.style.height, '150px', 'initial increase applied');

        this.set('increaseBy', 25);
        await settled();

        assert.strictEqual(element.style.height, '175px', 'the new amount is added to the current measured height');
    });

    test('it applies zero as a no-op increase', async function (assert) {
        this.set('increaseBy', 0);

        await render(hbs`<div data-test-el style="box-sizing: border-box; height: 100px;" {{increase-height-by this.increaseBy}}></div>`);

        assert.strictEqual(find('[data-test-el]').style.height, '100px', 'a zero increase pins the height to the measured height');
    });
});
