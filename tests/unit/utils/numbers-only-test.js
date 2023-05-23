import numbersOnly from 'dummy/utils/numbers-only';
import { module, test } from 'qunit';

module('Unit | Utility | numbers-only', function () {
    // TODO: Replace this with your real tests.
    test('it works', function (assert) {
        let stringOfNumber = '4321';
        let result = numbersOnly(stringOfNumber);
        assert.equal(result, 4321);
    });
});
