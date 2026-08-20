import getCustomFieldTypeMap from 'dummy/utils/get-custom-field-type-map';
import { module, test } from 'qunit';
import { camelize, dasherize } from '@ember/string';

module('Unit | Utility | get-custom-field-type-map', function () {
    test('it returns every supported field type', function (assert) {
        const result = getCustomFieldTypeMap();

        assert.deepEqual(
            Object.keys(result),
            ['input', 'phoneInput', 'moneyInput', 'dateTimeInput', 'datePicker', 'radioButton', 'select', 'fileUpload', 'signaturePad'],
            'the map lists every field type offered in the custom field form'
        );
    });

    test('it maps signaturePad to the signature-pad component', function (assert) {
        assert.strictEqual(getCustomFieldTypeMap().signaturePad.component, 'signature-pad');
    });

    test('every entry names a component', function (assert) {
        for (const [key, fieldMap] of Object.entries(getCustomFieldTypeMap())) {
            assert.strictEqual(typeof fieldMap.component, 'string', `${key} names a component`);
            assert.ok(fieldMap.component.length > 0, `${key} names a non-empty component`);
        }
    });

    test('every key survives the dasherize/camelize round trip', function (assert) {
        // `custom-field/form.js` persists `dasherize(key)` as the field type and looks the
        // field map back up with `camelize(type)`, so a key that does not round trip would
        // silently render the wrong component.
        for (const key of Object.keys(getCustomFieldTypeMap())) {
            assert.strictEqual(camelize(dasherize(key)), key, `${key} round trips`);
        }
    });

    test('signaturePad dasherizes to the persisted field type', function (assert) {
        assert.strictEqual(dasherize('signaturePad'), 'signature-pad', 'the persisted custom field type is signature-pad');
    });

    test('it returns a fresh object on every call', function (assert) {
        const first = getCustomFieldTypeMap();
        const second = getCustomFieldTypeMap();

        assert.notStrictEqual(first, second, 'callers cannot mutate a shared map');
        assert.deepEqual(first, second, 'but the contents are identical');
    });
});
