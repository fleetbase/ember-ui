import options from '@fleetbase/ember-ui/utils/options';
import { module, test } from 'qunit';

module('Unit | Utility | options', function () {
    test('it is an exported function', function (assert) {
        assert.strictEqual(typeof options, 'function');
        assert.strictEqual(options.length, 0, 'it declares no parameters');
    });

    test('it returns the boolean true, not a truthy value', function (assert) {
        const result = options();

        assert.true(result);
        assert.strictEqual(typeof result, 'boolean');
    });

    test('it ignores every argument it is given', function (assert) {
        assert.true(options(undefined));
        assert.true(options(null));
        assert.true(options(false));
        assert.true(options(0));
        assert.true(options({ some: 'config' }, ['a', 'b'], 'third'));
    });

    test('it returns the same value on repeated invocations', function (assert) {
        assert.strictEqual(options(), options(), 'the util is pure and stateless');
        assert.true(options.call({ scope: 'other' }), 'the receiver does not matter');
    });
});
