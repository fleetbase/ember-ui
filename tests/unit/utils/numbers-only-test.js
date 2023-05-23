import numbersOnly from 'dummy/utils/numbers-only';
import { module, test } from 'qunit';

module('Unit | Utility | numbers-only', function () {
    test('it works', function (assert) {
        let stringOfNumber = 'hello 4321abc';
        let result = numbersOnly(stringOfNumber);
        assert.strictEqual(result, '4321');
    });
});
