import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

const POINT_MODULE = '@fleetbase/fleetops-data/utils/geojson/point';

/**
 * The helper narrows its input with `instanceof Point`, where `Point` comes from
 * `@fleetbase/fleetops-data` — a package the dummy app does not depend on. When the module is
 * not present in the loader, register a minimal stand-in that matches the real class' construction
 * contract, so the tests exercise the helper against the exact class it imports.
 */
function resolvePointClass() {
    if (!window.requirejs.entries[POINT_MODULE]) {
        window.define(POINT_MODULE, ['exports'], function (exports) {
            class Point {
                constructor(input) {
                    const args = Array.prototype.slice.call(arguments);

                    if (input && input.type === 'Point' && input.coordinates) {
                        Object.assign(this, input);
                    } else if (Array.isArray(input)) {
                        this.coordinates = input;
                    } else if (args.length >= 2) {
                        this.coordinates = args;
                    } else {
                        throw new Error('GeoJSON: invalid input for new Point');
                    }

                    this.type = 'Point';
                }
            }

            exports.default = Point;
        });
    }

    return require(POINT_MODULE).default;
}

module('Integration | Helper | point-coordinates', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        this.Point = resolvePointClass();
    });

    test('it renders a Point as latitude then longitude separated by a space', async function (assert) {
        this.set('point', new this.Point([-80.191788, 25.761681]));

        await render(hbs`{{point-coordinates this.point}}`);

        assert.dom(this.element).hasText('25.761681 -80.191788');
    });

    test('it renders zero coordinates', async function (assert) {
        this.set('point', new this.Point([0, 0]));

        await render(hbs`{{point-coordinates this.point}}`);

        assert.dom(this.element).hasText('0 0');
    });

    test('it renders negative latitudes and longitudes', async function (assert) {
        this.set('point', new this.Point([-179.9999, -89.5]));

        await render(hbs`{{point-coordinates this.point}}`);

        assert.dom(this.element).hasText('-89.5 -179.9999');
    });

    test('it ignores extra coordinate dimensions such as altitude', async function (assert) {
        this.set('point', new this.Point([103.851959, 1.29027, 42]));

        await render(hbs`{{point-coordinates this.point}}`);

        assert.dom(this.element).hasText('1.29027 103.851959');
    });

    test('it accepts a Point constructed from a geojson literal', async function (assert) {
        this.set('point', new this.Point({ type: 'Point', coordinates: [13.405, 52.52] }));

        await render(hbs`{{point-coordinates this.point}}`);

        assert.dom(this.element).hasText('52.52 13.405');
    });

    test('it rejects a plain object that only looks like a point', async function (assert) {
        this.set('point', { type: 'Point', coordinates: [13.405, 52.52] });

        await render(hbs`{{point-coordinates this.point}}`);

        assert.dom(this.element).hasText('Invalid coordinates');
    });

    test('it rejects a bare coordinate array', async function (assert) {
        this.set('point', [13.405, 52.52]);

        await render(hbs`{{point-coordinates this.point}}`);

        assert.dom(this.element).hasText('Invalid coordinates');
    });

    test('it rejects null, undefined and strings', async function (assert) {
        this.set('nullValue', null);
        this.set('string', '13.405,52.52');

        await render(hbs`{{point-coordinates this.nullValue}}|{{point-coordinates this.missing}}|{{point-coordinates this.string}}`);

        assert.dom(this.element).hasText('Invalid coordinates|Invalid coordinates|Invalid coordinates');
    });
});
