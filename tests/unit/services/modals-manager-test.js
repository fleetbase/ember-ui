import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';
import Service from '@ember/service';

module('Unit | Service | modals-manager', function (hooks) {
    setupTest(hooks);

    hooks.beforeEach(function () {
        class EventsStub extends Service {
            on() {}
            off() {}
            trigger() {}
            emit() {}
        }

        this.owner.register('service:events', EventsStub);
    });

    test('it exists', function (assert) {
        let service = this.owner.lookup('service:modals-manager');
        assert.ok(service);
    });
});
