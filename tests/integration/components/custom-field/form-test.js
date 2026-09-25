import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, fillIn, select, click, find, findAll } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import { set } from '@ember/object';

// A stand-in for a custom-field record: the form reads and assigns plain attributes and
// writes `meta` through `set`, which on a record notifies the template as Ember's `set` does here.
function createResource(attributes = {}) {
    return {
        label: 'Untitled Field',
        meta: {},
        set(key, value) {
            set(this, key, value);
        },
        ...attributes,
    };
}

const TYPE_SELECT = 'select.form-select';

module('Integration | Component | custom-field/form', function (hooks) {
    setupRenderingTest(hooks);

    test('it renders the field attributes', async function (assert) {
        this.set('resource', createResource({ label: 'Gate code', description: 'Code for the gate', help_text: 'Ask the guard' }));

        await render(hbs`<CustomField::Form @resource={{this.resource}} />`);

        assert.dom(this.element).containsText('Field Label');
        assert.dom(this.element).containsText('Field Type');
        assert.dom(this.element).containsText('Field is Required');
        assert.dom(this.element).containsText('Field is Editable');
        const [label, description, helpText] = findAll('input');
        assert.dom(label).hasValue('Gate code');
        assert.dom(description).hasValue('Code for the gate');
        assert.dom(helpText).hasValue('Ask the guard');
    });

    module('the field type', function () {
        test('the stored type is preselected and its field map applied', async function (assert) {
            this.set('resource', createResource({ type: 'select' }));

            await render(hbs`<CustomField::Form @resource={{this.resource}} />`);

            assert.strictEqual(find(TYPE_SELECT).value, 'select');
            assert.strictEqual(this.resource.component, 'select', 'the rendering component follows the type');
            assert.dom(this.element).containsText('Field Options', 'a type with options shows the options editor');
        });

        test('a type without options hides the options editor', async function (assert) {
            this.set('resource', createResource({ type: 'input' }));

            await render(hbs`<CustomField::Form @resource={{this.resource}} />`);

            assert.strictEqual(this.resource.component, 'input');
            assert.dom(this.element).doesNotContainText('Field Options');
        });

        test('a new field with no type has no field map yet', async function (assert) {
            this.set('resource', createResource());

            await render(hbs`<CustomField::Form @resource={{this.resource}} />`);

            assert.strictEqual(this.resource.component, undefined);
            assert.dom(this.element).doesNotContainText('Field Options');
        });

        test('a type that is not in the map is left alone', async function (assert) {
            this.set('resource', createResource({ type: 'hologram' }));

            await render(hbs`<CustomField::Form @resource={{this.resource}} />`);

            assert.strictEqual(this.resource.type, 'hologram', 'the stored type is not overwritten');
            assert.strictEqual(this.resource.component, undefined, 'no component is assigned for it');
        });

        test('every field type in the map is offered', async function (assert) {
            this.set('resource', createResource());

            await render(hbs`<CustomField::Form @resource={{this.resource}} />`);

            const offered = findAll(`${TYPE_SELECT} option:not([disabled])`).map((option) => option.value);
            assert.deepEqual(offered, ['input', 'phone-input', 'money-input', 'date-time-input', 'date-picker', 'radio-button', 'select', 'file-upload', 'signature-pad']);
        });

        test('choosing a type stores it dasherized and applies its field map', async function (assert) {
            this.set('resource', createResource());

            await render(hbs`<CustomField::Form @resource={{this.resource}} />`);
            await select(TYPE_SELECT, 'radio-button');

            assert.strictEqual(this.resource.type, 'radio-button');
            assert.strictEqual(this.resource.component, 'radio-button-select');
            assert.dom(this.element).containsText('Field Options');
        });
    });

    test('typing a label dasherizes it into the field name', async function (assert) {
        this.set('resource', createResource());

        await render(hbs`<CustomField::Form @resource={{this.resource}} />`);
        await fillIn(findAll('input')[0], 'Gate Code');

        assert.strictEqual(this.resource.name, 'gate-code');
    });

    module('the column span', function () {
        test('the stored span is shown on the button', async function (assert) {
            this.set('resource', createResource({ meta: { colSpan: 2 } }));

            await render(hbs`<CustomField::Form @resource={{this.resource}} />`);

            assert.dom(this.element).containsText('Column Span Size :2');
        });

        test('choosing a span writes it into meta and keeps the other keys', async function (assert) {
            this.set('resource', createResource({ meta: { modelName: 'driver' } }));

            await render(hbs`<CustomField::Form @resource={{this.resource}} />`);
            await click('.ember-basic-dropdown-trigger');
            await click(findAll('.next-dd-item')[2]);

            assert.deepEqual(this.resource.meta, { modelName: 'driver', colSpan: 3 });
            assert.dom(this.element).containsText('Column Span Size :3');
        });

        test('a field with no meta object gets one', async function (assert) {
            this.set('resource', createResource({ meta: null }));

            await render(hbs`<CustomField::Form @resource={{this.resource}} />`);
            await click('.ember-basic-dropdown-trigger');
            await click(findAll('.next-dd-item')[1]);

            assert.deepEqual(this.resource.meta, { colSpan: 2 });
        });

        test('the chosen span is ticked in the menu', async function (assert) {
            this.set('resource', createResource({ meta: { colSpan: 1 } }));

            await render(hbs`<CustomField::Form @resource={{this.resource}} />`);
            await click('.ember-basic-dropdown-trigger');

            const items = findAll('.next-dd-item');
            assert.dom(items[0]).includesText('1');
            assert.dom('[data-icon="check"]', items[0]).exists('the current span carries the tick');
            assert.dom('[data-icon="check"]', items[1]).doesNotExist();
        });
    });
});
