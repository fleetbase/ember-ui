import placeAddress from 'dummy/utils/place-address';
import { module, test } from 'qunit';

function lines(result) {
    return String(result)
        .replace(/^<address[^>]*>|<\/address>$/g, '')
        .split('</div>')
        .filter(Boolean)
        .map((chunk) => chunk.replace(/^<div[^>]*>/, ''));
}

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

    test('every part of a full address is rendered in order', function (assert) {
        const result = placeAddress({
            name: 'North Dock',
            street1: '100 Harbor Road',
            street2: 'Unit 4',
            city: 'Singapore',
            province: 'Central',
            postal_code: '018956',
            country_name: 'Singapore',
        });

        assert.deepEqual(lines(result), ['North Dock', '100 Harbor Road', 'Unit 4', 'Singapore, Central, 018956', 'Singapore']);
    });

    test('a blank city, province or postal code is skipped rather than leaving stray commas', function (assert) {
        const result = placeAddress({ street1: '100 Harbor Road', province: 'Central' });

        assert.deepEqual(lines(result), ['100 Harbor Road', 'Central']);
    });

    module('the title line', function () {
        test('a name identical to the street is not repeated', function (assert) {
            const result = placeAddress({ name: '100 Harbor Road', street1: '100 Harbor Road', city: 'Singapore' });

            assert.deepEqual(lines(result), ['100 Harbor Road', 'Singapore'], 'the street is promoted to the title line instead');
        });

        test('showTitle false drops the name but keeps the street', function (assert) {
            const result = placeAddress({ name: 'North Dock', street1: '100 Harbor Road' }, { showTitle: false });

            assert.deepEqual(lines(result), ['100 Harbor Road']);
        });

        test('an address with no street and no name renders only what it has', function (assert) {
            const result = placeAddress({ city: 'Singapore' });

            assert.deepEqual(lines(result), ['Singapore']);
        });
    });

    module('the country line', function () {
        test('country_name wins when both are present', function (assert) {
            const result = placeAddress({ street1: '100 Harbor Road', country_name: 'Singapore', country: 'SG' });

            assert.deepEqual(lines(result), ['100 Harbor Road', 'Singapore']);
        });

        test('the country code stands in when there is no name', function (assert) {
            const result = placeAddress({ street1: '100 Harbor Road', country: 'SG' });

            assert.deepEqual(lines(result), ['100 Harbor Road', 'SG']);
        });
    });

    module('what counts as an address', function () {
        test('a place wrapper is unwrapped', function (assert) {
            const result = placeAddress({ place: { street1: '100 Harbor Road' } });

            assert.deepEqual(lines(result), ['100 Harbor Road']);
        });

        test('nothing at all renders an empty string', function (assert) {
            assert.strictEqual(String(placeAddress()), '', 'no arguments');
            assert.strictEqual(String(placeAddress(null)), '', 'a null place');
            // `place?.place ?? place` falls back to the wrapper itself, which is truthy, so an
            // empty wrapper renders an empty <address> rather than an empty string.
            assert.deepEqual(lines(placeAddress({ place: null })), [], 'a wrapper around nothing has no lines');
        });
    });

    test('address content is escaped rather than injected', function (assert) {
        const result = placeAddress({ street1: '<script>alert("x")</script>' });

        assert.false(String(result).includes('<script>'), 'the tag is not emitted raw');
        assert.true(String(result).includes('&lt;script&gt;'), 'it is escaped instead');
    });
});
