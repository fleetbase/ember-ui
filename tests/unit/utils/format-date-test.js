import formatDate from '@fleetbase/ember-ui/utils/format-date';
import { module, test } from 'qunit';

// All dates are constructed from explicit local-time components so the assertions
// never depend on the system clock or the machine timezone.
const FIXED_DATE = new Date(2020, 0, 15, 13, 45, 30);

module('Unit | Utility | format-date', function () {
    test('it formats with the default "PPP p" pattern when no format string is given', function (assert) {
        assert.strictEqual(formatDate(FIXED_DATE), 'January 15th, 2020 1:45 PM');
    });

    test('it honors an explicit format string', function (assert) {
        assert.strictEqual(formatDate(FIXED_DATE, 'yyyy-MM-dd'), '2020-01-15');
        assert.strictEqual(formatDate(FIXED_DATE, 'HH:mm:ss'), '13:45:30');
        assert.strictEqual(formatDate(FIXED_DATE, "EEEE 'at' h:mm a"), 'Wednesday at 1:45 PM');
    });

    test('it formats midnight and end-of-day boundaries', function (assert) {
        assert.strictEqual(formatDate(new Date(2020, 0, 1, 0, 0, 0), 'yyyy-MM-dd HH:mm'), '2020-01-01 00:00');
        assert.strictEqual(formatDate(new Date(2020, 11, 31, 23, 59, 59), 'yyyy-MM-dd HH:mm:ss'), '2020-12-31 23:59:59');
        assert.strictEqual(formatDate(new Date(1999, 11, 31, 23, 59, 59)), 'December 31st, 1999 11:59 PM');
    });

    test('it formats leap days and single-digit components with padding', function (assert) {
        assert.strictEqual(formatDate(new Date(2020, 1, 29, 5, 7, 9), 'yyyy-MM-dd HH:mm:ss'), '2020-02-29 05:07:09');
        assert.strictEqual(formatDate(new Date(2020, 1, 29), 'd/M/yyyy'), '29/2/2020', 'unpadded tokens stay unpadded');
    });

    test('it accepts a numeric timestamp as well as a Date instance', function (assert) {
        const timestamp = FIXED_DATE.getTime();

        assert.strictEqual(formatDate(timestamp, 'yyyy-MM-dd HH:mm:ss'), '2020-01-15 13:45:30', 'timestamps and Dates format identically');
    });

    test('it throws a RangeError for unrepresentable dates', function (assert) {
        assert.throws(() => formatDate(new Date('not-a-date'), 'yyyy'), RangeError, 'an Invalid Date throws');
        assert.throws(() => formatDate(null, 'yyyy'), RangeError, 'null throws');
        assert.throws(() => formatDate(undefined, 'yyyy'), RangeError, 'undefined throws');
        assert.throws(() => formatDate(NaN, 'yyyy'), RangeError, 'NaN throws');
    });

    test('it does not mutate the date instance it is given', function (assert) {
        const date = new Date(2020, 0, 15, 13, 45, 30);
        const before = date.getTime();

        formatDate(date);
        formatDate(date, 'yyyy');

        assert.strictEqual(date.getTime(), before, 'the input Date is left untouched');
    });

    test('it returns identical output for repeated invocations', function (assert) {
        const first = formatDate(FIXED_DATE, 'yyyy-MM-dd');
        const second = formatDate(FIXED_DATE, 'yyyy-MM-dd');

        assert.strictEqual(first, '2020-01-15');
        assert.strictEqual(second, first);
    });
});
