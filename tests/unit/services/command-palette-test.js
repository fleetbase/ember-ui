import { module, test } from 'qunit';
import { setupTest } from 'dummy/tests/helpers';

module('Unit | Service | command-palette', function (hooks) {
    setupTest(hooks);

    hooks.beforeEach(function () {
        this.service = this.owner.lookup('service:command-palette');
    });

    test('it starts closed, unscoped and with no host', function (assert) {
        assert.false(this.service.isOpen);
        assert.strictEqual(this.service.scope, null);
        assert.false(this.service.hasHost);
    });

    test('open, close and toggle', function (assert) {
        this.service.open('orders');
        assert.true(this.service.isOpen);
        assert.strictEqual(this.service.scope, 'orders');

        this.service.close();
        assert.false(this.service.isOpen);

        this.service.toggle();
        assert.true(this.service.isOpen);
        assert.strictEqual(this.service.scope, null, 'open without a scope clears it');

        this.service.toggle();
        assert.false(this.service.isOpen);
    });

    test('register counts hosts, and unregistering twice only counts once', function (assert) {
        const first = this.service.register();
        const second = this.service.register();
        assert.strictEqual(this.service.hosts, 2);
        assert.true(this.service.hasHost);

        first();
        first();
        assert.strictEqual(this.service.hosts, 1);

        second();
        assert.false(this.service.hasHost);
    });
});
