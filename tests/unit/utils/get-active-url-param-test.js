import getActiveUrlParam from 'dummy/utils/get-active-url-param';
import { module, test } from 'qunit';

module('Unit | Utility | get-active-url-param', function () {
    test('it works', function (assert) {
        let result = getActiveUrlParam();
        assert.ok(true);
    });
});
