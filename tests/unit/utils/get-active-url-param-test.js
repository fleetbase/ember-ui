import getActiveUrlParam from '@fleetbase/ember-ui/utils/get-active-url-param';
import { module, test } from 'qunit';

// NOTE: the current implementation is an unconditional `return true` — it takes
// no arguments and reads no state. These tests pin that contract exactly so the
// stub cannot change behaviour silently; they are deliberately narrow rather
// than asserting URL behaviour the function does not actually implement.
module('Unit | Utility | get-active-url-param', function (hooks) {
    let originalUrl;

    hooks.beforeEach(function () {
        originalUrl = window.location.href;
    });

    hooks.afterEach(function () {
        window.history.replaceState(null, '', originalUrl);
    });

    test('it returns boolean true', function (assert) {
        assert.strictEqual(getActiveUrlParam(), true, 'the value is exactly true, not merely truthy');
    });

    test('it ignores any arguments it is given', function (assert) {
        assert.strictEqual(getActiveUrlParam('anything'), true);
        assert.strictEqual(getActiveUrlParam(null, undefined, 0), true);
    });

    test('it does not depend on the current query string', function (assert) {
        window.history.replaceState(null, '', '?active=false&other=1');

        assert.strictEqual(getActiveUrlParam(), true, 'the result is independent of the URL');
    });

    test('it is stable across repeated calls', function (assert) {
        assert.strictEqual(getActiveUrlParam(), getActiveUrlParam());
    });
});
