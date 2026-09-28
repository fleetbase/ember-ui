import deprecateSubclassing from '@fleetbase/ember-ui/utils/deprecate-subclassing';
import { module, test } from 'qunit';
import { settled } from '@ember/test-helpers';

module('Unit | Utility | deprecate-subclassing', function () {
    test('it returns a subclass of the target in a debug build', function (assert) {
        class Widget {}

        const Wrapped = deprecateSubclassing(Widget);

        assert.notStrictEqual(Wrapped, Widget, 'a new class is returned');
        assert.true(Object.prototype.isPrototypeOf.call(Widget, Wrapped), 'the returned class extends the target');
    });

    test('instances of the returned class are instances of the target', function (assert) {
        class Widget {}

        const instance = new (deprecateSubclassing(Widget))();

        assert.true(instance instanceof Widget);
    });

    test('it preserves constructor arguments and target behaviour', function (assert) {
        class Widget {
            constructor(a, b) {
                this.sum = a + b;
            }

            describe() {
                return `sum:${this.sum}`;
            }
        }

        const instance = new (deprecateSubclassing(Widget))(2, 3);

        assert.strictEqual(instance.sum, 5, 'arguments reach the target constructor');
        assert.strictEqual(instance.describe(), 'sum:5', 'prototype methods are inherited');
    });

    // The deprecation check runs in a `next()` callback and reports through
    // Ember's deprecation channel, so these cases assert that each variant
    // constructs cleanly and settles — exercising all three states of the
    // `wrapperClass === this.constructor || this[flag] === true` predicate.
    test('constructing the wrapper directly settles cleanly', async function (assert) {
        class Widget {}
        const Wrapped = deprecateSubclassing(Widget);

        const instance = new Wrapped();
        await settled();

        assert.strictEqual(instance.constructor, Wrapped, 'the direct-construction predicate branch holds');
    });

    test('a subclass of the wrapper still constructs and settles', async function (assert) {
        class Widget {}
        const Wrapped = deprecateSubclassing(Widget);

        class Subclass extends Wrapped {}

        const instance = new Subclass();
        await settled();

        assert.true(instance instanceof Widget, 'subclassing is deprecated but not prevented');
        assert.notStrictEqual(instance.constructor, Wrapped, 'the deprecated branch is the one taken');
    });

    test('the __ember-bootstrap_subclass escape hatch marks a privileged subclass', async function (assert) {
        class Widget {}
        const Wrapped = deprecateSubclassing(Widget);

        class PrivilegedSubclass extends Wrapped {
            '__ember-bootstrap_subclass' = true;
        }

        const instance = new PrivilegedSubclass();
        await settled();

        assert.true(instance['__ember-bootstrap_subclass'], 'the flag is set by the time the deferred check runs');
        assert.true(instance instanceof Widget);
    });

    test('each call produces an independent wrapper', function (assert) {
        class Widget {}

        assert.notStrictEqual(deprecateSubclassing(Widget), deprecateSubclassing(Widget), 'wrappers are not cached or shared');
    });
});
