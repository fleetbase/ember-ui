import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import { helper } from '@ember/component/helper';
import { A } from '@ember/array';

function registerCapture(owner, sink) {
    owner.register(
        'helper:capture-value',
        helper(function ([value]) {
            sink.push(value);
            return '';
        })
    );
}

module('Integration | Helper | point-to-coordinates', function (hooks) {
    setupRenderingTest(hooks);

    test('it defaults to a latitude longitude array', async function (assert) {
        const captured = [];
        registerCapture(this.owner, captured);
        this.set('point', { type: 'Point', coordinates: [-80.191788, 25.761681] });

        await render(hbs`{{capture-value (point-to-coordinates this.point)}}`);

        assert.deepEqual(captured[0], [25.761681, -80.191788], 'the geojson longitude/latitude pair is swapped');
    });

    test('it renders the default array format as comma separated text', async function (assert) {
        this.set('point', { type: 'Point', coordinates: [-80.191788, 25.761681] });

        await render(hbs`{{point-to-coordinates this.point}}`);

        assert.dom(this.element).hasText('25.761681,-80.191788');
    });

    test('it supports the explicit array format', async function (assert) {
        const captured = [];
        registerCapture(this.owner, captured);
        this.set('point', { coordinates: [13.405, 52.52] });

        await render(hbs`{{capture-value (point-to-coordinates this.point "array")}}`);

        assert.deepEqual(captured[0], [52.52, 13.405]);
    });

    test('it supports the latitudelongitude object format', async function (assert) {
        this.set('point', { coordinates: [13.405, 52.52] });

        await render(hbs`{{get (point-to-coordinates this.point "latitudelongitude") "latitude"}}|{{get (point-to-coordinates this.point "latitudelongitude") "longitude"}}`);

        assert.dom(this.element).hasText('52.52|13.405');
    });

    test('it supports the latlng object format', async function (assert) {
        this.set('point', { coordinates: [13.405, 52.52] });

        await render(hbs`{{get (point-to-coordinates this.point "latlng") "lat"}}|{{get (point-to-coordinates this.point "latlng") "lng"}}`);

        assert.dom(this.element).hasText('52.52|13.405');
    });

    test('it supports the xy object format where x is the latitude', async function (assert) {
        this.set('point', { coordinates: [13.405, 52.52] });

        await render(hbs`{{get (point-to-coordinates this.point "xy") "x"}}|{{get (point-to-coordinates this.point "xy") "y"}}`);

        assert.dom(this.element).hasText('52.52|13.405');
    });

    test('it returns nothing for an unknown format', async function (assert) {
        const captured = [];
        registerCapture(this.owner, captured);
        this.set('point', { coordinates: [13.405, 52.52] });

        await render(hbs`{{capture-value (point-to-coordinates this.point "geohash")}}`);

        assert.strictEqual(captured[0], undefined, 'unsupported formats yield undefined');
    });

    test('it falls back to the null island for a missing point', async function (assert) {
        const captured = [];
        registerCapture(this.owner, captured);
        this.set('point', null);

        await render(hbs`{{capture-value (point-to-coordinates this.point)}}{{capture-value (point-to-coordinates this.missing)}}`);

        assert.deepEqual(captured[0], [0, 0], 'null point falls back to zero');
        assert.deepEqual(captured[1], [0, 0], 'undefined point falls back to zero');
    });

    test('it falls back to the null island when coordinates are not an array', async function (assert) {
        const captured = [];
        registerCapture(this.owner, captured);
        this.set('point', { coordinates: '13.405,52.52' });

        await render(hbs`{{capture-value (point-to-coordinates this.point)}}`);

        assert.deepEqual(captured[0], [0, 0]);
    });

    test('it yields undefined members for an empty coordinates array', async function (assert) {
        const captured = [];
        registerCapture(this.owner, captured);
        this.set('point', { coordinates: [] });

        await render(hbs`{{capture-value (point-to-coordinates this.point)}}`);

        assert.deepEqual(captured[0], [undefined, undefined], 'destructuring an empty array yields undefined members');
    });

    test('it accepts an ember array of coordinates', async function (assert) {
        const captured = [];
        registerCapture(this.owner, captured);
        this.set('point', { coordinates: A([-80.191788, 25.761681]) });

        await render(hbs`{{capture-value (point-to-coordinates this.point)}}`);

        assert.deepEqual(captured[0], [25.761681, -80.191788]);
    });

    test('it preserves zero and negative coordinate values', async function (assert) {
        const captured = [];
        registerCapture(this.owner, captured);
        this.set('point', { coordinates: [0, -33.8688] });

        await render(hbs`{{capture-value (point-to-coordinates this.point)}}`);

        assert.deepEqual(captured[0], [-33.8688, 0]);
    });
});
