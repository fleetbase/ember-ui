import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Helper | first-char', function (hooks) {
    setupRenderingTest(hooks);

    test('it renders the first character of a string', async function (assert) {
        this.set('value', 'Fleetbase');

        await render(hbs`{{first-char this.value}}`);

        assert.dom(this.element).hasText('F');
    });

    test('it preserves the original casing', async function (assert) {
        this.set('value', 'fleetbase');

        await render(hbs`{{first-char this.value}}`);

        assert.dom(this.element).hasText('f', 'the helper does not upper-case the result');
    });

    test('it renders nothing for an empty string', async function (assert) {
        this.set('value', '');

        await render(hbs`{{first-char this.value}}`);

        assert.dom(this.element).hasNoText();
    });

    test('it returns the first element when given an array', async function (assert) {
        this.set('value', ['alpha', 'beta']);

        await render(hbs`{{first-char this.value}}`);

        assert.dom(this.element).hasText('alpha');
    });

    test('it renders nothing for an empty array', async function (assert) {
        this.set('value', []);

        await render(hbs`{{first-char this.value}}`);

        assert.dom(this.element).hasNoText();
    });

    test('it handles accented characters', async function (assert) {
        this.set('value', 'Émile Zola');

        await render(hbs`{{first-char this.value}}`);

        assert.dom(this.element).hasText('É');
    });

    test('it preserves a leading space instead of trimming it', async function (assert) {
        this.set('value', ' padded');

        await render(hbs`{{first-char this.value}}`);

        assert.strictEqual(this.element.textContent, ' ', 'the raw first character is returned verbatim');
    });

    test('it renders nothing for values that cannot be indexed', async function (assert) {
        this.set('value', 12345);

        await render(hbs`{{first-char this.value}}`);

        assert.dom(this.element).hasNoText('numbers have no index 0 so the empty-string fallback is used');
    });
});
