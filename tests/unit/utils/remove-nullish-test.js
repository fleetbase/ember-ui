import removeNullish from '@fleetbase/ember-ui/utils/remove-nullish';
import { module, test } from 'qunit';

module('Unit | Utility | remove-nullish', function () {
    test('it strips null and undefined values', function (assert) {
        const result = removeNullish({ a: 1, b: null, c: undefined, d: 'kept' });

        assert.deepEqual(result, { a: 1, d: 'kept' });
        assert.deepEqual(Object.keys(result), ['a', 'd'], 'nullish keys are gone entirely, not set to undefined');
    });

    test('it keeps every other falsy value', function (assert) {
        const result = removeNullish({ zero: 0, empty: '', no: false, nan: NaN, negZero: -0 });

        assert.deepEqual(Object.keys(result).sort(), ['empty', 'nan', 'negZero', 'no', 'zero'], 'only null/undefined are nullish');
        assert.strictEqual(result.zero, 0);
        assert.strictEqual(result.empty, '');
        assert.false(result.no);
        assert.true(Number.isNaN(result.nan));
    });

    test('it returns a new object and does not mutate the input', function (assert) {
        const input = { a: 1, b: null };
        const result = removeNullish(input);

        assert.notStrictEqual(result, input, 'a fresh object is returned');
        assert.deepEqual(input, { a: 1, b: null }, 'the input still carries its nullish key');
        assert.true('b' in input);
        assert.false('b' in result);
    });

    test('it copies nested values by reference (shallow filter)', function (assert) {
        const nested = { deep: null };
        const result = removeNullish({ nested });

        assert.strictEqual(result.nested, nested, 'nested objects are not cloned');
        assert.deepEqual(result.nested, { deep: null }, 'and nested nullish values are not filtered');
    });

    test('it returns an empty object for empty or entirely nullish input', function (assert) {
        assert.deepEqual(removeNullish({}), {});
        assert.deepEqual(removeNullish({ a: null, b: undefined }), {});
        assert.strictEqual(Object.keys(removeNullish({ a: null })).length, 0);
    });

    test('it throws for null and undefined input', function (assert) {
        assert.throws(() => removeNullish(null), TypeError, 'Object.entries(null) throws');
        assert.throws(() => removeNullish(undefined), TypeError, 'Object.entries(undefined) throws');
    });

    test('it converts array and string input into index-keyed objects', function (assert) {
        assert.deepEqual(removeNullish([1, null, 3]), { 0: 1, 2: 3 }, 'arrays become plain objects with index keys');
        assert.false(Array.isArray(removeNullish([1, 2])), 'the return value is never an array');
        assert.deepEqual(removeNullish('hi'), { 0: 'h', 1: 'i' }, 'strings expand to character maps');
    });

    test('it ignores inherited, non-enumerable and symbol keys', function (assert) {
        const parent = { inherited: 'nope' };
        const input = Object.create(parent);
        input.own = 'yes';
        input.dropped = null;
        Object.defineProperty(input, 'hidden', { value: 'x', enumerable: false });
        input[Symbol('sym')] = 'ignored';

        const result = removeNullish(input);

        assert.deepEqual(result, { own: 'yes' });
        assert.strictEqual(Object.getOwnPropertySymbols(result).length, 0, 'symbol keys are not carried over');
    });

    test('it preserves unicode and special-character keys', function (assert) {
        const result = removeNullish({ 'key with spaces': 1, 'ünïcödé-🚚': 2, '': 3, 'drop-me': undefined });

        assert.deepEqual(result, { 'key with spaces': 1, 'ünïcödé-🚚': 2, '': 3 });
    });

    test('it is idempotent when applied to its own output', function (assert) {
        const once = removeNullish({ a: 1, b: null });
        const twice = removeNullish(once);

        assert.deepEqual(twice, once);
        assert.notStrictEqual(twice, once, 'each call still returns a new object');
    });
});
