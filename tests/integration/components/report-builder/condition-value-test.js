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

        // The component always exposed an `isBoolean` getter; the template had no boolean branch,
        // so a boolean column was edited as free text. It gets a radio group now. (DEFECTS #3)
        test('a boolean column is edited with a radio group', async function (assert) {
            this.set('column', { type: 'boolean' });

            await render(TEMPLATE);

            assert.dom('input[type="text"]').doesNotExist('no free-text field for a boolean');
            assert.strictEqual(findAll('input[type="radio"]').length, 2, 'exactly True and False are offered');
            assert.dom('.report-builder-boolean-value').hasText('True False');
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
    // The boolean editor added for DEFECTS #3. A saved report round-trips through JSON and query
    // params, so the value can come back as a string or a number rather than a boolean.
    module('the boolean editor', function () {
        function radios() {
            return findAll('.report-builder-boolean-value input[type="radio"]');
        }

        test('neither option is selected until one is chosen', async function (assert) {
            this.set('column', { type: 'boolean' });

            await render(TEMPLATE);

            assert.false(radios()[0].checked, 'True is not preselected');
            assert.false(radios()[1].checked, 'and neither is False');
        });

        test('choosing True reports a real boolean', async function (assert) {
            this.set('column', { type: 'boolean' });
            await render(TEMPLATE);

            await click(radios()[0]);

            assert.deepEqual(changes[changes.length - 1], { value: true }, 'true, not the string "true"');
        });

        test('choosing False reports false rather than clearing the value', async function (assert) {
            this.set('column', { type: 'boolean' });
            await render(TEMPLATE);

            await click(radios()[1]);

            assert.deepEqual(changes[changes.length - 1], { value: false });
        });

        test('an existing boolean value is reflected in the selection', async function (assert) {
            this.set('column', { type: 'boolean' });
            this.set('value', true);

            await render(TEMPLATE);

            assert.true(radios()[0].checked, 'True is selected');
            assert.false(radios()[1].checked);
        });

        test('a value that round-tripped as a string still selects the right option', async function (assert) {
            this.set('column', { type: 'boolean' });
            this.set('value', 'false');

            await render(TEMPLATE);

            assert.false(radios()[0].checked);
            assert.true(radios()[1].checked, "the string 'false' selects False, not neither");
        });

        test('a value that round-tripped as a number still selects the right option', async function (assert) {
            this.set('column', { type: 'boolean' });
            this.set('value', 1);

            await render(TEMPLATE);

            assert.true(radios()[0].checked, '1 selects True');
        });

        test('an unrecognised value selects neither option', async function (assert) {
            this.set('column', { type: 'boolean' });
            this.set('value', 'maybe');

            await render(TEMPLATE);

            assert.false(radios()[0].checked);
            assert.false(radios()[1].checked);
        });

        test('two boolean editors do not share a radio group', async function (assert) {
            this.set('column', { type: 'boolean' });

            await render(hbs`
                <ReportBuilder::ConditionValue @column={{this.column}} @onChange={{this.onChange}} />
                <ReportBuilder::ConditionValue @column={{this.column}} @onChange={{this.onChange}} />
            `);

            const names = findAll('.report-builder-boolean-value input[type="radio"]').map((input) => input.name);
            assert.strictEqual(new Set(names).size, 2, 'each editor gets its own group name');
        });
    });
});
