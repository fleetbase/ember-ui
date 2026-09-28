import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render, settled, fillIn, find } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Modifier | imask', function (hooks) {
    setupRenderingTest(hooks);

    test('it masks what is typed into the input', async function (assert) {
        this.set('options', { mask: '000-000' });

        await render(hbs`<input data-test-input {{imask this.options}} />`);

        await fillIn('[data-test-input]', '123456');

        assert.dom('[data-test-input]').hasValue('123-456', 'the mask inserts the literal separator');
    });

    test('it drops characters that do not fit the mask', async function (assert) {
        this.set('options', { mask: '000-000' });

        await render(hbs`<input data-test-input {{imask this.options}} />`);

        await fillIn('[data-test-input]', 'ab12cd34ef56gh');

        assert.dom('[data-test-input]').hasValue('123-456', 'non digits are stripped and the mask is applied');
    });

    test('it truncates input that overflows the mask', async function (assert) {
        this.set('options', { mask: '000-000' });

        await render(hbs`<input data-test-input {{imask this.options}} />`);

        await fillIn('[data-test-input]', '1234567890');

        assert.dom('[data-test-input]').hasValue('123-456', 'input longer than the mask is truncated');
    });

    test('it masks a value that is already present when the modifier installs', async function (assert) {
        this.set('options', { mask: '000-000' });

        await render(hbs`<input data-test-input value="987654" {{imask this.options}} />`);

        assert.dom('[data-test-input]').hasValue('987-654', 'the pre-existing value is masked on install');
    });

    test('it re-masks the input when the mask options change', async function (assert) {
        this.set('options', { mask: '000-000' });

        await render(hbs`<input data-test-input {{imask this.options}} />`);

        await fillIn('[data-test-input]', '123456');
        assert.dom('[data-test-input]').hasValue('123-456', 'the original mask is applied');

        await fillIn('[data-test-input]', '');
        assert.dom('[data-test-input]').hasValue('', 'the masked input can be cleared');

        this.set('options', { mask: '00/00/0000' });
        await settled();

        await fillIn('[data-test-input]', '12312021');
        assert.dom('[data-test-input]').hasValue('12/31/2021', 'the updated mask is applied');
    });

    test('it does nothing when no mask is configured', async function (assert) {
        this.set('options', {});

        await render(hbs`<input data-test-input {{imask this.options}} />`);

        await fillIn('[data-test-input]', 'plain text 123');

        assert.dom('[data-test-input]').hasValue('plain text 123', 'the value is left untouched when the mask is empty');
    });

    test('it does nothing when no options are passed at all', async function (assert) {
        await render(hbs`<input data-test-input {{imask}} />`);

        await fillIn('[data-test-input]', 'plain text 123');

        assert.dom('[data-test-input]').hasValue('plain text 123', 'the value is left untouched with no options');
    });

    test('it destroys the mask instance when the element is torn down', async function (assert) {
        this.set('options', { mask: '000-000' });
        this.set('show', true);

        await render(hbs`{{#if this.show}}<input data-test-input {{imask this.options}} />{{/if}}`);

        await fillIn('[data-test-input]', '123456');
        const input = find('[data-test-input]');
        assert.strictEqual(input.value, '123-456', 'the mask is active while rendered');

        this.set('show', false);
        await settled();

        assert.dom('[data-test-input]').doesNotExist('the input was torn down');

        input.value = '999888';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        await settled();

        assert.strictEqual(input.value, '999888', 'the destroyed mask no longer reformats input events');
    });
});
