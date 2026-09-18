import getCurrency from 'dummy/utils/get-currency';
import { module, test } from 'qunit';

module('Unit | Utility | get-currency', function () {
    test('it returns normal currencies by code', function (assert) {
        let result = getCurrency('SGD');
        assert.strictEqual(result.code, 'SGD');
        assert.strictEqual(result.title, 'Singapore Dollar');
    });

    test('a code is matched case-insensitively', function (assert) {
        assert.strictEqual(getCurrency('sgd').code, 'SGD');
        assert.strictEqual(getCurrency('Sgd').code, 'SGD');
    });

    test('a two-letter code is matched against the country iso2', function (assert) {
        const result = getCurrency('SG');
        assert.strictEqual(result.iso2, 'SG');
        assert.strictEqual(result.code, 'SGD');
    });

    test('a longer string is matched against the country name', function (assert) {
        const result = getCurrency('Singapore');
        assert.strictEqual(result.code, 'SGD');
    });

    test('an unknown code returns nothing', function (assert) {
        assert.strictEqual(getCurrency('NOTACURRENCY'), undefined);
        assert.strictEqual(getCurrency('ZZ'), undefined);
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
        assert.true(result.length > 100, 'the rest of the list is still returned');
    });

    test('hidden currencies can be opted into', function (assert) {
        const result = getCurrency(null, { includeHidden: true });
        assert.true(result.some((currency) => currency.code === 'KUDOS'));
    });

    test('an empty code is treated as no code at all', function (assert) {
        assert.true(Array.isArray(getCurrency('')), 'an empty string returns the whole list');
    });
});
