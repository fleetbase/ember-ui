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
    // Every one of these entry points has a defaulted parameter, and a caller that supplies
    // nothing is the only way those defaults run.
    module('called with no arguments', function () {
        test('the setters fall back to their defaults', function (assert) {
            const service = this.owner.lookup('service:sidebar');

            service.setVisualState('minimized');
            service.setVisualState();
            assert.strictEqual(service.state, 'visible', 'setVisualState defaults to visible');

            service.setEnabled(false);
            service.setEnabled();
            assert.true(service.isEnabled, 'setEnabled defaults to true');
        });

        test('transitionTo defaults to visible and syncContextToState to the current state', function (assert) {
            const service = this.owner.lookup('service:sidebar');
            const calls = [];
            service.registerContext({
                show: () => calls.push('show'),
                hide: (immediate) => calls.push(`hide:${immediate}`),
                minimize: () => calls.push('minimize'),
            });

            service.setVisualState('minimized');
            service.syncContextToState();
            assert.deepEqual(calls, ['minimize'], 'with no state it syncs the state it already has');

            service.transitionTo();
            assert.strictEqual(service.state, 'visible');
            assert.deepEqual(calls, ['minimize', 'show'], 'and transitionTo lands on visible');
        });
    });

    module('while the sidebar is disabled', function () {
        test('an ordinary transition is refused', function (assert) {
            const service = this.owner.lookup('service:sidebar');
            const calls = [];
            service.registerContext({ show: () => calls.push('show'), hide: () => calls.push('hide'), minimize: () => calls.push('minimize') });

            service.disable();
            const stateAfterDisable = service.state;
            calls.length = 0;

            service.show();
            service.minimize();

            assert.strictEqual(service.state, stateAfterDisable, 'the state is untouched');
            assert.deepEqual(calls, [], 'and the context is never told to move');
        });

        test('disabling twice is a no-op that preserves the remembered state', function (assert) {
            const service = this.owner.lookup('service:sidebar');

            service.setVisualState('minimized');
            service.disable();
            assert.strictEqual(service.previousState, 'minimized', 'the state before disabling is remembered');

            service.disable();

            assert.strictEqual(service.previousState, 'minimized', 'the second call does not overwrite it with "hidden"');
            assert.true(service.isHidden);
        });

        test('toggling is refused', function (assert) {
            const service = this.owner.lookup('service:sidebar');

            service.disable();
            const before = service.state;
            service.toggle();

            assert.strictEqual(service.state, before);
        });

        test('hiding re-enables the sidebar unless asked to preserve the disabled flag', function (assert) {
            const service = this.owner.lookup('service:sidebar');

            service.disable();
            assert.true(service.isDisabled);

            service.hide();

            assert.true(service.isEnabled, 'an explicit hide takes the sidebar back out of the disabled state');
            assert.true(service.isHidden);

            service.disable();
            service.hide({ preserveDisabled: true });

            assert.true(service.isDisabled, 'unless the caller says otherwise');
        });

        test('enable with no remembered state falls back to visible', function (assert) {
            const service = this.owner.lookup('service:sidebar');

            service.previousState = null;
            service.setEnabled(false);
            service.enable();

            assert.strictEqual(service.state, 'visible');
            assert.true(service.isEnabled);
        });
    });

    test('hide accepts a bare boolean as the immediate flag', function (assert) {
        const service = this.owner.lookup('service:sidebar');
        const hides = [];
        service.registerContext({ show() {}, minimize() {}, hide: (immediate) => hides.push(immediate) });

        service.hide(true);
        service.hide(false);
        service.hide();

        assert.deepEqual(hides, [true, false, false], 'the boolean form is passed straight through to the context');
    });

    module('reaching into the registered context', function () {
        test('with no context the accessors answer undefined rather than throwing', function (assert) {
            const service = this.owner.lookup('service:sidebar');

            assert.strictEqual(service.getComponent(), undefined);
            assert.strictEqual(service.getElement(), undefined);
            assert.strictEqual(service.getGutterElement(), undefined);
        });

        test('with a context they reach through to the component and its nodes', function (assert) {
            const service = this.owner.lookup('service:sidebar');
            const sidebarNode = document.createElement('div');
            const gutterNode = document.createElement('div');
            const component = { sidebarNode, gutterNode };
            service.registerContext({ component });

            assert.strictEqual(service.getComponent(), component);
            assert.strictEqual(service.getElement(), sidebarNode);
            assert.strictEqual(service.getGutterElement(), gutterNode);
        });

        test('a context with no component still answers safely', function (assert) {
            const service = this.owner.lookup('service:sidebar');
            service.registerContext({});

            assert.strictEqual(service.getComponent(), undefined);
            assert.strictEqual(service.getElement(), undefined, 'the second hop is guarded too');
            assert.strictEqual(service.getGutterElement(), undefined);
        });
    });
});
