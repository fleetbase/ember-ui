import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click } from '@ember/test-helpers';
import { helper } from '@ember/component/helper';
import { hbs } from 'ember-cli-htmlbars';

function makeDropdown(sequence) {
    return {
        uniqueId: 'ember-basic-dropdown-1',
        isOpen: true,
        disabled: false,
        actions: {
            close: () => sequence.push('close'),
            open: () => {},
            toggle: () => {},
        },
    };
}

module('Integration | Helper | dropdown-fn', function (hooks) {
    setupRenderingTest(hooks);

    test('the returned closure invokes the wrapped function when called', async function (assert) {
        const sequence = [];
        this.set('dd', makeDropdown(sequence));
        this.set('handler', () => sequence.push('handler'));

        await render(hbs`<button type="button" id="go" {{on "click" (dropdown-fn this.dd this.handler)}}>Go</button>`);

        assert.deepEqual(sequence, [], 'nothing runs until the closure is invoked');

        await click('#go');

        assert.true(sequence.includes('handler'), 'the wrapped function runs on invocation');
    });

    test('the dropdown is closed before the wrapped function runs', async function (assert) {
        const sequence = [];
        this.set('dd', makeDropdown(sequence));
        this.set('handler', () => sequence.push('handler'));

        await render(hbs`<button type="button" id="go" {{on "click" (dropdown-fn this.dd this.handler)}}>Go</button>`);
        await click('#go');

        assert.deepEqual(sequence, ['close', 'handler'], 'close() runs first, then the action');
    });

    test('curried arguments are forwarded to the wrapped function', async function (assert) {
        const sequence = [];
        const received = [];
        this.set('dd', makeDropdown(sequence));
        this.set('handler', (...args) => received.push(args));

        await render(hbs`<button type="button" id="go" {{on "click" (dropdown-fn this.dd this.handler "order-123")}}>Go</button>`);
        await click('#go');

        assert.strictEqual(received.length, 1, 'the handler ran once');
        assert.strictEqual(received[0][0], 'order-123', 'the curried argument arrives first');
    });

    test('the raw DOM event is never handed to the wrapped function', async function (assert) {
        const sequence = [];
        const received = [];
        this.set('dd', makeDropdown(sequence));
        this.set('handler', (...args) => received.push(args));

        await render(hbs`<button type="button" id="go" {{on "click" (dropdown-fn this.dd this.handler "order-123")}}>Go</button>`);
        await click('#go');

        assert.false(
            received[0].some((arg) => typeof Event !== 'undefined' && arg instanceof Event),
            'invocation arguments from the DOM listener are swallowed by the helper'
        );
    });

    test('a dropdown without a close action still invokes the wrapped function', async function (assert) {
        const sequence = [];
        this.set('dd', { uniqueId: 'ember-basic-dropdown-2', isOpen: false });
        this.set('handler', () => sequence.push('handler'));

        await render(hbs`<button type="button" id="go" {{on "click" (dropdown-fn this.dd this.handler)}}>Go</button>`);
        await click('#go');

        assert.deepEqual(sequence, ['handler'], 'the missing close action is tolerated');
    });

    test('every invocation re-runs the wrapped function', async function (assert) {
        const sequence = [];
        this.set('dd', makeDropdown(sequence));
        this.set('handler', () => sequence.push('handler'));

        await render(hbs`<button type="button" id="go" {{on "click" (dropdown-fn this.dd this.handler)}}>Go</button>`);
        await click('#go');
        await click('#go');

        assert.deepEqual(sequence, ['close', 'handler', 'close', 'handler']);
    });
    // The helper calls the wrapped function with a Proxy as `this` so that an UNBOUND function
    // reaching for `this.something` fails loudly during development instead of silently reading
    // undefined. Each trap raises its own assertion. The closure has to be captured and called
    // directly: thrown from inside `{{on "click"}}` the assertion escapes as an uncaught global
    // error that neither `assert.rejects` nor `setupOnerror` can intercept.
    module('an unbound function is caught rather than silently misbehaving', function () {
        async function captureClosure(context, handler) {
            const captured = [];
            context.owner.register(
                'helper:capture-value',
                helper(function ([value]) {
                    captured.push(value);
                    return '';
                })
            );

            context.set('dd', makeDropdown([]));
            context.set('handler', handler);

            await render(hbs`{{capture-value (dropdown-fn this.dd this.handler)}}`);

            return captured[0];
        }

        test('reading a property off `this` asserts', async function (assert) {
            const invoke = await captureClosure(this, function () {
                return this.somethingUnbound;
            });

            assert.throws(invoke, /You accessed `this.somethingUnbound`/, 'the get trap names the property');
            assert.throws(invoke, /not bound to a valid `this` context/, 'and explains the cause');
        });

        test('writing a property to `this` asserts', async function (assert) {
            const invoke = await captureClosure(this, function () {
                this.somethingUnbound = 1;
            });

            assert.throws(invoke, /You accessed `this.somethingUnbound`/, 'the set trap raises too');
        });

        test('probing `this` with `in` asserts', async function (assert) {
            const invoke = await captureClosure(this, function () {
                return 'somethingUnbound' in this;
            });

            assert.throws(invoke, /You accessed `this.somethingUnbound`/, 'the has trap raises too');
        });
    });

    test('a function carrying an INVOKE method is called through it', async function (assert) {
        const sequence = [];
        const wrapped = function () {
            sequence.push('plain-call');
        };
        wrapped.invoke = (...args) => sequence.push(`invoke:${args.join(',')}`);

        this.set('dd', makeDropdown(sequence));
        this.set('handler', wrapped);

        await render(hbs`<button type="button" id="go" {{on "click" (dropdown-fn this.dd this.handler "alpha")}}>Go</button>`);
        await click('#go');

        assert.true(
            sequence.some((entry) => entry.startsWith('invoke:alpha')),
            `the INVOKE method takes precedence over calling the function itself (${sequence.join('|')})`
        );
        assert.false(sequence.includes('plain-call'), 'the function body is not called directly');
    });
});
