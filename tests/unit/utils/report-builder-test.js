import reportBuilder, {
    DEFAULT_LIMIT,
    DEFAULT_PAGE,
    EMPTY_QUERY,
    AGGREGATE_FUNCTIONS,
    JOIN_TYPES,
    OPERATORS,
    deepClone,
    emptyJoin,
    emptyWhere,
    emptyOrder,
} from '@fleetbase/ember-ui/utils/report-builder';
import { module, test } from 'qunit';

module('Unit | Utility | report-builder', function () {
    module('constants', function () {
        test('the paging defaults are the documented numbers', function (assert) {
            assert.strictEqual(DEFAULT_LIMIT, 100);
            assert.strictEqual(DEFAULT_PAGE, 1);
        });

        test('EMPTY_QUERY describes an unconfigured query', function (assert) {
            assert.deepEqual(EMPTY_QUERY, {
                select: [],
                from: null,
                joins: [],
                where: [],
                groupBy: [],
                having: [],
                orderBy: [],
                limit: 100,
            });
            assert.strictEqual(EMPTY_QUERY.limit, DEFAULT_LIMIT, 'the limit is wired to the shared default');
        });

        test('EMPTY_QUERY is frozen at the top level only', function (assert) {
            assert.true(Object.isFrozen(EMPTY_QUERY), 'the template object cannot be reassigned');
            assert.throws(
                () => {
                    EMPTY_QUERY.from = 'orders';
                },
                TypeError,
                'writing a property throws in strict mode'
            );
            assert.false(Object.isFrozen(EMPTY_QUERY.select), 'the freeze is shallow, so consumers must clone before mutating nested arrays');
        });

        test('AGGREGATE_FUNCTIONS starts with an explicit "None" option', function (assert) {
            assert.strictEqual(AGGREGATE_FUNCTIONS.length, 6);
            assert.strictEqual(AGGREGATE_FUNCTIONS[0].value, null, 'the no-aggregate option carries a null value');
            assert.strictEqual(AGGREGATE_FUNCTIONS[0].label, 'None');
            assert.deepEqual(
                AGGREGATE_FUNCTIONS.slice(1).map((item) => item.value),
                ['COUNT', 'SUM', 'AVG', 'MIN', 'MAX'],
                'aggregate values are upper-case SQL function names'
            );
            assert.deepEqual(
                AGGREGATE_FUNCTIONS.map((item) => item.label),
                ['None', 'Count', 'Sum', 'Average', 'Minimum', 'Maximum']
            );
        });

        test('JOIN_TYPES covers the four SQL joins with lower-case values', function (assert) {
            assert.deepEqual(
                JOIN_TYPES.map((item) => item.value),
                ['inner', 'left', 'right', 'full']
            );
            assert.deepEqual(
                JOIN_TYPES.map((item) => item.label),
                ['Inner', 'Left', 'Right', 'Full']
            );
        });

        test('OPERATORS covers comparison, pattern, set and null checks', function (assert) {
            const values = OPERATORS.map((item) => item.value);

            assert.strictEqual(OPERATORS.length, 12);
            assert.deepEqual(values, ['=', '!=', '>', '>=', '<', '<=', 'LIKE', 'NOT LIKE', 'IN', 'NOT IN', 'IS NULL', 'IS NOT NULL']);
            assert.true(
                OPERATORS.every((item) => item.label === item.value),
                'operator labels mirror their values'
            );
        });
    });

    module('deepClone', function () {
        test('it returns a structurally equal but disconnected copy', function (assert) {
            const source = { a: 1, nested: { list: [1, 2, { deep: true }] } };
            const clone = deepClone(source);

            assert.deepEqual(clone, source);
            assert.notStrictEqual(clone, source);
            assert.notStrictEqual(clone.nested, source.nested);
            assert.notStrictEqual(clone.nested.list, source.nested.list);
            assert.notStrictEqual(clone.nested.list[2], source.nested.list[2]);
        });

        test('mutating the clone leaves the source untouched', function (assert) {
            const source = { list: [1, 2] };
            const clone = deepClone(source);

            clone.list.push(3);
            clone.added = true;

            assert.deepEqual(source, { list: [1, 2] });
        });

        test('it substitutes an empty object for null and undefined', function (assert) {
            assert.deepEqual(deepClone(null), {});
            assert.deepEqual(deepClone(undefined), {});
            assert.deepEqual(deepClone(), {}, 'calling with no argument is the same as undefined');
            assert.notStrictEqual(deepClone(null), deepClone(null), 'each fallback is a fresh object');
        });

        test('it round-trips primitives and arrays', function (assert) {
            assert.strictEqual(deepClone(0), 0, 'zero is not treated as nullish');
            assert.strictEqual(deepClone(''), '', 'an empty string is not treated as nullish');
            assert.false(deepClone(false));
            assert.strictEqual(deepClone('text'), 'text');
            assert.deepEqual(deepClone([1, [2]]), [1, [2]]);
            assert.true(Array.isArray(deepClone([])), 'array-ness survives the round trip');
        });

        test('it drops JSON-unrepresentable values', function (assert) {
            const clone = deepClone({ keep: 1, gone: undefined, fn() {}, sym: Symbol('s') });

            assert.deepEqual(clone, { keep: 1 }, 'undefined, functions and symbols are dropped');
            assert.deepEqual(deepClone([undefined, () => {}]), [null, null], 'inside arrays they become null');
            assert.strictEqual(deepClone(NaN), null, 'NaN serializes to null');
            assert.strictEqual(deepClone(Infinity), null);
        });

        test('it degrades Dates to ISO strings', function (assert) {
            const clone = deepClone({ at: new Date(Date.UTC(2020, 0, 15, 13, 45, 30)) });

            assert.strictEqual(clone.at, '2020-01-15T13:45:30.000Z');
            assert.false(clone.at instanceof Date, 'prototypes are not preserved');
        });

        test('it throws on circular structures', function (assert) {
            const circular = { name: 'loop' };
            circular.self = circular;

            assert.throws(() => deepClone(circular), TypeError);
        });

        test('it can safely clone EMPTY_QUERY for mutation', function (assert) {
            const query = deepClone(EMPTY_QUERY);

            query.from = 'orders';
            query.select.push('id');

            assert.strictEqual(query.from, 'orders');
            assert.deepEqual(query.select, ['id']);
            assert.strictEqual(EMPTY_QUERY.from, null, 'the frozen template is untouched');
            assert.deepEqual(EMPTY_QUERY.select, [], 'including its nested arrays');
        });
    });

    module('empty factories', function () {
        test('emptyJoin returns an inner join skeleton', function (assert) {
            assert.deepEqual(emptyJoin(), {
                type: 'inner',
                table: null,
                alias: null,
                on: [{ left: null, operator: '=', right: null }],
            });
            assert.strictEqual(emptyJoin().type, JOIN_TYPES[0].value, 'the default matches the first join type option');
        });

        test('emptyWhere returns an AND string equality skeleton', function (assert) {
            assert.deepEqual(emptyWhere(), {
                column: null,
                operator: '=',
                value: '',
                type: 'string',
                logic: 'AND',
            });
            assert.strictEqual(emptyWhere().operator, OPERATORS[0].value, 'the default operator matches the first operator option');
        });

        test('emptyOrder returns an ascending order skeleton', function (assert) {
            assert.deepEqual(emptyOrder(), { column: null, direction: 'asc' });
        });

        test('each factory returns a fresh graph so rows never share state', function (assert) {
            const first = emptyJoin();
            const second = emptyJoin();

            assert.notStrictEqual(first, second);
            assert.notStrictEqual(first.on, second.on, 'the nested on-clause array is fresh');
            assert.notStrictEqual(first.on[0], second.on[0]);

            first.on[0].left = 'orders.id';
            first.table = 'orders';

            assert.strictEqual(second.on[0].left, null, 'mutating one join does not affect the next');
            assert.strictEqual(emptyJoin().table, null);
            assert.notStrictEqual(emptyWhere(), emptyWhere());
            assert.notStrictEqual(emptyOrder(), emptyOrder());
        });
    });

    module('default export', function () {
        test('it is a function returning boolean true', function (assert) {
            assert.strictEqual(typeof reportBuilder, 'function');
            assert.true(reportBuilder());
            assert.true(reportBuilder('ignored', 1), 'arguments are ignored');
        });
    });
});
