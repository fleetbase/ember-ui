import { module, test } from 'qunit';
import { setupTest } from 'dummy/tests/helpers';

function type(label, value, icon = 'box') {
    return { label, value, icon };
}

module('Unit | Service | template-builder', function (hooks) {
    setupTest(hooks);

    hooks.beforeEach(function () {
        this.service = this.owner.lookup('service:template-builder');
    });

    test('it starts with no registered resource types', function (assert) {
        assert.deepEqual(this.service.resourceTypes, []);
    });

    test('registering adds the types in order', function (assert) {
        this.service.registerResourceTypes([type('Order', 'Models\\Order'), type('Driver', 'Models\\Driver')]);

        assert.deepEqual(
            this.service.resourceTypes.map((t) => t.label),
            ['Order', 'Driver']
        );
    });

    test('registering appends rather than replacing', function (assert) {
        this.service.registerResourceTypes([type('Order', 'Models\\Order')]);
        this.service.registerResourceTypes([type('Driver', 'Models\\Driver')]);

        assert.strictEqual(this.service.resourceTypes.length, 2, 'a second extension adds to the first');
    });

    test('duplicate values are ignored', function (assert) {
        this.service.registerResourceTypes([type('Order', 'Models\\Order')]);
        this.service.registerResourceTypes([type('Order Renamed', 'Models\\Order')]);

        assert.strictEqual(this.service.resourceTypes.length, 1, 'the value is the identity');
        assert.strictEqual(this.service.resourceTypes[0].label, 'Order', 'the first registration wins');
    });

    test('duplicates within a single call are still added once each', function (assert) {
        this.service.registerResourceTypes([type('Order', 'Models\\Order'), type('Driver', 'Models\\Driver')]);

        assert.strictEqual(this.service.resourceTypes.length, 2);
    });

    test('types without a value are rejected', function (assert) {
        this.service.registerResourceTypes([{ label: 'No value', icon: 'box' }, type('Ok', 'Models\\Ok')]);

        assert.deepEqual(
            this.service.resourceTypes.map((t) => t.value),
            ['Models\\Ok'],
            'a type with no value cannot be identified so it is dropped'
        );
    });

    test('registering an empty list is a no-op', function (assert) {
        this.service.registerResourceTypes([type('Order', 'Models\\Order')]);
        this.service.registerResourceTypes([]);

        assert.strictEqual(this.service.resourceTypes.length, 1);
    });

    test('registering with no argument is a no-op', function (assert) {
        this.service.registerResourceTypes();

        assert.deepEqual(this.service.resourceTypes, []);
    });

    test('registering only duplicates leaves the list identical', function (assert) {
        this.service.registerResourceTypes([type('Order', 'Models\\Order')]);
        const before = this.service.resourceTypes;

        this.service.registerResourceTypes([type('Order', 'Models\\Order')]);

        assert.strictEqual(this.service.resourceTypes, before, 'the tracked array is not reassigned when nothing is new');
    });

    test('unregistering removes the named values', function (assert) {
        this.service.registerResourceTypes([type('Order', 'Models\\Order'), type('Driver', 'Models\\Driver')]);

        this.service.unregisterResourceTypes(['Models\\Order']);

        assert.deepEqual(
            this.service.resourceTypes.map((t) => t.label),
            ['Driver']
        );
    });

    test('unregistering several values at once', function (assert) {
        this.service.registerResourceTypes([type('A', 'a'), type('B', 'b'), type('C', 'c')]);

        this.service.unregisterResourceTypes(['a', 'c']);

        assert.deepEqual(
            this.service.resourceTypes.map((t) => t.value),
            ['b']
        );
    });

    test('unregistering an unknown value leaves the list untouched', function (assert) {
        this.service.registerResourceTypes([type('Order', 'Models\\Order')]);

        this.service.unregisterResourceTypes(['Models\\Nope']);

        assert.strictEqual(this.service.resourceTypes.length, 1);
    });

    test('unregistering with no argument is a no-op', function (assert) {
        this.service.registerResourceTypes([type('Order', 'Models\\Order')]);

        this.service.unregisterResourceTypes();

        assert.strictEqual(this.service.resourceTypes.length, 1);
    });

    test('a value can be re-registered after being unregistered', function (assert) {
        this.service.registerResourceTypes([type('Order', 'Models\\Order')]);
        this.service.unregisterResourceTypes(['Models\\Order']);
        this.service.registerResourceTypes([type('Order Again', 'Models\\Order')]);

        assert.deepEqual(
            this.service.resourceTypes.map((t) => t.label),
            ['Order Again'],
            'removal clears the duplicate guard'
        );
    });

    test('resourceTypes reflects the backing list without copying it', function (assert) {
        this.service.registerResourceTypes([type('Order', 'Models\\Order')]);

        assert.strictEqual(this.service.resourceTypes, this.service._resourceTypes);
    });

    test('it is a singleton within one owner', function (assert) {
        this.service.registerResourceTypes([type('Order', 'Models\\Order')]);

        assert.strictEqual(this.owner.lookup('service:template-builder').resourceTypes.length, 1, 'a second lookup sees the same registrations');
    });
});
