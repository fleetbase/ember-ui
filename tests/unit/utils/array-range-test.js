import arrayRange from 'dummy/utils/array-range';
import { module, test } from 'qunit';

module('Unit | Utility | array-range', function () {
    test('it works', function (assert) {
        let result = arrayRange(5);
        assert.deepEqual(result, [0, 1, 2, 3, 4, 5]);
    });
});
