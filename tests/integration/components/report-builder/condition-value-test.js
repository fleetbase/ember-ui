import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, fillIn, click, find, findAll } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

const DAY = '.air-datepicker-cell.-day-:not(.-other-month-)';

module('Integration | Component | report-builder/condition-value', function (hooks) {
    setupRenderingTest(hooks);

    let changes;

    hooks.beforeEach(function () {
        changes = [];
        this.set('onChange', (payload) => changes.push(payload));
    });

    const TEMPLATE = hbs`<ReportBuilder::ConditionValue @column={{this.column}} @value={{this.value}} @onChange={{this.onChange}} />`;

    module('choosing an editor for the column type', function () {
        test('an untyped column gets a plain text field', async function (assert) {
            await render(TEMPLATE);

            assert.dom('input[type="text"]').exists();
            assert.strictEqual(find('textarea'), null);
        });

        test('a string column gets a plain text field', async function (assert) {
            this.set('column', { type: 'string' });

            await render(TEMPLATE);

            assert.dom('input[type="text"]').exists();
        });

        test('an unrecognised type falls back to a text field', async function (assert) {
            this.set('column', { type: 'geometry' });

            await render(TEMPLATE);

            assert.dom('input[type="text"]').exists();
        });

        test('an integer column gets a number field', async function (assert) {
            this.set('column', { type: 'integer' });

            await render(TEMPLATE);

            assert.dom('input[type="number"]').exists();
            assert.dom('input[type="number"]').hasClass('w-32');
        });

        test('a number column gets a number field', async function (assert) {
            this.set('column', { type: 'number' });

            await render(TEMPLATE);

            assert.dom('input[type="number"]').exists();
        });

        test('a json column gets a textarea', async function (assert) {
            this.set('column', { type: 'json' });

            await render(TEMPLATE);

            assert.dom('textarea').exists();
            assert.dom('textarea').hasAttribute('rows', '2');
        });

        test('a date column gets a date picker formatted to the day', async function (assert) {
            this.set('column', { type: 'date' });

            await render(TEMPLATE);

            assert.dom('.fleetbase-date-picker').exists();
            assert.dom('.fleetbase-date-picker').hasClass('w-40');
        });

        test('a datetime column gets a wider date picker', async function (assert) {
            this.set('column', { type: 'datetime' });

            await render(TEMPLATE);

            assert.dom('.fleetbase-date-picker').exists();
            assert.dom('.fleetbase-date-picker').hasClass('w-52');
        });

        test('a boolean column currently falls through to a text field', async function (assert) {
            this.set('column', { type: 'boolean' });

            await render(TEMPLATE);

            // The component exposes an `isBoolean` getter, but the template has no boolean
            // branch, so a boolean condition is edited as free text.
            assert.dom('input[type="text"]').exists();
        });
    });

    module('showing the current value', function () {
        test('a text value is shown', async function (assert) {
            this.set('value', 'pending');

            await render(TEMPLATE);

            assert.dom('input[type="text"]').hasValue('pending');
        });

        test('a number value is shown', async function (assert) {
            this.setProperties({ column: { type: 'integer' }, value: 42 });

            await render(TEMPLATE);

            assert.dom('input[type="number"]').hasValue('42');
        });

        test('a json value is shown', async function (assert) {
            this.setProperties({ column: { type: 'json' }, value: '{"a":1}' });

            await render(TEMPLATE);

            assert.dom('textarea').hasValue('{"a":1}');
        });

        test('a date value is shown', async function (assert) {
            this.setProperties({ column: { type: 'date' }, value: '2026-03-12' });

            await render(TEMPLATE);

            assert.dom('.fleetbase-date-picker').hasValue('2026-03-12');
        });
    });

    module('reporting changes', function () {
        test('typing text reports what was typed', async function (assert) {
            await render(TEMPLATE);
            await fillIn('input[type="text"]', 'pending');

            assert.strictEqual(changes.length, 1, 'a change is reported');
            assert.strictEqual(changes[0].value, 'pending');
        });

        test('typing a number reports what was typed', async function (assert) {
            this.set('column', { type: 'integer' });

            await render(TEMPLATE);
            await fillIn('input[type="number"]', '42');

            assert.strictEqual(changes[0].value, '42');
        });

        test('typing json reports what was typed', async function (assert) {
            this.set('column', { type: 'json' });

            await render(TEMPLATE);
            await fillIn('textarea', '{"a":1}');

            assert.strictEqual(changes[0].value, '{"a":1}');
        });

        test('choosing a date reports it correctly', async function (assert) {
            this.set('column', { type: 'date' });

            await render(TEMPLATE);
            await click('.fleetbase-date-picker');
            await click(findAll(DAY)[9]);

            assert.strictEqual(changes.length, 1);
            assert.true(changes[0].value instanceof Date, 'the date branch passes the value straight through');
        });

        test('it reports happily without an onChange handler', async function (assert) {
            await render(hbs`<ReportBuilder::ConditionValue />`);
            await fillIn('input[type="text"]', 'pending');

            assert.dom('input[type="text"]').exists('the editor survives');
        });
    });
});
