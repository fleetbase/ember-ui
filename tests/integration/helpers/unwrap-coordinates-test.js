import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import { helper } from '@ember/component/helper';
import { leafletWrapCoordinates } from '@fleetbase/ember-ui/helpers/unwrap-coordinates';

const TOLERANCE = 1e-6;

function registerCapture(owner, sink) {
    owner.register(
        'helper:capture-value',
        helper(function ([value]) {
            sink.push(value);
            return '';
        })
    );
}

function assertLatLng(assert, actual, expectedLat, expectedLng, label) {
    assert.strictEqual(typeof actual?.lat, 'number', `${label}: has a numeric lat`);
    assert.strictEqual(typeof actual?.lng, 'number', `${label}: has a numeric lng`);
    assert.true(Math.abs(actual.lat - expectedLat) < TOLERANCE, `${label}: lat is ${expectedLat} (got ${actual.lat})`);
    assert.true(Math.abs(actual.lng - expectedLng) < TOLERANCE, `${label}: lng is ${expectedLng} (got ${actual.lng})`);
}

module('Integration | Helper | unwrap-coordinates', function (hooks) {
    setupRenderingTest(hooks);

    test('it projects a geojson point and preserves the other members', async function (assert) {
        const captured = [];
        registerCapture(this.owner, captured);
        const point = { type: 'Point', coordinates: [-80.191788, 25.761681], id: 'place_1' };
        this.set('input', point);

        await render(hbs`{{capture-value (unwrap-coordinates this.input)}}`);

        const result = captured[0];
        assert.notStrictEqual(result, point, 'a new geometry object is returned');
        assert.strictEqual(result.type, 'Point', 'the geometry type is preserved');
        assert.strictEqual(result.id, 'place_1', 'unrelated members are preserved');
        assert.deepEqual(point.coordinates, [-80.191788, 25.761681], 'the source geometry is not mutated');
        assertLatLng(assert, result.coordinates, 25.761681, -80.191788, 'point');
    });

    test('it wraps out of range longitudes back into the canonical range', async function (assert) {
        const captured = [];
        registerCapture(this.owner, captured);
        this.set('input', { type: 'Point', coordinates: [200, 45] });

        await render(hbs`{{capture-value (unwrap-coordinates this.input)}}`);

        assertLatLng(assert, captured[0].coordinates, 45, -160, 'wrapped point');
    });

    test('it wraps longitudes below negative 180', async function (assert) {
        const captured = [];
        registerCapture(this.owner, captured);
        this.set('input', { type: 'Point', coordinates: [-190, -33.8688] });

        await render(hbs`{{capture-value (unwrap-coordinates this.input)}}`);

        assertLatLng(assert, captured[0].coordinates, -33.8688, 170, 'wrapped point');
    });

    test('it projects every vertex of a geojson line string', async function (assert) {
        const captured = [];
        registerCapture(this.owner, captured);
        this.set('input', {
            type: 'LineString',
            coordinates: [
                [-80, 26],
                [-80.1, 26.1],
                [-80.2, 26.2],
            ],
        });

        await render(hbs`{{capture-value (unwrap-coordinates this.input)}}`);

        const coordinates = captured[0].coordinates;
        assert.strictEqual(coordinates.length, 3, 'every vertex is returned');
        assertLatLng(assert, coordinates[0], 26, -80, 'vertex 0');
        assertLatLng(assert, coordinates[1], 26.1, -80.1, 'vertex 1');
        assertLatLng(assert, coordinates[2], 26.2, -80.2, 'vertex 2');
    });

    test('it projects every ring of a geojson polygon', async function (assert) {
        const captured = [];
        registerCapture(this.owner, captured);
        this.set('input', {
            type: 'Polygon',
            coordinates: [
                [
                    [-80, 26],
                    [-80.1, 26.1],
                    [-80.2, 26.2],
                    [-80, 26],
                ],
            ],
        });

        await render(hbs`{{capture-value (unwrap-coordinates this.input)}}`);

        const rings = captured[0].coordinates;
        assert.strictEqual(rings.length, 1, 'the ring nesting is preserved');
        assert.strictEqual(rings[0].length, 4, 'every vertex of the ring is returned');
        assertLatLng(assert, rings[0][0], 26, -80, 'ring vertex 0');
        assertLatLng(assert, rings[0][3], 26, -80, 'closing vertex');
    });

    test('it clamps latitudes beyond the web mercator limit', async function (assert) {
        const captured = [];
        registerCapture(this.owner, captured);
        this.set('input', { type: 'Point', coordinates: [10, 89] });

        await render(hbs`{{capture-value (unwrap-coordinates this.input)}}`);

        const coordinates = captured[0].coordinates;
        assert.true(coordinates.lat < 85.06, `the latitude is clamped below the mercator maximum (got ${coordinates.lat})`);
        assert.true(coordinates.lat > 85.04, `and not past it (got ${coordinates.lat})`);
        assert.true(Math.abs(coordinates.lng - 10) < TOLERANCE, 'the longitude is untouched');
    });

    test('it converts a bare list of latitude longitude pairs', async function (assert) {
        const captured = [];
        registerCapture(this.owner, captured);
        this.set('input', [
            [26, -80],
            [26.1, -80.1],
        ]);

        await render(hbs`{{capture-value (unwrap-coordinates this.input)}}`);

        const coordinates = captured[0];
        assert.strictEqual(coordinates.length, 2, 'each pair is converted');
        assertLatLng(assert, coordinates[0], 26, -80, 'pair 0');
        assertLatLng(assert, coordinates[1], 26.1, -80.1, 'pair 1');
    });

    test('it converts a single latitude longitude pair', async function (assert) {
        const captured = [];
        registerCapture(this.owner, captured);
        this.set('input', [26, -80]);

        await render(hbs`{{capture-value (unwrap-coordinates this.input)}}`);

        assertLatLng(assert, captured[0], 26, -80, 'single pair');
    });

    test('it returns falsy input unchanged', async function (assert) {
        const captured = [];
        registerCapture(this.owner, captured);
        this.set('nullValue', null);
        this.set('zero', 0);
        this.set('empty', '');

        await render(
            hbs`{{capture-value (unwrap-coordinates this.nullValue)}}{{capture-value (unwrap-coordinates this.missing)}}{{capture-value (unwrap-coordinates this.zero)}}{{capture-value (unwrap-coordinates this.empty)}}`
        );

        assert.deepEqual(captured, [null, undefined, 0, ''], 'falsy values are passed straight through');
    });

    test('it returns non geometry input unchanged', async function (assert) {
        const captured = [];
        registerCapture(this.owner, captured);
        const plain = { type: 'Point', id: 'no-coordinates' };
        this.set('object', plain);
        this.set('string', 'not coordinates');

        await render(hbs`{{capture-value (unwrap-coordinates this.object)}}{{capture-value (unwrap-coordinates this.string)}}`);

        assert.strictEqual(captured[0], plain, 'an object without coordinates is returned by identity');
        assert.strictEqual(captured[1], 'not coordinates', 'a string is returned unchanged');
    });

    test('it returns an empty coordinate list unchanged', async function (assert) {
        const captured = [];
        registerCapture(this.owner, captured);
        this.set('input', []);

        await render(hbs`{{capture-value (unwrap-coordinates this.input)}}`);

        assert.deepEqual(captured[0], [], 'an empty array stays empty');
    });
    module('leafletWrapCoordinates', function () {
        test('a longitude past the antimeridian is wrapped back into range', function (assert) {
            assert.deepEqual(leafletWrapCoordinates([200, 10]), [-160, 10]);
            assert.deepEqual(leafletWrapCoordinates([-200, 10, 55]), [160, 10, 55], 'extra dimensions are preserved');
        });

        test('nested rings are wrapped element by element', function (assert) {
            assert.deepEqual(
                leafletWrapCoordinates([
                    [200, 10],
                    [-200, 20],
                ]),
                [
                    [-160, 10],
                    [160, 20],
                ]
            );
        });

        test('anything that is not an array is handed straight back', function (assert) {
            assert.strictEqual(leafletWrapCoordinates('not coordinates'), 'not coordinates');
            assert.strictEqual(leafletWrapCoordinates(null), null);
            assert.deepEqual(leafletWrapCoordinates({ lat: 1, lng: 2 }), { lat: 1, lng: 2 });
        });
    });
});
