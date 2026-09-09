import formatMeters from '@fleetbase/ember-ui/utils/format-meters';
import { module, test } from 'qunit';

module('Unit | Utility | format-meters', function () {
    test('it converts whole kilometers', function (assert) {
        assert.strictEqual(formatMeters(0), '0km');
        assert.strictEqual(formatMeters(1000), '1km');
        assert.strictEqual(formatMeters(25000), '25km');
    });

    test('it rounds to the nearest kilometer', function (assert) {
        assert.strictEqual(formatMeters(1500), '2km', 'half rounds up');
        assert.strictEqual(formatMeters(1499), '1km');
        assert.strictEqual(formatMeters(999), '1km');
        assert.strictEqual(formatMeters(500), '1km');
        assert.strictEqual(formatMeters(499), '0km', 'sub-half-kilometer collapses to zero');
        assert.strictEqual(formatMeters(1234567), '1235km');
    });

    test('it rounds negative distances toward positive infinity', function (assert) {
        assert.strictEqual(formatMeters(-1000), '-1km');
        assert.strictEqual(formatMeters(-1500), '-1km', 'Math.round(-1.5) is -1, not -2');
        assert.strictEqual(formatMeters(-1600), '-2km');
        assert.strictEqual(formatMeters(-400), '0km', 'negative zero stringifies without a sign');
    });

    test('it propagates non-numeric input into the output string', function (assert) {
        assert.strictEqual(formatMeters(undefined), 'NaNkm');
        assert.strictEqual(formatMeters(NaN), 'NaNkm');
        assert.strictEqual(formatMeters({}), 'NaNkm');
        assert.strictEqual(formatMeters(Infinity), 'Infinitykm');
    });

    test('it coerces numeric strings and null through division', function (assert) {
        assert.strictEqual(formatMeters('2000'), '2km', 'numeric strings divide cleanly');
        assert.strictEqual(formatMeters(null), '0km', 'null coerces to 0');
    });

    test('it handles very large values without switching to exponential notation', function (assert) {
        assert.strictEqual(formatMeters(1e12), '1000000000km');
    });

    test('it always returns a km-suffixed string and is stable across calls', function (assert) {
        const first = formatMeters(3000);

        assert.strictEqual(first, '3km');
        assert.strictEqual(formatMeters(3000), first, 'repeated calls are identical');
        assert.true(first.endsWith('km'), 'the unit suffix is always appended');
    });
});
