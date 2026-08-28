import { module, test } from 'qunit';
import { encodeState, decodeState } from 'dummy/playground/state-codec';
import { control } from 'dummy/playground/controls';

const CONTROLS = [
    control('text', 'text', { default: 'Save' }),
    control('type', 'select', { options: ['default', 'primary'], default: 'default' }),
    control('count', 'number', { default: 1, min: 0, max: 10 }),
    control('on', 'boolean', { default: false }),
];

function encodeRaw(payload) {
    return btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

module('Unit | playground | state-codec', function () {
    module('defaults', function () {
        test('no state decodes to the documented defaults', function (assert) {
            const { values, warnings } = decodeState(CONTROLS, null);

            assert.deepEqual(values, { text: 'Save', type: 'default', count: 1, on: false });
            assert.deepEqual(warnings, [], 'an absent parameter is not a problem worth reporting');
        });

        test('an empty state decodes to defaults too', function (assert) {
            assert.deepEqual(decodeState(CONTROLS, '').values, { text: 'Save', type: 'default', count: 1, on: false });
        });

        test('values equal to their defaults are not encoded', function (assert) {
            assert.strictEqual(encodeState(CONTROLS, { text: 'Save', type: 'default', count: 1, on: false }), null, 'the query parameter stays absent rather than present-and-empty');
        });
    });

    module('round trips', function () {
        test('non-default values survive an encode/decode round trip', function (assert) {
            const values = { text: 'Dispatch', type: 'primary', count: 7, on: true };
            const { values: decoded, warnings } = decodeState(CONTROLS, encodeState(CONTROLS, values));

            assert.deepEqual(decoded, values);
            assert.deepEqual(warnings, []);
        });

        test('non-ASCII text survives', function (assert) {
            const encoded = encodeState(CONTROLS, { text: 'Överför — 送信' });

            assert.strictEqual(decodeState(CONTROLS, encoded).values.text, 'Överför — 送信');
        });

        test('only what differs from the default is carried', function (assert) {
            const encoded = encodeState(CONTROLS, { text: 'Save', type: 'primary', count: 1, on: false });

            assert.deepEqual(JSON.parse(atob(encoded.replace(/-/g, '+').replace(/_/g, '/'))), { type: 'primary' }, 'shared URLs stay short');
        });
    });

    module('hostile input', function () {
        test('malformed encoding falls back to defaults with one warning', function (assert) {
            const { values, warnings } = decodeState(CONTROLS, '!!!not-base64!!!');

            assert.deepEqual(values, { text: 'Save', type: 'default', count: 1, on: false });
            assert.strictEqual(warnings.length, 1);
            assert.ok(warnings[0].includes('could not be read'), 'the fallback is reported, not silent');
        });

        test('a payload that is not an object falls back', function (assert) {
            const { values, warnings } = decodeState(CONTROLS, encodeRaw([1, 2, 3]));

            assert.deepEqual(values, { text: 'Save', type: 'default', count: 1, on: false });
            assert.ok(warnings[0].includes('not a set of control values'));
        });

        test('unknown keys are ignored and reported', function (assert) {
            const { values, warnings } = decodeState(CONTROLS, encodeRaw({ text: 'Kept', nope: 'dropped' }));

            assert.strictEqual(values.text, 'Kept', 'known keys still apply');
            assert.notOk('nope' in values, 'the unknown key does not reach the component');
            assert.ok(warnings.some((warning) => warning.includes('nope')));
        });

        test('wrong types fall back per control and report', function (assert) {
            const { values, warnings } = decodeState(CONTROLS, encodeRaw({ count: 'abc', type: 'nope', text: 'fine' }));

            assert.strictEqual(values.count, 1, 'the bad number fell back to its default');
            assert.strictEqual(values.type, 'default', 'the bad option fell back to its default');
            assert.strictEqual(values.text, 'fine', 'the good value was kept');
            assert.strictEqual(warnings.length, 2, 'each bad value is reported');
        });

        test('an out-of-range number falls back', function (assert) {
            const { values, warnings } = decodeState(CONTROLS, encodeRaw({ count: 999 }));

            assert.strictEqual(values.count, 1);
            assert.ok(warnings[0].includes('at most 10'));
        });

        test('decoding never throws', function (assert) {
            for (const hostile of ['', '=', '???', 'e30', btoa('not json'), 'null', undefined]) {
                assert.ok(decodeState(CONTROLS, hostile).values, `survived ${JSON.stringify(hostile)}`);
            }
        });
    });

    module('what is never serialized', function () {
        test('functions are dropped', function (assert) {
            const encoded = encodeState(CONTROLS, { text: () => 'nope', type: 'primary' });

            assert.deepEqual(decodeState(CONTROLS, encoded).values.type, 'primary');
            assert.strictEqual(decodeState(CONTROLS, encoded).values.text, 'Save', 'the function never made it into the URL');
        });

        test('class instances such as records and services are dropped', function (assert) {
            class Record {
                id = 'order_1';
            }

            const encoded = encodeState([control('data', 'json', { default: null })], { data: new Record() });

            assert.strictEqual(encoded, null, 'a non-plain object is not URL material');
        });

        test('Dates and Errors are dropped', function (assert) {
            const definition = [control('data', 'json', { default: null })];

            assert.strictEqual(encodeState(definition, { data: new Date() }), null);
            assert.strictEqual(encodeState(definition, { data: new Error('boom') }), null);
        });

        test('controls marked unserializable are skipped and reported on the way back', function (assert) {
            const controls = [control('secret', 'text', { default: '', serializable: false })];

            assert.strictEqual(encodeState(controls, { secret: 'value' }), null, 'never encoded');

            const { values, warnings } = decodeState(controls, encodeRaw({ secret: 'injected' }));

            assert.strictEqual(values.secret, '', 'an injected value is refused');
            assert.ok(warnings.some((warning) => warning.includes('not shareable')));
        });

        test('plain nested structures are allowed', function (assert) {
            const controls = [control('data', 'json', { default: null })];
            const data = { rows: [{ id: 1, ok: true }], label: 'x' };

            assert.deepEqual(decodeState(controls, encodeState(controls, { data })).values.data, data);
        });
    });
});
