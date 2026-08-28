import formatBytes from '@fleetbase/ember-ui/utils/format-bytes';
import { module, test } from 'qunit';

module('Unit | Utility | format-bytes', function () {
    test('it returns the literal "0 Bytes" for exactly zero', function (assert) {
        assert.strictEqual(formatBytes(0), '0 Bytes');
        assert.strictEqual(formatBytes(0, 5), '0 Bytes', 'decimals are irrelevant for the zero short-circuit');
    });

    test('it keeps values under 1 KB in bytes', function (assert) {
        assert.strictEqual(formatBytes(1), '1 Bytes');
        assert.strictEqual(formatBytes(500), '500 Bytes');
        assert.strictEqual(formatBytes(1023), '1023 Bytes', '1023 is still below the 1024 boundary');
    });

    test('it steps up a unit at each 1024 boundary', function (assert) {
        assert.strictEqual(formatBytes(1024), '1 KB');
        assert.strictEqual(formatBytes(1024 * 1024), '1 MB');
        assert.strictEqual(formatBytes(1024 ** 3), '1 GB');
        assert.strictEqual(formatBytes(1024 ** 4), '1 TB');
        assert.strictEqual(formatBytes(1024 ** 5), '1 PB');
    });

    test('it defaults to two decimals and strips insignificant trailing zeros', function (assert) {
        assert.strictEqual(formatBytes(1536), '1.5 KB', '1.50 is normalized to 1.5 by parseFloat');
        assert.strictEqual(formatBytes(1234567, 1), '1.2 MB');
        assert.strictEqual(formatBytes(1234567), '1.18 MB');
    });

    test('it honors an explicit decimals argument', function (assert) {
        assert.strictEqual(formatBytes(1536, 0), '2 KB', 'rounds when no decimals are requested');
        assert.strictEqual(formatBytes(1536, 3), '1.5 KB');
        assert.strictEqual(formatBytes(1234567, 4), '1.1774 MB');
    });

    test('it clamps negative decimals to zero rather than throwing', function (assert) {
        assert.strictEqual(formatBytes(1536, -2), '2 KB');
        assert.strictEqual(formatBytes(1024, -100), '1 KB');
    });

    test('it produces "NaN undefined" for inputs with no logarithm', function (assert) {
        assert.strictEqual(formatBytes(-1), 'NaN undefined', 'negative sizes have no defined unit index');
        assert.strictEqual(formatBytes(NaN), 'NaN undefined');
        assert.strictEqual(formatBytes(undefined), 'NaN undefined');
        assert.strictEqual(formatBytes(null), 'NaN undefined', 'null is not === 0 so it does not hit the short-circuit');
        assert.strictEqual(formatBytes(Infinity), 'NaN undefined');
    });

    test('it under-indexes for fractional byte counts', function (assert) {
        assert.strictEqual(formatBytes(0.5), '512 undefined', 'sub-byte values compute a negative unit index');
    });

    test('it is pure and stable across repeated invocations', function (assert) {
        const first = formatBytes(2048);
        const second = formatBytes(2048);

        assert.strictEqual(first, '2 KB');
        assert.strictEqual(second, first, 'repeated calls with the same input return the same string');
        assert.strictEqual(typeof first, 'string', 'the return value is always a string');
    });
});
