import formatDuration from 'dummy/utils/format-duration';
import { module, test } from 'qunit';

module('Unit | Utility | format-duration', function () {
    test('it formats seconds into compact duration parts', function (assert) {
        assert.strictEqual(formatDuration(), '0s');
        assert.strictEqual(formatDuration(59), '59s');
        assert.strictEqual(formatDuration(90), '1m 30s');
        assert.strictEqual(formatDuration(3670), '1h 1m');
        assert.strictEqual(formatDuration(90000), '1d 1h');
        assert.strictEqual(formatDuration(-10), '0s');
    });
});
