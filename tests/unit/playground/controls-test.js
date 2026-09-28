import { module, test } from 'qunit';
import { control, coerce, defaultsFor, validateControl, CONTROL_TYPES } from 'dummy/playground/controls';

module('Unit | playground | controls', function () {
    module('definition', function () {
        test('a control gets a humanized label and a type-appropriate default', function (assert) {
            assert.strictEqual(control('isLoading', 'boolean').label, 'Is Loading');
            assert.false(control('isLoading', 'boolean').default);
            assert.strictEqual(control('count', 'number').default, 0);
            assert.strictEqual(control('text', 'text').default, '');
            assert.strictEqual(control('data', 'json').default, null);
        });

        test('explicit labels, defaults and help win', function (assert) {
            const definition = control('type', 'select', { label: 'Kind', options: ['a', 'b'], default: 'b', help: 'pick one' });

            assert.strictEqual(definition.label, 'Kind');
            assert.strictEqual(definition.default, 'b');
            assert.strictEqual(definition.help, 'pick one');
        });

        test('select options are normalized, including a null option', function (assert) {
            const definition = control('prefix', 'select', { options: [null, 'fas'], default: null });

            assert.deepEqual(definition.options, [
                { value: null, label: '(none)' },
                { value: 'fas', label: 'fas' },
            ]);
        });

        test('controls are serializable unless opted out', function (assert) {
            assert.true(control('text', 'text').serializable);
            assert.false(control('text', 'text', { serializable: false }).serializable);
        });
    });

    module('coercion', function () {
        test('booleans accept real booleans and their string forms', function (assert) {
            const definition = control('on', 'boolean');

            assert.true(coerce(definition, true).value);
            assert.true(coerce(definition, 'true').value);
            assert.false(coerce(definition, 'false').value);
        });

        test('a non-boolean falls back to the default and reports why', function (assert) {
            const { value, error } = coerce(control('on', 'boolean', { default: false }), 'maybe');

            assert.false(value, 'the default is used');
            assert.strictEqual(error, 'Expected true or false.');
        });

        test('numbers are parsed and bounded', function (assert) {
            const definition = control('percent', 'number', { default: 10, min: 0, max: 100 });

            assert.strictEqual(coerce(definition, '42').value, 42);
            assert.strictEqual(coerce(definition, 42).value, 42);
            assert.strictEqual(coerce(definition, '-1').error, 'Must be at least 0.');
            assert.strictEqual(coerce(definition, '101').error, 'Must be at most 100.');
            assert.strictEqual(coerce(definition, 'abc').error, 'Enter a number.');
            assert.strictEqual(coerce(definition, 'abc').value, 10, 'an unparseable number falls back');
        });

        test('selects only accept declared options', function (assert) {
            const definition = control('type', 'select', { options: ['default', 'primary'], default: 'default' });

            assert.strictEqual(coerce(definition, 'primary').value, 'primary');
            assert.strictEqual(coerce(definition, 'nope').error, 'Not one of the allowed options.');
            assert.strictEqual(coerce(definition, 'nope').value, 'default', 'an unknown option falls back');
        });

        test('a select matches an option through its string form', function (assert) {
            const definition = control('size', 'select', { options: [1, 2], default: 1 });

            assert.strictEqual(coerce(definition, '2').value, 2, 'the declared value type is preserved');
        });

        test('colours must be hex', function (assert) {
            const definition = control('tint', 'color', { default: '#000000' });

            assert.strictEqual(coerce(definition, '#3b82f6').value, '#3b82f6');
            assert.strictEqual(coerce(definition, 'blue').error, 'Expected a hex colour such as #3b82f6.');
        });

        test('dates must parse, and empty means unset', function (assert) {
            const definition = control('when', 'date', { default: '' });

            assert.strictEqual(coerce(definition, '2026-03-16').value, '2026-03-16');
            assert.strictEqual(coerce(definition, '').value, '');
            assert.strictEqual(coerce(definition, 'not-a-date').error, 'Not a valid date.');
        });

        test('json is parsed, and invalid json reports rather than throws', function (assert) {
            const definition = control('rows', 'json', { default: null });

            assert.deepEqual(coerce(definition, '{"a":1}').value, { a: 1 });
            assert.deepEqual(coerce(definition, { a: 1 }).value, { a: 1 }, 'an object passes through');
            assert.strictEqual(coerce(definition, '{oops').error, 'Not valid JSON.');
            assert.strictEqual(coerce(definition, '{oops').value, null, 'the default is used');
        });

        test('text coerces anything to a string and never errors', function (assert) {
            const definition = control('label', 'text');

            assert.strictEqual(coerce(definition, 42).value, '42');
            assert.strictEqual(coerce(definition, null).value, '');
            assert.strictEqual(coerce(definition, 'hi').error, null);
        });
    });

    module('defaults', function () {
        test('defaultsFor collects every documented default', function (assert) {
            const controls = [control('text', 'text', { default: 'Save' }), control('on', 'boolean', { default: true }), control('n', 'number', { default: 3 })];

            assert.deepEqual(defaultsFor(controls), { text: 'Save', on: true, n: 3 });
        });

        test('defaultsFor of nothing is an empty set', function (assert) {
            assert.deepEqual(defaultsFor([]), {});
            assert.deepEqual(defaultsFor(), {});
        });
    });

    module('validation', function () {
        test('a well-formed control has no problems', function (assert) {
            assert.deepEqual(validateControl(control('text', 'text', { default: 'x' })), []);
        });

        test('it catches the mistakes that would break a page', function (assert) {
            assert.deepEqual(validateControl(null), ['control is not an object']);
            assert.ok(validateControl({ key: '', type: 'text', label: 'x', default: '' }).includes('missing key'));
            assert.ok(validateControl({ key: 'a', type: 'nope', label: 'x', default: '' }).includes('unknown type "nope"'));
            assert.ok(validateControl({ key: 'a', type: 'text', label: '', default: '' }).includes('missing label'));
            assert.ok(validateControl({ key: 'a', type: 'text', label: 'x' }).includes('missing default'));
        });

        test('a select must have options and a default among them', function (assert) {
            assert.ok(validateControl({ key: 'a', type: 'select', label: 'A', default: 'x', options: [] }).includes('select control needs options'));
            assert.ok(
                validateControl({
                    key: 'a',
                    type: 'select',
                    label: 'A',
                    default: 'z',
                    options: [{ value: 'x', label: 'x' }],
                }).includes('select default is not among its options')
            );
        });

        test('a number control cannot have min above max', function (assert) {
            assert.ok(validateControl({ key: 'a', type: 'number', label: 'A', default: 5, min: 10, max: 1 }).includes('min is greater than max'));
        });

        test('a default that fails its own validation is caught', function (assert) {
            const problems = validateControl({ key: 'a', type: 'number', label: 'A', default: 500, min: 0, max: 100 });

            assert.ok(
                problems.some((problem) => problem.startsWith('default fails its own validation')),
                'Reset would otherwise produce a validation error'
            );
        });

        test('the supported type list is what the control component renders', function (assert) {
            assert.deepEqual(CONTROL_TYPES, ['boolean', 'text', 'number', 'select', 'color', 'date', 'datetime', 'json']);
        });
    });
});
