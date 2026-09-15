import { module, test } from 'qunit';
import { setupTest } from 'dummy/tests/helpers';
import ObjectProxy from '@ember/object/proxy';
import { hbs } from 'ember-cli-htmlbars';

module('Unit | Service | resource-registry', function (hooks) {
    setupTest(hooks);

    test('it fronts the registry util for an owner', async function (assert) {
        const service = this.owner.lookup('service:resource-registry');
        this.owner.register('template:components/vehicle/pill', hbs`x`);

        const [vehicle] = service.registerDescriptors([{ key: 'vehicle', aliases: ['attachable-vehicle'], identifier: (r) => r.plate }]);
        assert.strictEqual(vehicle.key, 'vehicle');
        assert.strictEqual(service.register({ key: 'driver' }).key, 'driver');
        assert.deepEqual(
            service.descriptors.map((d) => d.key),
            ['vehicle', 'driver']
        );
        assert.strictEqual(service.resolveKey('attachable-vehicle'), 'vehicle');
        assert.strictEqual(service.getDescriptor('vehicle').key, 'vehicle');
        assert.strictEqual(service.componentName('pill', 'vehicle'), 'vehicle/pill');
        assert.false(service.canOpen('vehicle'));
        assert.true(service.setOpener('vehicle', () => true));
        assert.true(service.canOpen('vehicle'));
        assert.true(await service.open({ resourceType: 'vehicle' }));
        assert.strictEqual(service.relationValue({ driver: { name: 'Ada' } }, 'driver').name, 'Ada');
        assert.strictEqual(service.safeIdentifier('9d2c6c5e-1b2a-4c3d-8e4f-1234567890ab'), null);
        const record = { name: 'Ada' };
        assert.strictEqual(await service.unwrap(ObjectProxy.create({ content: record })), record);
    });
});
