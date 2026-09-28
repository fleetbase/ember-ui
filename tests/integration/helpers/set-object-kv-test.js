import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import { helper } from '@ember/component/helper';

function registerCapture(owner, sink) {
    owner.register(
        'helper:capture-value',
        helper(function ([value]) {
            sink.push(value);
            return '';
        })
    );
}

/**
 * NOTE: the helper reassigns its local `object` parameter and returns nothing, so its only
 * observable contract today is that it is a pure no-op: it neither mutates the object that was
 * passed in nor yields a value. These tests pin that behaviour down.
 */
module('Integration | Helper | set-object-kv', function (hooks) {
    setupRenderingTest(hooks);

    test('it yields no value', async function (assert) {
        const captured = [];
        registerCapture(this.owner, captured);
        this.set('object', { a: 1 });

        await render(hbs`{{capture-value (set-object-kv this.object "b" 2)}}`);

        assert.strictEqual(captured.length, 1, 'the helper was invoked');
        assert.strictEqual(captured[0], undefined, 'the helper returns undefined');
    });

    test('it renders nothing', async function (assert) {
        this.set('object', { a: 1 });

        await render(hbs`<span class="output">{{set-object-kv this.object "b" 2}}</span>`);

        assert.dom('.output').hasNoText();
    });

    test('it does not mutate the object that was passed in', async function (assert) {
        const object = { a: 1 };
        this.set('object', object);

        await render(hbs`{{set-object-kv this.object "b" 2}}`);

        assert.deepEqual(object, { a: 1 }, 'the original object is untouched');
        assert.notOk('b' in object, 'the key was not added to the original object');
    });

    test('it does not overwrite an existing key on the object that was passed in', async function (assert) {
        const object = { a: 1 };
        this.set('object', object);

        await render(hbs`{{set-object-kv this.object "a" 99}}`);

        assert.strictEqual(object.a, 1, 'the existing value is preserved');
    });

    test('it tolerates null, undefined and missing arguments', async function (assert) {
        this.set('nullObject', null);

        await render(hbs`
            <span class="output">{{set-object-kv this.nullObject "b" 2}}{{set-object-kv this.missing "b" 2}}{{set-object-kv (hash) this.missingKey this.missingValue}}</span>
        `);

        assert.dom('.output').hasNoText('no output and no error for empty input');
    });
});
