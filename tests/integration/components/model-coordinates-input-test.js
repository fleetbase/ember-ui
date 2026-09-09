import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, fillIn, settled, find } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import Service from '@ember/service';

// A stand-in for an Ember Data record: the component only calls setProperties on it.
function modelFixture(attrs = {}) {
    return {
        ...attrs,
        setProperties(properties) {
            Object.assign(this, properties);
        },
    };
}

module('Integration | Component | model-coordinates-input', function (hooks) {
    setupRenderingTest(hooks);

    let requests;
    let respondWith;
    let inputApi;

    hooks.beforeEach(function () {
        requests = [];
        respondWith = () => Promise.resolve({ address: '1 Main St', city: 'Springfield' });
        inputApi = null;

        this.owner.unregister('service:fetch');
        this.owner.register(
            'service:fetch',
            class extends Service {
                get(endpoint, params) {
                    requests.push({ endpoint, params });
                    return respondWith();
                }
            }
        );

        this.set('model', modelFixture());
        this.set('onInputReady', (api) => (inputApi = api));
    });

    const TEMPLATE = hbs`
        <ModelCoordinatesInput
            @model={{this.model}}
            @locationProperty={{this.locationProperty}}
            @autocomplete={{this.autocomplete}}
            @disabled={{this.disabled}}
            @onChange={{this.onChange}}
            @onAutocomplete={{this.onAutocomplete}}
            @onReverseGeocode={{this.onReverseGeocode}}
            @onInputReady={{this.onInputReady}}
        />
    `;

    function latitudeField() {
        return find('[aria-label="Latitude"]');
    }

    function longitudeField() {
        return find('[aria-label="Longitude"]');
    }

    module('rendering', function () {
        test('it renders a coordinates input', async function (assert) {
            await render(TEMPLATE);

            assert.dom('.coordinates-input').exists();
            assert.ok(latitudeField(), 'a latitude field is offered');
            assert.ok(longitudeField(), 'a longitude field is offered');
        });

        test('it hands the inner input api to the caller', async function (assert) {
            await render(TEMPLATE);

            assert.ok(inputApi, 'onInputReady receives the coordinates input');
            assert.strictEqual(typeof inputApi.updateCoordinates, 'function');
        });

        test('a disabled input disables both fields', async function (assert) {
            this.set('disabled', true);

            await render(TEMPLATE);

            assert.dom(latitudeField()).isDisabled();
            assert.dom(longitudeField()).isDisabled();
        });

        test('it renders without any callbacks', async function (assert) {
            await render(hbs`<ModelCoordinatesInput @model={{this.model}} />`);

            assert.dom('.coordinates-input').exists();
        });
    });

    module('updating coordinates', function () {
        test('updating the coordinates writes a point onto the model', async function (assert) {
            const changes = [];
            this.set('onChange', (...args) => changes.push(args));

            await render(TEMPLATE);

            inputApi.updateCoordinates(40.7, -74);
            await settled();

            const location = this.model.location;
            assert.ok(location, 'a location is written to the model');
            assert.deepEqual(location.coordinates, [-74, 40.7], 'stored as [longitude, latitude]');
            assert.true(changes.length > 0, 'the change is reported');
        });

        test('typing into the coordinate fields writes through to the model', async function (assert) {
            const changes = [];
            this.set('onChange', (...args) => changes.push(args));

            await render(TEMPLATE);
            await fillIn(latitudeField(), '40.7');
            await fillIn(longitudeField(), '-74.0');

            assert.true(changes.length > 0, 'the change is reported');
            const location = this.model.location;
            assert.ok(location, 'a location is written to the model');
            assert.deepEqual(location.coordinates, ['-74.0', '40.7'], 'stored as [longitude, latitude]');
        });

        test('a custom location property is honoured', async function (assert) {
            this.set('locationProperty', 'pickup');

            await render(TEMPLATE);

            inputApi.updateCoordinates(40.7, -74);
            await settled();

            assert.ok(this.model.pickup, 'the configured property is written');
            assert.notOk(this.model.location, 'the default property is left alone');
        });

        test('it updates without an onChange handler', async function (assert) {
            await render(hbs`<ModelCoordinatesInput @model={{this.model}} @onInputReady={{this.onInputReady}} />`);

            inputApi.updateCoordinates(40.7, -74);
            await settled();

            assert.ok(this.model.location, 'the model is still updated');
        });
    });

    module('autocomplete', function () {
        const SELECTED = { location: { type: 'Point', coordinates: [-74, 40.7] }, address: '1 Main St', city: 'Springfield' };

        test('location mode copies only the location', async function (assert) {
            this.set('autocomplete', 'location');

            await render(TEMPLATE);

            inputApi.args.onGeocode(SELECTED);
            await settled();

            assert.deepEqual(this.model.location.coordinates, SELECTED.location.coordinates, 'the location is copied across');
            assert.notOk(this.model.address, 'other fields are left alone');
        });

        test('location mode honours a custom location property', async function (assert) {
            this.set('autocomplete', 'location');
            this.set('locationProperty', 'pickup');

            await render(TEMPLATE);

            inputApi.args.onGeocode(SELECTED);
            await settled();

            assert.deepEqual(this.model.pickup.coordinates, SELECTED.location.coordinates);
        });

        test('all mode copies every selected field onto the model', async function (assert) {
            this.set('autocomplete', 'all');

            await render(TEMPLATE);

            inputApi.args.onGeocode(SELECTED);
            await settled();

            assert.strictEqual(this.model.address, '1 Main St');
            assert.strictEqual(this.model.city, 'Springfield');
        });

        test('autocomplete true behaves like all', async function (assert) {
            this.set('autocomplete', true);

            await render(TEMPLATE);

            inputApi.args.onGeocode(SELECTED);
            await settled();

            assert.strictEqual(this.model.address, '1 Main St');
        });

        test('the selection is reported to the caller', async function (assert) {
            const seen = [];
            this.set('autocomplete', 'all');
            this.set('onAutocomplete', (selected) => seen.push(selected));

            await render(TEMPLATE);

            inputApi.args.onGeocode(SELECTED);
            await settled();

            assert.deepEqual(seen, [SELECTED]);
        });

        test('with no autocomplete mode only the coordinates are synced', async function (assert) {
            await render(TEMPLATE);

            inputApi.args.onGeocode(SELECTED);
            await settled();

            assert.notOk(this.model.address, 'no arbitrary fields are copied');
            assert.deepEqual(this.model.location.coordinates, SELECTED.location.coordinates, 'the map selection still moves the point');
        });
    });

    module('reverse geocoding', function () {
        test('moving the marker looks the position up and copies the result', async function (assert) {
            await render(TEMPLATE);

            await inputApi.args.onUpdatedFromMap({ latitude: 40.7, longitude: -74 });
            await settled();

            assert.strictEqual(requests.length, 1);
            assert.strictEqual(requests[0].endpoint, 'geocoder/reverse');
            assert.strictEqual(requests[0].params.coordinates, '40.7,-74');
            assert.true(requests[0].params.single);
            assert.strictEqual(this.model.address, '1 Main St', 'the resolved address is copied onto the model');
        });

        test('the lookup is reported to the caller', async function (assert) {
            const seen = [];
            this.set('onReverseGeocode', (position) => seen.push(position));

            await render(TEMPLATE);

            await inputApi.args.onUpdatedFromMap({ latitude: 40.7, longitude: -74 });
            await settled();

            assert.strictEqual(seen.length, 1);
        });

        test('a failed lookup leaves the model untouched', async function (assert) {
            respondWith = () => Promise.reject(new Error('offline'));

            await render(TEMPLATE);

            await inputApi.args.onUpdatedFromMap({ latitude: 40.7, longitude: -74 });
            await settled();

            assert.notOk(this.model.address, 'nothing is written');
            assert.dom('.coordinates-input').exists('and the component survives');
        });

        test('an empty response is absorbed', async function (assert) {
            respondWith = () => Promise.resolve(null);

            await render(TEMPLATE);

            await inputApi.args.onUpdatedFromMap({ latitude: 40.7, longitude: -74 });
            await settled();

            assert.dom('.coordinates-input').exists();
        });
    });
});
