import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, fillIn, findAll } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

function createResource(attributes = {}) {
    return {
        name: null,
        label: null,
        description: null,
        help_text: null,
        type: null,
        component: null,
        required: false,
        editable: false,
        options: [],
        meta: {},
        set(key, value) {
            this[key] = value;
        },
        save() {
            return Promise.resolve(this);
        },
        ...attributes,
    };
}

module('Integration | Component | custom-field/form', function (hooks) {
    setupRenderingTest(hooks);

    test('it renders the form inputs and every available custom field type as an option', async function (assert) {
        this.set('resource', createResource());

        await render(hbs`<CustomField::Form @resource={{this.resource}} />`);

        assert.dom('input[placeholder="Field Label"]').exists();
        assert.dom('input[placeholder="Field Description"]').exists();
        assert.dom('input[placeholder="Field Help Text"]').exists();
        assert.dom('[role="checkbox"]').exists({ count: 2 });

        const optionValues = findAll('select.form-select option')
            .map((option) => option.getAttribute('value'))
            .filter(Boolean);
        assert.deepEqual(optionValues, ['input', 'phone-input', 'money-input', 'date-time-input', 'date-picker', 'radio-button', 'select', 'file-upload']);
    });

    test('it selects the field map for the resource type on initial render', async function (assert) {
        this.set('resource', createResource({ type: 'select' }));

        await render(hbs`<CustomField::Form @resource={{this.resource}} />`);

        assert.strictEqual(this.resource.component, 'select', 'resource component is set from the field type map');
        assert.dom('select.form-select').hasValue('select', 'the resource type is preselected');
        assert.dom(this.element).containsText('Field Options', 'options editor is rendered for field types with options');
    });

    test('it does not render the options editor for field types without options', async function (assert) {
        this.set('resource', createResource({ type: 'input' }));

        await render(hbs`<CustomField::Form @resource={{this.resource}} />`);

        assert.strictEqual(this.resource.component, 'input');
        assert.dom(this.element).doesNotContainText('Field Options');
    });

    test('choosing a field type updates the resource and shows the options editor', async function (assert) {
        this.set('resource', createResource());

        await render(hbs`<CustomField::Form @resource={{this.resource}} />`);
        assert.dom(this.element).doesNotContainText('Field Options');

        await fillIn('select.form-select', 'radio-button');

        assert.strictEqual(this.resource.type, 'radio-button', 'resource type is updated');
        assert.strictEqual(this.resource.component, 'radio-button-select', 'resource component is mapped from the type');
        assert.dom(this.element).containsText('Field Options', 'options editor appears for option based field types');
    });

    test('typing a field label dasherizes it into the resource name', async function (assert) {
        this.set('resource', createResource());

        await render(hbs`<CustomField::Form @resource={{this.resource}} />`);
        await fillIn('input[placeholder="Field Label"]', 'Delivery Instructions');

        assert.strictEqual(this.resource.name, 'delivery-instructions');
    });

    test('toggling required updates the resource', async function (assert) {
        this.set('resource', createResource());

        await render(hbs`<CustomField::Form @resource={{this.resource}} />`);
        await click('[role="checkbox"]');

        assert.true(this.resource.required, 'resource is flagged as required after toggling');
    });
    module('the column span meta property', function () {
        async function openColumnSpanMenu() {
            const trigger = findAll('.ember-basic-dropdown-trigger').find((node) => node.textContent.includes('Column Span Size'));
            await click(trigger);
        }

        function spanOption(size) {
            return findAll('.next-dd-item').find((item) => item.textContent.trim().startsWith(String(size)));
        }

        test('choosing a size writes it into the resource meta', async function (assert) {
            const resource = createResource();
            this.set('resource', resource);

            await render(hbs`<CustomField::Form @resource={{this.resource}} />`);
            await openColumnSpanMenu();
            await click(spanOption(2));

            assert.deepEqual(resource.meta, { colSpan: 2 }, 'the meta object is replaced rather than mutated in place');
        });

        test('the existing meta is preserved when a size is chosen', async function (assert) {
            const resource = createResource({ meta: { modelName: 'driver' } });
            this.set('resource', resource);

            await render(hbs`<CustomField::Form @resource={{this.resource}} />`);
            await openColumnSpanMenu();
            await click(spanOption(3));

            assert.deepEqual(resource.meta, { modelName: 'driver', colSpan: 3 });
        });

        // A custom field that has never carried metadata arrives with `meta` unset, and the
        // component has to create it before it can spread it.
        test('a resource with no meta at all gets one', async function (assert) {
            const resource = createResource({ meta: null });
            this.set('resource', resource);

            await render(hbs`<CustomField::Form @resource={{this.resource}} />`);
            await openColumnSpanMenu();
            await click(spanOption(1));

            assert.deepEqual(resource.meta, { colSpan: 1 });
        });
    });

    test('an unrecognised field type leaves the component unassigned', async function (assert) {
        const resource = createResource({ type: 'space-invader' });
        this.set('resource', resource);

        await render(hbs`<CustomField::Form @resource={{this.resource}} />`);

        assert.strictEqual(resource.component, null, 'no component is picked for a type the map does not know');
        assert.dom('.custom-field-options-input').doesNotExist('and no options editor is offered');
    });
});
