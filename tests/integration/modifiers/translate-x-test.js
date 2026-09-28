import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render, settled, find } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Modifier | translate-x', function (hooks) {
    setupRenderingTest(hooks);

    test('it translates using rem as the default unit', async function (assert) {
        this.set('x', 2);

        await render(hbs`<div data-test-el {{translate-x this.x}}></div>`);

        assert.strictEqual(find('[data-test-el]').style.transform, 'translateX(2rem)', 'transform uses the rem default unit');
    });

    test('it uses the provided unit and produces a real transform', async function (assert) {
        this.set('x', 50);

        await render(hbs`<div data-test-el {{translate-x this.x "px"}}></div>`);

        assert.strictEqual(find('[data-test-el]').style.transform, 'translateX(50px)', 'inline transform uses the supplied unit');
        assert.dom('[data-test-el]').hasStyle({ transform: 'matrix(1, 0, 0, 1, 50, 0)' }, 'element is actually translated 50px on the x axis');
    });

    test('it supports percentage units and negative offsets', async function (assert) {
        this.set('x', 50);

        await render(hbs`<div data-test-el {{translate-x this.x "%"}}></div>`);

        const element = find('[data-test-el]');
        assert.strictEqual(element.style.transform, 'translateX(50%)', 'percentage unit is applied');

        this.set('x', -10);
        await settled();

        assert.strictEqual(element.style.transform, 'translateX(-10%)', 'negative offsets are applied');
    });

    test('it applies a zero translation instead of skipping it', async function (assert) {
        this.set('x', 0);

        await render(hbs`<div data-test-el {{translate-x this.x "px"}}></div>`);

        assert.strictEqual(find('[data-test-el]').style.transform, 'translateX(0px)', 'zero is not treated as "no value"');
        assert.dom('[data-test-el]').hasStyle({ transform: 'matrix(1, 0, 0, 1, 0, 0)' }, 'computed transform is the identity translation');
    });

    test('it updates the transform when the offset or unit changes', async function (assert) {
        this.set('x', 1);
        this.set('unit', 'rem');

        await render(hbs`<div data-test-el {{translate-x this.x this.unit}}></div>`);

        const element = find('[data-test-el]');
        assert.strictEqual(element.style.transform, 'translateX(1rem)', 'initial transform applied');

        this.set('x', 4);
        await settled();
        assert.strictEqual(element.style.transform, 'translateX(4rem)', 'transform tracks the updated offset');

        this.set('unit', 'px');
        await settled();
        assert.strictEqual(element.style.transform, 'translateX(4px)', 'transform tracks the updated unit');
    });

    test('it does not apply an invalid transform for a null offset', async function (assert) {
        this.set('x', null);

        await render(hbs`<div data-test-el {{translate-x this.x "px"}}></div>`);

        assert.strictEqual(find('[data-test-el]').style.transform, '', 'an invalid translateX value is rejected by the CSSOM');
        assert.dom('[data-test-el]').hasStyle({ transform: 'none' }, 'element is left untransformed');
    });
});
