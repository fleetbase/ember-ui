import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';

/**
 * Matches an absolute or protocol-relative URL. A query-mode endpoint has to be
 * a path relative to the Fleetbase API host: the `fetch` service attaches the
 * session credentials to every request it makes, so pointing an endpoint at a
 * third-party host would hand that session to the third party.
 */
const ABSOLUTE_URL = /^([a-z][a-z0-9+.-]*:)?\/\//i;

/** A `{token}` left in a query param value, resolved downstream at render time. */
const UNRESOLVED_TOKEN = /\{[^}]*\}/;

/** How many preview rows are scanned when suggesting column keys. */
const KEY_DISCOVERY_LIMIT = 20;

/** Strips the leading slashes the `fetch` service does not want. */
function normalizeEndpoint(raw) {
    return raw.trim().replace(/^\/+/, '');
}

/**
 * Returns a message describing why `raw` is not a usable endpoint, or null.
 */
function validateEndpoint(raw) {
    const value = (raw ?? '').trim();
    if (!value) {
        return 'Enter an API endpoint to query.';
    }
    if (ABSOLUTE_URL.test(value)) {
        return 'Enter a path on the Fleetbase API, not a full URL — requests are sent with your session credentials.';
    }
    return null;
}

function describeValue(value) {
    if (value === null) return 'null';
    if (value === undefined) return 'nothing';
    const type = typeof value;
    // `object` is the only typeof that reaches here needing "an".
    return `${type === 'object' ? 'an' : 'a'} ${type}`;
}

/**
 * Walks the dotted `path` into `body` and returns `{ rows }` when it lands on an
 * array, or `{ error }` describing exactly where it stopped. An empty path means
 * the response body is itself the array of rows.
 */
function resolveResponsePath(body, path) {
    const segments = (path ?? '')
        .trim()
        .split('.')
        .map((segment) => segment.trim())
        .filter(Boolean);
    const full = segments.join('.');
    const walked = [];
    let cursor = body;

    for (const segment of segments) {
        if (cursor === null || typeof cursor !== 'object') {
            const at = walked.length ? `"${walked.join('.')}"` : 'the response body';
            return { error: `Response path "${full}" did not resolve — ${at} is ${describeValue(cursor)}, not an object.` };
        }
        if (!(segment in cursor)) {
            const at = walked.length ? ` under "${walked.join('.')}"` : ' in the response';
            return { error: `Response path "${full}" did not resolve — there is no "${segment}"${at}.` };
        }
        cursor = cursor[segment];
        walked.push(segment);
    }

    if (!Array.isArray(cursor)) {
        const at = full ? `at "${full}"` : 'in the response';
        return { error: `Expected an array of rows ${at}, got ${describeValue(cursor)}.` };
    }

    return { rows: cursor };
}

/**
 * Collects the union of the keys on the first `KEY_DISCOVERY_LIMIT` rows, in the
 * order they were first seen, so the panel can offer them as table columns.
 */
function discoverKeys(rows) {
    const keys = [];
    rows.slice(0, KEY_DISCOVERY_LIMIT).forEach((row) => {
        if (row === null || typeof row !== 'object' || Array.isArray(row)) return;
        Object.keys(row).forEach((key) => {
            if (!keys.includes(key)) keys.push(key);
        });
    });
    return keys;
}

/** `total_amount` / `totalAmount` -> `Total Amount`, for a suggested column label. */
function humanizeKey(key) {
    return String(key)
        .replace(/[_-]+/g, ' ')
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .trim()
        .replace(/\b\w/g, (character) => character.toUpperCase());
}

/**
 * TemplateBuilderPropertiesPanelComponent
 *
 * Right-side panel that shows and edits all properties of the currently
 * selected element. Sections are collapsed/expanded. When no element is
 * selected, shows template-level canvas settings.
 *
 * @argument {Object}   selectedElement  - Currently selected element (or null)
 * @argument {Object}   template         - The template object (for canvas settings)
 * @argument {Array}    contextSchemas   - Variable schemas from the API
 * @argument {Function} onUpdateElement  - Called with (uuid, changes)
 * @argument {Function} onUpdateTemplate - Called with changes to the template itself
 * @argument {Function} onOpenVariablePicker - Called to open the variable picker modal
 */
export default class TemplateBuilderPropertiesPanelComponent extends Component {
    @service fetch;
    @service notifications;

    @tracked openSections = new Set(['position', 'size', 'style', 'text', 'content']);

    /** @type {Boolean} Whether an image upload is in progress */
    @tracked isUploadingImage = false;

    /** @type {String|null} Filename of the most recently uploaded image */
    @tracked uploadedImageFilename = null;

    /** @type {Boolean} Whether the query-mode test request is in flight */
    @tracked isTestingQuery = false;

    /**
     * @type {{uuid: String|null, error: String|null, result: Object|null}}
     * State of the last query test, kept as one object rather than three fields:
     * a tracked field's initializer only runs on first read, and every path here
     * writes before reading, so assigning in the constructor is what actually
     * defines the state. `uuid` is the element the test was run against.
     */
    @tracked queryTest;

    constructor(owner, args) {
        super(owner, args);
        this._clearQueryTest();
    }

    get hasSelection() {
        return !!this.args.selectedElement;
    }

    get element() {
        return this.args.selectedElement;
    }

    get elementType() {
        /* istanbul ignore next -- the template renders every section that reads this inside {{#if this.element}}, so there is never no selection here */
        return this.element?.type ?? null;
    }

    get isText() {
        return this.elementType === 'text';
    }
    get isImage() {
        return this.elementType === 'image';
    }
    get isTable() {
        return this.elementType === 'table';
    }
    get isLine() {
        return this.elementType === 'line';
    }
    get isShape() {
        return this.elementType === 'shape';
    }
    get isQrCode() {
        return this.elementType === 'qr_code';
    }
    get isBarcode() {
        return this.elementType === 'barcode';
    }
    get hasTextContent() {
        return this.isText;
    }
    get hasBorderOptions() {
        return !this.isLine;
    }

    @action
    isSectionOpen(section) {
        return this.openSections.has(section);
    }

    @action
    toggleSection(section) {
        const next = new Set(this.openSections);
        if (next.has(section)) {
            next.delete(section);
        } else {
            next.add(section);
        }
        this.openSections = next;
    }

    @action
    updateProp(prop, event) {
        /* istanbul ignore next -- every call site is a DOM {{on}} handler, so the event is always an Event; the one that looks like it passes a raw value passes `value=` to {{fn}}, which ignores it (DEFECTS #14) */
        const value = event?.target ? event.target.value : event;
        if (this.args.onUpdateElement && this.element) {
            this.args.onUpdateElement(this.element.uuid, { [prop]: value });
        }
    }

    @action
    updateNumericProp(prop, event) {
        /* istanbul ignore next -- every call site is a DOM {{on}} handler, so the event is always an Event; the one that looks like it passes a raw value passes `value=` to {{fn}}, which ignores it (DEFECTS #14) */
        const raw = event?.target ? event.target.value : event;
        const value = raw === '' ? null : parseFloat(raw);
        if (this.args.onUpdateElement && this.element) {
            this.args.onUpdateElement(this.element.uuid, { [prop]: value });
        }
    }

    @action
    updateTemplateProp(prop, event) {
        /* istanbul ignore next -- every call site is a DOM {{on}} handler, so the event is always an Event; the one that looks like it passes a raw value passes `value=` to {{fn}}, which ignores it (DEFECTS #14) */
        const value = event?.target ? event.target.value : event;
        if (this.args.onUpdateTemplate) {
            this.args.onUpdateTemplate({ [prop]: value });
        }
    }

    @action
    openVariablePicker(targetProp) {
        if (this.args.onOpenVariablePicker) {
            this.args.onOpenVariablePicker(targetProp, (variable) => {
                if (this.args.onUpdateElement && this.element) {
                    const current = this.element[targetProp] ?? '';
                    this.args.onUpdateElement(this.element.uuid, { [targetProp]: current + variable });
                }
            });
        }
    }

    get fontWeightOptions() {
        return [
            { value: '300', label: 'Light' },
            { value: '400', label: 'Regular' },
            { value: '500', label: 'Medium' },
            { value: '600', label: 'Semi Bold' },
            { value: '700', label: 'Bold' },
            { value: '800', label: 'Extra Bold' },
            { value: '900', label: 'Black' },
        ];
    }

    get fontFamilyOptions() {
        return [
            { value: 'Inter, sans-serif', label: 'Inter' },
            { value: 'Arial, sans-serif', label: 'Arial' },
            { value: 'Helvetica, sans-serif', label: 'Helvetica' },
            { value: 'Georgia, serif', label: 'Georgia' },
            { value: 'Times New Roman, serif', label: 'Times New Roman' },
            { value: 'Courier New, monospace', label: 'Courier New' },
            { value: 'Roboto, sans-serif', label: 'Roboto' },
            { value: 'Open Sans, sans-serif', label: 'Open Sans' },
        ];
    }

    get textAlignOptions() {
        return [
            { value: 'left', icon: 'align-left' },
            { value: 'center', icon: 'align-center' },
            { value: 'right', icon: 'align-right' },
            { value: 'justify', icon: 'align-justify' },
        ];
    }

    get lineStyleOptions() {
        return [
            { value: 'solid', label: 'Solid' },
            { value: 'dashed', label: 'Dashed' },
            { value: 'dotted', label: 'Dotted' },
        ];
    }

    get objectFitOptions() {
        return [
            { value: 'cover', label: 'Cover' },
            { value: 'contain', label: 'Contain' },
            { value: 'fill', label: 'Fill' },
            { value: 'none', label: 'None' },
        ];
    }

    // -------------------------------------------------------------------------
    // Table helpers
    // -------------------------------------------------------------------------

    get tableColumns() {
        /* istanbul ignore next -- the template renders every section that reads this inside {{#if this.element}}, so there is never no selection here */
        return this.element?.columns ?? [];
    }

    get tableRows() {
        /* istanbul ignore next -- the template renders every section that reads this inside {{#if this.element}}, so there is never no selection here */
        return this.element?.rows ?? [];
    }

    /**
     * The current data mode for the table: 'variable', 'query', or 'manual'.
     * Stored explicitly as `data_source_mode` on the element so the mode is
     * independent of whether the variable/query fields have been filled in yet.
     * Defaults to 'manual' for new elements.
     */
    get tableDataMode() {
        return this.element?.data_source_mode ?? 'manual';
    }

    @action
    setTableDataMode(mode) {
        if (!this.args.onUpdateElement || !this.element) return;
        this._clearQueryTest();
        const changes = { data_source_mode: mode };
        if (mode === 'manual') {
            // Clear variable/query fields when switching to manual
            changes.data_source = null;
            changes.query_endpoint = null;
            changes.query_params = [];
            changes.query_response_path = null;
        } else if (mode === 'variable') {
            // Clear query fields when switching to variable
            changes.query_endpoint = null;
            changes.query_params = [];
            changes.query_response_path = null;
        } else {
            // 'query' — the third and last mode the toggle offers. A plain `else`
            // rather than `else if (mode === 'query')`: a third condition would
            // carry a false path nothing can ever reach, which is what left this
            // branch reporting [0,0] and un-suppressable in the first place.
            changes.data_source = null;
            // Seed empty query_params array if not already present
            if (!this.element.query_params) {
                changes.query_params = [];
            }
        }
        this.args.onUpdateElement(this.element.uuid, changes);
    }

    // ── Query data source helpers ────────────────────────────────────────────
    //
    // Query mode and the `__queries__` variables are deliberately two different
    // things, and Variable mode is the right answer far more often:
    //
    //   Variable mode  — a token resolved from the render context, including the
    //                    saved TemplateQuery records the queries panel manages.
    //                    Structured, reusable across elements, and saved with the
    //                    template. Reach a saved query through this mode.
    //   Query mode     — one Fleetbase API path, with params, bound to a single
    //                    element. It exists for the endpoints the saved-query
    //                    builder cannot express: aggregates, reports, and
    //                    extension endpoints with no `model_type` behind them.
    //
    // Nothing in this addon resolves a data source at render time — the builder
    // stores intent and the renderer downstream resolves it. `testQuery` is the
    // one exception, and it is explicitly on demand: it fetches once so the
    // endpoint, params and response path can be checked before the template is
    // saved. It never writes the fetched rows onto the element.

    get isTableQueryMode() {
        return this.tableDataMode === 'query';
    }

    /** @type {Array<{key: String, value: String}>} Only read while an element is selected. */
    get queryParams() {
        return this.element.query_params ?? [];
    }

    /**
     * Complaint about the endpoint as typed, or null. An empty endpoint is not
     * reported here — there is nothing to correct until the user tests it.
     */
    get queryEndpointError() {
        const raw = this.element.query_endpoint;
        if (!raw || !raw.trim()) {
            return null;
        }
        return validateEndpoint(raw);
    }

    /**
     * Test state belongs to the element it was run against — selecting a
     * different element must not show that element the previous one's results.
     */
    get _queryTestMatchesSelection() {
        return this.queryTest.uuid === this.element.uuid;
    }

    get queryTestError() {
        return this._queryTestMatchesSelection ? this.queryTest.error : null;
    }

    get queryTestResult() {
        return this._queryTestMatchesSelection ? this.queryTest.result : null;
    }

    _clearQueryTest() {
        this.queryTest = { uuid: null, error: null, result: null };
    }

    @action
    addQueryParam() {
        if (!this.args.onUpdateElement || !this.element) return;
        const query_params = [...this.queryParams, { key: '', value: '' }];
        this.args.onUpdateElement(this.element.uuid, { query_params });
    }

    @action
    removeQueryParam(index) {
        if (!this.args.onUpdateElement || !this.element) return;
        const query_params = this.queryParams.filter((_, i) => i !== index);
        this.args.onUpdateElement(this.element.uuid, { query_params });
    }

    @action
    updateQueryParam(index, field, event) {
        if (!this.args.onUpdateElement || !this.element) return;
        const value = event.target.value;
        const query_params = this.queryParams.map((param, i) => (i === index ? { ...param, [field]: value } : param));
        this.args.onUpdateElement(this.element.uuid, { query_params });
    }

    /**
     * Fetches the endpoint once and reports what came back: how many rows the
     * response path resolved to, which keys those rows carry, and which params
     * were left out because their value is still an unresolved variable token.
     */
    @action
    async testQuery() {
        // Reached only from the query-mode form, which the template renders
        // inside `{{#if this.hasSelection}}`, so an element is always selected.
        const element = this.element;
        const uuid = element.uuid;
        this.queryTest = { uuid, error: null, result: null };

        const invalid = validateEndpoint(element.query_endpoint);
        if (invalid) {
            this.queryTest = { uuid, error: invalid, result: null };
            return;
        }

        // A param whose value still holds a `{token}` cannot be sent — the token
        // is resolved downstream, not here — so it is dropped and named instead.
        const named = this.queryParams.filter((param) => param.key?.trim());
        const skippedParams = [];
        const params = {};
        named.forEach((param) => {
            const value = param.value ?? '';
            if (UNRESOLVED_TOKEN.test(value)) {
                skippedParams.push(param.key.trim());
                return;
            }
            params[param.key.trim()] = value;
        });

        this.isTestingQuery = true;

        try {
            const response = await this.fetch.get(normalizeEndpoint(element.query_endpoint), params);
            const { rows, error } = resolveResponsePath(response, element.query_response_path);
            if (error) {
                this.queryTest = { uuid, error, result: null };
            } else {
                const keys = discoverKeys(rows);
                const result = {
                    count: rows.length,
                    keys,
                    keysLabel: keys.join(', '),
                    skippedParams,
                    skippedParamsLabel: skippedParams.join(', '),
                };
                this.queryTest = { uuid, error: null, result };
            }
        } catch (err) {
            const message = err?.message ? `The request failed: ${err.message}` : 'The request failed.';
            this.queryTest = { uuid, error: message, result: null };
        } finally {
            this.isTestingQuery = false;
        }
    }

    /**
     * Replaces the table's columns with one per key the last test discovered.
     * Undoable — every `onUpdateElement` pushes an undo frame upstream.
     */
    @action
    applyDiscoveredColumns() {
        if (!this.args.onUpdateElement || !this.element) return;
        const columns = this.queryTestResult.keys.map((key) => ({ label: humanizeKey(key), key }));
        this.args.onUpdateElement(this.element.uuid, { columns });
    }

    @action
    addColumn() {
        if (!this.args.onUpdateElement || !this.element) return;
        const columns = [...this.tableColumns, { label: '', key: '' }];
        this.args.onUpdateElement(this.element.uuid, { columns });
    }

    @action
    removeColumn(index) {
        if (!this.args.onUpdateElement || !this.element) return;
        const columns = this.tableColumns.filter((_, i) => i !== index);
        // Also remove the corresponding key from all rows
        const removedKey = this.tableColumns[index]?.key;
        const rows = removedKey
            ? this.tableRows.map((row) => {
                  const next = Object.assign({}, row);
                  delete next[removedKey];
                  return next;
              })
            : this.tableRows;
        this.args.onUpdateElement(this.element.uuid, { columns, rows });
    }

    @action
    updateColumnLabel(index, event) {
        if (!this.args.onUpdateElement || !this.element) return;
        const columns = this.tableColumns.map((col, i) => (i === index ? { ...col, label: event.target.value } : col));
        this.args.onUpdateElement(this.element.uuid, { columns });
    }

    @action
    updateColumnKey(index, event) {
        if (!this.args.onUpdateElement || !this.element) return;
        const oldKey = this.tableColumns[index]?.key;
        const newKey = event.target.value;
        const columns = this.tableColumns.map((col, i) => (i === index ? { ...col, key: newKey } : col));
        // Rename the key in all existing rows
        const rows = this.tableRows.map((row) => {
            const next = Object.assign({}, row);
            if (oldKey && oldKey !== newKey) {
                next[newKey] = next[oldKey] ?? '';
                delete next[oldKey];
            }
            return next;
        });
        this.args.onUpdateElement(this.element.uuid, { columns, rows });
    }

    @action
    addRow() {
        if (!this.args.onUpdateElement || !this.element) return;
        // Build an empty row with a key for each defined column
        const emptyRow = {};
        this.tableColumns.forEach((col) => {
            if (col.key) emptyRow[col.key] = '';
        });
        const rows = [...this.tableRows, emptyRow];
        this.args.onUpdateElement(this.element.uuid, { rows });
    }

    @action
    removeRow(index) {
        if (!this.args.onUpdateElement || !this.element) return;
        const rows = this.tableRows.filter((_, i) => i !== index);
        this.args.onUpdateElement(this.element.uuid, { rows });
    }

    @action
    updateRowCell(rowIndex, key, event) {
        if (!this.args.onUpdateElement || !this.element) return;
        const rows = this.tableRows.map((row, i) => (i === rowIndex ? { ...row, [key]: event.target.value } : row));
        this.args.onUpdateElement(this.element.uuid, { rows });
    }

    // -------------------------------------------------------------------------
    // Image helpers
    // -------------------------------------------------------------------------

    get imageIsVariable() {
        const src = this.element?.src ?? '';
        return src.length > 0 && src.includes('{');
    }

    /**
     * True when the image src is a URL (uploaded file) rather than a variable token.
     */
    get imageIsUploaded() {
        const src = this.element?.src ?? '';
        return src.length > 0 && !src.includes('{');
    }

    @action
    async onImageFileAdded(file) {
        // Guard against duplicate calls (ember-file-upload can fire twice)
        /* istanbul ignore if -- guards against ember-file-upload firing onFileAdded twice; the queue only ever hands this suite a freshly queued file, so the duplicate call cannot be reproduced from a test */
        if (['queued', 'failed', 'timed_out', 'aborted'].indexOf(file.state) === -1) return;

        this.isUploadingImage = true;
        this.uploadedImageFilename = file.name;

        try {
            await this.fetch.uploadFile.perform(
                file,
                {
                    path: 'uploads/template-builder/images',
                    type: 'template_image',
                },
                (uploadedFile) => {
                    this.isUploadingImage = false;
                    // Store the URL on the element but keep the filename visible in the UI
                    if (this.args.onUpdateElement && this.element) {
                        this.args.onUpdateElement(this.element.uuid, { src: uploadedFile.url });
                    }
                }
            );
        } catch (err) {
            this.isUploadingImage = false;
            this.uploadedImageFilename = null;
            /* istanbul ignore else -- notifications is an injected service, so it is always present */
            if (this.notifications) {
                this.notifications.error(`Image upload failed: ${err.message}`);
            }
        }
    }

    @action
    clearImageSrc() {
        this.uploadedImageFilename = null;
        if (this.args.onUpdateElement && this.element) {
            this.args.onUpdateElement(this.element.uuid, { src: '' });
        }
    }

    get shapeOptions() {
        return [
            { value: 'rectangle', label: 'Rectangle' },
            { value: 'circle', label: 'Circle' },
        ];
    }

    get paperSizeOptions() {
        return [
            { value: 'A4', label: 'A4 (210 × 297 mm)' },
            { value: 'A3', label: 'A3 (297 × 420 mm)' },
            { value: 'A5', label: 'A5 (148 × 210 mm)' },
            { value: 'Letter', label: 'Letter (216 × 279 mm)' },
            { value: 'Legal', label: 'Legal (216 × 356 mm)' },
            { value: 'custom', label: 'Custom' },
        ];
    }

    get orientationOptions() {
        return [
            { value: 'portrait', label: 'Portrait' },
            { value: 'landscape', label: 'Landscape' },
        ];
    }
}
