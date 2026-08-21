import getUrlParam from '@fleetbase/ember-ui/utils/get-url-param';
import { module, test } from 'qunit';

module('Unit | Utility | get-url-param', function (hooks) {
    let originalUrl;

    hooks.beforeEach(function () {
        originalUrl = window.location.href;
    });

    hooks.afterEach(function () {
        window.history.replaceState(null, '', originalUrl);
    });

    function withSearch(search) {
        window.history.replaceState(null, '', search);
    }

    test('it returns a single value as a string', function (assert) {
        withSearch('?status=active');

        assert.strictEqual(getUrlParam('status'), 'active');
    });

    test('it returns an array when a key repeats', function (assert) {
        withSearch('?tag=a&tag=b&tag=c');

        assert.deepEqual(getUrlParam('tag'), ['a', 'b', 'c'], 'every repeated value is preserved in order');
    });

    test('it returns an array for the bracket form when it repeats', function (assert) {
        withSearch('?tag[]=a&tag[]=b');

        assert.deepEqual(getUrlParam('tag'), ['a', 'b'], 'tag[]=a&tag[]=b is read through the bare key');
    });

    test('it prefers the bare key over the bracket key when both repeat', function (assert) {
        withSearch('?tag=a&tag=b&tag[]=c&tag[]=d');

        assert.deepEqual(getUrlParam('tag'), ['a', 'b'], 'the bare-key branch is checked first');
    });

    test('it falls back to the bracket form for a single value', function (assert) {
        withSearch('?tag[]=only');

        assert.strictEqual(getUrlParam('tag'), 'only', 'a lone tag[]=x still resolves through the bare key');
    });

    test('it returns undefined for a missing key', function (assert) {
        withSearch('?other=1');

        assert.strictEqual(getUrlParam('status'), undefined);
    });

    test('it returns undefined for a present but empty value', function (assert) {
        withSearch('?status=');

        assert.strictEqual(getUrlParam('status'), undefined, 'an empty string is treated as absent, not as ""');
    });

    test('it returns undefined when the query string is empty', function (assert) {
        withSearch(window.location.pathname);

        assert.strictEqual(getUrlParam('status'), undefined);
    });

    test('it decodes percent-encoded and unicode values', function (assert) {
        withSearch(`?q=${encodeURIComponent('a b/&é 🚚')}`);

        assert.strictEqual(getUrlParam('q'), 'a b/&é 🚚');
    });

    test('it keeps a single repeated-looking value as a string', function (assert) {
        withSearch('?tag=a');

        assert.strictEqual(getUrlParam('tag'), 'a', 'one value is a string, not a one-element array');
    });

    test('it preserves empty entries inside a repeated key', function (assert) {
        withSearch('?tag=a&tag=');

        assert.deepEqual(getUrlParam('tag'), ['a', ''], 'the empty-value check only applies to the single-value path');
    });
});
