import getCurrency from 'dummy/utils/get-currency';
import { module, test } from 'qunit';

module('Unit | Utility | get-currency', function () {
    test('it works', function (assert) {
        let currency = 'SGD';
        let result = getCurrency(currency);
        assert.ok(result);
    });
});
