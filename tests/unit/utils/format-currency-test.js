import formatCurrency from 'dummy/utils/format-currency';
import { module, test } from 'qunit';

module('Unit | Utility | format-currency', function () {
    test('it works', function (assert) {
        let result = formatCurrency(10000);
        assert.strictEqual(result, '$100.00');
    });
});
