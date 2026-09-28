import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, findAll } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

const OPTION = '[data-test-filter-radio-option]';

function labels() {
    return findAll(`${OPTION} span`).map((node) => node.textContent.trim());
}

function values() {
    return findAll(OPTION).map((node) => node.getAttribute('data-test-filter-radio-option'));
}

function checkedValue() {
    const checked = findAll(`${OPTION} input`).find((input) => input.checked);

    // `input.value` reads back as "on" for the empty-valued "any" radio, so read the
    // value off the label the input sits in instead.
    return checked ? checked.closest(OPTION).getAttribute('data-test-filter-radio-option') : null;
}

module('Integration | Component | filter/radio', function (hooks) {
    setupRenderingTest(hooks);

    let changes;

    hooks.beforeEach(function () {
        changes = [];
        this.set('filter', { key: 'assigned' });
        this.set('onChange', (filter, value) => changes.push([filter?.key, value]));
        this.set('options', [
            { label: 'Assigned', value: 'yes' },
            { label: 'Unassigned', value: 'no' },
        ]);
    });

    const TEMPLATE = hbs`
        <Filter::Radio
            @filter={{this.filter}}
            @options={{this.options}}
            @value={{this.value}}
            @placeholder={{this.placeholder}}
            @anyLabel={{this.anyLabel}}
            @optionLabel={{this.optionLabel}}
            @optionValue={{this.optionValue}}
            @filterOptionLabel={{this.filterOptionLabel}}
            @filterOptionValue={{this.filterOptionValue}}
            @onChange={{this.onChange}}
        />
    `;

    module('the choices it offers', function () {
        test('it renders a radiogroup of the options behind an "any" choice', async function (assert) {
            await render(TEMPLATE);

            assert.dom('[data-test-filter-radio]').hasAttribute('role', 'radiogroup');
            assert.deepEqual(labels(), ['Any', 'Assigned', 'Unassigned'], '"any" comes first, then the options in order');
            assert.deepEqual(values(), ['', 'yes', 'no'], 'the "any" choice carries the empty value');
        });

        test('every radio shares one group name', async function (assert) {
            await render(TEMPLATE);

            const names = findAll(`${OPTION} input`).map((input) => input.name);

            assert.strictEqual(new Set(names).size, 1, 'one name means the radios are exclusive');
            assert.ok(names[0].startsWith('filter-radio-'), 'and it is namespaced to this component');
        });

        test('@anyLabel names the clearing choice', async function (assert) {
            this.set('anyLabel', 'Either');

            await render(TEMPLATE);

            assert.deepEqual(labels(), ['Either', 'Assigned', 'Unassigned']);
        });

        test('@placeholder names it when there is no @anyLabel', async function (assert) {
            this.set('placeholder', 'No preference');

            await render(TEMPLATE);

            assert.deepEqual(labels(), ['No preference', 'Assigned', 'Unassigned']);
        });

        test('@anyLabel wins over @placeholder', async function (assert) {
            this.setProperties({ anyLabel: 'From anyLabel', placeholder: 'From placeholder' });

            await render(TEMPLATE);

            assert.strictEqual(labels()[0], 'From anyLabel');
        });

        test('bare values are used as both label and value', async function (assert) {
            this.set('options', ['yes', 'no']);

            await render(TEMPLATE);

            assert.deepEqual(labels(), ['Any', 'yes', 'no']);
            assert.deepEqual(values(), ['', 'yes', 'no']);
        });

        test('a null entry is treated as a bare value rather than an object', async function (assert) {
            this.set('options', [null]);

            await render(TEMPLATE);

            assert.deepEqual(labels(), ['Any', 'null'], 'null is stringified rather than read for a label path');
        });

        test('non-array options are ignored', async function (assert) {
            this.set('options', undefined);

            await render(TEMPLATE);

            assert.deepEqual(labels(), ['Any'], 'only the clearing choice is left');

            this.set('options', 'not an array');

            assert.deepEqual(labels(), ['Any'], 'and a string is not treated as a list of options');
        });

        test('values are compared as strings, so true and "true" are the same choice', async function (assert) {
            this.set('options', [
                { label: 'On', value: true },
                { label: 'Off', value: false },
            ]);
            this.set('value', true);

            await render(TEMPLATE);

            assert.deepEqual(values(), ['', 'true', 'false']);
            assert.strictEqual(checkedValue(), 'true', 'the boolean incoming value selects the "true" option');
        });

        module('naming the label and value paths', function () {
            test('@optionLabel and @optionValue are honoured', async function (assert) {
                this.setProperties({
                    options: [
                        { name: 'Assigned', id: 'a' },
                        { name: 'Unassigned', id: 'u' },
                    ],
                    optionLabel: 'name',
                    optionValue: 'id',
                });

                await render(TEMPLATE);

                assert.deepEqual(labels(), ['Any', 'Assigned', 'Unassigned']);
                assert.deepEqual(values(), ['', 'a', 'u']);
            });

            test('@filterOptionLabel and @filterOptionValue are accepted as the column-level spelling', async function (assert) {
                this.setProperties({
                    options: [{ name: 'Assigned', id: 'a' }],
                    filterOptionLabel: 'name',
                    filterOptionValue: 'id',
                });

                await render(TEMPLATE);

                assert.deepEqual(labels(), ['Any', 'Assigned']);
                assert.deepEqual(values(), ['', 'a']);
            });

            test('@optionLabel wins over @filterOptionLabel', async function (assert) {
                this.setProperties({
                    options: [{ name: 'From name', label: 'From label' }],
                    optionLabel: 'label',
                    filterOptionLabel: 'name',
                });

                await render(TEMPLATE);

                assert.deepEqual(labels(), ['Any', 'From label']);
            });
        });
    });

    module('the selected state', function () {
        test('nothing is selected but "any" when no value is given', async function (assert) {
            await render(TEMPLATE);

            assert.strictEqual(checkedValue(), '', 'the clearing choice is the resting state');
        });

        test('an explicit null value rests on "any" too', async function (assert) {
            this.set('value', null);

            await render(TEMPLATE);

            assert.strictEqual(checkedValue(), '');
        });

        test('an incoming value selects its option', async function (assert) {
            this.set('value', 'no');

            await render(TEMPLATE);

            assert.strictEqual(checkedValue(), 'no');
            assert.dom(`[data-test-filter-radio-option="no"]`).hasClass('filter-radio-option--active', 'the active option is marked');
            assert.dom(`[data-test-filter-radio-option="yes"]`).doesNotHaveClass('filter-radio-option--active');
        });
    });

    module('choosing', function () {
        test('picking an option reports the filter and the value', async function (assert) {
            await render(TEMPLATE);

            await click('[data-test-filter-radio-option="yes"] input');

            assert.deepEqual(changes, [['assigned', 'yes']]);
            assert.strictEqual(checkedValue(), 'yes', 'and the pick is shown as selected');
        });

        test('picking "any" reports a cleared filter as null', async function (assert) {
            this.set('value', 'yes');

            await render(TEMPLATE);
            await click('[data-test-filter-radio-option=""] input');

            assert.deepEqual(changes, [['assigned', null]], 'the empty value is reported as null, not an empty string');
            assert.strictEqual(checkedValue(), '');
        });

        test('it chooses happily with no handler behind it', async function (assert) {
            this.set('onChange', undefined);

            await render(TEMPLATE);
            await click('[data-test-filter-radio-option="no"] input');

            assert.strictEqual(checkedValue(), 'no', 'the choice is still made and shown');
        });
    });
});
