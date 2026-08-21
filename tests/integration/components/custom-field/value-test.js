import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

function createCustomField(attributes = {}) {
    return {
        id: 'custom-field-1',
        name: 'priority',
        label: 'Priority',
        type: 'input',
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

module('Integration | Component | custom-field/value', function (hooks) {
    setupRenderingTest(hooks);

    test('it renders the field label and the value from the subject', async function (assert) {
        this.set('customField', createCustomField());
        this.set('subject', createSubject([{ custom_field_uuid: 'custom-field-1', value: 'High' }]));

        await render(hbs`<CustomField::Value @customField={{this.customField}} @subject={{this.subject}} />`);

        assert.dom('.field-name').hasText('Priority');
        assert.dom('.field-value').hasText('High');
    });

    test('it renders a fallback when the subject has no value for the field', async function (assert) {
        this.set('customField', createCustomField());
        this.set('subject', createSubject());

        await render(hbs`<CustomField::Value @customField={{this.customField}} @subject={{this.subject}} />`);

        assert.dom('.field-value').hasText('-');
    });

    test('it renders a yes badge for truthy boolean fields', async function (assert) {
        this.set('customField', createCustomField({ type: 'boolean' }));
        this.set('subject', createSubject([{ custom_field_uuid: 'custom-field-1', value: true }]));

        await render(hbs`<CustomField::Value @customField={{this.customField}} @subject={{this.subject}} />`);

        assert.dom('.field-value .status-badge').hasText('Yes');
    });

    test('it renders a no badge for falsy boolean fields', async function (assert) {
        this.set('customField', createCustomField({ type: 'boolean' }));
        this.set('subject', createSubject());

        await render(hbs`<CustomField::Value @customField={{this.customField}} @subject={{this.subject}} />`);

        assert.dom('.field-value .status-badge').hasText('No');
    });

    test('it normalizes file upload values into the store and renders the file', async function (assert) {
        const filePayload = {
            id: 'file-1',
            original_filename: 'invoice-2024.pdf',
            filename: 'invoice-2024.pdf',
            content_type: 'application/pdf',
            url: 'https://example.test/files/invoice-2024.pdf',
        };
        this.set('customField', createCustomField({ type: 'file-upload' }));
        this.set('subject', createSubject([{ custom_field_uuid: 'custom-field-1', value: JSON.stringify(filePayload) }]));

        await render(hbs`<CustomField::Value @customField={{this.customField}} @subject={{this.subject}} />`);

        const store = this.owner.lookup('service:store');
        const normalizeCall = store.calls.find((call) => call.method === 'normalize');
        assert.ok(normalizeCall, 'the file payload is normalized into the store');
        assert.strictEqual(normalizeCall.args[0], 'file');
        assert.strictEqual(normalizeCall.args[1].id, 'file-1');
        assert.dom('.custom-field-file').exists('the file is rendered');
        assert.dom('.custom-field-file').containsText('invoice-2024.pdf');
    });

    test('it applies the column span from the custom field meta', async function (assert) {
        this.set('customField', createCustomField({ meta: { colSpan: 3 } }));
        this.set('subject', createSubject());

        await render(hbs`<CustomField::Value @customField={{this.customField}} @subject={{this.subject}} />`);

        assert.dom('.field-info-container').hasClass('col-span-3');
    });
});
