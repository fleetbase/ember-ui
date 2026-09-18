import { module, test } from 'qunit';
import { setupTest } from 'dummy/tests/helpers';

// A stand-in for the real Leaflet global. No script is ever loaded and no tile is
// ever requested; the service only cares that `window.L` is a non-null object.
function fakeLeaflet(name) {
    return { name, map: () => ({}) };
}

module('Unit | Service | leaflet', function (hooks) {
    setupTest(hooks);

    hooks.beforeEach(function () {
        this.originalL = window.L;
        this.originalLeaflet = window.leaflet;
        this.originalSetInterval = window.setInterval;
        this.originalClearTimeout = window.clearTimeout;

        delete window.L;
        delete window.leaflet;

        this.ticks = [];
        this.cleared = [];

        // Replace the timer boundary so the polling loop is driven by the test.
        window.setInterval = (callback) => {
            this.ticks.push(callback);
            return 4242;
        };
        window.clearTimeout = (id) => {
            this.cleared.push(id);
        };

        this.service = this.owner.lookup('service:leaflet');

        // Drives the most recently registered polling callback.
        this.tick = (times = 1) => {
            const callback = this.ticks[this.ticks.length - 1];
            for (let i = 0; i < times; i++) {
                callback();
            }
        };
    });

    hooks.afterEach(function () {
        window.setInterval = this.originalSetInterval;
        window.clearTimeout = this.originalClearTimeout;

        if (this.originalL === undefined) {
            delete window.L;
        } else {
            window.L = this.originalL;
        }

        if (this.originalLeaflet === undefined) {
            delete window.leaflet;
        } else {
            window.leaflet = this.originalLeaflet;
        }
    });

    test('it starts uninitialized with no instances', function (assert) {
        assert.deepEqual(this.service.instances, []);
        assert.false(this.service.initialized);
        assert.strictEqual(this.service.instance, undefined);
        assert.strictEqual(this.service.initializationId, undefined);
    });

    test('setInstance publishes the instance on the service and both globals', function (assert) {
        const leaflet = fakeLeaflet('primary');

        this.service.setInstance(leaflet);

        assert.strictEqual(this.service.instance, leaflet);
        assert.strictEqual(window.L, leaflet, 'window.L is aliased');
        assert.strictEqual(window.leaflet, leaflet, 'window.leaflet is aliased');
    });

    test('getInstance prefers the tracked instance', function (assert) {
        const tracked = fakeLeaflet('tracked');
        this.service.instance = tracked;
        window.L = fakeLeaflet('global');

        assert.strictEqual(this.service.getInstance(), tracked);
    });

    test('getInstance falls back to the window globals', function (assert) {
        const global = fakeLeaflet('global');
        window.L = global;

        assert.strictEqual(this.service.getInstance(), global, 'window.L is used when nothing is tracked');

        delete window.L;
        window.leaflet = global;

        assert.strictEqual(this.service.getInstance(), global, 'window.leaflet is the last resort');
    });

    test('getInstance returns undefined when Leaflet is absent everywhere', function (assert) {
        assert.strictEqual(this.service.getInstance(), undefined);
    });

    test('load starts a polling interval and records its id', function (assert) {
        this.service.load();

        assert.strictEqual(this.ticks.length, 1, 'exactly one interval is started');
        assert.strictEqual(this.service.initializationId, 4242, 'the timer id is retained for cleanup');
        assert.false(this.service.initialized, 'nothing is initialized before the first tick');
    });

    test('polling stays uninitialized while no Leaflet global exists', function (assert) {
        this.service.load();
        this.tick(5);

        assert.false(this.service.initialized);
        assert.strictEqual(this.service.instance, undefined);
        assert.deepEqual(this.service.instances, []);
    });

    test('the first tick that sees a Leaflet global initializes the service', function (assert) {
        this.service.load();
        window.L = fakeLeaflet('first');

        this.tick();

        assert.true(this.service.initialized);
        assert.strictEqual(this.service.instance.name, 'first');
        assert.strictEqual(window.leaflet, this.service.instance, 'both globals are aliased to the instance');
        assert.deepEqual(this.service.instances, [], 'the first load is not recorded as a re-initialization');
    });

    test('a non-object Leaflet global is ignored', function (assert) {
        this.service.load();
        window.L = function LeafletFn() {};

        this.tick();

        assert.false(this.service.initialized, 'only object globals count as Leaflet');
    });

    test('further ticks with the same global change nothing', function (assert) {
        this.service.load();
        const leaflet = fakeLeaflet('first');
        window.L = leaflet;

        this.tick(4);

        assert.true(this.service.initialized);
        assert.strictEqual(this.service.instance, leaflet, 'the instance is stable');
        assert.deepEqual(this.service.instances, [], 'no re-initializations are recorded');
    });

    test('a replacement global is recorded and the original instance is re-pinned', function (assert) {
        this.service.load();
        const first = fakeLeaflet('first');
        window.L = first;
        this.tick();

        window.L = fakeLeaflet('second');
        this.tick();

        assert.strictEqual(this.service.instance, first, 'the service keeps the instance it initialized with');
        assert.strictEqual(window.L, first, 'and restores window.L to it');
        assert.strictEqual(this.service.instances.length, 1, 'the re-initialization is recorded once');
    });

    test('onReady fires once after twenty ticks and clears the timer', function (assert) {
        const readyWith = [];
        this.service.load({ onReady: (instance) => readyWith.push(instance) });

        const leaflet = fakeLeaflet('first');
        window.L = leaflet;

        this.tick(19);
        assert.deepEqual(readyWith, [], 'onReady has not fired yet at nineteen ticks');
        assert.deepEqual(this.cleared, [], 'and the timer is still running');

        this.tick();

        assert.strictEqual(readyWith.length, 1, 'onReady fires exactly once');
        assert.strictEqual(readyWith[0], leaflet, 'it receives the resolved Leaflet instance');
        assert.deepEqual(this.cleared, [4242], 'the polling timer is cleared by its id');
    });

    test('onReady receives undefined when Leaflet never appears', function (assert) {
        const readyWith = [];
        this.service.load({ onReady: (instance) => readyWith.push(instance) });

        this.tick(20);

        assert.strictEqual(readyWith.length, 1);
        assert.strictEqual(readyWith[0], undefined, 'the callback still runs so callers can handle failure');
        assert.deepEqual(this.cleared, [4242]);
    });

    test('load tolerates a missing options object and a non-function onReady', function (assert) {
        this.service.load();
        window.L = fakeLeaflet('first');

        this.tick(20);
        assert.deepEqual(this.cleared, [4242], 'the timer is still cleared without an onReady callback');

        this.cleared.length = 0;
        this.service.load({ onReady: 'not a function' });
        this.tick(20);

        assert.strictEqual(this.cleared.length, 1, 'a non-callable onReady is skipped rather than invoked');
    });

    test('the counter is per-load, so a second load gets its own countdown', function (assert) {
        const readyWith = [];
        this.service.load({ onReady: () => readyWith.push('first-load') });
        this.tick(20);

        assert.deepEqual(readyWith, ['first-load']);

        this.service.load({ onReady: () => readyWith.push('second-load') });

        this.tick(19);
        assert.deepEqual(readyWith, ['first-load'], 'the second load restarts the count');

        this.tick();
        assert.deepEqual(readyWith, ['first-load', 'second-load']);
    });

    test('ticks past the twentieth do not re-fire onReady', function (assert) {
        let readyCount = 0;
        this.service.load({ onReady: () => readyCount++ });

        this.tick(25);

        assert.strictEqual(readyCount, 1, 'the callback is guarded by an exact tick count');
    });
    test('an instance already set is kept, and the service still finishes initializing', function (assert) {
        const existing = fakeLeaflet('preset');
        this.service.instance = existing;
        this.service.load();
        window.L = fakeLeaflet('later');

        this.tick();
        this.tick();

        assert.strictEqual(this.service.instance, existing, 'the preset instance is kept');
        assert.true(this.service.initialized, 'and the poll is marked done rather than running forever');
        assert.strictEqual(this.service.instances.length, 1, 'a later global is now noticed as a re-initialization instead of being ignored forever');
    });
});
