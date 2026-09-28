import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

const SAMPLE = { id: 1, name: 'Fleetbase', nested: { active: true } };

module('Integration | Helper | json-stringify', function (hooks) {
    setupRenderingTest(hooks);

    test('it serializes compactly by default', async function (assert) {
        this.set('subject', SAMPLE);

        await render(hbs`{{json-stringify this.subject}}`);

        assert.strictEqual(this.element.textContent.trim(), JSON.stringify(SAMPLE));
    });

    test('it serializes primitives and arrays', async function (assert) {
        this.set('string', 'Fleetbase');
        this.set('number', -12.5);
        this.set('nullValue', null);
        this.set('list', [1, 'two', null]);

        await render(hbs`{{json-stringify this.string}}|{{json-stringify this.number}}|{{json-stringify this.nullValue}}|{{json-stringify this.list}}`);

        assert.strictEqual(this.element.textContent.trim(), '"Fleetbase"|-12.5|null|[1,"two",null]');
    });

    test('it renders nothing for undefined input', async function (assert) {
        await render(hbs`{{json-stringify this.missing}}`);

        assert.dom(this.element).hasNoText();
    });

    test('it uses a positional number as the indentation width', async function (assert) {
        this.set('subject', SAMPLE);

        await render(hbs`{{json-stringify this.subject 4}}`);

        assert.strictEqual(this.element.textContent.trim(), JSON.stringify(SAMPLE, null, 4));
    });

    test('it treats a positional true as two space indentation', async function (assert) {
        this.set('subject', SAMPLE);

        await render(hbs`{{json-stringify this.subject true}}`);

        assert.strictEqual(this.element.textContent.trim(), JSON.stringify(SAMPLE, null, 2));
    });

    test('it treats a positional false as compact output', async function (assert) {
        this.set('subject', SAMPLE);

        await render(hbs`{{json-stringify this.subject false}}`);

        assert.strictEqual(this.element.textContent.trim(), JSON.stringify(SAMPLE));
    });

    test('it honours a named space argument', async function (assert) {
        this.set('subject', SAMPLE);

        await render(hbs`{{json-stringify this.subject space=3}}`);

        assert.strictEqual(this.element.textContent.trim(), JSON.stringify(SAMPLE, null, 3));
    });

    test('it coerces a numeric string space argument', async function (assert) {
        this.set('subject', SAMPLE);

        await render(hbs`{{json-stringify this.subject space="2"}}`);

        assert.strictEqual(this.element.textContent.trim(), JSON.stringify(SAMPLE, null, 2));
    });

    test('it falls back to compact output when the space argument is not a finite number', async function (assert) {
        this.set('subject', SAMPLE);

        await render(hbs`{{json-stringify this.subject space="wide"}}`);

        assert.strictEqual(this.element.textContent.trim(), JSON.stringify(SAMPLE));
    });

    test('it indents by two when pretty is true', async function (assert) {
        this.set('subject', SAMPLE);

        await render(hbs`{{json-stringify this.subject pretty=true}}`);

        assert.strictEqual(this.element.textContent.trim(), JSON.stringify(SAMPLE, null, 2));
    });

    test('an explicit named space overrides pretty and positional spacing', async function (assert) {
        this.set('subject', SAMPLE);

        await render(hbs`{{json-stringify this.subject 4 pretty=true space=0}}`);

        assert.strictEqual(this.element.textContent.trim(), JSON.stringify(SAMPLE));
    });

    test('it applies a positional replacer function', async function (assert) {
        this.set('subject', SAMPLE);
        this.set('replacer', (key, value) => (key === 'name' ? undefined : value));

        await render(hbs`{{json-stringify this.subject this.replacer}}`);

        assert.strictEqual(this.element.textContent.trim(), '{"id":1,"nested":{"active":true}}');
    });

    test('it applies a positional replacer together with a positional space', async function (assert) {
        this.set('subject', { id: 1, name: 'Fleetbase' });
        this.set('replacer', (key, value) => (key === 'name' ? 'redacted' : value));

        await render(hbs`{{json-stringify this.subject this.replacer 2}}`);

        assert.strictEqual(this.element.textContent.trim(), JSON.stringify({ id: 1, name: 'redacted' }, null, 2));
    });

    test('it applies a named replacer allow list', async function (assert) {
        this.set('subject', SAMPLE);
        this.set('replacer', ['id']);

        await render(hbs`{{json-stringify this.subject replacer=this.replacer}}`);

        assert.strictEqual(this.element.textContent.trim(), '{"id":1}');
    });

    test('it guards against circular structures', async function (assert) {
        const circular = { name: 'root' };
        circular.self = circular;
        this.set('subject', circular);

        await render(hbs`{{json-stringify this.subject}}`);

        assert.dom(this.element).hasText('[Unserializable JSON]');
    });

    test('it serializes an empty object and an empty array', async function (assert) {
        this.set('emptyObject', {});
        this.set('emptyArray', []);

        await render(hbs`{{json-stringify this.emptyObject}}|{{json-stringify this.emptyArray}}`);

        assert.strictEqual(this.element.textContent.trim(), '{}|[]');
    });

    test('it serializes non finite numbers as null', async function (assert) {
        this.set('subject', { infinite: Infinity, notANumber: NaN, zero: 0 });

        await render(hbs`{{json-stringify this.subject}}`);

        assert.strictEqual(this.element.textContent.trim(), '{"infinite":null,"notANumber":null,"zero":0}');
    });
    test('a replacer can be given as the third positional argument', async function (assert) {
        this.set('subject', { keep: 1, drop: 2 });
        this.set('replacer', (key, value) => (key === 'drop' ? undefined : value));

        await render(hbs`{{json-stringify this.subject 2 this.replacer}}`);

        const output = this.element.textContent.trim();
        assert.true(output.includes('"keep"'), 'the kept key survives');
        assert.false(output.includes('"drop"'), 'the replacer removed the other one');
        assert.true(output.includes('\n'), 'and the numeric second argument is still the indent');
    });
});
