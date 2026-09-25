import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, find, findAll } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

const INPUT = '.filter-date-input';
const DAY = '.air-datepicker-cell.-day-:not(.-other-month-)';

async function openCalendar() {
    await click(INPUT);
}

module('Integration | Component | filter/date', function (hooks) {
    setupRenderingTest(hooks);

    let changes;
    let dateChanges;

    hooks.beforeEach(function () {
        changes = [];
        dateChanges = [];
        this.set('filter', { key: 'created_at' });
        this.set('onChange', (filter, value) => changes.push([filter.key, value]));
        this.set('onDateChange', (filter, date) => dateChanges.push([filter.key, date]));
    });

    const TEMPLATE = hbs`<Filter::Date @filter={{this.filter}} @value={{this.value}} @placeholder={{this.placeholder}} @onChange={{this.onChange}} @onDateChange={{this.onDateChange}} />`;

    test('it renders a date field', async function (assert) {
        await render(TEMPLATE);

        assert.dom('.filter-date').exists();
        assert.dom(INPUT).exists('the field is styled as a filter input');
        assert.strictEqual(find('.air-datepicker'), null, 'the calendar stays closed until asked for');
    });

    test('a placeholder can be supplied', async function (assert) {
        this.set('placeholder', 'Any date');

        await render(TEMPLATE);

        assert.dom(INPUT).hasAttribute('placeholder', 'Any date');
    });

    test('an incoming value is shown in the field', async function (assert) {
        this.set('value', '2026-01-05,2026-01-09');

        await render(TEMPLATE);

        assert.dom(INPUT).hasValue('2026-01-05,2026-01-09');
    });

    test('the field opens a calendar', async function (assert) {
        await render(TEMPLATE);
        await openCalendar();

        assert.ok(find('.air-datepicker'), 'the calendar opens');
        assert.true(findAll(DAY).length >= 28, 'a full month of days is offered');
    });

    test('picking a day reports the formatted range and the raw dates', async function (assert) {
        await render(TEMPLATE);
        await openCalendar();
        await click(findAll(DAY)[9]);

        assert.strictEqual(changes.length, 1, 'the choice is reported once');
        assert.strictEqual(changes[0][0], 'created_at');
        assert.true(Array.isArray(changes[0][1]), 'a range filter reports a list of formatted dates');
        assert.strictEqual(changes[0][1].length, 1, 'only the start of the range is chosen so far');
        assert.true(/^\d{4}-\d{2}-\d{2}$/.test(changes[0][1][0]), 'formatted as yyyy-MM-dd');

        assert.strictEqual(dateChanges.length, 1, 'the raw date is reported alongside');
        assert.true(dateChanges[0][1][0] instanceof Date);
    });

    test('picking a second day completes the range', async function (assert) {
        await render(TEMPLATE);
        await openCalendar();
        await click(findAll(DAY)[9]);
        await click(findAll(DAY)[14]);

        assert.strictEqual(changes.length, 2);
        assert.strictEqual(changes[1][1].length, 2, 'both ends of the range are reported');
    });

    test('it picks happily without any handlers', async function (assert) {
        await render(hbs`<Filter::Date @filter={{this.filter}} />`);
        await openCalendar();
        await click(findAll(DAY)[9]);

        assert.dom('.air-datepicker-cell.-selected-').exists('the chosen day is marked');
    });

    test('it reports the change without an onDateChange handler', async function (assert) {
        await render(hbs`<Filter::Date @filter={{this.filter}} @onChange={{this.onChange}} />`);
        await openCalendar();
        await click(findAll(DAY)[9]);

        assert.strictEqual(changes.length, 1);
        assert.deepEqual(dateChanges, [], 'nothing is reported to the absent handler');
    });
});
