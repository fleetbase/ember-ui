import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import CoordinatesInputComponent, { DEFAULT_TILE_URL, DEFAULT_TILE_ATTRIBUTION } from '@fleetbase/ember-ui/components/coordinates-input';

module('Integration | Component | coordinates-input', function (hooks) {
    setupRenderingTest(hooks);

    test('it renders', async function (assert) {
        // Set any properties with this.set('myProperty', 'value');
        // Handle any actions with this.set('myAction', function(val) { ... });

        await render(hbs`<CoordinatesInput />`);

        assert.dom(this.element).hasText('');

        // Template block usage:
        await render(hbs`
      <CoordinatesInput>
        template block text
      </CoordinatesInput>
    `);

        assert.dom(this.element).hasText('template block text');
    });

    test('every theme uses keyless OpenStreetMap tiles, and a custom URL is kept', function (assert) {
        // CARTO tiles now need an API key and show "API key required" without one;
        // Stadia Maps needs one outside localhost. Neither may come back as a default.
        const component = {};
        const change = (source) => CoordinatesInputComponent.prototype.changeTileSource.call(component, source);

        for (const theme of [undefined, null, 'light', 'dark', 'dark_all', 'unknown']) {
            change(theme);
            assert.strictEqual(component.tileSourceUrl, DEFAULT_TILE_URL, `${theme} uses OpenStreetMap`);
        }

        change('https://tiles.example.com/{z}/{x}/{y}.png?key=abc');
        assert.strictEqual(component.mapTheme, 'custom');
        assert.strictEqual(component.tileSourceUrl, 'https://tiles.example.com/{z}/{x}/{y}.png?key=abc');

        assert.true(DEFAULT_TILE_URL.startsWith('https://tile.openstreetmap.org/'));
        assert.true(DEFAULT_TILE_ATTRIBUTION.includes('OpenStreetMap'), 'OpenStreetMap is credited, as its tile policy requires');
    });
});
