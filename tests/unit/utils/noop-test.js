import noop from 'dummy/utils/noop';
import { module, test } from 'qunit';

module('Unit | Utility | noop', function () {
    // TODO: Replace this with your real tests.
    test('it works', function (assert) {
        let result = noop();
        assert.equal(result, undefined);
    });
});
