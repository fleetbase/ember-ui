import leafletTileSource, { DEFAULT_TILE_URL, DEFAULT_TILE_ATTRIBUTION } from 'dummy/utils/leaflet-tile-source';
import { module, test } from 'qunit';

module('Unit | Utility | leaflet-tile-source', function () {
    test('every theme uses keyless OpenStreetMap tiles', function (assert) {
        // CARTO tiles now need an API key and show "API key required" without one;
        // Stadia Maps needs one outside localhost. Neither may come back as a default.
        assert.strictEqual(DEFAULT_TILE_URL, 'https://tile.openstreetmap.org/{z}/{x}/{y}.png');

        for (const source of [undefined, null, 'light', 'unknown', 'http://insecure.example/{z}/{x}/{y}.png']) {
            assert.deepEqual(leafletTileSource(source), { theme: 'light', url: DEFAULT_TILE_URL }, `${source} is light OpenStreetMap`);
        }

        assert.deepEqual(leafletTileSource('dark'), { theme: 'dark', url: DEFAULT_TILE_URL });
        assert.deepEqual(leafletTileSource('dark_all'), { theme: 'dark_all', url: DEFAULT_TILE_URL });
    });

    test('an https tile URL is used as given', function (assert) {
        assert.deepEqual(leafletTileSource('https://tiles.example.com/{z}/{x}/{y}.png?key=abc'), { theme: 'custom', url: 'https://tiles.example.com/{z}/{x}/{y}.png?key=abc' });
    });

    test('OpenStreetMap is credited, as its tile policy requires', function (assert) {
        assert.true(DEFAULT_TILE_ATTRIBUTION.includes('openstreetmap.org/copyright'));
    });
});
