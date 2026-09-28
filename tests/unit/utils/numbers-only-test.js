import numbersOnly from '@fleetbase/ember-ui/utils/numbers-only';
import { module, test } from 'qunit';

module('Unit | Utility | numbers-only', function () {
    test('it works', function (assert) {
        let stringOfNumber = 'hello 4321abc';
        let result = numbersOnly(stringOfNumber);
        assert.strictEqual(result, '4321');
    });
    test('decimals can be kept', function (assert) {
        assert.strictEqual(numbersOnly('$1,250.75 USD', true), '1250.75', 'the decimal point survives');
        assert.strictEqual(numbersOnly('$1,250.75 USD'), '125075', 'and is stripped by default');
        assert.strictEqual(numbersOnly('no digits here', true), '', 'a string with nothing to keep comes back empty');
    });
});
