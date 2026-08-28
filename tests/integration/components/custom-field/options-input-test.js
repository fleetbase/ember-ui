import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, fillIn, findAll, triggerEvent } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

function createCustomField(attributes = {}) {
    return {
        id: 'custom-field-1',
        name: 'priority',
        label: 'Priority',
        options: [],
        meta: {},
        set(key, value) {
            this[key] = value;
        },
        ...attributes,
    };
}

function findButtonByText(rootElement, text) {
    return [...rootElement.querySelectorAll('button')].find((button) => button.textContent.includes(text));
}

module('Integration | Component | custom-field/options-input', function (hooks) {
    setupRenderingTest(hooks);

    test('it renders a row for each existing option', async function (assert) {
        this.set('customField', createCustomField({ options: ['Red', 'Blue'] }));

        await render(hbs`<CustomField::OptionsInput @customField={{this.customField}} />`);

        assert.dom(this.element).containsText('Field Options');
        const inputs = findAll('input');
        assert.strictEqual(inputs.length, 2, 'one input per option is rendered');
        assert.deepEqual(
            inputs.map((input) => input.value),
            ['Red', 'Blue']
        );
    });

    test('clicking add new option appends an empty option row', async function (assert) {
        this.set('customField', createCustomField({ options: ['Red'] }));

        await render(hbs`<CustomField::OptionsInput @customField={{this.customField}} />`);
        await click(findButtonByText(this.element, 'Add new option'));

        const inputs = findAll('input');
        assert.strictEqual(inputs.length, 2, 'a new option row is appended');
        assert.strictEqual(inputs[1].value, '', 'the new option starts empty');
    });

    test('editing an option commits the change on blur and calls onChange', async function (assert) {
        const customField = createCustomField({ options: ['Red', 'Blue'] });
        const changes = [];
        this.set('customField', customField);
        this.set('onChange', (options, changedCustomField) => changes.push({ options, changedCustomField }));

        await render(hbs`<CustomField::OptionsInput @customField={{this.customField}} @onChange={{this.onChange}} />`);

        const input = findAll('input')[0];
        await fillIn(input, 'Crimson');
        await triggerEvent(input, 'blur');

        assert.deepEqual(customField.options, ['Crimson', 'Blue'], 'the custom field options are updated');
        assert.strictEqual(changes.length, 1, 'onChange is called once');
        assert.deepEqual(changes[0].options, ['Crimson', 'Blue']);
        assert.strictEqual(changes[0].changedCustomField, customField, 'onChange receives the custom field');
    });

    test('removing an option updates the custom field options', async function (assert) {
        const customField = createCustomField({ options: ['Red', 'Blue'] });
        const changes = [];
        this.set('customField', customField);
        this.set('onChange', (options) => changes.push(options));

        await render(hbs`<CustomField::OptionsInput @customField={{this.customField}} @onChange={{this.onChange}} />`);

        const firstRemoveButton = findAll('button.btn-danger')[0];
        await click(firstRemoveButton);

        assert.deepEqual(customField.options, ['Blue'], 'the removed option is dropped from the custom field');
        assert.deepEqual(changes, [['Blue']], 'onChange is called with the remaining options');
        assert.dom('input').exists({ count: 1 }, 'the option row is removed');
    });
    test('adding the first option to an empty field keys it from zero', async function (assert) {
        const customField = createCustomField({ options: [] });
        this.set('customField', customField);

        await render(hbs`<CustomField::OptionsInput @customField={{this.customField}} />`);
        assert.strictEqual(findAll('input').length, 0, 'there is nothing to start with');

        await click(findButtonByText(this.element, 'Add new option'));
        await fillIn(findAll('input')[0], 'Red');
        await triggerEvent(findAll('input')[0], 'blur');

        assert.deepEqual(customField.options, ['Red'], 'the first option is stored');
    });

    test('a customField whose options are not an array renders no rows', async function (assert) {
        this.set('customField', createCustomField({ options: { red: 'Red' } }));

        await render(hbs`<CustomField::OptionsInput @customField={{this.customField}} />`);

        assert.strictEqual(findAll('input').length, 0, 'an options object is discarded rather than indexed');
        assert.dom(this.element).containsText('Field Options', 'and the editor still renders');
    });

    test('an option can be edited with no onChange handler attached', async function (assert) {
        const customField = createCustomField({ options: ['Red'] });
        this.set('customField', customField);

        await render(hbs`<CustomField::OptionsInput @customField={{this.customField}} />`);
        await fillIn(findAll('input')[0], 'Crimson');
        await triggerEvent(findAll('input')[0], 'blur');

        assert.deepEqual(customField.options, ['Crimson'], 'the edit is still committed to the field');
    });
});
