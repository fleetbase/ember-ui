import removeUrlParam from '@fleetbase/ember-ui/utils/remove-url-param';
import { module, test } from 'qunit';

module('Unit | Utility | remove-url-param', function (hooks) {
    let originalUrl;

    hooks.beforeEach(function () {
        originalUrl = window.location.href;
    });

    hooks.afterEach(function () {
        window.history.replaceState(null, '', originalUrl);
    });

    function currentParams() {
        return new URLSearchParams(window.location.search);
    }

    test('it removes the named parameter and leaves the others alone', function (assert) {
        window.history.replaceState(null, '', '?a=1&b=2&c=3');

        removeUrlParam('b');

        assert.false(currentParams().has('b'), 'the named parameter is gone');
        assert.strictEqual(currentParams().get('a'), '1');
        assert.strictEqual(currentParams().get('c'), '3');
    });

    test('it removes every occurrence of a repeated parameter', function (assert) {
        window.history.replaceState(null, '', '?tag=a&tag=b&keep=1');

        removeUrlParam('tag');

        assert.deepEqual(currentParams().getAll('tag'), [], 'all repeats are removed');
        assert.strictEqual(currentParams().get('keep'), '1');
    });

    test('it is a no-op for a parameter that is not present', function (assert) {
        window.history.replaceState(null, '', '?a=1');

        removeUrlParam('missing');

        assert.strictEqual(currentParams().get('a'), '1', 'the query string is otherwise untouched');
    });

    test('it invokes the callback after updating the URL', function (assert) {
        window.history.replaceState(null, '', '?a=1');
        let paramsWhenCalled;

        removeUrlParam('a', () => {
            paramsWhenCalled = window.location.search;
        });

        assert.strictEqual(paramsWhenCalled, '', 'the callback runs after the history entry is replaced, not before');
    });

    test('it does not throw when the callback is omitted', function (assert) {
        window.history.replaceState(null, '', '?a=1');

        removeUrlParam('a');

        assert.false(currentParams().has('a'));
    });

    test('it ignores a non-function callback', function (assert) {
        window.history.replaceState(null, '', '?a=1');

        removeUrlParam('a', 'not-a-function');

        assert.false(currentParams().has('a'), 'the removal still happens');
    });

    test('it leaves a bare path when the last parameter is removed', function (assert) {
        window.history.replaceState(null, '', '?only=1');

        removeUrlParam('only');

        assert.strictEqual(window.location.search, '', 'no dangling question mark is left behind');
    });

    test('it preserves the bracket form, which is a distinct key', function (assert) {
        window.history.replaceState(null, '', '?tag=a&tag[]=b');

        removeUrlParam('tag');

        assert.strictEqual(currentParams().get('tag[]'), 'b', 'tag[] is not matched by the bare key');
    });
});
