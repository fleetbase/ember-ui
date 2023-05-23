import or from 'dummy/utils/or';
import { module, test } from 'qunit';

module('Unit | Utility | or', function () {
    test('it works', function (assert) {
        let nonNullValue = 'Hello World';
        let result = or(null, nonNullValue);
        assert.strictEqual(result, nonNullValue);
    });
});
