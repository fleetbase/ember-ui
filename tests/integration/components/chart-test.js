import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, settled, find, clearRender } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import Chart, { _adapters } from 'chart.js/auto';

const LABELS = ['Jan', 'Feb', 'Mar'];
const DATASETS = [{ label: 'Orders', data: [3, 7, 5] }];

// A fixed instant so nothing here depends on the clock or the local calendar
// beyond the timezone offset, which every assertion below is written to tolerate.
const INSTANT = new Date(2024, 4, 15, 13, 45, 30, 123).getTime();

module('Integration | Component | chart', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        this.set('type', 'bar');
        this.set('labels', LABELS);
        this.set('datasets', DATASETS);
    });

    const TEMPLATE = hbs`
        <Chart
            @type={{this.type}}
            @labels={{this.labels}}
            @datasets={{this.datasets}}
            @options={{this.options}}
            @isLoading={{this.isLoading}}
            @loadingMessage={{this.loadingMessage}}
            @wrapperClass={{this.wrapperClass}}
        />
    `;

    module('rendering', function () {
        test('it renders a canvas and builds a chart on it', async function (assert) {
            await render(TEMPLATE);

            const canvas = find('canvas');
            assert.ok(canvas, 'a canvas is rendered');

            const chart = Chart.getChart(canvas);
            assert.ok(chart, 'a chart instance is attached to the canvas');
            assert.strictEqual(chart.config.type, 'bar');
            assert.deepEqual(chart.data.labels, LABELS);
            assert.deepEqual(
                chart.data.datasets.map((dataset) => dataset.label),
                ['Orders']
            );
        });

        test('the chart type is taken from the argument', async function (assert) {
            this.set('type', 'line');

            await render(TEMPLATE);

            assert.strictEqual(Chart.getChart(find('canvas')).config.type, 'line');
        });

        test('chart options are forwarded', async function (assert) {
            this.set('options', { responsive: false });

            await render(TEMPLATE);

            assert.false(Chart.getChart(find('canvas')).options.responsive);
        });

        test('a wrapper class is applied and splattributes reach the canvas', async function (assert) {
            this.set('wrapperClass', 'my-chart');

            await render(hbs`<Chart @type="bar" @labels={{this.labels}} @datasets={{this.datasets}} @wrapperClass={{this.wrapperClass}} data-test-chart="yes" />`);

            assert.dom('.ui-chart').hasClass('my-chart');
            assert.dom('canvas').hasAttribute('data-test-chart', 'yes');
        });
    });

    module('loading state', function () {
        test('no overlay is shown for eagerly supplied data', async function (assert) {
            await render(TEMPLATE);

            assert.dom('.overloader').doesNotExist();
        });

        test('the overlay is shown while the caller says it is loading', async function (assert) {
            this.set('isLoading', true);

            await render(TEMPLATE);

            assert.dom('.overloader').exists();
            assert.dom('.overloader').containsText('Loading...');
        });

        test('the loading message can be customised', async function (assert) {
            this.set('isLoading', true);
            this.set('loadingMessage', 'Crunching numbers');

            await render(TEMPLATE);

            assert.dom('.overloader').containsText('Crunching numbers');
        });

        test('a datasets function is awaited and its result charted', async function (assert) {
            let release;
            this.set('datasets', () => new Promise((resolve) => (release = () => resolve([{ label: 'Deferred', data: [1] }]))));

            await render(TEMPLATE);

            assert.dom('.overloader').exists('the overlay covers the pending load');
            assert.notOk(Chart.getChart(find('canvas')), 'no chart is built until the data arrives');

            release();
            await settled();

            assert.dom('.overloader').doesNotExist();
            assert.deepEqual(
                Chart.getChart(find('canvas')).data.datasets.map((dataset) => dataset.label),
                ['Deferred']
            );
        });

        // Until DEFECTS.md #21 was fixed this case could not be written at all: the catch left
        // the FUNCTION in `datasets`, Chart.js threw `datasets.forEach is not a function`, and
        // because the throw happens after an await inside {{did-insert}} it escaped as an
        // uncaught global error that aborted the whole QUnit run.
        test('a rejecting datasets function leaves an empty chart rather than crashing', async function (assert) {
            this.set('datasets', () => Promise.reject(new Error('upstream is down')));

            await render(TEMPLATE);

            const chart = Chart.getChart(find('canvas'));
            assert.ok(chart, 'a chart is still built');
            assert.deepEqual(chart.data.datasets, [], 'with no datasets');
            assert.dom('.overloader').doesNotExist('and the loading overlay is cleared');
        });

        test('the chart instance is destroyed when the component goes away', async function (assert) {
            this.set('mounted', true);

            await render(hbs`
                {{#if this.mounted}}
                    <Chart @type="bar" @labels={{this.labels}} @datasets={{this.datasets}} />
                {{/if}}
            `);

            const canvas = find('canvas');
            assert.ok(Chart.getChart(canvas), 'a chart is attached while mounted');

            this.set('mounted', false);
            await settled();

            assert.notOk(Chart.getChart(canvas), 'and released on teardown');
        });
    });

    module('the date-fns adapter it installs', function (hooks) {
        // The component overrides Chart.js's global date adapter as part of rendering,
        // so render once and then exercise the installed adapter directly.
        hooks.beforeEach(async function () {
            await render(TEMPLATE);
        });

        // Chart.js exposes the date adapter as a class and `override()` writes onto its
        // prototype, so the installed implementation is reached through an instance.
        function adapter() {
            return new _adapters._date({});
        }

        test('it advertises a format for every supported unit', function (assert) {
            const formats = adapter().formats();

            assert.deepEqual(Object.keys(formats), ['datetime', 'millisecond', 'second', 'minute', 'hour', 'day', 'week', 'month', 'quarter', 'year']);
            assert.strictEqual(formats.year, 'yyyy');
        });

        test('parse accepts numbers, dates, ISO strings and explicit formats', function (assert) {
            assert.strictEqual(adapter().parse(INSTANT), INSTANT, 'a timestamp passes through');
            assert.strictEqual(adapter().parse(new Date(INSTANT)), INSTANT, 'a Date is converted');
            assert.strictEqual(adapter().parse('2024-05-15T00:00:00'), new Date(2024, 4, 15).getTime(), 'an ISO string is parsed');
            assert.strictEqual(adapter().parse('15/05/2024', 'dd/MM/yyyy'), new Date(2024, 4, 15).getTime(), 'an explicit format is honoured');
        });

        test('parse rejects nothing-values and unparseable input', function (assert) {
            assert.strictEqual(adapter().parse(null), null);
            assert.strictEqual(adapter().parse(undefined), null);
            assert.strictEqual(adapter().parse('not a date'), null);
            assert.strictEqual(adapter().parse('31/31/2024', 'dd/MM/yyyy'), null, 'an impossible date is rejected');
        });

        test('format renders a time with the given pattern', function (assert) {
            assert.strictEqual(adapter().format(INSTANT, 'yyyy'), '2024');
            assert.strictEqual(adapter().format(INSTANT, 'MMM d'), 'May 15');
        });

        test('add moves a time by each supported unit', function (assert) {
            const cases = [
                ['millisecond', 1, 1],
                ['second', 1, 1000],
                ['minute', 1, 60 * 1000],
                ['hour', 1, 60 * 60 * 1000],
                ['day', 1, 24 * 60 * 60 * 1000],
                ['week', 1, 7 * 24 * 60 * 60 * 1000],
            ];

            for (const [unit, amount, expectedDelta] of cases) {
                const moved = adapter().add(INSTANT, amount, unit);
                assert.strictEqual(moved.getTime() - INSTANT, expectedDelta, `${unit} advances by the right amount`);
            }

            assert.strictEqual(adapter().add(INSTANT, 1, 'month').getMonth(), 5, 'a month advances the calendar month');
            assert.strictEqual(adapter().add(INSTANT, 1, 'quarter').getMonth(), 7, 'a quarter advances three months');
            assert.strictEqual(adapter().add(INSTANT, 1, 'year').getFullYear(), 2025, 'a year advances the calendar year');
        });

        test('add leaves the time alone for an unknown unit', function (assert) {
            assert.strictEqual(adapter().add(INSTANT, 5, 'fortnight'), INSTANT);
        });

        test('diff measures the gap in each supported unit', function (assert) {
            const later = new Date(2026, 4, 15, 13, 45, 30, 123).getTime();

            assert.strictEqual(adapter().diff(later, INSTANT, 'year'), 2);
            assert.strictEqual(adapter().diff(later, INSTANT, 'quarter'), 8);
            assert.strictEqual(adapter().diff(later, INSTANT, 'month'), 24);
            assert.strictEqual(adapter().diff(INSTANT + 7 * 24 * 3600 * 1000, INSTANT, 'week'), 1);
            assert.strictEqual(adapter().diff(INSTANT + 24 * 3600 * 1000, INSTANT, 'day'), 1);
            assert.strictEqual(adapter().diff(INSTANT + 3600 * 1000, INSTANT, 'hour'), 1);
            assert.strictEqual(adapter().diff(INSTANT + 60 * 1000, INSTANT, 'minute'), 1);
            assert.strictEqual(adapter().diff(INSTANT + 1000, INSTANT, 'second'), 1);
            assert.strictEqual(adapter().diff(INSTANT + 5, INSTANT, 'millisecond'), 5);
        });

        test('diff reports zero for an unknown unit', function (assert) {
            assert.strictEqual(adapter().diff(INSTANT + 1000, INSTANT, 'fortnight'), 0);
        });

        test('startOf truncates to each supported unit', function (assert) {
            assert.strictEqual(adapter().startOf(INSTANT, 'second').getMilliseconds(), 0);
            assert.strictEqual(adapter().startOf(INSTANT, 'minute').getSeconds(), 0);
            assert.strictEqual(adapter().startOf(INSTANT, 'hour').getMinutes(), 0);
            assert.strictEqual(adapter().startOf(INSTANT, 'day').getHours(), 0);
            assert.strictEqual(adapter().startOf(INSTANT, 'week').getDay(), 0, 'the week starts on Sunday by default');
            assert.strictEqual(adapter().startOf(INSTANT, 'isoWeek', 1).getDay(), 1, 'the weekday can be chosen');
            assert.strictEqual(adapter().startOf(INSTANT, 'month').getDate(), 1);
            assert.strictEqual(adapter().startOf(INSTANT, 'quarter').getMonth(), 3, 'May falls in the quarter starting April');
            assert.strictEqual(adapter().startOf(INSTANT, 'year').getMonth(), 0);
        });

        test('startOf leaves the time alone for an unknown unit', function (assert) {
            assert.strictEqual(adapter().startOf(INSTANT, 'fortnight'), INSTANT);
        });

        test('endOf extends to each supported unit', function (assert) {
            assert.strictEqual(adapter().endOf(INSTANT, 'second').getMilliseconds(), 999);
            assert.strictEqual(adapter().endOf(INSTANT, 'minute').getSeconds(), 59);
            assert.strictEqual(adapter().endOf(INSTANT, 'hour').getMinutes(), 59);
            assert.strictEqual(adapter().endOf(INSTANT, 'day').getHours(), 23);
            assert.strictEqual(adapter().endOf(INSTANT, 'week').getDay(), 6, 'the week ends on Saturday');
            assert.strictEqual(adapter().endOf(INSTANT, 'month').getDate(), 31, 'May has 31 days');
            assert.strictEqual(adapter().endOf(INSTANT, 'quarter').getMonth(), 5, 'the quarter ends in June');
            assert.strictEqual(adapter().endOf(INSTANT, 'year').getMonth(), 11);
        });

        test('endOf leaves the time alone for an unknown unit', function (assert) {
            assert.strictEqual(adapter().endOf(INSTANT, 'fortnight'), INSTANT);
        });
    });
    // The dataset loader awaits, and the component can be torn down while it is in flight.
    // Building a chart against a detached canvas after that would leak it.
    test('a component destroyed while its datasets load does not build a chart', async function (assert) {
        let releaseDatasets;
        this.set(
            'datasets',
            () =>
                new Promise((resolve) => {
                    releaseDatasets = () => resolve(DATASETS);
                })
        );

        await render(TEMPLATE);
        assert.dom('canvas').exists('the canvas is rendered while the datasets load');

        // Tear the component down with the load still pending, then let it finish.
        await clearRender();
        releaseDatasets();
        await settled();

        assert.dom('canvas').doesNotExist('nothing is left behind');
    });
});
