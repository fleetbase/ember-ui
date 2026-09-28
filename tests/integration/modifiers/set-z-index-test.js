import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render, settled, find } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Modifier | set-z-index', function (hooks) {
    setupRenderingTest(hooks);

    test('it sets the z-index from a number', async function (assert) {
        this.set('zIndex', 5);

        await render(hbs`<div data-test-el style="position: relative;" {{set-z-index this.zIndex}}></div>`);

        assert.strictEqual(find('[data-test-el]').style.zIndex, '5', 'inline z-index is set');
        assert.dom('[data-test-el]').hasStyle({ zIndex: '5' }, 'computed z-index is applied');
    });

    test('it sets the z-index from a numeric string', async function (assert) {
        this.set('zIndex', '42');

        await render(hbs`<div data-test-el style="position: relative;" {{set-z-index this.zIndex}}></div>`);

        assert.strictEqual(find('[data-test-el]').style.zIndex, '42', 'string values are accepted');
    });

    test('it supports zero and negative stacking values', async function (assert) {
        this.set('zIndex', 0);

        await render(hbs`<div data-test-el style="position: relative;" {{set-z-index this.zIndex}}></div>`);

        const element = find('[data-test-el]');
        assert.strictEqual(element.style.zIndex, '0', 'zero is applied rather than skipped as falsy');

        this.set('zIndex', -1);
        await settled();

        assert.strictEqual(element.style.zIndex, '-1', 'negative values are applied');
        assert.dom('[data-test-el]').hasStyle({ zIndex: '-1' }, 'computed z-index reflects the negative value');
    });

    test('it updates the z-index when the argument changes', async function (assert) {
        this.set('zIndex', 10);

        await render(hbs`<div data-test-el style="position: relative;" {{set-z-index this.zIndex}}></div>`);

        const element = find('[data-test-el]');
        assert.strictEqual(element.style.zIndex, '10', 'initial value applied');

        this.set('zIndex', 999);
        await settled();

        assert.strictEqual(element.style.zIndex, '999', 'value tracks the updated argument');
    });

    test('it leaves the z-index unset for undefined and null values', async function (assert) {
        this.set('zIndex', undefined);

        await render(hbs`<div data-test-el style="position: relative;" {{set-z-index this.zIndex}}></div>`);

        const element = find('[data-test-el]');
        assert.strictEqual(element.style.zIndex, '', 'undefined does not produce an invalid z-index');

        this.set('zIndex', null);
        await settled();

        assert.strictEqual(element.style.zIndex, '', 'null does not produce an invalid z-index');
        assert.dom('[data-test-el]').hasStyle({ zIndex: 'auto' }, 'element keeps the default auto stacking');
    });
});
