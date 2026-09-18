import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, settled } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import { A } from '@ember/array';

module('Integration | Helper | in-array', function (hooks) {
    setupRenderingTest(hooks);

    test('it reports membership in a native array', async function (assert) {
        this.set('list', ['alpha', 'beta', 'gamma']);

        await render(hbs`<span id="hit">{{in-array "beta" this.list}}</span><span id="miss">{{in-array "delta" this.list}}</span>`);

        assert.dom('#hit').hasText('true');
        assert.dom('#miss').hasText('false');
    });

    test('it works with an Ember array', async function (assert) {
        this.set('list', A(['alpha', 'beta']));

        await render(hbs`<span id="hit">{{in-array "alpha" this.list}}</span><span id="miss">{{in-array "omega" this.list}}</span>`);

        assert.dom('#hit').hasText('true');
        assert.dom('#miss').hasText('false');
    });

    test('an empty array never contains anything', async function (assert) {
        this.set('list', []);

        await render(hbs`{{in-array "alpha" this.list}}`);

        assert.dom(this.element).hasText('false');
    });

    test('a missing or non-array second argument is false rather than an error', async function (assert) {
        this.set('nothing', undefined);
        this.set('nullish', null);
        this.set('object', { alpha: true });

        await render(
            hbs`<span id="undef">{{in-array "alpha" this.nothing}}</span><span id="null">{{in-array "alpha" this.nullish}}</span><span id="obj">{{in-array "alpha" this.object}}</span>`
        );

        assert.dom('#undef').hasText('false');
        assert.dom('#null').hasText('false');
        assert.dom('#obj').hasText('false');
    });

    test('a string is not treated as an array of characters', async function (assert) {
        this.set('list', 'alpha');

        await render(hbs`{{in-array "a" this.list}}`);

        assert.dom(this.element).hasText('false', 'strings are rejected before the includes() check');
    });

    test('comparison is strict, so types matter', async function (assert) {
        this.set('list', [1, 2, 3]);

        await render(hbs`<span id="num">{{in-array 2 this.list}}</span><span id="str">{{in-array "2" this.list}}</span>`);

        assert.dom('#num').hasText('true');
        assert.dom('#str').hasText('false', 'the string "2" does not match the number 2');
    });

    test('objects are matched by reference', async function (assert) {
        const item = { id: 1 };
        this.set('list', [item]);
        this.set('item', item);
        this.set('lookalike', { id: 1 });

        await render(hbs`<span id="same">{{in-array this.item this.list}}</span><span id="other">{{in-array this.lookalike this.list}}</span>`);

        assert.dom('#same').hasText('true');
        assert.dom('#other').hasText('false', 'a structurally equal but distinct object is not a member');
    });

    test('falsy members are found', async function (assert) {
        this.set('list', [0, false, '', null, undefined]);
        this.set('nullish', null);
        this.set('nothing', undefined);

        await render(
            hbs`<span id="zero">{{in-array 0 this.list}}</span><span id="empty">{{in-array "" this.list}}</span><span id="null">{{in-array this.nullish this.list}}</span><span id="undef">{{in-array this.nothing this.list}}</span>`
        );

        assert.dom('#zero').hasText('true');
        assert.dom('#empty').hasText('true');
        assert.dom('#null').hasText('true');
        assert.dom('#undef').hasText('true');
    });

    test('NaN is found because includes uses SameValueZero', async function (assert) {
        this.set('list', [Number.NaN]);
        this.set('notANumber', Number.NaN);

        await render(hbs`{{in-array this.notANumber this.list}}`);

        assert.dom(this.element).hasText('true');
    });

    test('it recomputes when the array is replaced', async function (assert) {
        this.set('list', ['alpha']);

        await render(hbs`{{in-array "beta" this.list}}`);
        assert.dom(this.element).hasText('false');

        this.set('list', ['alpha', 'beta']);
        await settled();

        assert.dom(this.element).hasText('true');
    });
});
