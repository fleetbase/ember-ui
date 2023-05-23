import getInt from 'dummy/utils/get-int';
import { module, test } from 'qunit';

module('Unit | Utility | get-int', function () {
    test('it works', function (assert) {
        let integerString = '123';
        let result = getInt(integerString);
        assert.strictEqual(typeof result, 'number');
    });
});
