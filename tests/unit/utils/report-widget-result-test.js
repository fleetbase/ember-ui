import mapReportExecutionDefault, {
    REPORT_WIDGET_ROW_LIMIT,
    REPORT_WIDGET_MIN_REFRESH_MINUTES,
    REPORT_WIDGET_DEFAULT_REFRESH_MINUTES,
    normalizeReportColumns,
    mapReportExecution,
    storedReportResult,
    resolveReportWidgetResult,
    isFailedExecution,
    resolveRefreshInterval,
    reportExecutionErrorMessage,
} from '@fleetbase/ember-ui/utils/report-widget-result';
import { module, test } from 'qunit';

function rows(count) {
    return Array.from({ length: count }, (_, i) => ({ id: i + 1 }));
}

module('Unit | Utility | report-widget-result', function () {
    test('the defaults cap at 100 rows and leave polling off', function (assert) {
        assert.strictEqual(REPORT_WIDGET_ROW_LIMIT, 100);
        assert.strictEqual(REPORT_WIDGET_MIN_REFRESH_MINUTES, 5);
        assert.strictEqual(REPORT_WIDGET_DEFAULT_REFRESH_MINUTES, 0);
        assert.strictEqual(mapReportExecutionDefault, mapReportExecution, 'the default export maps an execution');
    });

    module('normalizeReportColumns', function () {
        test('it shapes strings and objects into name/label columns', function (assert) {
            assert.deepEqual(normalizeReportColumns(['total', { name: 'count', label: 'Count', type: 'int' }, { key: 'k' }, { alias: 'a', label: 'A' }]), [
                { name: 'total', label: 'total' },
                { name: 'count', label: 'Count', type: 'int' },
                { key: 'k', name: 'k', label: 'k' },
                { alias: 'a', name: 'a', label: 'A' },
            ]);
        });

        test('it drops entries without a name and tolerates non-arrays', function (assert) {
            assert.deepEqual(normalizeReportColumns([null, 3, { label: 'No name' }, { name: '' }]), []);
            assert.deepEqual(normalizeReportColumns(undefined), []);
            assert.deepEqual(normalizeReportColumns({ name: 'x' }), []);
        });
    });

    module('mapReportExecution', function () {
        test('it maps results and columns into the Report::Data shape', function (assert) {
            const result = mapReportExecution({
                success: true,
                results: [{ total: 42 }],
                columns: [{ name: 'total', label: 'Total' }],
                meta: { total_rows: 1, execution_time_ms: 12 },
            });

            assert.deepEqual(result, {
                result_columns: [{ name: 'total', label: 'Total' }],
                data: [{ total: 42 }],
                total_rows: 1,
                truncated: false,
                meta: { total_rows: 1, execution_time_ms: 12 },
                source: 'live',
            });
        });

        test('it caps the rows at the limit and reports the total', function (assert) {
            const result = mapReportExecution({ success: true, results: rows(250), columns: ['id'] });

            assert.strictEqual(result.data.length, 100);
            assert.deepEqual(result.data[99], { id: 100 });
            assert.strictEqual(result.total_rows, 250);
            assert.true(result.truncated);
        });

        test('a server total beyond the returned rows still marks the result truncated', function (assert) {
            const result = mapReportExecution({ results: rows(10), columns: ['id'], meta: { total_rows: 5000 } }, 10);

            assert.strictEqual(result.data.length, 10);
            assert.strictEqual(result.total_rows, 5000);
            assert.true(result.truncated);
        });

        test('a server total below the returned rows is ignored', function (assert) {
            const result = mapReportExecution({ results: rows(3), columns: ['id'], meta: { total_rows: 1 } });

            assert.strictEqual(result.total_rows, 3);
            assert.false(result.truncated);
        });

        test('it accepts `data` in place of `results` and survives an empty response', function (assert) {
            assert.deepEqual(mapReportExecution({ data: [{ a: 1 }], columns: ['a'] }).data, [{ a: 1 }]);

            const empty = mapReportExecution(undefined);
            assert.deepEqual(empty.result_columns, []);
            assert.deepEqual(empty.data, []);
            assert.deepEqual(empty.meta, {});
            assert.false(empty.truncated);

            assert.deepEqual(mapReportExecution({ results: 'nope', meta: 'nope' }).data, []);
        });
    });

    module('storedReportResult', function () {
        test('it shapes and caps the results stored on the record', function (assert) {
            const result = storedReportResult({ result_columns: [{ name: 'id', label: 'ID' }], data: rows(120), row_count: 120 });

            assert.strictEqual(result.source, 'stored');
            assert.deepEqual(result.result_columns, [{ name: 'id', label: 'ID' }]);
            assert.strictEqual(result.data.length, 100);
            assert.strictEqual(result.total_rows, 120);
            assert.true(result.truncated);
        });

        test('it prefers the stored meta total and handles a record without results', function (assert) {
            assert.strictEqual(storedReportResult({ data: rows(2), meta: { total_rows: 9 }, row_count: 4 }).total_rows, 9);

            const bare = storedReportResult({});
            assert.deepEqual(bare.result_columns, []);
            assert.deepEqual(bare.data, []);
            assert.strictEqual(bare.total_rows, 0);
        });

        test('there is nothing stored without a record', function (assert) {
            assert.strictEqual(storedReportResult(null), null);
        });
    });

    module('resolveReportWidgetResult', function () {
        test('a live result wins over the stored one', function (assert) {
            const live = mapReportExecution({ results: [{ id: 1 }], columns: ['id'] });
            assert.strictEqual(resolveReportWidgetResult(live, { data: rows(5) }), live);
        });

        test('without a live result it falls back to the stored results', function (assert) {
            const fallback = resolveReportWidgetResult(null, { result_columns: ['id'], data: rows(150) });

            assert.strictEqual(fallback.source, 'stored');
            assert.strictEqual(fallback.data.length, 100);
            assert.strictEqual(resolveReportWidgetResult(null, null), null);
        });
    });

    test('isFailedExecution flags missing and unsuccessful responses', function (assert) {
        assert.true(isFailedExecution(null));
        assert.true(isFailedExecution('oops'));
        assert.true(isFailedExecution({ success: false, error: 'bad' }));
        assert.false(isFailedExecution({ success: true, results: [] }));
        assert.false(isFailedExecution({ results: [] }), 'a response without a success flag is treated as a result');
    });

    test('resolveRefreshInterval is off by default and never faster than five minutes', function (assert) {
        assert.strictEqual(resolveRefreshInterval(undefined), 0);
        assert.strictEqual(resolveRefreshInterval({}), 0);
        assert.strictEqual(resolveRefreshInterval({ refreshInterval: 0 }), 0);
        assert.strictEqual(resolveRefreshInterval({ refreshInterval: -3 }), 0);
        assert.strictEqual(resolveRefreshInterval({ refreshInterval: 'soon' }), 0);
        assert.strictEqual(resolveRefreshInterval({ refreshInterval: 1 }), 5 * 60 * 1000, 'raised to the minimum');
        assert.strictEqual(resolveRefreshInterval({ refreshInterval: '15' }), 15 * 60 * 1000);
    });

    test('reportExecutionErrorMessage picks a readable message', function (assert) {
        assert.strictEqual(reportExecutionErrorMessage('Timed out'), 'Timed out');
        assert.strictEqual(reportExecutionErrorMessage(new Error('Boom')), 'Boom');
        assert.strictEqual(reportExecutionErrorMessage({ success: false, error: 'Bad query' }), 'Bad query');
        assert.strictEqual(reportExecutionErrorMessage({ errors: ['Not allowed'] }), 'Not allowed');
        assert.strictEqual(reportExecutionErrorMessage(null), 'The report could not be run.');
        assert.strictEqual(reportExecutionErrorMessage(''), 'The report could not be run.');
    });
});
