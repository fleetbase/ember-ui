import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, settled, find } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import { selectChoose, getDropdownItems } from 'ember-power-select/test-support';

const SCOPE = '.ui-unit-input';

function input() {
    return find(`${SCOPE} input`);
}

module('Integration | Component | unit-input', function (hooks) {
    setupRenderingTest(hooks);

    let unitChanges;

    hooks.beforeEach(function () {
        unitChanges = [];
        this.set('onUnitChange', (unit) => unitChanges.push(unit));
    });

    const TEMPLATE = hbs`
        <UnitInput
            @value={{this.value}}
            @unit={{this.unit}}
            @measurement={{this.measurement}}
            @placeholder={{this.placeholder}}
            @canSelectUnit={{this.canSelectUnit}}
            @disabled={{this.disabled}}
            @wrapperClass={{this.wrapperClass}}
            @onUnitChange={{this.onUnitChange}}
        />
    `;

    module('rendering', function () {
        test('it renders an amount field beside the unit', async function (assert) {
            this.set('unit', 'm');

            await render(TEMPLATE);

            assert.dom(SCOPE).exists();
            assert.dom(input()).hasAttribute('type', 'tel');
            assert.dom(SCOPE).containsText('m', 'the unit is shown alongside the input');
        });

        test('the value is bound to the input', async function (assert) {
            this.set('unit', 'm');
            this.set('value', '42');

            await render(TEMPLATE);

            assert.dom(input()).hasValue('42');
        });

        test('a wrapper class and splattributes are applied', async function (assert) {
            this.set('wrapperClass', 'my-unit-input');

            await render(hbs`<UnitInput @unit="m" @wrapperClass={{this.wrapperClass}} data-test-unit="yes" />`);

            assert.dom(SCOPE).hasClass('my-unit-input');
            assert.dom(input()).hasAttribute('data-test-unit', 'yes');
        });

        test('a disabled input is dimmed and both controls disabled', async function (assert) {
            this.set('unit', 'm');
            this.set('disabled', true);

            await render(TEMPLATE);

            assert.dom(SCOPE).hasClass('unit-input-disabled');
            assert.dom(input()).isDisabled();
        });
    });

    module('the placeholder', function () {
        test('it names the selected unit by default', async function (assert) {
            this.set('unit', 'm');

            await render(TEMPLATE);

            assert.dom(input()).hasAttribute('placeholder', 'Enter Meter');
        });

        test('an unknown unit falls back to the raw code', async function (assert) {
            this.set('unit', 'furlongs');

            await render(TEMPLATE);

            assert.dom(input()).hasAttribute('placeholder', 'Enter furlongs');
        });

        test('an explicit placeholder wins', async function (assert) {
            this.set('unit', 'm');
            this.set('placeholder', 'How far?');

            await render(TEMPLATE);

            assert.dom(input()).hasAttribute('placeholder', 'How far?');
        });
    });

    module('measurement systems', function (hooks) {
        hooks.beforeEach(function () {
            this.set('canSelectUnit', true);
        });

        test('length is the default measurement', async function (assert) {
            this.set('unit', 'm');

            await render(TEMPLATE);
            const options = await getDropdownItems(`${SCOPE} .unit-input-selector`);

            assert.true(options.some((option) => option.includes('Meter')));
            assert.false(options.some((option) => option.includes('Kilograms')));
        });

        test('weight offers the weight units', async function (assert) {
            this.set('measurement', 'weight');
            this.set('unit', 'kg');

            await render(TEMPLATE);
            const options = await getDropdownItems(`${SCOPE} .unit-input-selector`);

            assert.true(options.some((option) => option.includes('Kilograms')));
            assert.true(options.some((option) => option.includes('Tonne')));
            assert.false(options.some((option) => option.includes('Meter')));
        });

        test('volume offers the volume units', async function (assert) {
            this.set('measurement', 'volume');

            await render(TEMPLATE);
            const options = await getDropdownItems(`${SCOPE} .unit-input-selector`);

            assert.true(options.length > 0, 'volume units are offered');
            assert.false(options.some((option) => option.includes('Kilograms')));
        });

        test('an unrecognised measurement offers nothing', async function (assert) {
            this.set('measurement', 'luminosity');

            await render(TEMPLATE);
            const options = await getDropdownItems(`${SCOPE} .unit-input-selector`);

            assert.deepEqual(options, ['No results found']);
        });

        test('each option shows its name and code', async function (assert) {
            this.set('unit', 'm');

            await render(TEMPLATE);
            const options = await getDropdownItems(`${SCOPE} .unit-input-selector`);

            assert.true(
                options.some((option) => option.includes('Meter') && option.includes('(m)')),
                'both the name and the abbreviation are shown'
            );
        });
    });

    module('choosing a unit', function () {
        test('the selector is only offered when asked for', async function (assert) {
            this.set('unit', 'm');

            await render(TEMPLATE);
            assert.dom('.unit-input-selector').doesNotExist('a plain label by default');

            this.set('canSelectUnit', true);
            await settled();

            assert.dom('.unit-input-selector').exists();
        });

        test('choosing a unit reports its code', async function (assert) {
            this.set('unit', 'm');
            this.set('canSelectUnit', true);

            await render(TEMPLATE);
            await selectChoose(`${SCOPE} .unit-input-selector`, 'Kilometer');

            assert.deepEqual(unitChanges, ['km']);
        });

        test('the placeholder follows the newly chosen unit', async function (assert) {
            this.set('unit', 'm');
            this.set('canSelectUnit', true);

            await render(TEMPLATE);
            await selectChoose(`${SCOPE} .unit-input-selector`, 'Kilometer');

            assert.dom(input()).hasAttribute('placeholder', 'Enter Kilometer');
        });

        test('it selects without an onUnitChange handler', async function (assert) {
            await render(hbs`<UnitInput @unit="m" @canSelectUnit={{true}} />`);
            await selectChoose(`${SCOPE} .unit-input-selector`, 'Kilometer');

            assert.dom(input()).hasAttribute('placeholder', 'Enter Kilometer', 'the selection still applies');
        });

        test('a disabled selector cannot be opened', async function (assert) {
            this.set('unit', 'm');
            this.set('canSelectUnit', true);
            this.set('disabled', true);

            await render(TEMPLATE);

            assert.dom(`${SCOPE} .ember-power-select-trigger`).hasAttribute('aria-disabled', 'true');
        });
    });

    test('with no unit the field carries no placeholder at all', async function (assert) {
        await render(hbs`<UnitInput />`);

        assert.dom(SCOPE).exists();
        assert.dom(input()).doesNotHaveAttribute('placeholder', 'better nothing than "Enter undefined"');
    });
});
