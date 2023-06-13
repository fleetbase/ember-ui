import formatDate from 'dummy/utils/format-date';
import { module, test } from 'qunit';

module('Unit | Utility | format-date', function () {
    // TODO: Replace this with your real tests.
    test('it works', function (assert) {
        let result = formatDate(new Date());
        assert.ok(result);
    });
});
