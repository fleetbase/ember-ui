import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

function beforeInput(element, data) {
    const event = new InputEvent('beforeinput', { inputType: 'insertText', data, bubbles: true, cancelable: true });
    element.dispatchEvent(event);
    return event;
}

module('Integration | Component | phone-input', function (hooks) {
    setupRenderingTest(hooks);

    test('it renders a tel input', async function (assert) {
        await render(hbs`<PhoneInput />`);

        assert.dom('input.phone-input').hasAttribute('type', 'tel');
    });

    test('it rejects typed characters that are not digits', async function (assert) {
        await render(hbs`<PhoneInput />`);
        const input = this.element.querySelector('input.phone-input');

        assert.true(beforeInput(input, 'a').defaultPrevented, 'a letter is blocked');
        assert.true(beforeInput(input, '-').defaultPrevented, 'a separator is blocked');
        assert.false(beforeInput(input, '5').defaultPrevented, 'a digit is allowed');
    });

    test('it keeps only the digits when several characters are inserted at once', async function (assert) {
        await render(hbs`<PhoneInput />`);
        const input = this.element.querySelector('input.phone-input');

        assert.true(beforeInput(input, '2a0b1').defaultPrevented, 'the raw text is not inserted');
        assert.strictEqual(input.value.replace(/\D/g, ''), '201', 'its digits are');
    });

    test('it strips letters from pasted or autofilled text', async function (assert) {
        await render(hbs`<PhoneInput />`);
        const input = this.element.querySelector('input.phone-input');

        input.value = '55ab5 1234';
        input.setSelectionRange(5, 5);
        input.dispatchEvent(new InputEvent('input', { inputType: 'insertFromPaste', bubbles: true }));

        assert.notOk(/[a-z]/i.test(input.value), 'letters are removed');
        assert.strictEqual(input.value.replace(/\D/g, ''), '5551234', 'digits are kept');
    });

    test('it leaves a clean number untouched', async function (assert) {
        await render(hbs`<PhoneInput />`);
        const input = this.element.querySelector('input.phone-input');

        input.value = '(555) 123-4567';
        input.setSelectionRange(3, 3);
        input.dispatchEvent(new InputEvent('input', { inputType: 'insertFromPaste', bubbles: true }));

        assert.strictEqual(input.value.replace(/\D/g, ''), '5551234567');
    });
});
