import getCustomFieldTypeMap from '@fleetbase/ember-ui/utils/get-custom-field-type-map';
import { module, test } from 'qunit';

module('Unit | Utility | get-custom-field-type-map', function () {
    test('it returns the full set of supported custom field types', function (assert) {
        const map = getCustomFieldTypeMap();

        assert.deepEqual(
            Object.keys(map),
            ['input', 'phoneInput', 'moneyInput', 'dateTimeInput', 'datePicker', 'radioButton', 'select', 'fileUpload'],
            'the key set and its order are part of the contract'
        );
    });

    test('each type maps to its rendering component', function (assert) {
        const map = getCustomFieldTypeMap();

        assert.strictEqual(map.input.component, 'input');
        assert.strictEqual(map.phoneInput.component, 'phone-input');
        assert.strictEqual(map.moneyInput.component, 'money-input');
        assert.strictEqual(map.dateTimeInput.component, 'date-time-input');
        assert.strictEqual(map.datePicker.component, 'date-picker');
        assert.strictEqual(map.radioButton.component, 'radio-button-select');
        assert.strictEqual(map.select.component, 'select');
        assert.strictEqual(map.fileUpload.component, 'file-upload');
    });

    test('only the option-driven types declare hasOptions', function (assert) {
        const map = getCustomFieldTypeMap();
        const withOptions = Object.keys(map).filter((key) => map[key].hasOptions === true);

        assert.deepEqual(withOptions, ['radioButton', 'select']);
        assert.strictEqual(map.input.hasOptions, undefined, 'plain inputs do not declare hasOptions at all');
        assert.false('hasOptions' in map.fileUpload, 'the key is absent rather than false');
    });

    test('commented-out types are not exposed', function (assert) {
        const map = getCustomFieldTypeMap();

        assert.false('modelSelect' in map, 'modelSelect is disabled in source');
        assert.false('dropzone' in map, 'dropzone is disabled in source');
    });

    test('it returns a fresh object graph on every call', function (assert) {
        const first = getCustomFieldTypeMap();
        const second = getCustomFieldTypeMap();

        assert.notStrictEqual(first, second, 'callers get their own top-level object');
        assert.notStrictEqual(first.input, second.input, 'nested descriptors are fresh too');
        assert.deepEqual(first, second, 'but the contents are identical');
    });

    test('mutating the returned map does not leak into later calls', function (assert) {
        const first = getCustomFieldTypeMap();
        first.input.component = 'hacked';
        delete first.select;

        const second = getCustomFieldTypeMap();

        assert.strictEqual(second.input.component, 'input', 'the source map is not shared state');
        assert.true('select' in second, 'deleted keys reappear on the next call');
    });
});
