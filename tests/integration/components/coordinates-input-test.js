import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, settled, waitUntil, find } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | coordinates-input', function (hooks) {
    setupRenderingTest(hooks);

    test('it renders empty latitude and longitude inputs and a map trigger', async function (assert) {
        await render(hbs`<CoordinatesInput />`);

        assert.dom('.coordinates-input input[aria-label="Latitude"]').hasValue('');
        assert.dom('.coordinates-input input[aria-label="Longitude"]').hasValue('');
        assert.dom(this.element).containsText('Select from map');
    });

    test('it populates the inputs from a point value', async function (assert) {
        this.set('value', { type: 'Point', coordinates: [103.8198, 1.3521] });

        await render(hbs`<CoordinatesInput @value={{this.value}} />`);

        assert.dom('.coordinates-input input[aria-label="Latitude"]').hasValue('1.3521');
        assert.dom('.coordinates-input input[aria-label="Longitude"]').hasValue('103.8198');
    });

    test('it ignores a zero-zero point value', async function (assert) {
        this.set('value', { type: 'Point', coordinates: [0, 0] });

        await render(hbs`<CoordinatesInput @value={{this.value}} />`);

        assert.dom('.coordinates-input input[aria-label="Latitude"]').hasValue('');
        assert.dom('.coordinates-input input[aria-label="Longitude"]').hasValue('');
    });

    test('@disabled disables the coordinate inputs', async function (assert) {
        await render(hbs`<CoordinatesInput @disabled={{true}} />`);

        assert.dom('.coordinates-input input[aria-label="Latitude"]').isDisabled();
        assert.dom('.coordinates-input input[aria-label="Longitude"]').isDisabled();
    });

    test('@onInit exposes the component and updating coordinates fires @onChange', async function (assert) {
        const changes = [];
        let component;

        this.set('onInit', (instance) => {
            component = instance;
        });
        this.set('onChange', (coordinates) => changes.push(coordinates));

        await render(hbs`<CoordinatesInput @onInit={{this.onInit}} @onChange={{this.onChange}} />`);

        assert.ok(component, 'component instance provided to onInit');

        component.updateCoordinates(10.5, 20.25);
        await settled();

        assert.deepEqual(changes, [{ latitude: 10.5, longitude: 20.25 }], 'onChange fired with new coordinates');
        assert.dom('.coordinates-input input[aria-label="Latitude"]').hasValue('10.5');
        assert.dom('.coordinates-input input[aria-label="Longitude"]').hasValue('20.25');
    });

    test('reverse lookup queries the geocoder and updates the coordinates', async function (assert) {
        const geocoded = [];
        const changes = [];
        let component;

        const fetch = this.owner.lookup('service:fetch');
        fetch.responses['geocoder/query'] = { location: { type: 'Point', coordinates: [103.85, 1.29] } };

        this.set('onInit', (instance) => {
            component = instance;
        });
        this.set('onChange', (coordinates) => changes.push(coordinates));
        this.set('onGeocode', (place) => geocoded.push(place));

        await render(hbs`<CoordinatesInput @onInit={{this.onInit}} @onChange={{this.onChange}} @onGeocode={{this.onGeocode}} />`);

        component.lookupQuery = 'Singapore';
        await component.reverseLookup.perform();
        await settled();

        const lookupCall = fetch.calls.find((call) => call.args[0] === 'geocoder/query');
        assert.ok(lookupCall, 'geocoder/query was requested');
        assert.deepEqual(lookupCall.args[1], { query: 'Singapore', single: true });
        assert.deepEqual(changes, [{ latitude: 1.29, longitude: 103.85 }]);
        assert.strictEqual(geocoded.length, 1, 'onGeocode fired with the place');
        assert.dom('.coordinates-input input[aria-label="Latitude"]').hasValue('1.29');
        assert.dom('.coordinates-input input[aria-label="Longitude"]').hasValue('103.85');
    });

    test('a failed reverse lookup is reported to onGeocodeError', async function (assert) {
        const errors = [];
        const changes = [];
        let component;

        const fetch = this.owner.lookup('service:fetch');
        const originalGet = fetch.get;
        fetch.get = () => Promise.reject(new Error('geocoder unavailable'));

        this.set('onInit', (instance) => {
            component = instance;
        });
        this.set('onChange', (coordinates) => changes.push(coordinates));
        this.set('onGeocodeError', (error) => errors.push(error));

        try {
            await render(hbs`<CoordinatesInput @onInit={{this.onInit}} @onChange={{this.onChange}} @onGeocodeError={{this.onGeocodeError}} />`);

            component.lookupQuery = 'Nowhere';
            await component.reverseLookup.perform();

            assert.strictEqual(errors.length, 1, 'the caller is told');
            assert.strictEqual(errors[0].message, 'geocoder unavailable');
            assert.deepEqual(changes, [], 'and no coordinates are reported');
        } finally {
            fetch.get = originalGet;
        }
    });

    test('a failed reverse lookup without a handler is swallowed', async function (assert) {
        let component;

        const fetch = this.owner.lookup('service:fetch');
        const originalGet = fetch.get;
        fetch.get = () => Promise.reject(new Error('geocoder unavailable'));

        this.set('onInit', (instance) => {
            component = instance;
        });

        try {
            await render(hbs`<CoordinatesInput @onInit={{this.onInit}} />`);

            component.lookupQuery = 'Nowhere';
            await component.reverseLookup.perform();

            assert.dom('.coordinates-input').exists('the component survives the failure');
        } finally {
            fetch.get = originalGet;
        }
    });

    test('a geocoder response with no place reports nothing', async function (assert) {
        const geocoded = [];
        let component;

        // The stub resolves `responses[path] ?? []`, so priming it with null yields a TRUTHY empty
        // array: `if (place)` was taken, `place.location.coordinates` threw, and the catch swallowed
        // it — so this passed for the opposite reason to the one it claims. Override `get` instead.
        const fetch = this.owner.lookup('service:fetch');
        const originalGet = fetch.get;
        fetch.get = () => Promise.resolve(null);

        this.set('onInit', (instance) => {
            component = instance;
        });
        this.set('onGeocode', (place) => geocoded.push(place));

        await render(hbs`<CoordinatesInput @onInit={{this.onInit}} @onGeocode={{this.onGeocode}} />`);

        component.lookupQuery = 'Nowhere';
        const place = await component.reverseLookup.perform();
        fetch.get = originalGet;

        assert.strictEqual(place, null, 'the empty result is returned as-is, not coerced');
        assert.deepEqual(geocoded, [], 'onGeocode is not called for an empty result');
    });

    test('reverse lookup does nothing when the query is blank', async function (assert) {
        let component;
        this.set('onInit', (instance) => {
            component = instance;
        });

        await render(hbs`<CoordinatesInput @onInit={{this.onInit}} />`);

        await component.reverseLookup.perform();

        const fetch = this.owner.lookup('service:fetch');
        assert.strictEqual(fetch.calls.length, 0, 'no request performed for a blank query');
    });

    module('reacting to the map', function () {
        function withInstance(context) {
            let component;
            context.set('onInit', (instance) => {
                component = instance;
            });

            return () => component;
        }

        test('panning the map updates the coordinates without recentering it', async function (assert) {
            const changes = [];
            const fromMap = [];
            const instance = withInstance(this);
            this.set('onChange', (coordinates) => changes.push(coordinates));
            this.set('onUpdatedFromMap', (coordinates) => fromMap.push(coordinates));

            await render(hbs`<CoordinatesInput @onInit={{this.onInit}} @onChange={{this.onChange}} @onUpdatedFromMap={{this.onUpdatedFromMap}} />`);

            const component = instance();
            component.setCoordinatesFromMap({ target: { getCenter: () => ({ lat: 1.3521, lng: 103.8198 }) } });
            await settled();

            assert.deepEqual(changes, [{ latitude: 1.3521, longitude: 103.8198 }], 'the change is reported');
            assert.deepEqual(fromMap, [{ latitude: 1.3521, longitude: 103.8198 }], 'and flagged as coming from the map');
            assert.dom('.coordinates-input input[aria-label="Latitude"]').hasValue('1.3521');
        });

        test('a wrapped map centre is normalised before use', async function (assert) {
            const fromMap = [];
            const instance = withInstance(this);
            this.set('onUpdatedFromMap', (coordinates) => fromMap.push(coordinates));

            await render(hbs`<CoordinatesInput @onInit={{this.onInit}} @onUpdatedFromMap={{this.onUpdatedFromMap}} />`);

            instance().setCoordinatesFromMap({
                target: {
                    getCenter: () => ({
                        lat: 1.3521,
                        lng: 463.8198,
                        wrap: () => ({ lat: 1.3521, lng: 103.8198 }),
                    }),
                },
            });
            await settled();

            assert.deepEqual(fromMap, [{ latitude: 1.3521, longitude: 103.8198 }], 'the wrapped longitude is used');
        });

        test('panning without an onUpdatedFromMap handler still records the coordinates', async function (assert) {
            const instance = withInstance(this);

            await render(hbs`<CoordinatesInput @onInit={{this.onInit}} />`);

            instance().setCoordinatesFromMap({ target: { getCenter: () => ({ lat: 5, lng: 6 }) } });
            await settled();

            assert.dom('.coordinates-input input[aria-label="Latitude"]').hasValue('5');
            assert.dom('.coordinates-input input[aria-label="Longitude"]').hasValue('6');
        });

        test('closing the picker recenters the map on the entered coordinates', async function (assert) {
            const instance = withInstance(this);

            await render(hbs`<CoordinatesInput @onInit={{this.onInit}} />`);

            const component = instance();
            component.updateCoordinates(1.3521, 103.8198);
            await settled();

            // Pan away without recentering, as a real map drag would.
            component.setCoordinatesFromMap({ target: { getCenter: () => ({ lat: 9, lng: 9 }) } });
            await settled();

            component.onClose();
            await settled();

            assert.strictEqual(component.mapLat, 9, 'the map follows the last panned position');
            assert.strictEqual(component.mapLng, 9);
        });

        test('zooming is a no-op until the map has loaded', async function (assert) {
            const instance = withInstance(this);

            await render(hbs`<CoordinatesInput @onInit={{this.onInit}} />`);

            const component = instance();
            assert.notOk(component.leafletMap, 'no map yet');

            component.onZoomIn();
            component.onZoomOut();

            assert.dom('.coordinates-input').exists('the component survives');
        });

        test('a point value passed to updateCoordinates is unpacked', async function (assert) {
            const changes = [];
            const instance = withInstance(this);
            this.set('onChange', (coordinates) => changes.push(coordinates));

            await render(hbs`<CoordinatesInput @onInit={{this.onInit}} @onChange={{this.onChange}} />`);

            instance().updateCoordinates({ type: 'Point', coordinates: [103.8198, 1.3521] });
            await settled();

            assert.deepEqual(changes, [{ latitude: 1.3521, longitude: 103.8198 }], 'longitude-first order is unpacked correctly');
        });

        test('an update can be made without firing the callback', async function (assert) {
            const changes = [];
            const instance = withInstance(this);
            this.set('onChange', (coordinates) => changes.push(coordinates));

            await render(hbs`<CoordinatesInput @onInit={{this.onInit}} @onChange={{this.onChange}} />`);

            instance().updateCoordinates(1.5, 2.5, { fireCallback: false });
            await settled();

            assert.deepEqual(changes, [], 'nothing is reported');
            assert.dom('.coordinates-input input[aria-label="Latitude"]').hasValue('1.5', 'but the field is updated');
        });
    });

    // Until DEFECTS.md #94 was fixed, mounting a live Leaflet map poisoned every LATER test in
    // the run: the component kept a reference to the torn-down map, and the next coordinate
    // change called `setView` on it, throwing "Cannot read properties of undefined (reading
    // '_leaflet_pos')" as an uncaught global error that aborted QUnit. The ORDER of the tests
    // below is the point — the map is mounted first, and the instance-driven test that follows
    // is exactly the one that used to fail.
    module('the live map picker', function () {
        async function openPicker() {
            await click('.ember-basic-dropdown-trigger');
            await waitUntil(() => find('.coordinates-input-map-container .leaflet-container'), { timeout: 3000 });
        }

        test('opening the picker mounts a real leaflet map', async function (assert) {
            await render(hbs`<CoordinatesInput />`);
            await openPicker();

            assert.dom('.coordinates-input-map-container .leaflet-container').exists('the map is mounted');
            assert.dom('.leaflet-tile-pane').exists('with a tile layer');
        });

        test('the loaded map is captured and marked ready', async function (assert) {
            let component;
            this.set('onInit', (instance) => {
                component = instance;
            });

            await render(hbs`<CoordinatesInput @onInit={{this.onInit}} />`);
            await openPicker();

            await waitUntil(() => component.leafletMap, { timeout: 3000 });

            assert.strictEqual(typeof component.leafletMap.zoomIn, 'function', 'onMapLoaded captured the real leaflet map');
            // `isReady` is flipped by a 300ms `later`, which settled() does not await.
            await waitUntil(() => component.isReady, { timeout: 3000 });
            assert.true(component.isReady, 'and the deferred ready flag is set');
        });

        test('the zoom controls delegate to the loaded map', async function (assert) {
            // Leaflet will not actually change zoom in a zero-size test container, so assert the
            // component's own responsibility — that both actions reach the captured instance.
            const calls = [];
            let component;
            this.set('onInit', (instance) => {
                component = instance;
            });

            await render(hbs`<CoordinatesInput @onInit={{this.onInit}} />`);
            await openPicker();
            await waitUntil(() => component.leafletMap, { timeout: 3000 });

            component.leafletMap = {
                zoomIn: () => calls.push('in'),
                zoomOut: () => calls.push('out'),
            };

            component.onZoomIn();
            component.onZoomOut();

            assert.deepEqual(calls, ['in', 'out']);
        });

        test('closing the picker releases the map', async function (assert) {
            let component;
            this.set('onInit', (instance) => {
                component = instance;
            });

            await render(hbs`<CoordinatesInput @onInit={{this.onInit}} />`);
            await openPicker();
            await waitUntil(() => component.leafletMap, { timeout: 3000 });

            // Close through the dropdown, which is what unmounts <LeafletMap> and fires onClose.
            await click('.ember-basic-dropdown-trigger');

            assert.strictEqual(component.leafletMap, null, 'the torn-down map is not held on to');
            assert.false(component.isReady, 'and the ready flag is reset');
        });

        test('a coordinate change after a map has been mounted does not throw', async function (assert) {
            const changes = [];
            let component;
            this.set('onInit', (instance) => {
                component = instance;
            });
            this.set('onChange', (coordinates) => changes.push(coordinates));

            await render(hbs`<CoordinatesInput @onInit={{this.onInit}} @onChange={{this.onChange}} />`);

            component.updateCoordinates(1.3521, 103.8198);
            await settled();

            assert.deepEqual(changes, [{ latitude: 1.3521, longitude: 103.8198 }], 'the change is reported cleanly');
            assert.dom('.coordinates-input input[aria-label="Latitude"]').hasValue('1.3521');
        });
    });

    module('the tile source', function () {
        test('dark mode selects the stadiamaps dark tiles', async function (assert) {
            let component;
            this.set('onInit', (instance) => {
                component = instance;
            });

            await render(hbs`<CoordinatesInput @darkMode={{true}} @onInit={{this.onInit}} />`);

            assert.strictEqual(component.mapTheme, 'dark');
            assert.true(component.tileSourceUrl.includes('alidade_smooth_dark'));
        });

        test('each named source maps to its own tiles', async function (assert) {
            let component;
            this.set('onInit', (instance) => {
                component = instance;
            });

            await render(hbs`<CoordinatesInput @onInit={{this.onInit}} />`);

            component.changeTileSource('dark_all');
            assert.strictEqual(component.mapTheme, 'dark_all');
            assert.true(component.tileSourceUrl.includes('dark_all'));

            component.changeTileSource('light');
            assert.strictEqual(component.mapTheme, 'light');
            assert.true(component.tileSourceUrl.includes('light_all'));
        });

        test('an https url is used verbatim as a custom source', async function (assert) {
            let component;
            this.set('onInit', (instance) => {
                component = instance;
            });

            await render(hbs`<CoordinatesInput @onInit={{this.onInit}} />`);

            component.changeTileSource('https://tiles.example.test/{z}/{x}/{y}.png');

            assert.strictEqual(component.mapTheme, 'custom');
            assert.strictEqual(component.tileSourceUrl, 'https://tiles.example.test/{z}/{x}/{y}.png');
        });

        test('anything unrecognised falls back to the light tiles', async function (assert) {
            let component;
            this.set('onInit', (instance) => {
                component = instance;
            });

            await render(hbs`<CoordinatesInput @onInit={{this.onInit}} />`);

            component.changeTileSource('nonsense');

            assert.strictEqual(component.mapTheme, 'light');
            assert.true(component.tileSourceUrl.includes('light_all'));
        });
    });
    test('a successful lookup with no @onGeocode handler still moves the coordinates', async function (assert) {
        let component;
        const changes = [];
        const fetch = this.owner.lookup('service:fetch');
        fetch.responses['geocoder/query'] = { location: { type: 'Point', coordinates: [103.85, 1.29] } };

        this.set('onInit', (instance) => {
            component = instance;
        });
        this.set('onChange', (coordinates) => changes.push(coordinates));

        await render(hbs`<CoordinatesInput @onInit={{this.onInit}} @onChange={{this.onChange}} />`);

        component.lookupQuery = 'Singapore';
        await component.reverseLookup.perform();
        await settled();

        assert.deepEqual(changes, [{ latitude: 1.29, longitude: 103.85 }], 'the coordinates move with nothing listening for the place');
    });
});
