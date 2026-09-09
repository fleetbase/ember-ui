import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Helper | format-json', function (hooks) {
    setupRenderingTest(hooks);

    test('an object is stringified with two-space indentation', async function (assert) {
        this.set('value', { name: 'Fleetbase', active: true });

        await render(hbs`{{format-json this.value}}`);

        assert.strictEqual(this.element.textContent, '{\n  "name": "Fleetbase",\n  "active": true\n}');
    });

    test('nested structures are indented cumulatively', async function (assert) {
        this.set('value', { meta: { page: 1 } });

        await render(hbs`{{format-json this.value}}`);

        assert.strictEqual(this.element.textContent, '{\n  "meta": {\n    "page": 1\n  }\n}');
    });

    test('arrays are pretty printed one element per line', async function (assert) {
        this.set('value', [1, 2]);

        await render(hbs`{{format-json this.value}}`);

        assert.strictEqual(this.element.textContent, '[\n  1,\n  2\n]');
    });

    test('empty objects and arrays stay on one line', async function (assert) {
        this.set('emptyObject', {});
        this.set('emptyArray', []);

        await render(hbs`<span id="obj">{{format-json this.emptyObject}}</span><span id="arr">{{format-json this.emptyArray}}</span>`);

        assert.strictEqual(this.element.querySelector('#obj').textContent, '{}');
        assert.strictEqual(this.element.querySelector('#arr').textContent, '[]');
    });

    test('primitives are rendered as their JSON literals', async function (assert) {
        this.set('stringValue', 'hello');
        this.set('numberValue', 0);
        this.set('boolValue', false);
        this.set('nullValue', null);

        await render(
            hbs`<span id="str">{{format-json this.stringValue}}</span><span id="num">{{format-json this.numberValue}}</span><span id="bool">{{format-json this.boolValue}}</span><span id="null">{{format-json this.nullValue}}</span>`
        );

        assert.strictEqual(this.element.querySelector('#str').textContent, '"hello"', 'strings keep their quotes');
        assert.strictEqual(this.element.querySelector('#num').textContent, '0');
        assert.strictEqual(this.element.querySelector('#bool').textContent, 'false');
        assert.strictEqual(this.element.querySelector('#null').textContent, 'null');
    });

    test('undefined has no JSON representation and renders nothing', async function (assert) {
        this.set('value', undefined);

        await render(hbs`{{format-json this.value}}`);

        assert.strictEqual(this.element.textContent, '');
    });

    test('keys with undefined values are dropped', async function (assert) {
        this.set('value', { kept: 1, dropped: undefined });

        await render(hbs`{{format-json this.value}}`);

        assert.strictEqual(this.element.textContent, '{\n  "kept": 1\n}');
    });

    test('special characters are escaped', async function (assert) {
        this.set('value', { quote: 'say "hi"', newline: 'a\nb', unicode: 'ünïcode' });

        await render(hbs`{{format-json this.value}}`);

        assert.strictEqual(this.element.textContent, '{\n  "quote": "say \\"hi\\"",\n  "newline": "a\\nb",\n  "unicode": "ünïcode"\n}');
    });
});
