import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import { A } from '@ember/array';
import ArrayProxy from '@ember/array/proxy';
import isArrayHelper from '@fleetbase/ember-ui/helpers/is-array';

// `ember-truth-helpers` also ships an `is-array` helper and wins the app-tree merge in
// the dummy app, so the addon helper is registered under its own name to be sure these
// tests exercise `addon/helpers/is-array.js`.
module('Integration | Helper | is-array', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        this.owner.register('helper:ui-is-array', isArrayHelper);
    });

    test('native arrays are arrays', async function (assert) {
        this.set('empty', []);
        this.set('filled', [1, 2, 3]);

        await render(hbs`<span id="empty">{{ui-is-array this.empty}}</span><span id="filled">{{ui-is-array this.filled}}</span>`);

        assert.dom('#empty').hasText('true', 'an empty array is still an array');
        assert.dom('#filled').hasText('true');
    });

    test('Ember arrays and array proxies are arrays', async function (assert) {
        this.set('emberArray', A(['alpha']));
        this.set('proxy', ArrayProxy.create({ content: A(['alpha']) }));

        await render(hbs`<span id="ember">{{ui-is-array this.emberArray}}</span><span id="proxy">{{ui-is-array this.proxy}}</span>`);

        assert.dom('#ember').hasText('true');
        assert.dom('#proxy').hasText('true');
    });

    test('null and undefined are not arrays', async function (assert) {
        this.set('nullish', null);
        this.set('nothing', undefined);

        await render(hbs`<span id="null">{{ui-is-array this.nullish}}</span><span id="undef">{{ui-is-array this.nothing}}</span><span id="none">{{ui-is-array}}</span>`);

        assert.dom('#null').hasText('false');
        assert.dom('#undef').hasText('false');
        assert.dom('#none').hasText('false', 'a missing argument is not an array');
    });

    test('only the first positional argument is inspected', async function (assert) {
        this.set('list', ['alpha']);

        await render(hbs`<span id="first">{{ui-is-array this.list "not-an-array"}}</span><span id="second">{{ui-is-array "not-an-array" this.list}}</span>`);

        assert.dom('#first').hasText('true', 'extra arguments are ignored');
        assert.dom('#second').hasText('false');
    });

    test('strings are not arrays despite having a length', async function (assert) {
        await render(hbs`<span id="text">{{ui-is-array "alpha"}}</span><span id="empty">{{ui-is-array ""}}</span>`);

        assert.dom('#text').hasText('false');
        assert.dom('#empty').hasText('false');
    });

    test('numbers and booleans are not arrays', async function (assert) {
        this.set('flag', true);

        await render(hbs`<span id="zero">{{ui-is-array 0}}</span><span id="number">{{ui-is-array 42}}</span><span id="bool">{{ui-is-array this.flag}}</span>`);

        assert.dom('#zero').hasText('false');
        assert.dom('#number').hasText('false');
        assert.dom('#bool').hasText('false');
    });

    test('plain objects are not arrays', async function (assert) {
        this.set('object', { alpha: 1 });

        await render(hbs`<span id="hash">{{ui-is-array (hash a=1)}}</span><span id="object">{{ui-is-array this.object}}</span>`);

        assert.dom('#hash').hasText('false');
        assert.dom('#object').hasText('false');
    });

    test('array-like objects with a numeric length are reported as arrays', async function (assert) {
        this.set('arrayLike', { length: 2, 0: 'alpha', 1: 'beta' });
        this.set('notArrayLike', { length: 'two' });

        await render(hbs`<span id="like">{{ui-is-array this.arrayLike}}</span><span id="unlike">{{ui-is-array this.notArrayLike}}</span>`);

        assert.dom('#like').hasText('true', 'Ember treats numeric-length objects as arrays');
        assert.dom('#unlike').hasText('false', 'a non-numeric length is not enough');
    });

    test('a NaN length is not enough to be an array', async function (assert) {
        this.set('weird', { length: Number.NaN });

        await render(hbs`{{ui-is-array this.weird}}`);

        assert.dom(this.element).hasText('false');
    });
});
