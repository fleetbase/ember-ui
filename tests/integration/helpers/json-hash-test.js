import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Helper | json-hash', function (hooks) {
    setupRenderingTest(hooks);

    test('it serializes named arguments into a json object', async function (assert) {
        await render(hbs`{{json-hash name="Fleetbase" count=3 active=true}}`);

        assert.strictEqual(this.element.textContent.trim(), '{"name":"Fleetbase","count":3,"active":true}');
    });

    test('it serializes an empty object when no named arguments are given', async function (assert) {
        await render(hbs`{{json-hash}}`);

        assert.strictEqual(this.element.textContent.trim(), '{}');
    });

    test('it ignores positional arguments', async function (assert) {
        this.set('positional', 'ignored');

        await render(hbs`{{json-hash this.positional name="Fleetbase"}}`);

        assert.strictEqual(this.element.textContent.trim(), '{"name":"Fleetbase"}');
    });

    test('it serializes nested hashes and arrays', async function (assert) {
        this.set('tags', ['a', 'b']);

        await render(hbs`{{json-hash meta=(hash driver="Ron" trips=2) tags=this.tags}}`);

        assert.strictEqual(this.element.textContent.trim(), '{"meta":{"driver":"Ron","trips":2},"tags":["a","b"]}');
    });

    test('it serializes null values and omits undefined values', async function (assert) {
        this.set('nullValue', null);

        await render(hbs`{{json-hash a=this.nullValue b=this.missing c=1}}`);

        assert.strictEqual(this.element.textContent.trim(), '{"a":null,"c":1}');
    });

    test('it omits function valued arguments', async function (assert) {
        this.set('callback', () => {});

        await render(hbs`{{json-hash onSelect=this.callback name="Fleetbase"}}`);

        assert.strictEqual(this.element.textContent.trim(), '{"name":"Fleetbase"}');
    });

    test('it escapes strings containing quotes, newlines and unicode', async function (assert) {
        this.set('value', 'a "quoted"\nvalue ünïcode');

        await render(hbs`{{json-hash value=this.value}}`);

        assert.strictEqual(this.element.textContent.trim(), JSON.stringify({ value: 'a "quoted"\nvalue ünïcode' }));
    });

    test('it serializes numeric edge values', async function (assert) {
        this.set('zero', 0);
        this.set('negative', -1.5);
        this.set('infinite', Infinity);
        this.set('notANumber', NaN);

        await render(hbs`{{json-hash zero=this.zero negative=this.negative infinite=this.infinite notANumber=this.notANumber}}`);

        assert.strictEqual(this.element.textContent.trim(), '{"zero":0,"negative":-1.5,"infinite":null,"notANumber":null}');
    });

    test('it can be embedded in an attribute value', async function (assert) {
        await render(hbs`<span class="payload" data-payload="{{json-hash id=1}}"></span>`);

        assert.dom('.payload').hasAttribute('data-payload', '{"id":1}');
    });
});
