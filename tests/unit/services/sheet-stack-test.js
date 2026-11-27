import { module, test } from 'qunit';
import { setupTest } from 'dummy/tests/helpers';
import { run } from '@ember/runloop';

function sheet(depth, handles = true) {
    return {
        depth,
        escapes: 0,
        escape() {
            this.escapes++;
            return handles;
        },
    };
}

function escape(init = {}) {
    const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true, ...init });
    window.dispatchEvent(event);
    return event;
}

module('Unit | Service | sheet-stack', function (hooks) {
    setupTest(hooks);

    hooks.beforeEach(function () {
        this.stack = this.owner.lookup('service:sheet-stack');
    });

    test('the top sheet is the shallowest, and the latest among equals', function (assert) {
        const bottom = sheet(1);
        const front = sheet(0);
        const later = sheet(0);

        assert.strictEqual(this.stack.top, null);

        this.stack.register(bottom);
        this.stack.register(front);
        this.stack.register(front);
        assert.strictEqual(this.stack.sheets.length, 2, 'a sheet registers once');
        assert.strictEqual(this.stack.top, front);

        this.stack.register(later);
        assert.true(this.stack.isTop(later));
        assert.false(this.stack.isTop(front));

        this.stack.unregister(later);
        this.stack.unregister(front);
        this.stack.unregister(bottom);
        assert.deepEqual(this.stack.sheets, []);
    });

    test('a deeper sheet mounted later does not take the top', function (assert) {
        const front = sheet(0);
        const behind = sheet(2);
        this.stack.register(front);
        this.stack.register(behind);

        assert.strictEqual(this.stack.top, front);

        this.stack.unregister(behind);
        this.stack.unregister(front);
    });

    test('Escape asks only the top sheet and is consumed when it handles it', function (assert) {
        const bottom = sheet(1);
        const front = sheet(0);
        this.stack.register(bottom);
        this.stack.register(front);

        const event = escape();

        assert.strictEqual(front.escapes, 1);
        assert.strictEqual(bottom.escapes, 0);
        assert.true(event.defaultPrevented);

        this.stack.unregister(front);
        this.stack.unregister(bottom);
    });

    test('Escape is left alone when the top sheet declines it', function (assert) {
        const front = sheet(0, false);
        this.stack.register(front);

        assert.false(escape().defaultPrevented);
        assert.strictEqual(front.escapes, 1);

        this.stack.unregister(front);
    });

    test('other keys, handled and composing events, and an open modal are ignored', function (assert) {
        const front = sheet(0);
        this.stack.register(front);

        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
        escape({ isComposing: true });

        const handled = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true });
        handled.preventDefault();
        window.dispatchEvent(handled);

        const modals = this.owner.lookup('service:modals-manager');
        Object.defineProperty(modals, 'modalIsOpened', { configurable: true, get: () => true });
        escape();

        assert.strictEqual(front.escapes, 0);
        this.stack.unregister(front);
    });

    test('Escape with no sheets does nothing, and the listener goes when the last sheet does', function (assert) {
        const front = sheet(0);
        this.stack.register(front);
        this.stack.unregister(front);

        assert.false(escape().defaultPrevented);
        this.stack.handleKeydown(new KeyboardEvent('keydown', { key: 'Escape' }));
        assert.strictEqual(front.escapes, 0);
    });

    test('destroying the service drops its sheets and listener', function (assert) {
        const front = sheet(0);
        this.stack.register(front);
        this.stack.unregister(sheet(0));

        run(() => this.stack.destroy());
        escape();

        assert.strictEqual(front.escapes, 0);
    });
});
