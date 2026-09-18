import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, fillIn, find } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

const INPUT = '.otp-input';

module('Integration | Component | otp-input', function (hooks) {
    setupRenderingTest(hooks);

    let inputs;
    let completions;

    hooks.beforeEach(function () {
        inputs = [];
        completions = [];
        this.set('size', 6);
        this.set('onInput', (value) => inputs.push(value));
        this.set('onInputCompleted', (value) => completions.push(value));
    });

    const TEMPLATE = hbs`
        <OtpInput @size={{this.size}} @value={{this.value}} @placeholder={{this.placeholder}} @onInput={{this.onInput}} @onInputCompleted={{this.onInputCompleted}} />
    `;

    module('rendering', function () {
        test('it renders a numeric field placeholdered to the code length', async function (assert) {
            await render(TEMPLATE);

            assert.dom('.otp-input-container').exists();
            assert.dom(INPUT).hasAttribute('type', 'tel');
            assert.dom(INPUT).hasAttribute('placeholder', '000000');
            assert.dom(INPUT).hasAttribute('autocomplete', 'off');
        });

        test('the placeholder tracks the code length', async function (assert) {
            this.set('size', 4);

            await render(TEMPLATE);

            assert.dom(INPUT).hasAttribute('placeholder', '0000');
        });

        test('an explicit placeholder wins', async function (assert) {
            this.set('placeholder', '------');

            await render(TEMPLATE);

            assert.dom(INPUT).hasAttribute('placeholder', '------');
        });

        test('an incoming value is shown', async function (assert) {
            this.set('value', '1234');

            await render(TEMPLATE);

            assert.dom(INPUT).hasValue('1234');
        });

        test('the field takes focus so the code can be typed immediately', async function (assert) {
            await render(TEMPLATE);

            assert.strictEqual(document.activeElement, find(INPUT), 'the field is focused on insert');
        });

        test('it forwards splattributes', async function (assert) {
            await render(hbs`<OtpInput @size={{6}} data-test-otp="yes" />`);

            assert.dom(INPUT).hasAttribute('data-test-otp', 'yes');
        });
    });

    module('typing the code', function () {
        test('every keystroke is reported', async function (assert) {
            await render(TEMPLATE);
            await fillIn(INPUT, '12');
            await fillIn(INPUT, '123');

            assert.deepEqual(inputs, ['12', '123']);
            assert.deepEqual(completions, [], 'the code is not complete yet');
        });

        test('a full length code is reported as complete', async function (assert) {
            await render(TEMPLATE);
            await fillIn(INPUT, '123456');

            assert.deepEqual(completions, ['123456']);
        });

        test('an over-long value is not reported as complete', async function (assert) {
            await render(TEMPLATE);
            await fillIn(INPUT, '1234567');

            assert.deepEqual(inputs, ['1234567']);
            assert.deepEqual(completions, []);
        });

        test('a shorter code length completes sooner', async function (assert) {
            this.set('size', 4);

            await render(TEMPLATE);
            await fillIn(INPUT, '1234');

            assert.deepEqual(completions, ['1234']);
        });

        test('it types happily without handlers', async function (assert) {
            await render(hbs`<OtpInput @size={{4}} />`);
            await fillIn(INPUT, '1234');

            assert.dom(INPUT).hasValue('1234');
        });
    });

    test('omitting the code length falls back to six digits', async function (assert) {
        await render(hbs`<OtpInput @onInputCompleted={{this.onInputCompleted}} />`);

        assert.dom(INPUT).hasAttribute('placeholder', '000000', 'the default length drives the placeholder');

        await fillIn(INPUT, '12345');
        assert.deepEqual(completions, [], 'five digits is not yet complete');

        await fillIn(INPUT, '123456');
        assert.deepEqual(completions, ['123456'], 'six digits completes the code');
    });
});
