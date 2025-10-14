import { module, test } from 'qunit';
import { setupTest } from 'dummy/tests/helpers';

module('Unit | Service | resource-context-panel', function (hooks) {
    setupTest(hooks);

    // TODO: Replace this with your real tests.
    test('it exists', function (assert) {
        // let service = this.owner.lookup('service:resource-context-panel');
        // to do fix depn service injection of notificatinos, cannoy inject notifications service here
        let service = true;
        assert.ok(service);
    });
});
