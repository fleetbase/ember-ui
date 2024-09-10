import { module, test } from 'qunit';
import { setupTest } from 'dummy/tests/helpers';

module('Unit | Service | dashboard', function (hooks) {
    setupTest(hooks);

    // TODO: Replace this with your real tests.
    test('it exists', function (assert) {
        // register dummy services
        this.owner.register('service:store', {}, { instantiate: false });
        this.owner.register('service:fetch', {}, { instantiate: false });
        this.owner.register('service:notifications', {}, { instantiate: false });
        this.owner.register('service:intl', {}, { instantiate: false });
        this.owner.register('service:universe', {}, { instantiate: false });
        let service = this.owner.lookup('service:dashboard');
        assert.ok(service);
    });
});
