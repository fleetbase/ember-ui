import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, findAll } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

const RED_PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAEklEQVR4nGP4z8DwHx9mGBkKAMLXf4EvceABAAAAAElFTkSuQmCC';

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

function signatureField() {
    return createCustomField({ name: 'signature', label: 'Signature', type: 'signature-pad' });
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

    test('a subject whose values have not loaded yet renders the fallback', async function (assert) {
        this.set('customField', createCustomField());
        this.set('subject', { id: 'subject-1', get: () => undefined });

        await render(hbs`<CustomField::Value @customField={{this.customField}} @subject={{this.subject}} />`);

        assert.dom('.field-value').hasText('-', 'the field falls back with nothing to read');
    });

    test('a file value that arrives already parsed is used as-is', async function (assert) {
        const filePayload = {
            id: 'file-2',
            original_filename: 'receipt.pdf',
            filename: 'receipt.pdf',
            content_type: 'application/pdf',
            url: 'https://example.test/files/receipt.pdf',
        };
        this.set('customField', createCustomField({ type: 'file-upload' }));
        this.set('subject', createSubject([{ custom_field_uuid: 'custom-field-1', value: filePayload }]));

        await render(hbs`<CustomField::Value @customField={{this.customField}} @subject={{this.subject}} />`);

        assert.dom('.custom-field-file').containsText('receipt.pdf', 'no JSON parsing was needed');
    });

    test('a file value can be downloaded through the fetch service', async function (assert) {
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

        await click('.custom-field-file .ember-basic-dropdown-trigger');
        await click(findAll('.custom-field-file a').find((anchor) => anchor.textContent.toLowerCase().includes('download')));

        const fetch = this.owner.lookup('service:fetch');
        const download = fetch.calls.find((call) => call.method === 'download');
        assert.ok(download, 'the download goes through the fetch service');
        assert.strictEqual(download.args[0], 'files/download');
        assert.deepEqual(download.args[1], { file: 'file-1' });
        assert.deepEqual(download.args[2], { fileName: 'invoice-2024.pdf', mimeType: 'application/pdf' });
    });

    test('it applies the column span from the custom field meta', async function (assert) {
        this.set('customField', createCustomField({ meta: { colSpan: 3 } }));
        this.set('subject', createSubject());

        await render(hbs`<CustomField::Value @customField={{this.customField}} @subject={{this.subject}} />`);

        assert.dom('.field-info-container').hasClass('col-span-3');
    });

    module('signature fields', function () {
        test('it renders a signature stored as expanded file json', async function (assert) {
            this.set('customField', signatureField());
            this.set('subject', createSubject([{ custom_field_uuid: 'custom-field-1', value: JSON.stringify({ uuid: 'file_1', url: 'https://files.test/signature.png' }) }]));

            await render(hbs`<CustomField::Value @customField={{this.customField}} @subject={{this.subject}} />`);

            assert.dom('img.custom-field-signature-image').hasAttribute('src', 'https://files.test/signature.png');
            assert.dom('img.custom-field-signature-image').hasAttribute('alt', 'Signature');
            assert.dom('.field-name').hasText('Signature');
        });

        test('it renders a signature still held as a raw data url', async function (assert) {
            this.set('customField', signatureField());
            this.set('subject', createSubject([{ custom_field_uuid: 'custom-field-1', value: RED_PNG }]));

            await render(hbs`<CustomField::Value @customField={{this.customField}} @subject={{this.subject}} />`);

            assert.dom('img.custom-field-signature-image').hasAttribute('src', RED_PNG);
        });

        test('it renders nothing for an unexpanded file sentinel', async function (assert) {
            this.set('customField', signatureField());
            this.set('subject', createSubject([{ custom_field_uuid: 'custom-field-1', value: 'file:file_1' }]));

            await render(hbs`<CustomField::Value @customField={{this.customField}} @subject={{this.subject}} />`);

            assert.dom('img.custom-field-signature-image').doesNotExist('there is no url to render yet');
            assert.dom('.field-value').exists('the field is still listed');
        });

        test('an expanded signature file without a url renders as a plain file', async function (assert) {
            this.set('customField', signatureField());
            // already-parsed file json, but the record carries no url to show inline
            this.set('subject', createSubject([{ custom_field_uuid: 'custom-field-1', value: { uuid: 'file_2', filename: 'signature.png' } }]));

            await render(hbs`<CustomField::Value @customField={{this.customField}} @subject={{this.subject}} />`);

            assert.dom('img.custom-field-signature-image').doesNotExist('nothing to render inline');
            assert.dom('.custom-field-file').exists('the file fallback takes over');
        });

        test('it survives a signature value that is not valid json', async function (assert) {
            this.set('customField', signatureField());
            this.set('subject', createSubject([{ custom_field_uuid: 'custom-field-1', value: '{not json' }]));

            await render(hbs`<CustomField::Value @customField={{this.customField}} @subject={{this.subject}} />`);

            assert.dom('img.custom-field-signature-image').doesNotExist();
            assert.dom('.field-value').exists('rendering does not blow up');
        });
    });
});
