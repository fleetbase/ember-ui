import formatCurrency from 'dummy/utils/format-currency';
import { module, test } from 'qunit';

module('Unit | Utility | format-currency', function () {
    test('it formats USD by default', function (assert) {
        let result = formatCurrency(10000);
        assert.strictEqual(result, '$100.00');
    });

    test('it formats KUDOS', function (assert) {
        let result = formatCurrency(500, 'KUDOS');
        assert.strictEqual(result, 'KUDOS 5.00');
    });

    test('it does not throw for unknown long currency codes', function (assert) {
        let result = formatCurrency(500, 'DEMOX');
        assert.strictEqual(result, 'DEMOX 5.00');
    });
    test('a zero-decimal currency is not divided into cents', function (assert) {
        // JPY has no decimal separator, so the amount is already in its main unit.
        const yen = formatCurrency(1500, 'JPY');

        assert.true(yen.includes('1,500'), `the amount is used as-is (${yen})`);
        assert.false(yen.includes('15.00'), 'rather than treated as cents');
    });

    test('it formats nothing at all as zero in US dollars', function (assert) {
        assert.strictEqual(formatCurrency(), '$0.00', 'both arguments default');
    });
});
