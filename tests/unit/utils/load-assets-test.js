import loadAssets from '@fleetbase/ember-ui/utils/load-assets';
import { settled } from '@ember/test-helpers';
import { module, test } from 'qunit';

const INDICATOR_KEY = '__loadAssetsTestIndicator';

module('Unit | Utility | load-assets', function (hooks) {
    hooks.beforeEach(function () {
        this.appended = [];

        // Intercept the DOM injection boundary: elements are recorded but never
        // attached, so no script is executed and no stylesheet is fetched.
        this.originalAppendChild = document.body.appendChild;
        document.body.appendChild = (node) => {
            this.appended.push(node);
            return node;
        };

        this.scripts = () => this.appended.filter((node) => node.tagName === 'SCRIPT' && node.src);
        this.links = () => this.appended.filter((node) => node.tagName === 'LINK');
    });

    hooks.afterEach(async function () {
        document.body.appendChild = this.originalAppendChild;
        await settled();
        delete window[INDICATOR_KEY];
    });

    test('it always injects the window.exports bootstrap first', async function (assert) {
        loadAssets();

        assert.strictEqual(this.appended.length, 1, 'only the bootstrap is injected with no assets');
        assert.strictEqual(this.appended[0].tagName, 'SCRIPT');
        assert.strictEqual(this.appended[0].innerHTML, 'window.exports = window.exports || {};');
        assert.strictEqual(this.appended[0].src, '', 'the bootstrap is inline, not a remote script');

        await settled();
    });

    test('it injects scripts in order under the base path', async function (assert) {
        loadAssets({ basePath: 'engines-dist/leaflet', scripts: ['leaflet.js', 'plugins/heat.js'], stylesheets: [] });

        assert.deepEqual(
            this.scripts().map((node) => node.getAttribute('src')),
            ['/engines-dist/leaflet/leaflet.js', '/engines-dist/leaflet/plugins/heat.js'],
            'each script is prefixed with a leading slash and the base path'
        );

        await settled();
    });

    test('it injects stylesheets as rel=stylesheet links after the scripts', async function (assert) {
        loadAssets({ basePath: 'assets', scripts: ['a.js'], stylesheets: ['a.css', 'b.css'] });

        assert.deepEqual(
            this.appended.map((node) => node.tagName),
            ['SCRIPT', 'SCRIPT', 'LINK', 'LINK'],
            'bootstrap, then scripts, then stylesheets'
        );
        assert.deepEqual(
            this.links().map((node) => node.getAttribute('href')),
            ['/assets/a.css', '/assets/b.css']
        );
        assert.true(
            this.links().every((node) => node.rel === 'stylesheet'),
            'links are marked as stylesheets'
        );

        await settled();
    });

    test('an empty or missing base path resolves to the site root', async function (assert) {
        loadAssets({ basePath: '', scripts: ['a.js'], stylesheets: ['a.css'] });

        assert.strictEqual(this.scripts()[0].getAttribute('src'), '/a.js');
        assert.strictEqual(this.links()[0].getAttribute('href'), '/a.css');

        await settled();
    });

    test('it preserves query strings and special characters in asset paths', async function (assert) {
        loadAssets({ basePath: 'dist', scripts: ['bundle.js?v=1.2.3', 'ünïcödé file.js'], stylesheets: [] });

        assert.deepEqual(
            this.scripts().map((node) => node.getAttribute('src')),
            ['/dist/bundle.js?v=1.2.3', '/dist/ünïcödé file.js'],
            'paths are passed through verbatim'
        );

        await settled();
    });

    test('empty asset lists inject nothing beyond the bootstrap', async function (assert) {
        loadAssets({ basePath: 'dist', scripts: [], stylesheets: [] });

        assert.strictEqual(this.scripts().length, 0);
        assert.strictEqual(this.links().length, 0);
        assert.strictEqual(this.appended.length, 1);

        await settled();
    });

    test('it flags the global indicator false immediately and true once loading settles', async function (assert) {
        window[INDICATOR_KEY] = 'stale value';

        loadAssets({ basePath: 'dist', scripts: ['a.js'], stylesheets: [], globalIndicatorKey: INDICATOR_KEY });

        assert.false(window[INDICATOR_KEY], 'the indicator is reset before injection');

        await settled();

        assert.true(window[INDICATOR_KEY], 'and flipped to true after the load window elapses');
    });

    test('the callback runs once, after the indicator is set', async function (assert) {
        const observed = [];

        loadAssets({ basePath: 'dist', scripts: [], stylesheets: [], globalIndicatorKey: INDICATOR_KEY }, () => observed.push(window[INDICATOR_KEY]));

        assert.deepEqual(observed, [], 'the callback is deferred, not synchronous');

        await settled();

        assert.deepEqual(observed, [true], 'it fires exactly once and sees the indicator already set');
    });

    test('a non-string or absent indicator key touches no globals', async function (assert) {
        loadAssets({ basePath: 'dist', scripts: [], stylesheets: [], globalIndicatorKey: 123 });

        await settled();

        assert.false(INDICATOR_KEY in window, 'nothing is written for a non-string key');
        assert.strictEqual(window[123], undefined, 'and the numeric key is not used either');
    });

    test('a non-function callback is ignored rather than invoked', async function (assert) {
        loadAssets({ basePath: 'dist', scripts: [], stylesheets: [], globalIndicatorKey: INDICATOR_KEY }, 'not-a-function');

        await settled();

        assert.true(window[INDICATOR_KEY], 'the rest of the completion work still runs');
    });

    test('it throws when the stylesheets list is missing, after injecting the scripts', function (assert) {
        assert.throws(() => loadAssets({ basePath: 'dist', scripts: ['a.js'] }), TypeError, 'the util assumes both lists are present');
        assert.strictEqual(this.scripts().length, 1, 'the scripts injected before the failure are still in the DOM');
    });

    test('it throws when the scripts list is missing', function (assert) {
        assert.throws(() => loadAssets({ basePath: 'dist', stylesheets: [] }), TypeError);
    });

    test('repeated calls re-inject rather than dedupe', async function (assert) {
        loadAssets({ basePath: 'dist', scripts: ['a.js'], stylesheets: ['a.css'] });
        loadAssets({ basePath: 'dist', scripts: ['a.js'], stylesheets: ['a.css'] });

        assert.strictEqual(this.appended.length, 6, 'each call injects its own bootstrap, script and stylesheet');
        assert.deepEqual(
            this.scripts().map((node) => node.getAttribute('src')),
            ['/dist/a.js', '/dist/a.js'],
            'there is no de-duplication of already requested assets'
        );

        await settled();
    });

    test('every injected node is a freshly created element', async function (assert) {
        loadAssets({ basePath: 'dist', scripts: ['a.js', 'b.js'], stylesheets: [] });

        const [bootstrap, first, second] = this.appended;

        assert.notStrictEqual(first, second, 'each script gets its own element');
        assert.notStrictEqual(bootstrap, first);
        assert.strictEqual(first.parentNode, null, 'the stubbed boundary means nothing was really attached');

        await settled();
    });
});
