import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, fillIn } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import Model from '@ember-data/model';

function createCustomField(attributes = {}) {
    return {
        id: 'custom-field-1',
        name: 'priority',
        label: 'Priority',
        component: 'input',
        type: 'input',
        required: false,
        options: [],
        meta: {},
        ...attributes,
    };
}

function createSubject(customFieldValues = []) {
    return {
        id: 'subject-1',
        custom_field_values: customFieldValues,
        get(key) {
            return this[key];
        },
    };
}

function createGroup(attributes = {}) {
    return {
        id: 'group-1',
        name: 'Order Details',
        meta: {},
        isEditing: false,
        customFields: [createCustomField()],
        ...attributes,
    };
}

function findButtonByText(rootElement, text) {
    return [...rootElement.querySelectorAll('button')].find((button) => button.textContent.includes(text));
}

module('Integration | Component | custom-field/yield', function (hooks) {
    setupRenderingTest(hooks);

    test('it loads custom fields for the owner and notifies when ready', async function (assert) {
        const registry = this.owner.lookup('service:custom-fields-registry');
        const currentUser = this.owner.lookup('service:current-user');
        const readyCalls = [];
        this.set('subject', createSubject());
        this.set('onCustomFieldsReady', (manager) => readyCalls.push(manager));

        await render(hbs`<CustomField::Yield @subject={{this.subject}} @modelType="order" @onCustomFieldsReady={{this.onCustomFieldsReady}} />`);

        const loadCalls = registry.calls.filter((call) => call.method === 'loadSubjectCustomFields.perform');
        assert.strictEqual(loadCalls.length, 1, 'custom fields are loaded once');
        assert.strictEqual(loadCalls[0].args[0], currentUser.company, 'the current user company is used as the owner');
        assert.deepEqual(
            loadCalls[0].args[1],
            { loadOptions: { groupedFor: 'order_custom_field_group', fieldFor: 'fleet-ops:order' } },
            'load options are derived from the model type and extension'
        );
        assert.strictEqual(readyCalls.length, 1, 'onCustomFieldsReady is called with the loaded manager');
        assert.dom(this.element).hasText('', 'nothing is rendered when there are no custom field groups');
    });

    test('it renders grouped custom field inputs and writes values through the manager', async function (assert) {
        const registry = this.owner.lookup('service:custom-fields-registry');
        const group = createGroup();
        const writes = [];
        const manager = {
            customFieldGroups: [group],
            writeFieldValue: (subject, value, customField) => writes.push({ subject, value, customField }),
        };
        registry.loadSubjectCustomFields = { perform: () => Promise.resolve(manager) };

        const subject = createSubject([{ custom_field_uuid: 'custom-field-1', value: 'High' }]);
        const resource = {};
        this.set('subject', subject);
        this.set('resource', resource);

        await render(hbs`<CustomField::Yield @subject={{this.subject}} @modelType="order" @resource={{this.resource}} />`);

        assert.dom(this.element).containsText('Order Details', 'the group panel is rendered');
        assert.dom('input').hasValue('High', 'the custom field input is prefilled from the subject');
        assert.strictEqual(resource.cfManager, manager, 'the manager is attached to the resource');

        await fillIn('input', 'Low');

        assert.true(writes.length > 0, 'writeFieldValue is called through onChange');
        const lastWrite = writes[writes.length - 1];
        assert.strictEqual(lastWrite.subject, subject);
        assert.strictEqual(lastWrite.value, 'Low');
        assert.strictEqual(lastWrite.customField, group.customFields[0]);
    });

    test('it renders read-only values in view mode', async function (assert) {
        const registry = this.owner.lookup('service:custom-fields-registry');
        const manager = { customFieldGroups: [createGroup()], writeFieldValue: () => {} };
        registry.loadSubjectCustomFields = { perform: () => Promise.resolve(manager) };
        this.set('subject', createSubject([{ custom_field_uuid: 'custom-field-1', value: 'High' }]));

        await render(hbs`<CustomField::Yield @subject={{this.subject}} @modelType="order" @viewMode={{true}} />`);

        assert.dom('.field-info-container .field-name').hasText('Priority');
        assert.dom('.field-info-container .field-value').hasText('High');
        assert.dom('input').doesNotExist('no editable input is rendered in view mode');
    });

    test('it shows save and cancel controls while editing in view mode and reports saves', async function (assert) {
        const registry = this.owner.lookup('service:custom-fields-registry');
        const group = createGroup({ isEditing: true });
        const manager = { customFieldGroups: [group], writeFieldValue: () => {} };
        registry.loadSubjectCustomFields = { perform: () => Promise.resolve(manager) };

        const savedGroups = [];
        const changeCalls = [];
        this.set('subject', createSubject());
        this.set('onGroupSaved', (savedGroup) => savedGroups.push(savedGroup));
        this.set('onChange', () => changeCalls.push(true));

        await render(hbs`<CustomField::Yield @subject={{this.subject}} @modelType="order" @viewMode={{true}} @onGroupSaved={{this.onGroupSaved}} @onChange={{this.onChange}} />`);

        assert.dom('input').exists('the editable input is rendered while the group is editing');
        const saveButton = findButtonByText(this.element, 'Save Changes');
        assert.ok(saveButton, 'the save button is rendered');
        assert.ok(findButtonByText(this.element, 'Cancel'), 'the cancel button is rendered');

        await click(saveButton);

        assert.false(group.isEditing, 'the group is taken out of editing mode');
        assert.deepEqual(savedGroups, [group], 'onGroupSaved receives the group');
        assert.strictEqual(changeCalls.length, 1, 'onChange is called after saving');
    });
    module('resolving the owner and the load options', function (hooks) {
        hooks.beforeEach(function () {
            this.loads = [];
            const registry = this.owner.lookup('service:custom-fields-registry');
            registry.loadSubjectCustomFields = {
                perform: (owner, options) => {
                    this.loads.push({ owner, options });

                    return Promise.resolve({ customFieldGroups: [] });
                },
            };
            this.set('subject', createSubject());
        });

        test('an owner given as a promise is awaited before the fields are loaded', async function (assert) {
            const company = { id: 'company-9' };
            // `this.owner` is the test context's Ember owner — the argument needs its own name.
            this.set('fieldOwner', Promise.resolve(company));

            await render(hbs`<CustomField::Yield @subject={{this.subject}} @modelType="order" @owner={{this.fieldOwner}} />`);

            assert.strictEqual(this.loads.length, 1);
            assert.strictEqual(this.loads[0].owner, company, 'the resolved company is used, not the promise');
        });

        test('an owner given directly is used as-is', async function (assert) {
            const company = { id: 'company-9' };
            this.set('fieldOwner', company);

            await render(hbs`<CustomField::Yield @subject={{this.subject}} @modelType="order" @owner={{this.fieldOwner}} />`);

            assert.strictEqual(this.loads[0].owner, company, 'the current user is never asked');
        });

        test('loadOptions false asks for everything', async function (assert) {
            await render(hbs`<CustomField::Yield @subject={{this.subject}} @modelType="order" @loadOptions={{false}} />`);

            assert.deepEqual(this.loads[0].options, { loadOptions: {} }, 'the derived scoping is dropped entirely');
        });

        test('an explicit loadOptions object extends the derived defaults', async function (assert) {
            this.set('loadOptions', { fieldFor: 'anything', extra: true });

            await render(hbs`<CustomField::Yield @subject={{this.subject}} @modelType="order" @loadOptions={{this.loadOptions}} />`);

            assert.deepEqual(
                this.loads[0].options.loadOptions,
                { groupedFor: 'order_custom_field_group', fieldFor: 'anything', extra: true },
                'the caller wins on conflicts and the rest is kept'
            );
        });

        test('an empty extension drops the prefix from the field type', async function (assert) {
            await render(hbs`<CustomField::Yield @subject={{this.subject}} @modelType="order" @extension="" />`);

            assert.strictEqual(this.loads[0].options.loadOptions.fieldFor, 'order', 'no "<ext>:" prefix is applied');
        });

        // With no @modelType the component has to name the subject itself.
        test('with no model type the subject is asked for its name', async function (assert) {
            this.set('subject', Object.assign(Object.create(Model.prototype), { constructor: { modelName: 'work-order' } }));

            await render(hbs`<CustomField::Yield @subject={{this.subject}} />`);

            assert.deepEqual(
                this.loads[0].options.loadOptions,
                { groupedFor: 'work_order_custom_field_group', fieldFor: 'fleet-ops:work_order' },
                'the model name is underscored into both keys'
            );
        });

        test('a registry that cannot load leaves the component empty rather than throwing', async function (assert) {
            const registry = this.owner.lookup('service:custom-fields-registry');
            registry.loadSubjectCustomFields = { perform: () => Promise.reject(new Error('registry is down')) };

            await render(hbs`<CustomField::Yield @subject={{this.subject}} @modelType="order" />`);

            assert.dom('.field-info-container').doesNotExist('nothing is rendered');
            assert.dom(this.element).hasText('', 'and the failure is swallowed');
        });
    });

    module('leaving edit mode', function (hooks) {
        hooks.beforeEach(function () {
            this.group = createGroup({ isEditing: true });
            const registry = this.owner.lookup('service:custom-fields-registry');
            registry.loadSubjectCustomFields = {
                perform: () => Promise.resolve({ customFieldGroups: [this.group], writeFieldValue: () => {} }),
            };
            this.set('subject', createSubject());
        });

        test('cancelling closes the group without reporting anything', async function (assert) {
            const changes = [];
            this.set('onChange', () => changes.push(true));

            await render(hbs`<CustomField::Yield @subject={{this.subject}} @modelType="order" @viewMode={{true}} @onChange={{this.onChange}} />`);
            await click(findButtonByText(this.element, 'Cancel'));

            assert.false(this.group.isEditing, 'the group leaves edit mode');
            assert.deepEqual(changes, [], 'cancelling is not a change');
        });

        test('saving works with no handlers attached at all', async function (assert) {
            await render(hbs`<CustomField::Yield @subject={{this.subject}} @modelType="order" @viewMode={{true}} />`);
            await click(findButtonByText(this.element, 'Save Changes'));

            assert.false(this.group.isEditing, 'the group is still closed');
            assert.ok(findButtonByText(this.element, 'Save Changes'), 'and the panel survives having no handlers to call');
        });
    });
});
