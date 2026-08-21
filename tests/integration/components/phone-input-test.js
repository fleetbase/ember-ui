import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, settled, triggerEvent, triggerKeyEvent, find, waitUntil } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import intlTelInput from 'intl-tel-input';

const INPUT = 'input.phone-input';

// intl-tel-input fetches `utils.js` (copied into the build by the addon's treeForPublic hook)
// asynchronously, and `onInput` reads `intlTelInput.utils.numberFormat.E164` unguarded.
function utilsLoaded() {
    return waitUntil(() => intlTelInput.utils, { timeout: 5000 });
}

module('Integration | Component | phone-input', function (hooks) {
    setupRenderingTest(hooks);

    let iti;

    hooks.beforeEach(function () {
        iti = undefined;
        // Several tests drive the library instance directly; the component destroys it itself.
        this.set('captureIti', (instance) => {
            iti = instance;
        });
    });

    test('it renders a telephone input wrapped by intl-tel-input', async function (assert) {
        await render(hbs`<PhoneInput @onInit={{this.captureIti}} />`);

        assert.dom(INPUT).exists();
        assert.dom(INPUT).hasAttribute('type', 'tel');
        assert.dom('.iti').exists('the library wraps the input in its own container');
        assert.dom('.iti__selected-dial-code, .iti__selected-flag, .iti__selected-country').exists('a country selector is rendered');
    });

    test('a wrapper class is applied to the library container', async function (assert) {
        await render(hbs`<PhoneInput @wrapperClass="my-wrapper" @onInit={{this.captureIti}} />`);

        assert.dom('.iti').hasClass('my-wrapper');
        assert.dom('.iti').hasClass('w-full', 'the base container class is kept');
    });

    test('with no wrapper class the container is still full width', async function (assert) {
        await render(hbs`<PhoneInput @onInit={{this.captureIti}} />`);

        assert.dom('.iti').hasClass('w-full');
    });

    test('the bound value is rendered', async function (assert) {
        this.set('value', '+16505550123');

        await render(hbs`<PhoneInput @value={{this.value}} @onInit={{this.captureIti}} />`);
        await utilsLoaded();

        // separateDialCode moves the +1 into the country selector and formatAsYouType groups the
        // remaining national number, so the raw digits survive but the punctuation is the library's.
        assert.strictEqual(find(INPUT).value.replace(/\D/g, ''), '6505550123', 'the national number is rendered');
        assert.dom('.iti').containsText('+1', 'the dial code is shown beside the input');
    });

    test('it forwards splattributes', async function (assert) {
        await render(hbs`<PhoneInput placeholder="Mobile number" data-test-phone="yes" @onInit={{this.captureIti}} />`);

        assert.dom(INPUT).hasAttribute('placeholder', 'Mobile number');
        assert.dom(INPUT).hasAttribute('data-test-phone', 'yes');
    });

    test('onInit receives the intl-tel-input instance exactly once', async function (assert) {
        let called = 0;
        this.set('onInit', (instance) => {
            called++;
            iti = instance;
        });

        await render(hbs`<PhoneInput @onInit={{this.onInit}} />`);

        assert.strictEqual(called, 1);
        assert.strictEqual(typeof iti.getNumber, 'function');
        assert.strictEqual(typeof iti.setCountry, 'function');
    });

    test('typing reports the E164 number', async function (assert) {
        const reported = [];
        this.set('onInput', (number) => reported.push(number));

        await render(hbs`<PhoneInput @onInput={{this.onInput}} @onInit={{this.captureIti}} />`);
        await utilsLoaded();

        iti.setNumber('+16505550123');
        await triggerKeyEvent(INPUT, 'keyup', '3');

        assert.strictEqual(reported.length, 1, 'the change is reported once');
        assert.strictEqual(reported[0], '+16505550123', 'the number is normalised to E164');
    });

    test('typing without an onInput handler does not throw', async function (assert) {
        await render(hbs`<PhoneInput @onInit={{this.captureIti}} />`);
        await utilsLoaded();

        iti.setNumber('+16505550123');
        await triggerKeyEvent(INPUT, 'keyup', '3');

        assert.dom(INPUT).exists('no handler is required');
    });

    test('a country change is reported', async function (assert) {
        const changes = [];
        this.set('onCountryChange', (event) => changes.push(event.type));

        await render(hbs`<PhoneInput @onCountryChange={{this.onCountryChange}} @onInit={{this.captureIti}} />`);
        await triggerEvent(INPUT, 'countrychange');

        assert.deepEqual(changes, ['countrychange']);
    });

    test('a country change with no handler does not throw', async function (assert) {
        await render(hbs`<PhoneInput @onInit={{this.captureIti}} />`);
        await triggerEvent(INPUT, 'countrychange');

        assert.dom(INPUT).exists('addEventListener tolerates the undefined handler');
    });

    test('the initial country is resolved before the input is usable', async function (assert) {
        await render(hbs`<PhoneInput @onInit={{this.captureIti}} />`);

        assert.ok(find('.iti'), 'the geoIpLookup fallback never blocks rendering');
        assert.strictEqual(typeof iti.getSelectedCountryData, 'function');
    });

    test('unmounting tears the library instance down instead of throwing', async function (assert) {
        this.set('mounted', true);

        await render(hbs`{{#if this.mounted}}<PhoneInput @onInit={{this.captureIti}} />{{/if}}`);
        assert.ok(find('.iti'), 'the library wrapper is in the DOM while mounted');

        this.set('mounted', false);
        await settled();

        assert.notOk(find('.iti'), 'the library wrapper is gone');
        assert.notOk(find(INPUT), 'and so is the input it re-parented');
    });
});
