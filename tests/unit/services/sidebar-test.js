import { module, test } from 'qunit';
import { setupTest } from 'dummy/tests/helpers';

module('Unit | Service | sidebar', function (hooks) {
    setupTest(hooks);

    test('it exposes tracked state and availability helpers', function (assert) {
        const service = this.owner.lookup('service:sidebar');

        assert.ok(service);
        assert.strictEqual(service.state, 'visible');
        assert.true(service.isVisible);
        assert.false(service.isHidden);
        assert.false(service.isMinimized);
        assert.true(service.isEnabled);
        assert.false(service.isDisabled);
        assert.false(service.hasContext);
    });

    test('it can register and clear context safely', function (assert) {
        const service = this.owner.lookup('service:sidebar');
        const context = {};
        const otherContext = {};

        service.registerContext(context);

        assert.true(service.hasContext);
        assert.strictEqual(service.context, context);

        service.clearContext(otherContext);
        assert.strictEqual(service.context, context, 'ignores a non-owned context');

        service.clearContext(context);
        assert.false(service.hasContext);
        assert.strictEqual(service.context, undefined);
    });

    test('service actions update state and delegate to context', function (assert) {
        const service = this.owner.lookup('service:sidebar');
        const calls = [];
        const context = {
            show() {
                calls.push(['show']);
            },
            hide(immediate) {
                calls.push(['hide', immediate]);
            },
            minimize() {
                calls.push(['minimize']);
            },
        };

        service.registerContext(context);
        service.hide();

        assert.strictEqual(service.state, 'hidden');
        assert.deepEqual(calls.at(-1), ['hide', false]);

        service.hideNow();
        assert.strictEqual(service.state, 'hidden');
        assert.deepEqual(calls.at(-1), ['hide', true]);

        service.show();
        assert.strictEqual(service.state, 'visible');
        assert.deepEqual(calls.at(-1), ['show']);

        service.minimize();
        assert.strictEqual(service.state, 'minimized');
        assert.true(service.isVisible, 'minimized still counts as visible');
        assert.deepEqual(calls.at(-1), ['minimize']);
    });

    test('disable hides immediately and enable restores the previous state', function (assert) {
        const service = this.owner.lookup('service:sidebar');
        const calls = [];
        const context = {
            show() {
                calls.push(['show']);
            },
            hide(immediate) {
                calls.push(['hide', immediate]);
            },
            minimize() {
                calls.push(['minimize']);
            },
        };

        service.registerContext(context);
        service.minimize();
        service.disable();

        assert.true(service.isDisabled);
        assert.true(service.isHidden);
        assert.deepEqual(calls.at(-1), ['hide', true]);

        service.enable();
        assert.true(service.isEnabled);
        assert.true(service.isMinimized);
        assert.deepEqual(calls.at(-1), ['minimize']);

        service.hideNow();
        service.disable();
        service.enable();
        assert.true(service.isHidden);
        assert.deepEqual(calls.at(-1), ['hide', true]);
    });

    test('toggle and no-context flows remain predictable', function (assert) {
        const service = this.owner.lookup('service:sidebar');

        service.hideNow();
        assert.true(service.isHidden);

        service.toggle();
        assert.strictEqual(service.state, 'visible', 'toggle reopens when hidden');

        service.disable();
        assert.true(service.isDisabled);
        assert.true(service.isHidden);

        service.toggle();
        assert.strictEqual(service.state, 'hidden', 'toggle is ignored when disabled');

        service.enable();
        assert.strictEqual(service.state, 'visible', 'enable restores the saved state');

        service.clearContext();
        service.show();
        assert.strictEqual(service.state, 'visible');

        service.hideNow();
        assert.strictEqual(service.state, 'hidden');
    });
});
