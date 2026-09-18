import noop from '@fleetbase/ember-ui/utils/noop';
import { module, test } from 'qunit';

module('Unit | Utility | noop', function () {
    test('it is a zero-argument function', function (assert) {
        assert.strictEqual(typeof noop, 'function');
        assert.strictEqual(noop.length, 0, 'it declares no parameters');
    });

    test('it always returns undefined', function (assert) {
        assert.strictEqual(noop(), undefined);
        assert.strictEqual(noop(1, 'two', { three: 3 }), undefined, 'arguments are ignored');
        assert.strictEqual(noop(null), undefined);
        assert.strictEqual(noop(undefined), undefined);
    });

    test('it never throws, whatever it is handed', function (assert) {
        const circular = {};
        circular.self = circular;

        noop(circular);
        noop(NaN, Infinity, -0);
        noop(...new Array(100).fill('x'));

        assert.strictEqual(noop(circular), undefined, 'a circular structure is still a no-op');
    });

    test('it produces no side effects on its receiver', function (assert) {
        const context = { touched: false, keys: 1 };

        noop.call(context, 'a', 'b');
        noop.apply(context, ['c']);

        assert.deepEqual(context, { touched: false, keys: 1 }, 'the bound context is unchanged');
    });

    test('it is safe to call repeatedly and can be used as a default callback', function (assert) {
        const results = [];

        for (let i = 0; i < 5; i++) {
            results.push(noop(i));
        }

        assert.deepEqual(results, [undefined, undefined, undefined, undefined, undefined]);
        assert.strictEqual([1, 2, 3].map(noop).join(','), ',,', 'mapping through noop yields holes of undefined');
    });
});
