import loadLeafletPlugins from '@fleetbase/ember-ui/utils/load-leaflet-plugins';
import { settled } from '@ember/test-helpers';
import { module, test } from 'qunit';

const INDICATOR_KEY = '__loadLeafletPluginsTestIndicator';

module('Unit | Utility | load-leaflet-plugins', function (hooks) {
    hooks.beforeEach(function () {
        this.appended = [];

        // Intercept the DOM injection boundary so nothing is executed or fetched.
        this.originalAppendChild = document.body.appendChild;
        document.body.appendChild = (node) => {
            this.appended.push(node);
            return node;
        };

        this.srcs = () => this.appended.filter((node) => node.tagName === 'SCRIPT' && node.src).map((node) => node.getAttribute('src'));
        this.hrefs = () => this.appended.filter((node) => node.tagName === 'LINK').map((node) => node.getAttribute('href'));
    });

    hooks.afterEach(async function () {
        document.body.appendChild = this.originalAppendChild;
        await settled();
        delete window[INDICATOR_KEY];
    });

    test('it defaults the base path to the leaflet engine dist directory', async function (assert) {
        loadLeafletPlugins({ scripts: ['leaflet.js', 'leaflet.draw.js'], stylesheets: ['leaflet.css'] });

        assert.deepEqual(this.srcs(), ['/engines-dist/leaflet/leaflet.js', '/engines-dist/leaflet/leaflet.draw.js']);
        assert.deepEqual(this.hrefs(), ['/engines-dist/leaflet/leaflet.css']);

        await settled();
    });

    test('an explicit base path overrides the default', async function (assert) {
        loadLeafletPlugins({ basePath: 'vendor/leaflet', scripts: ['leaflet.js'], stylesheets: ['leaflet.css'] });

        assert.deepEqual(this.srcs(), ['/vendor/leaflet/leaflet.js']);
        assert.deepEqual(this.hrefs(), ['/vendor/leaflet/leaflet.css']);

        await settled();
    });

    test('an explicit null base path resolves to the site root', async function (assert) {
        // The spread of `assets` happens after the computed default, so an explicit
        // null key wins and the assets end up at the root.
        loadLeafletPlugins({ basePath: null, scripts: ['leaflet.js'], stylesheets: [] });

        assert.deepEqual(this.srcs(), ['/leaflet.js']);

        await settled();
    });

    test('it still injects the window.exports bootstrap', async function (assert) {
        loadLeafletPlugins({ scripts: [], stylesheets: [] });

        assert.strictEqual(this.appended.length, 1);
        assert.strictEqual(this.appended[0].innerHTML, 'window.exports = window.exports || {};');

        await settled();
    });

    test('calling it with no arguments injects only the bootstrap', async function (assert) {
        loadLeafletPlugins();

        assert.deepEqual(this.srcs(), [], 'the default asset lists are empty');
        assert.deepEqual(this.hrefs(), []);
        assert.strictEqual(this.appended.length, 1);

        await settled();
    });

    test('it forwards the global indicator key and the callback', async function (assert) {
        const observed = [];

        loadLeafletPlugins({ scripts: ['leaflet.js'], stylesheets: [], globalIndicatorKey: INDICATOR_KEY }, () => observed.push(window[INDICATOR_KEY]));

        assert.false(window[INDICATOR_KEY], 'the indicator starts false');
        assert.deepEqual(observed, [], 'the callback is deferred');

        await settled();

        assert.true(window[INDICATOR_KEY], 'the indicator is flipped when loading settles');
        assert.deepEqual(observed, [true], 'the callback fires once, after the indicator is set');
    });

    test('it propagates the underlying TypeError for malformed asset lists', function (assert) {
        assert.throws(() => loadLeafletPlugins({ scripts: ['leaflet.js'] }), TypeError, 'a missing stylesheets list still throws');
        assert.throws(() => loadLeafletPlugins({ stylesheets: [] }), TypeError, 'a missing scripts list still throws');
    });

    test('repeated calls re-inject without de-duplication', async function (assert) {
        loadLeafletPlugins({ scripts: ['leaflet.js'], stylesheets: [] });
        loadLeafletPlugins({ scripts: ['leaflet.js'], stylesheets: [] });

        assert.deepEqual(this.srcs(), ['/engines-dist/leaflet/leaflet.js', '/engines-dist/leaflet/leaflet.js']);

        await settled();
    });

    test('the caller asset object is not mutated', async function (assert) {
        const assets = { scripts: ['leaflet.js'], stylesheets: [] };

        loadLeafletPlugins(assets);

        assert.deepEqual(assets, { scripts: ['leaflet.js'], stylesheets: [] }, 'no basePath is written back onto the caller object');
        assert.false('basePath' in assets);

        await settled();
    });
});
