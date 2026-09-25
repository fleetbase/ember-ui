import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import { helper } from '@ember/component/helper';

function registerCapture(owner, sink) {
    owner.register(
        'helper:capture-value',
        helper(function ([value]) {
            sink.push(value);
            return '';
        })
    );
}

module('Integration | Helper | now', function (hooks) {
    setupRenderingTest(hooks);

    test('it produces a Date for the current moment when called without arguments', async function (assert) {
        const captured = [];
        registerCapture(this.owner, captured);

        const before = Date.now();
        await render(hbs`{{capture-value (now)}}`);
        const after = Date.now();

        assert.strictEqual(captured.length, 1, 'the helper produced a value');
        assert.true(captured[0] instanceof Date, 'the value is a Date');
        assert.true(captured[0].getTime() >= before, 'the date is not earlier than the render start');
        assert.true(captured[0].getTime() <= after, 'the date is not later than the render end');
    });

    test('it forwards a millisecond timestamp to the Date constructor', async function (assert) {
        const captured = [];
        registerCapture(this.owner, captured);
        this.set('timestamp', 0);

        await render(hbs`{{capture-value (now this.timestamp)}}`);

        assert.true(captured[0] instanceof Date, 'the value is a Date');
        assert.strictEqual(captured[0].getTime(), 0, 'the epoch timestamp is preserved exactly');
    });

    test('it forwards a large millisecond timestamp without loss', async function (assert) {
        const captured = [];
        registerCapture(this.owner, captured);
        this.set('timestamp', 4102444800000);

        await render(hbs`{{capture-value (now this.timestamp)}}`);

        assert.strictEqual(captured[0].getTime(), 4102444800000, 'the timestamp round trips');
    });

    test('it parses an ISO 8601 string argument', async function (assert) {
        const captured = [];
        registerCapture(this.owner, captured);
        this.set('iso', '2020-01-15T12:30:45.000Z');

        await render(hbs`{{capture-value (now this.iso)}}`);

        assert.strictEqual(captured[0].getTime(), Date.parse('2020-01-15T12:30:45.000Z'), 'the parsed time matches Date.parse');
    });

    test('it forwards multiple date component arguments', async function (assert) {
        const captured = [];
        registerCapture(this.owner, captured);

        await render(hbs`{{capture-value (now 2020 0 15 6 30 15)}}`);

        const date = captured[0];
        assert.strictEqual(date.getFullYear(), 2020, 'year');
        assert.strictEqual(date.getMonth(), 0, 'month');
        assert.strictEqual(date.getDate(), 15, 'day of month');
        assert.strictEqual(date.getHours(), 6, 'hours');
        assert.strictEqual(date.getMinutes(), 30, 'minutes');
        assert.strictEqual(date.getSeconds(), 15, 'seconds');
    });

    test('it produces an invalid Date for unparsable input rather than throwing', async function (assert) {
        const captured = [];
        registerCapture(this.owner, captured);
        this.set('garbage', 'not-a-date');

        await render(hbs`{{capture-value (now this.garbage)}}`);

        assert.true(captured[0] instanceof Date, 'still a Date instance');
        assert.true(Number.isNaN(captured[0].getTime()), 'the date is invalid');
    });

    test('it produces a distinct Date instance for every invocation', async function (assert) {
        const captured = [];
        registerCapture(this.owner, captured);

        await render(hbs`{{capture-value (now)}}{{capture-value (now)}}`);

        assert.strictEqual(captured.length, 2, 'two dates produced');
        assert.notStrictEqual(captured[0], captured[1], 'each invocation creates its own Date instance');
    });

    test('it renders the date as text when used directly', async function (assert) {
        this.set('timestamp', 0);

        await render(hbs`{{now this.timestamp}}`);

        assert.strictEqual(this.element.textContent.trim(), String(new Date(0)), 'the rendered text matches the stringified Date');
    });
});
