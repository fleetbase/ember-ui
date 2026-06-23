import getCurrency from 'dummy/utils/get-currency';
import { module, test } from 'qunit';

module('Unit | Utility | get-currency', function () {
    test('it returns normal currencies by code', function (assert) {
        let result = getCurrency('SGD');
        assert.ok(result);
        assert.strictEqual(result.code, 'SGD');
    });

    test('it returns KUDOS by code', function (assert) {
        let result = getCurrency('KUDOS');
        assert.ok(result);
        assert.strictEqual(result.code, 'KUDOS');
        assert.strictEqual(result.title, 'GNU Taler KUDO Currency');
    });

    test('it hides KUDOS from the default currency list', function (assert) {
        let result = getCurrency();
        assert.false(result.some((currency) => currency.code === 'KUDOS'));
    });
});
