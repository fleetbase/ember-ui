import removeNullish from 'dummy/utils/remove-nullish';
import { module, test } from 'qunit';

module('Unit | Utility | remove-nullish', function () {
    // TODO: Replace this with your real tests.
    test('it works', function (assert) {
        let result = removeNullish({});
        assert.ok(result);
    });
});
