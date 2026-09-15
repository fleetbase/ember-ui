import { module, test } from 'qunit';
import { setupTest } from 'dummy/tests/helpers';
import Service from '@ember/service';
import ObjectProxy from '@ember/object/proxy';
import { hbs } from 'ember-cli-htmlbars';
import {
    registerResourceDescriptor,
    registerResourceDescriptors,
    setResourceOpener,
    getResourceDescriptors,
    getResourceDescriptor,
    resolveResourceKey,
    resourceComponentName,
    isComponentResolvable,
    relationValue,
    safeIdentifier,
    isUuidValue,
    unwrapResource,
    canOpenResource,
    openResource,
    readDescriptor,
    SUBTYPE_PREFIXES,
} from '@fleetbase/ember-ui/utils/resource-registry';

class VehicleModel {
    static modelName = 'vehicle';
    constructor(attrs = {}) {
        Object.assign(this, attrs);
    }
}

class MaintenanceSubjectVehicleModel {
    static modelName = 'maintenance-subject-vehicle';
    constructor(attrs = {}) {
        Object.assign(this, attrs);
    }
}

function fakeOwner(services = {}) {
    return {
        lookup(name) {
            return services[name] ?? null;
        },
    };
}

module('Unit | Utility | resource-registry', function (hooks) {
    setupTest(hooks);

    test('it normalizes descriptors on registration and rejects junk', function (assert) {
        const [vehicle, driver] = registerResourceDescriptors(this.owner, [
            {
                key: 'vehicle',
                aliases: ['attachable-vehicle', ' '],
                modelNames: ['maintenance-subject-vehicle'],
                polymorphicTypes: ['fleet-ops:vehicle', 'Fleetbase\\FleetOps\\Models\\Vehicle'],
            },
            { key: 'driver', components: { pill: 'custom/driver-pill', 'select-option': 'custom/driver-option' }, icon: 'id-card', labelKey: 'x.driver' },
            { nokey: true },
            null,
            { key: '   ' },
        ]);

        assert.strictEqual(vehicle.key, 'vehicle');
        assert.deepEqual(vehicle.aliases, ['attachable-vehicle']);
        assert.deepEqual(vehicle.modelNames, ['vehicle', 'maintenance-subject-vehicle']);
        assert.deepEqual(vehicle.polymorphicTypes, ['fleet-ops:vehicle', 'Fleetbase\\FleetOps\\Models\\Vehicle']);
        assert.strictEqual(vehicle.labelKey, 'resource.vehicle');
        assert.strictEqual(vehicle.icon, 'cube');
        assert.deepEqual(vehicle.components, { pill: 'vehicle/pill', summary: 'vehicle/summary', identity: 'table/cell/vehicle-identity', selectOption: 'select-option/vehicle' });
        assert.deepEqual(vehicle.statusTones, {});
        assert.strictEqual(driver.components.pill, 'custom/driver-pill');
        assert.strictEqual(driver.components.selectOption, 'custom/driver-option');
        assert.strictEqual(driver.icon, 'id-card');
        assert.strictEqual(driver.labelKey, 'x.driver');
        assert.strictEqual(getResourceDescriptors(this.owner).length, 2);

        const replaced = registerResourceDescriptor(this.owner, { key: 'driver', icon: 'user' });
        assert.strictEqual(replaced.icon, 'user');
        assert.strictEqual(getResourceDescriptors(this.owner).length, 2, 'the same key replaces');
        assert.strictEqual(getResourceDescriptor(this.owner, 'driver').icon, 'user');
        assert.deepEqual(
            registerResourceDescriptors(this.owner, { key: 'single' }).map((d) => d.key),
            ['single'],
            'a single descriptor is accepted'
        );
        assert.strictEqual(registerResourceDescriptor(this.owner, null), null);
        assert.deepEqual(registerResourceDescriptors(null, [{ key: 'nowhere' }]), [], 'no owner, no registration');
    });

    test('it resolves keys from every accepted input form', function (assert) {
        registerResourceDescriptors(this.owner, [
            { key: 'vehicle', aliases: ['attachable-vehicle'], modelNames: ['maintenance-subject-vehicle'], polymorphicTypes: ['fleet-ops:vehicle', 'Fleetbase\\FleetOps\\Models\\Vehicle'] },
            { key: 'driver' },
            { key: 'integrated-vendor' },
        ]);

        assert.strictEqual(resolveResourceKey(this.owner, 'vehicle'), 'vehicle', 'key');
        assert.strictEqual(resolveResourceKey(this.owner, ' Vehicle '), 'vehicle', 'trimmed and lowercased');
        assert.strictEqual(resolveResourceKey(this.owner, 'attachable-vehicle'), 'vehicle', 'alias');
        assert.strictEqual(resolveResourceKey(this.owner, 'maintenance-subject-vehicle'), 'vehicle', 'model name');
        assert.strictEqual(resolveResourceKey(this.owner, 'fleet-ops:vehicle'), 'vehicle', 'polymorphic prefix:key');
        assert.strictEqual(resolveResourceKey(this.owner, 'Fleetbase\\FleetOps\\Models\\Vehicle'), 'vehicle', 'PHP class');
        assert.strictEqual(resolveResourceKey(this.owner, 'fleetbase\\fleetops\\models\\vehicle'), 'vehicle', 'PHP class, any case');
        assert.strictEqual(resolveResourceKey(this.owner, 'App\\Models\\IntegratedVendor'), 'integrated-vendor', 'PHP class basename is dasherized');
        assert.strictEqual(resolveResourceKey(this.owner, 'facilitator-driver'), 'driver', 'subtype prefix stripped');
        assert.strictEqual(resolveResourceKey(this.owner, 'customer-driver'), 'driver');
        assert.strictEqual(resolveResourceKey(this.owner, 'maintenance-subject-driver'), 'driver');
        assert.strictEqual(resolveResourceKey(this.owner, 'attachable-driver'), 'driver');
        assert.strictEqual(resolveResourceKey(this.owner, 'facilitator-nothing'), null, 'a stripped prefix still needs a match');
        assert.strictEqual(resolveResourceKey(this.owner, new VehicleModel()), 'vehicle', 'record');
        assert.strictEqual(resolveResourceKey(this.owner, ObjectProxy.create({ content: new VehicleModel() })), 'vehicle', 'proxied record');
        assert.strictEqual(resolveResourceKey(this.owner, ObjectProxy.create({ content: null })), null, 'empty proxy');
        assert.strictEqual(resolveResourceKey(this.owner, { resourceType: 'driver' }), 'driver', 'stub resourceType');
        assert.strictEqual(resolveResourceKey(this.owner, { resource_type: 'fleet-ops:driver' }), 'driver', 'stub resource_type');
        assert.strictEqual(resolveResourceKey(this.owner, { modelName: 'driver', resource: {} }), 'driver', 'wrapper modelName');
        assert.strictEqual(resolveResourceKey(this.owner, { name: 'nothing' }), null, 'unknown object');
        assert.strictEqual(resolveResourceKey(this.owner, 'nothing'), null, 'unknown string');
        assert.strictEqual(resolveResourceKey(this.owner, ''), null);
        assert.strictEqual(resolveResourceKey(this.owner, 42), null);
        assert.strictEqual(resolveResourceKey(this.owner, null), null);
        assert.strictEqual(resolveResourceKey(null, 'vehicle'), null, 'no owner');
        assert.strictEqual(getResourceDescriptor(this.owner, 'nothing'), null);
        assert.deepEqual(SUBTYPE_PREFIXES, ['facilitator-', 'maintenance-subject-', 'customer-', 'attachable-']);
    });

    test('it stores descriptors in a per-owner fallback when there is no universe registry', function (assert) {
        const owner = fakeOwner();
        const other = fakeOwner();

        assert.strictEqual(resolveResourceKey(owner, 'vehicle'), null, 'empty before registration');
        registerResourceDescriptors(owner, [{ key: 'vehicle' }]);
        registerResourceDescriptors(owner, [{ key: 'vehicle', icon: 'truck' }]);
        assert.strictEqual(resolveResourceKey(owner, 'vehicle'), 'vehicle');
        assert.strictEqual(getResourceDescriptor(owner, 'vehicle').icon, 'truck', 'replaced in place');
        assert.strictEqual(getResourceDescriptors(owner).length, 1);
        assert.strictEqual(resolveResourceKey(other, 'vehicle'), null, 'another owner has its own store');
        assert.deepEqual(getResourceDescriptors(null), []);

        const throwing = {
            lookup() {
                throw new Error('no container');
            },
        };
        registerResourceDescriptors(throwing, [{ key: 'driver' }]);
        assert.strictEqual(resolveResourceKey(throwing, 'driver'), 'driver', 'a throwing lookup falls back too');
    });

    test('it uses the universe registry service when the owner provides one', function (assert) {
        registerResourceDescriptors(this.owner, [{ key: 'vehicle' }]);
        const registry = this.owner.lookup('service:universe/registry-service');

        assert.ok(registry.calls.some((call) => call.method === 'register' && call.args[0] === 'resource-identity' && call.args[2] === 'vehicle'));
        assert.strictEqual(registry.lookup('resource-identity', 'descriptors', 'vehicle').key, 'vehicle');
    });

    test('setResourceOpener lets another package supply how a resource opens', async function (assert) {
        registerResourceDescriptors(this.owner, [{ key: 'user' }]);
        const record = { resourceType: 'user' };

        assert.false(canOpenResource(this.owner, record), 'nothing to open yet');
        assert.false(setResourceOpener(this.owner, 'nothing', () => true));
        assert.true(setResourceOpener(this.owner, 'user', () => 'opened', { permission: 'iam view user', canOpen: () => true }));
        assert.strictEqual(getResourceDescriptor(this.owner, 'user').permission, 'iam view user');
        assert.true(canOpenResource(this.owner, record));
        assert.true(await openResource(this.owner, record));
    });

    test('resourceComponentName returns a name only for a known resource and a resolvable component', function (assert) {
        registerResourceDescriptors(this.owner, [{ key: 'vehicle', components: { summary: () => {} } }, { key: 'driver' }]);
        this.owner.register('template:components/vehicle/pill', hbs`x`);
        this.owner.register('template:components/select-option/vehicle', hbs`x`);

        assert.strictEqual(resourceComponentName(this.owner, 'pill', 'vehicle'), 'vehicle/pill');
        assert.strictEqual(resourceComponentName(this.owner, 'select-option', 'vehicle'), 'select-option/vehicle');
        assert.strictEqual(resourceComponentName(this.owner, 'selectOption', 'vehicle'), 'select-option/vehicle');
        assert.strictEqual(typeof resourceComponentName(this.owner, 'summary', 'vehicle'), 'function', 'a component class passes through');
        assert.strictEqual(resourceComponentName(this.owner, 'identity', 'vehicle'), null, 'not resolvable in this owner');
        assert.strictEqual(resourceComponentName(this.owner, 'pill', 'driver'), null, 'default name does not resolve');
        assert.strictEqual(resourceComponentName(this.owner, 'pill', 'nothing'), null, 'unknown resource');
        assert.strictEqual(resourceComponentName(this.owner, 'nope', 'vehicle'), null, 'unknown kind');
    });

    test('isComponentResolvable covers every input shape', function (assert) {
        this.owner.register('template:components/known-thing', hbs`x`);
        assert.false(isComponentResolvable(this.owner, null));
        assert.false(isComponentResolvable(this.owner, ''));
        assert.true(isComponentResolvable(this.owner, () => {}));
        assert.true(isComponentResolvable(this.owner, {}));
        assert.true(isComponentResolvable(this.owner, 'known-thing'));
        assert.false(isComponentResolvable(this.owner, 'unknown-thing'));
        assert.false(isComponentResolvable(null, 'known-thing'));
        assert.false(
            isComponentResolvable(
                {
                    factoryFor() {
                        throw new Error('boom');
                    },
                },
                'known-thing'
            ),
            'a throwing owner is treated as unresolvable'
        );
        assert.true(
            isComponentResolvable(
                {
                    factoryFor: () => ({}),
                },
                'anything'
            ),
            'factoryFor alone is enough'
        );
    });

    test('relationValue never returns a proxy', function (assert) {
        const driver = { name: 'Ada' };
        const model = {
            belongsTo(name) {
                if (name === 'driver') {
                    return { value: () => driver };
                }

                if (name === 'vendor') {
                    return { value: () => null };
                }

                throw new Error(`${name} is not a belongsTo`);
            },
            hasMany(name) {
                if (name === 'trailers') {
                    return { value: () => ['t1'] };
                }

                if (name === 'devices') {
                    return { value: () => null };
                }

                throw new Error(`${name} is not a hasMany`);
            },
            plain: 'value',
            promised: { then() {}, content: driver },
            empty: { then() {}, content: null },
        };

        assert.strictEqual(relationValue(model, 'driver'), driver);
        assert.strictEqual(relationValue(model, 'vendor'), null);
        assert.deepEqual(relationValue(model, 'trailers'), ['t1']);
        assert.strictEqual(relationValue(model, 'devices'), null);
        assert.strictEqual(relationValue(model, 'plain'), 'value');
        assert.strictEqual(relationValue(model, 'promised'), driver, 'a promise proxy yields its content');
        assert.strictEqual(relationValue(model, 'empty'), null);
        assert.strictEqual(relationValue(model, 'missing'), null);
        assert.strictEqual(relationValue({ driver }, 'driver'), driver, 'plain objects use get');
        assert.strictEqual(relationValue(ObjectProxy.create({ content: { driver } }), 'driver'), driver, 'a proxied record is unwrapped first');
        assert.strictEqual(relationValue(ObjectProxy.create({ content: null }), 'driver'), null);
        assert.strictEqual(relationValue({ driver: ObjectProxy.create({ content: driver }) }, 'driver'), driver, 'a proxied value is unwrapped');
        assert.strictEqual(relationValue(null, 'driver'), null);
        assert.strictEqual(relationValue(model, ''), null);
        assert.strictEqual(relationValue(model, 5), null);
    });

    test('safeIdentifier and isUuidValue drop UUIDs', function (assert) {
        assert.strictEqual(safeIdentifier('ABC-123'), 'ABC-123');
        assert.strictEqual(safeIdentifier(42), 42);
        assert.strictEqual(safeIdentifier(' 9d2c6c5e-1b2a-4c3d-8e4f-1234567890ab '), null);
        assert.strictEqual(safeIdentifier(''), null);
        assert.strictEqual(safeIdentifier('   '), null);
        assert.strictEqual(safeIdentifier(null), null);
        assert.strictEqual(safeIdentifier(undefined), null);
        assert.true(isUuidValue('9d2c6c5e-1b2a-4c3d-8e4f-1234567890ab'));
        assert.false(isUuidValue('vehicle_123'));
        assert.false(isUuidValue(null));
    });

    test('unwrapResource resolves thenables, proxies and stubs', async function (assert) {
        const record = { name: 'Ada' };
        assert.strictEqual(await unwrapResource(record), record);
        assert.strictEqual(await unwrapResource(Promise.resolve(record)), record);
        assert.strictEqual(await unwrapResource(ObjectProxy.create({ content: record })), record);
        assert.strictEqual(await unwrapResource(Promise.resolve(ObjectProxy.create({ content: record }))), record);
        assert.strictEqual(await unwrapResource(ObjectProxy.create({ content: null })), null);
        assert.strictEqual(await unwrapResource({ loadResource: () => Promise.resolve(record) }), record);
        const stub = { loadResource: () => null };
        assert.strictEqual(await unwrapResource(stub), stub, 'a stub that loads nothing stands for itself');
        assert.strictEqual(await unwrapResource(null), null);
        assert.strictEqual(await unwrapResource(undefined), null);

        let nested = record;
        for (let i = 0; i < 10; i++) {
            nested = ObjectProxy.create({ content: nested });
        }
        assert.ok(await unwrapResource(nested), 'deep nesting stops after a bounded number of steps');
    });

    test('canOpenResource checks the open path, the descriptor guard and the permission', function (assert) {
        const abilities = { can: (permission) => permission === 'fleet-ops view vehicle' };
        const owner = fakeOwner({ 'service:abilities': abilities });
        registerResourceDescriptors(owner, [
            { key: 'vehicle', open: () => true, permission: 'fleet-ops view vehicle' },
            { key: 'driver', open: () => true, permission: () => 'fleet-ops view driver' },
            { key: 'trailer', open: () => true, canOpen: (record) => Boolean(record?.id) },
            {
                key: 'device',
                open: () => true,
                canOpen: () => {
                    throw new Error('boom');
                },
            },
            { key: 'place', open: () => true },
            { key: 'zone' },
        ]);

        assert.true(canOpenResource(owner, { resourceType: 'vehicle' }));
        assert.false(canOpenResource(owner, { resourceType: 'driver' }), 'a permission function is evaluated');
        assert.true(canOpenResource(owner, { resourceType: 'trailer', id: 't1' }));
        assert.false(canOpenResource(owner, { resourceType: 'trailer' }), 'canOpen guard');
        assert.true(canOpenResource(owner, ObjectProxy.create({ content: { resourceType: 'trailer', id: 't1' } })), 'proxies are unwrapped for the guard');
        assert.false(canOpenResource(owner, { resourceType: 'device' }), 'a throwing guard denies');
        assert.true(canOpenResource(owner, 'place'), 'no permission means allowed');
        assert.false(canOpenResource(owner, 'zone'), 'no open path');
        assert.false(canOpenResource(owner, 'nothing'));

        const throwingAbilities = fakeOwner({
            'service:abilities': {
                can() {
                    throw new Error('boom');
                },
            },
        });
        registerResourceDescriptors(throwingAbilities, [{ key: 'vehicle', open: () => true, permission: 'x' }]);
        assert.false(canOpenResource(throwingAbilities, 'vehicle'), 'a throwing abilities service denies');

        const noAbilities = fakeOwner();
        registerResourceDescriptors(noAbilities, [{ key: 'vehicle', open: () => true, permission: 'x' }]);
        assert.true(canOpenResource(noAbilities, 'vehicle'), 'without an abilities service the permission is not enforced');
    });

    test('openResource unwraps, loads the canonical record for a subtype and never throws', async function (assert) {
        const opened = [];
        const canonical = new VehicleModel({ id: 'v1' });
        const found = new VehicleModel({ id: 'v2' });
        const store = {
            peekRecord: (modelName, id) => (modelName === 'vehicle' && id === 'v1' ? canonical : null),
            findRecord: (modelName, id) => Promise.resolve(id === 'v2' ? found : null),
        };
        const owner = fakeOwner({ 'service:store': store });
        registerResourceDescriptors(owner, [
            { key: 'vehicle', modelNames: ['maintenance-subject-vehicle'], open: (record, context) => opened.push([record, context]) && true },
            { key: 'driver', open: () => false },
            {
                key: 'trailer',
                open: () => {
                    throw new Error('boom');
                },
            },
            { key: 'zone' },
        ]);

        assert.false(await openResource(owner, null));
        assert.false(await openResource(owner, { resourceType: 'nothing' }));
        assert.false(await openResource(owner, { resourceType: 'zone' }), 'no open path');
        assert.false(await openResource(owner, { resourceType: 'driver' }), 'the descriptor declined');
        assert.false(await openResource(owner, { resourceType: 'trailer' }), 'a throwing open is swallowed');

        const event = { type: 'click' };
        assert.true(await openResource(owner, new MaintenanceSubjectVehicleModel({ id: 'v1' }), { event }));
        assert.strictEqual(opened[0][0], canonical, 'the subtype was swapped for the peeked canonical record');
        assert.strictEqual(opened[0][1].event, event);
        assert.strictEqual(opened[0][1].owner, owner);

        assert.true(await openResource(owner, new MaintenanceSubjectVehicleModel({ uuid: 'v2' })));
        assert.strictEqual(opened[1][0], found, 'or fetched when not in the store');

        const notFound = new MaintenanceSubjectVehicleModel({ id: 'v3' });
        assert.true(await openResource(owner, notFound));
        assert.strictEqual(opened[2][0], notFound, 'an unknown id opens the subtype itself');

        const noId = new MaintenanceSubjectVehicleModel();
        assert.true(await openResource(owner, noId));
        assert.strictEqual(opened[3][0], noId, 'no id means nothing to load');

        assert.true(await openResource(owner, canonical));
        assert.strictEqual(opened[4][0], canonical, 'a canonical record is used as is');
        assert.strictEqual(opened[4][1].event, null);

        const stub = { loadResource: () => Promise.resolve(canonical) };
        assert.true(await openResource(owner, stub));
        assert.strictEqual(opened[5][0], canonical, 'stubs are loaded first');

        assert.true(await openResource(owner, Promise.resolve(ObjectProxy.create({ content: canonical }))));
        assert.strictEqual(opened[6][0], canonical, 'thenables and proxies are unwrapped');

        assert.true(await openResource(owner, { id: 'plain' }, { resourceType: 'vehicle' }), 'options.resourceType names the type of an anonymous record');
        assert.strictEqual(opened[7][0].id, 'plain');

        const noStore = fakeOwner();
        registerResourceDescriptors(noStore, [{ key: 'vehicle', modelNames: ['maintenance-subject-vehicle'], open: (record) => opened.push([record]) && true }]);
        const subtype = new MaintenanceSubjectVehicleModel({ id: 'v1' });
        assert.true(await openResource(noStore, subtype));
        assert.strictEqual(opened[8][0], subtype, 'without a store the subtype opens itself');

        const partialStore = fakeOwner({ 'service:store': { peekRecord: () => null } });
        registerResourceDescriptors(partialStore, [{ key: 'vehicle', modelNames: ['maintenance-subject-vehicle'], open: (record) => opened.push([record]) && true }]);
        assert.true(await openResource(partialStore, subtype));
        assert.strictEqual(opened[9][0], subtype, 'a store without findRecord cannot fetch');

        const nullStore = fakeOwner({ 'service:store': { findRecord: () => Promise.resolve(null) } });
        registerResourceDescriptors(nullStore, [{ key: 'vehicle', modelNames: ['maintenance-subject-vehicle'], open: (record) => opened.push([record]) && true }]);
        assert.true(await openResource(nullStore, subtype));
        assert.strictEqual(opened[10][0], subtype, 'a fetch that returns nothing keeps the subtype');
    });

    test('readDescriptor reads plain fields and calls functions safely', function (assert) {
        const descriptor = {
            icon: 'truck',
            title: (record) => record.name,
            broken: () => {
                throw new Error('boom');
            },
        };

        assert.strictEqual(readDescriptor(descriptor, 'icon'), 'truck');
        assert.strictEqual(readDescriptor(descriptor, 'title', { name: 'Ada' }), 'Ada');
        assert.strictEqual(readDescriptor(descriptor, 'broken'), undefined);
        assert.strictEqual(readDescriptor(descriptor, 'missing'), undefined);
        assert.strictEqual(readDescriptor(null, 'icon'), undefined);
    });
});

module('Unit | Utility | resource-registry | abilities service', function (hooks) {
    setupTest(hooks);

    test('the abilities service of the owner gates opening', function (assert) {
        this.owner.register(
            'service:abilities',
            class extends Service {
                can(permission) {
                    return permission === 'allowed';
                }
            }
        );
        registerResourceDescriptors(this.owner, [
            { key: 'allowed-thing', open: () => true, permission: 'allowed' },
            { key: 'denied-thing', open: () => true, permission: 'denied' },
        ]);

        assert.true(canOpenResource(this.owner, 'allowed-thing'));
        assert.false(canOpenResource(this.owner, 'denied-thing'));
    });
});
