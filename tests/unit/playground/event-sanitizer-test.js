import { module, test } from 'qunit';
import { summarize, summarizeArguments } from 'dummy/playground/event-sanitizer';

/**
 * The event log shows what a component handed a callback. It must never render a live object
 * graph, never walk a record's relationships, and never throw — a callback that cannot be
 * summarized must not take the page down.
 */
module('Unit | playground | event-sanitizer', function () {
    module('primitives', function () {
        test('it summarizes primitives', function (assert) {
            assert.deepEqual(summarize(null), { kind: 'null', text: 'null' });
            assert.deepEqual(summarize(undefined), { kind: 'undefined', text: 'undefined' });
            assert.deepEqual(summarize(42), { kind: 'number', text: '42' });
            assert.deepEqual(summarize(true), { kind: 'boolean', text: 'true' });
            assert.deepEqual(summarize('hi'), { kind: 'string', text: '"hi"' });
        });

        test('long strings are truncated', function (assert) {
            const summary = summarize('x'.repeat(500));

            assert.true(summary.text.length < 200, 'the log does not carry a 500-character argument');
            assert.true(summary.text.endsWith('…'), 'truncation is visible');
        });

        test('functions are named, not invoked', function (assert) {
            assert.strictEqual(summarize(function save() {}).text, 'function save()');
            assert.strictEqual(summarize(() => {}).kind, 'function');
        });
    });

    module('DOM values', function () {
        test('a DOM event is reduced to safe fields', function (assert) {
            const event = new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true });
            const summary = summarize(event);

            assert.strictEqual(summary.kind, 'event');
            assert.strictEqual(summary.text, 'keydown event');
            assert.strictEqual(summary.fields.key, 'Enter');
            assert.strictEqual(summary.fields.ctrlKey, 'true');
        });

        test('an input event exposes value and checked, and nothing else off target', function (assert) {
            const input = document.createElement('input');

            input.type = 'checkbox';
            input.checked = true;
            input.value = 'on';

            const event = new Event('change');

            Object.defineProperty(event, 'target', { value: input });

            const summary = summarize(event);

            assert.strictEqual(summary.fields['target.checked'], 'true');
            assert.strictEqual(summary.fields['target.value'], 'on');
            assert.strictEqual(summary.fields.target, 'input');
            assert.notOk('innerHTML' in summary.fields, 'the element itself is not walked');
        });

        test('a DOM node is described by its tag only', function (assert) {
            assert.deepEqual(summarize(document.createElement('div')), { kind: 'node', text: '<div>' });
        });

        test('a File reports name, type and size but never contents', function (assert) {
            const file = new File(['secret contents'], 'report.pdf', { type: 'application/pdf' });
            const summary = summarize(file);

            assert.strictEqual(summary.kind, 'file');
            assert.strictEqual(summary.text, 'File "report.pdf"');
            assert.strictEqual(summary.fields.type, 'application/pdf');
            assert.notOk(JSON.stringify(summary).includes('secret contents'), 'contents are never read');
        });
    });

    module('application values', function () {
        test('an Error is summarized by name and message', function (assert) {
            assert.deepEqual(summarize(new TypeError('bad thing')), { kind: 'error', text: 'TypeError: bad thing' });
        });

        test('a Date is summarized in ISO form', function (assert) {
            assert.strictEqual(summarize(new Date('2026-03-16T00:00:00Z')).text, '2026-03-16T00:00:00.000Z');
        });

        test('an invalid Date does not throw', function (assert) {
            assert.strictEqual(summarize(new Date('nonsense')).text, 'Invalid Date');
        });

        test('an ember-data-shaped record is reduced to its identity', function (assert) {
            const record = { id: 'order_1', isDestroyed: false, currentState: {}, secretToken: 'sk_live_xyz' };
            const summary = summarize(record);

            assert.strictEqual(summary.kind, 'record');
            assert.notOk(JSON.stringify(summary).includes('sk_live_xyz'), 'record attributes are never walked');
        });

        test('a service is not walked', function (assert) {
            assert.deepEqual(summarize({ isServiceFactory: true, apiKey: 'secret' }), { kind: 'service', text: '(service)' });
        });
    });

    module('hostile structures', function () {
        test('a cyclic object is summarized rather than exploding', function (assert) {
            const node = { name: 'a' };

            node.self = node;

            const summary = summarize(node);

            assert.strictEqual(summary.fields.self, '(circular)');
        });

        test('two objects referencing each other are handled', function (assert) {
            const a = {};
            const b = { a };

            a.b = b;

            assert.ok(summarize(a), 'no infinite recursion');
        });

        test('deep nesting stops at a bounded depth', function (assert) {
            const deep = { a: { b: { c: { d: { e: 'too far' } } } } };

            assert.notOk(JSON.stringify(summarize(deep)).includes('too far'), 'the log does not descend forever');
        });

        test('long arrays are truncated with a count', function (assert) {
            const summary = summarize(Array.from({ length: 50 }, (_, i) => i));

            assert.strictEqual(summary.text, 'Array(50)');
            assert.strictEqual(summary.items.length, 10, 'only the first few are shown');
            assert.strictEqual(summary.truncated, 40);
        });

        test('wide objects are truncated with a count', function (assert) {
            const wide = Object.fromEntries(Array.from({ length: 30 }, (_, i) => [`k${i}`, i]));

            assert.strictEqual(summarize(wide).truncated, 18);
        });

        test('a value whose getters throw is reported, not propagated', function (assert) {
            const hostile = {};

            Object.defineProperty(hostile, 'boom', {
                enumerable: true,
                get() {
                    throw new Error('nope');
                },
            });

            assert.strictEqual(summarize(hostile).kind, 'unavailable', 'the log degrades instead of crashing');
        });
    });

    module('argument lists', function () {
        test('summarizeArguments maps every argument', function (assert) {
            const summaries = summarizeArguments(['a', 1, null]);

            assert.strictEqual(summaries.length, 3);
            assert.strictEqual(summaries[0].text, '"a"');
        });

        test('an empty argument list is fine', function (assert) {
            assert.deepEqual(summarizeArguments([]), []);
            assert.deepEqual(summarizeArguments(), []);
        });
    });
});
