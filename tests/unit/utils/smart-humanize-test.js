import smartHumanize from 'dummy/utils/smart-humanize';
import { module, test } from 'qunit';

module('Unit | Utility | smart-humanize', function () {
    test('it works', function (assert) {
        let testString = 'hello-world';
        let result = smartHumanize(testString);
        assert.ok(result, 'Hello World');
    });
});
