import isEmptyObject from '@fleetbase/ember-ui/utils/is-empty-object';
import { module, test } from 'qunit';

module('Unit | Utility | is-empty-object', function () {
    test('it reports true for an object literal with no keys', function (assert) {
        assert.true(isEmptyObject({}));
        assert.true(isEmptyObject(new Object()));
    });

    test('it reports false for an object with any own enumerable key', function (assert) {
        assert.false(isEmptyObject({ a: 1 }));
        assert.false(isEmptyObject({ a: undefined }), 'an explicitly undefined value is still a key');
        assert.false(isEmptyObject({ a: null }));
        assert.false(isEmptyObject({ '': 'blank key' }));
        assert.false(isEmptyObject({ 'ünïcödé-🚚': true }), 'unicode keys count');
    });

    test('it treats blank values as empty', function (assert) {
        assert.true(isEmptyObject(null));
        assert.true(isEmptyObject(undefined));
        assert.true(isEmptyObject(''));
        assert.true(isEmptyObject('   '), 'whitespace-only strings are blank');
        assert.true(isEmptyObject([]), 'an empty array is blank');
    });

    test('it reports false for non-plain objects and non-blank primitives', function (assert) {
        assert.false(isEmptyObject([1, 2]), 'a populated array is not a plain empty object');
        assert.false(isEmptyObject('text'));
        assert.false(isEmptyObject(0), 'zero is neither blank nor a plain object');
        assert.false(isEmptyObject(false));
        assert.false(isEmptyObject(NaN));
        assert.false(isEmptyObject(new Date(2020, 0, 1)), 'a Date has a non-Object constructor');
        assert.false(isEmptyObject(() => {}));
    });

    test('it reports false for empty class instances because the constructor differs', function (assert) {
        class Empty {}

        assert.false(isEmptyObject(new Empty()), 'only plain object literals qualify');
    });

    test('it reports false for a null-prototype object with no constructor', function (assert) {
        assert.false(isEmptyObject(Object.create(null)), 'no constructor means the Object check cannot pass');
    });

    test('it ignores inherited and non-enumerable properties', function (assert) {
        const parent = { inherited: true };
        const child = Object.create(parent);

        assert.true(isEmptyObject(child), 'inherited keys do not count — only own enumerable keys do');

        const hidden = {};
        Object.defineProperty(hidden, 'secret', { value: 1, enumerable: false });

        assert.true(isEmptyObject(hidden), 'non-enumerable own keys are invisible to Object.keys');
    });

    test('it does not mutate the object it inspects and is repeatable', function (assert) {
        const subject = { a: 1 };

        assert.false(isEmptyObject(subject));
        assert.false(isEmptyObject(subject), 'repeated calls agree');
        assert.deepEqual(subject, { a: 1 }, 'the input is untouched');
    });
});
