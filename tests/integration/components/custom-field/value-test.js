import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import EmberObject from '@ember/object';
import Service from '@ember/service';

const RED_PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAEklEQVR4nGP4z8DwHx9mGBkKAMLXf4EvceABAAAAAElFTkSuQmCC';

module('Integration | Component | custom-field/value', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        // `value.js` normalizes file backed values through the store; the dummy app has no
        // ember-data setup, so stand in with something that echoes the payload back.
        this.owner.register(
            'service:store',
            class StoreStub extends Service {
                normalize(_modelName, payload) {
                    return payload;
                }
                push(payload) {
                    return payload;
                }
            }
        );

        this.owner.register('service:fetch', class FetchStub extends Service {});
    });

    function subjectWith(value) {
        return EmberObject.create({
            custom_field_values: [{ custom_field_uuid: 'cf_signature', value }],
        });
    }

    function signatureField() {
        return EmberObject.create({ id: 'cf_signature', name: 'signature', label: 'Signature', type: 'signature-pad', meta: {} });
    }

    test('it renders a signature stored as expanded file json', async function (assert) {
        this.set('customField', signatureField());
        this.set('subject', subjectWith(JSON.stringify({ uuid: 'file_1', url: 'https://files.test/signature.png' })));

        await render(hbs`<CustomField::Value @customField={{this.customField}} @subject={{this.subject}} />`);

        assert.dom('img.custom-field-signature-image').hasAttribute('src', 'https://files.test/signature.png');
        assert.dom('img.custom-field-signature-image').hasAttribute('alt', 'Signature');
        assert.dom('.field-name').hasText('Signature');
    });

    test('it renders a signature still held as a raw data url', async function (assert) {
        this.set('customField', signatureField());
        this.set('subject', subjectWith(RED_PNG));

        await render(hbs`<CustomField::Value @customField={{this.customField}} @subject={{this.subject}} />`);

        assert.dom('img.custom-field-signature-image').hasAttribute('src', RED_PNG);
    });

    test('it renders nothing for an unexpanded file sentinel', async function (assert) {
        this.set('customField', signatureField());
        this.set('subject', subjectWith('file:file_1'));

        await render(hbs`<CustomField::Value @customField={{this.customField}} @subject={{this.subject}} />`);

        assert.dom('img.custom-field-signature-image').doesNotExist('there is no url to render yet');
        assert.dom('.field-value').exists('the field is still listed');
    });

    test('it survives a signature value that is not valid json', async function (assert) {
        this.set('customField', signatureField());
        this.set('subject', subjectWith('{not json'));

        await render(hbs`<CustomField::Value @customField={{this.customField}} @subject={{this.subject}} />`);

        assert.dom('img.custom-field-signature-image').doesNotExist();
        assert.dom('.field-value').exists('rendering does not blow up');
    });

    test('it still renders a file-upload value as a file', async function (assert) {
        this.set('customField', EmberObject.create({ id: 'cf_signature', name: 'doc', label: 'Document', type: 'file-upload', meta: {} }));
        // an image, so <File> renders its preview rather than <FileIcon>, which imports
        // `@fleetbase/ember-core` and cannot load in the dummy app
        this.set('subject', subjectWith(JSON.stringify({ uuid: 'file_1', url: 'https://files.test/doc.png', original_filename: 'doc.png', content_type: 'image/png' })));

        await render(hbs`<CustomField::Value @customField={{this.customField}} @subject={{this.subject}} />`);

        assert.dom('.custom-field-file').exists('the file-upload branch is unchanged');
        assert.dom('img.custom-field-signature-image').doesNotExist();
    });
});
