import usesTransition from '@fleetbase/ember-ui/utils/decorators/uses-transition';
import Service from '@ember/service';
import { setOwner } from '@ember/application';
import { module, test } from 'qunit';
import { setupTest } from 'dummy/tests/helpers';

class Panel {
    @usesTransition('fade') usesTransition;
    @usesTransition('backdropFade') usesBackdropTransition;

    constructor(owner, args = {}) {
        setOwner(this, owner);
        this.args = args;
    }
}

module('Unit | Utility | decorators/uses-transition', function (hooks) {
    setupTest(hooks);

    hooks.beforeEach(function () {
        this.build = (args) => new Panel(this.owner, args);
    });

    test('it asserts that a fade property name is provided', function (assert) {
        assert.throws(() => usesTransition(), /fadeProperty/, 'no argument at all');
        assert.throws(() => usesTransition(undefined), /fadeProperty/);
        assert.throws(() => usesTransition(null), /fadeProperty/);
        assert.throws(() => usesTransition(123), /fadeProperty/, 'a non-string is rejected');
        assert.throws(() => usesTransition({ fade: true }), /fadeProperty/);
    });

    test('it accepts an empty string because only the type is asserted', function (assert) {
        assert.strictEqual(typeof usesTransition(''), 'function', 'the factory returns a decorator');
        assert.strictEqual(typeof usesTransition('fade'), 'function');
    });

    test('transitions are enabled by default when the arg is absent', function (assert) {
        assert.true(this.build({}).usesTransition);
        assert.true(this.build({}).usesBackdropTransition);
    });

    test('only an explicit false disables the transition', function (assert) {
        assert.false(this.build({ fade: false }).usesTransition, 'false disables');
        assert.true(this.build({ fade: true }).usesTransition);
        assert.true(this.build({ fade: 0 }).usesTransition, '0 is not === false');
        assert.true(this.build({ fade: null }).usesTransition, 'null is not === false');
        assert.true(this.build({ fade: '' }).usesTransition, 'an empty string is not === false');
        assert.true(this.build({ fade: 'false' }).usesTransition, 'the string "false" is not === false');
        assert.true(this.build({ fade: undefined }).usesTransition, 'undefined falls back to enabled');
    });

    test('each decorated property reads its own configured arg', function (assert) {
        const panel = this.build({ fade: false, backdropFade: true });

        assert.false(panel.usesTransition, 'the fade arg drives usesTransition');
        assert.true(panel.usesBackdropTransition, 'the backdropFade arg drives usesBackdropTransition independently');
    });

    test('it always returns a boolean, never the raw arg value', function (assert) {
        const value = this.build({ fade: 'truthy string' }).usesTransition;

        assert.strictEqual(typeof value, 'boolean');
        assert.strictEqual(value, true);
    });

    test('transitions are disabled entirely under FastBoot', function (assert) {
        this.owner.register(
            'service:fastboot',
            class FastBootStub extends Service {
                isFastBoot = true;
            }
        );

        assert.false(this.build({}).usesTransition, 'FastBoot short-circuits before the arg is consulted');
        assert.false(this.build({ fade: true }).usesTransition, 'even an explicit true is ignored');
    });

    test('transitions stay enabled when the fastboot service reports false', function (assert) {
        this.owner.register(
            'service:fastboot',
            class FastBootStub extends Service {
                isFastBoot = false;
            }
        );

        assert.true(this.build({}).usesTransition);
        assert.false(this.build({ fade: false }).usesTransition, 'the arg still wins when not in FastBoot');
    });

    test('it is a live getter that re-evaluates on every access', function (assert) {
        const args = {};
        const panel = this.build(args);

        assert.true(panel.usesTransition);

        args.fade = false;
        assert.false(panel.usesTransition, 'the second read reflects the updated arg');

        args.fade = true;
        assert.true(panel.usesTransition, 'and the third read reflects it again');
    });

    test('the decorated property is read-only', function (assert) {
        const panel = this.build({});

        assert.throws(
            () => {
                panel.usesTransition = false;
            },
            TypeError,
            'no setter is installed'
        );
    });
});
