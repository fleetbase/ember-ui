import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Helper | string-starts-with', function (hooks) {
    setupRenderingTest(hooks);

    async function renderWith(context, str, prefix) {
        context.set('str', str);
        context.set('prefix', prefix);

        await render(hbs`{{string-starts-with this.str this.prefix}}`);

        return context.element.textContent.trim();
    }

    test('it is true when the string starts with the prefix', async function (assert) {
        assert.strictEqual(await renderWith(this, '_new_report', '_new_'), 'true');
    });

    test('it is false when the string does not start with the prefix', async function (assert) {
        assert.strictEqual(await renderWith(this, 'report_new_', '_new_'), 'false', 'the prefix must be at the start, not anywhere');
    });

    test('an empty prefix always matches', async function (assert) {
        assert.strictEqual(await renderWith(this, 'anything', ''), 'true');
    });

    test('an empty string only matches an empty prefix', async function (assert) {
        assert.strictEqual(await renderWith(this, '', ''), 'true');
        assert.strictEqual(await renderWith(this, '', 'x'), 'false');
    });

    test('it is false when either argument is not a string', async function (assert) {
        assert.strictEqual(await renderWith(this, null, '_new_'), 'false');
        assert.strictEqual(await renderWith(this, undefined, '_new_'), 'false');
        assert.strictEqual(await renderWith(this, '_new_x', null), 'false');
        assert.strictEqual(await renderWith(this, '_new_x', undefined), 'false');
        assert.strictEqual(await renderWith(this, 123, '1'), 'false', 'a number is not coerced to a string');
        assert.strictEqual(await renderWith(this, ['_new_'], '_new_'), 'false');
        assert.strictEqual(await renderWith(this, {}, '_new_'), 'false');
    });

    test('it is false when both arguments are missing', async function (assert) {
        await render(hbs`{{string-starts-with}}`);

        assert.dom(this.element).hasText('false', 'no arguments is safe rather than a crash');
    });

    test('matching is case sensitive', async function (assert) {
        assert.strictEqual(await renderWith(this, 'Report', 'report'), 'false');
        assert.strictEqual(await renderWith(this, 'Report', 'Report'), 'true');
    });

    test('it handles whitespace and unicode prefixes literally', async function (assert) {
        assert.strictEqual(await renderWith(this, '  spaced', '  '), 'true');
        assert.strictEqual(await renderWith(this, '🚚 truck', '🚚'), 'true');
        assert.strictEqual(await renderWith(this, 'truck 🚚', '🚚'), 'false');
    });

    test('a prefix longer than the string does not match', async function (assert) {
        assert.strictEqual(await renderWith(this, 'ab', 'abc'), 'false');
    });

    test('it recomputes when the arguments change', async function (assert) {
        this.set('str', '_new_a');
        this.set('prefix', '_new_');

        await render(hbs`{{string-starts-with this.str this.prefix}}`);
        assert.dom(this.element).hasText('true');

        this.set('str', 'old_a');
        assert.dom(this.element).hasText('false', 'the helper is reactive to its arguments');
    });
});
