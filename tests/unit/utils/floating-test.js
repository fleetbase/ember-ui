import floating from 'dummy/utils/floating';
import { module, test } from 'qunit';

module('Unit | Utility | floating', function () {
    // TODO: Replace this with your real tests.
    test('it works', function (assert) {
        let result = typeof floating === 'object' && typeof floating.createTooltip === 'function';
        assert.ok(result);
    });
});
