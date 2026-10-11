/**
 * Helpers for the dashboard report widget, which runs its report live and renders the
 * result through `Report::Data` (an object with `result_columns` and `data`).
 */

/** The most rows the widget renders from one run. */
export const REPORT_WIDGET_ROW_LIMIT = 100;

/**
 * The shortest polling interval, in minutes. Every execute writes usage stats, a cache entry
 * and an execution-log row on the server, so the widget never polls faster than this.
 */
export const REPORT_WIDGET_MIN_REFRESH_MINUTES = 5;

/** Polling is off unless the widget's options ask for it. */
export const REPORT_WIDGET_DEFAULT_REFRESH_MINUTES = 0;

/**
 * Normalize the columns of a report run into `{ name, label }` objects. Plain strings become
 * a column named and labelled by the string; entries without a usable name are dropped.
 *
 * @param {Array} columns
 * @return {Array<{name: string, label: string}>}
 */
export function normalizeReportColumns(columns) {
    if (!Array.isArray(columns)) {
        return [];
    }

    return columns
        .map((column) => {
            if (typeof column === 'string') {
                return { name: column, label: column };
            }

            if (!column || typeof column !== 'object') {
                return null;
            }

            const name = column.name ?? column.key ?? column.alias ?? null;
            if (name === null || name === undefined || name === '') {
                return null;
            }

            return { ...column, name, label: column.label ?? name };
        })
        .filter(Boolean);
}

/**
 * Cap a list of rows and describe how much was left out.
 *
 * @param {Array} rows
 * @param {Number} totalRows the server's count, when it reports one
 * @param {Number} limit
 */
function capRows(rows, totalRows, limit) {
    const list = Array.isArray(rows) ? rows : [];
    const total = Number.isFinite(totalRows) && totalRows >= list.length ? totalRows : list.length;
    const data = list.slice(0, limit);

    return { data, total_rows: total, truncated: total > data.length };
}

/**
 * Map the response of `POST reports/{id}/execute` (`{ success, results, columns, meta }`) into
 * the shape `Report::Data` renders, capped at `limit` rows.
 *
 * @param {Object} response
 * @param {Number} [limit]
 * @return {{result_columns: Array, data: Array, meta: Object, total_rows: Number, truncated: Boolean, source: String}}
 */
export function mapReportExecution(response, limit = REPORT_WIDGET_ROW_LIMIT) {
    const meta = response?.meta && typeof response.meta === 'object' ? response.meta : {};
    const rows = response?.results ?? response?.data ?? [];

    return {
        result_columns: normalizeReportColumns(response?.columns),
        ...capRows(rows, meta.total_rows, limit),
        meta,
        source: 'live',
    };
}

/**
 * The results stored on the report record, capped and shaped like a live run. This is what
 * the widget shows when a live run fails.
 *
 * @param {Object} report
 * @param {Number} [limit]
 */
export function storedReportResult(report, limit = REPORT_WIDGET_ROW_LIMIT) {
    if (!report) {
        return null;
    }

    const meta = report.meta && typeof report.meta === 'object' ? report.meta : {};

    return {
        result_columns: normalizeReportColumns(report.result_columns),
        ...capRows(report.data, meta.total_rows ?? report.row_count, limit),
        meta,
        source: 'stored',
    };
}

/**
 * Choose what the widget renders: the latest live run when there is one, otherwise the
 * results stored on the record.
 *
 * @param {Object|null} liveResult
 * @param {Object|null} report
 * @param {Number} [limit]
 */
export function resolveReportWidgetResult(liveResult, report, limit = REPORT_WIDGET_ROW_LIMIT) {
    return liveResult ?? storedReportResult(report, limit);
}

/**
 * Whether a response from the execute endpoint is a failed run.
 *
 * @param {Object} response
 */
export function isFailedExecution(response) {
    return !response || typeof response !== 'object' || response.success === false;
}

/**
 * The polling interval in milliseconds from the widget's options (`refreshInterval`, in
 * minutes). Missing, zero, negative or non-numeric values turn polling off (0); positive
 * values are raised to the minimum.
 *
 * @param {Object} options
 * @return {Number}
 */
export function resolveRefreshInterval(options) {
    const minutes = Number(options?.refreshInterval ?? REPORT_WIDGET_DEFAULT_REFRESH_MINUTES);
    if (!Number.isFinite(minutes) || minutes <= 0) {
        return 0;
    }

    return Math.max(minutes, REPORT_WIDGET_MIN_REFRESH_MINUTES) * 60 * 1000;
}

/**
 * The message to show inline when a run fails.
 *
 * @param {*} error
 */
export function reportExecutionErrorMessage(error) {
    if (typeof error === 'string' && error) {
        return error;
    }

    const message = error?.message ?? error?.error ?? error?.errors?.[0];
    return typeof message === 'string' && message ? message : 'The report could not be run.';
}

export default mapReportExecution;
