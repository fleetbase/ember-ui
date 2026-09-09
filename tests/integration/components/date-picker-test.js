import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, find, findAll } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

const INPUT = '.fleetbase-date-picker';
const DAY = '.air-datepicker-cell.-day-:not(.-other-month-)';

function days() {
    return findAll(DAY);
}

module('Integration | Component | date-picker', function (hooks) {
    setupRenderingTest(hooks);

    let selections;
    let changes;
    let dateChanges;

    hooks.beforeEach(function () {
        selections = [];
        changes = [];
        dateChanges = [];
        this.set('onSelect', (selection) => selections.push(selection));
        this.set('onChange', (date) => changes.push(date));
        this.set('onDateChanged', (formatted) => dateChanges.push(formatted));
    });

    const TEMPLATE = hbs`
        <DatePicker
            @value={{this.value}}
            @placeholder={{this.placeholder}}
            @dateFormat={{this.dateFormat}}
            @inline={{this.inline}}
            @class={{this.class}}
            @onSelect={{this.onSelect}}
            @onChange={{this.onChange}}
            @onDateChanged={{this.onDateChanged}}
        />
    `;

    module('rendering', function () {
        test('it renders a date field with the calendar closed', async function (assert) {
            await render(TEMPLATE);

            assert.dom('.date-picker-container').exists();
            assert.dom(INPUT).exists();
            assert.dom(INPUT).hasAttribute('autocomplete', 'off');
            assert.strictEqual(find('.air-datepicker'), null, 'the calendar is not shown yet');
        });

        test('a placeholder can be supplied', async function (assert) {
            this.set('placeholder', 'Pick a date');

            await render(TEMPLATE);

            assert.dom(INPUT).hasAttribute('placeholder', 'Pick a date');
        });

        test('extra classes and splattributes are forwarded to the field', async function (assert) {
            await render(hbs`<DatePicker @class="my-picker" name="delivered_at" />`);

            assert.dom(INPUT).hasClass('my-picker');
            assert.dom(INPUT).hasAttribute('name', 'delivered_at');
        });

        test('an inline picker shows the calendar straight away', async function (assert) {
            this.set('inline', true);

            await render(TEMPLATE);

            assert.ok(find('.air-datepicker'), 'the calendar is always visible');
            assert.true(days().length >= 28);
        });

        test('the calendar is rendered inside the component, not the page body', async function (assert) {
            await render(TEMPLATE);
            await click(INPUT);

            assert.ok(find('.date-picker-container .air-datepicker'), 'the calendar is contained by the picker');
        });
    });

    module('reading the incoming value', function () {
        test('a single date is shown and preselected', async function (assert) {
            this.set('value', '2026-03-12');

            await render(TEMPLATE);

            assert.dom(INPUT).hasValue('2026-03-12');

            await click(INPUT);
            assert.dom('.air-datepicker-cell.-selected-').exists('the day is marked in the calendar');
        });

        // A picker that is not a range (or multi-date) picker keeps only one selected day,
        // so these cases pass @range through to prove both parsed dates arrive.
        const RANGE_TEMPLATE = hbs`<DatePicker @value={{this.value}} @range={{true}} />`;

        test('a comma separated pair is parsed into two dates', async function (assert) {
            this.set('value', '2026-03-12,2026-03-15');

            await render(RANGE_TEMPLATE);
            await click(INPUT);

            assert.strictEqual(findAll('.air-datepicker-cell.-selected-').length, 2, 'both days are marked');
        });

        test('a list of dates is used as given', async function (assert) {
            this.set('value', [new Date(2026, 2, 12), new Date(2026, 2, 15)]);

            await render(RANGE_TEMPLATE);
            await click(INPUT);

            assert.strictEqual(findAll('.air-datepicker-cell.-selected-').length, 2);
        });

        test('a single date without a range keeps only that day selected', async function (assert) {
            this.set('value', '2026-03-12');

            await render(TEMPLATE);
            await click(INPUT);

            assert.strictEqual(findAll('.air-datepicker-cell.-selected-').length, 1);
        });
    });

    module('choosing a date', function () {
        test('it reports the choice three ways', async function (assert) {
            await render(TEMPLATE);
            await click(INPUT);
            await click(days()[9]);

            assert.strictEqual(selections.length, 1, 'onSelect receives the whole selection');
            assert.true(selections[0].date instanceof Date);

            assert.strictEqual(changes.length, 1, 'onChange receives the date');
            assert.true(changes[0] instanceof Date);

            assert.strictEqual(dateChanges.length, 1, 'onDateChanged receives the formatted date');
            assert.true(/^\d{4}-\d{2}-\d{2}$/.test(dateChanges[0]), 'formatted as yyyy-MM-dd by default');
        });

        test('the date format can be changed', async function (assert) {
            this.set('dateFormat', 'dd/MM/yyyy');

            await render(TEMPLATE);
            await click(INPUT);
            await click(days()[9]);

            assert.true(/^\d{2}\/\d{2}\/\d{4}$/.test(dateChanges[0]), 'the chosen format is used');
            assert.dom(INPUT).hasValue(dateChanges[0], 'and shown in the field');
        });

        test('it picks happily with no handlers at all', async function (assert) {
            await render(hbs`<DatePicker />`);
            await click(INPUT);
            await click(days()[9]);

            assert.dom('.air-datepicker-cell.-selected-').exists('the day is still marked');
        });

        test('it reports through onChange alone', async function (assert) {
            await render(hbs`<DatePicker @onChange={{this.onChange}} />`);
            await click(INPUT);
            await click(days()[9]);

            assert.strictEqual(changes.length, 1);
            assert.deepEqual(selections, [], 'no other handler is invoked');
            assert.deepEqual(dateChanges, []);
        });
    });
});
