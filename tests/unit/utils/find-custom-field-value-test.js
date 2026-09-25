import findCustomFieldValue from 'dummy/utils/find-custom-field-value';
import { module, test } from 'qunit';

module('Unit | Utility | find-custom-field-value', function () {
    const field = { id: 'cf_1' };

    test('it finds the record for the field on a plain subject', function (assert) {
        const record = { custom_field_uuid: 'cf_1', value: 'High' };
        assert.strictEqual(findCustomFieldValue({ custom_field_values: [{ custom_field_uuid: 'cf_2' }, record] }, field), record);
    });

    test('it reads through get() when the subject offers one', function (assert) {
        const record = { custom_field_uuid: 'cf_1', value: 'High' };
        const subject = { get: (key) => (key === 'custom_field_values' ? [record] : undefined) };
        assert.strictEqual(findCustomFieldValue(subject, field), record);
    });

    test('a persisted record wins over the unsaved twin left behind by a save', function (assert) {
        const unsaved = { custom_field_uuid: 'cf_1', value: 'file:abc', isNew: true };
        const persisted = { custom_field_uuid: 'cf_1', value: '{"id":"abc"}', isNew: false };
        assert.strictEqual(findCustomFieldValue({ custom_field_values: [unsaved, persisted] }, field), persisted);
    });

    test('an unsaved record is still used when it is the only one', function (assert) {
        const unsaved = { custom_field_uuid: 'cf_1', value: 'draft', isNew: true };
        assert.strictEqual(findCustomFieldValue({ custom_field_values: [unsaved] }, field), unsaved);
    });

    test('it returns null with nothing to read', function (assert) {
        assert.strictEqual(findCustomFieldValue({ custom_field_values: [] }, field), null);
        assert.strictEqual(findCustomFieldValue({ get: () => undefined }, field), null);
        assert.strictEqual(findCustomFieldValue(null, field), null);
        assert.strictEqual(findCustomFieldValue({ custom_field_values: [null, { custom_field_uuid: 'cf_1' }] }, undefined), null);
    });
});
