import isMenuItemActive from 'dummy/utils/is-menu-item-active';
import { module, test } from 'qunit';

module('Unit | Utility | is-menu-item-active', function () {
    test('it works', function (assert) {
        let result = isMenuItemActive();
        assert.strictEqual(typeof result, 'boolean');
    });
});
