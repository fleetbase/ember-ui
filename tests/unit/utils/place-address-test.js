import placeAddress from 'dummy/utils/place-address';
import { module, test } from 'qunit';

module('Unit | Utility | place-address', function () {
    test('it returns a safe address string', function (assert) {
        const result = placeAddress({
            name: 'North Dock',
            street1: '100 Harbor Road',
            city: 'Singapore',
            country_name: 'Singapore',
        });

        assert.true(String(result).includes('North Dock'));
        assert.true(String(result).includes('100 Harbor Road'));
    });
});
