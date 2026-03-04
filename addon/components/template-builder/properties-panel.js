import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';

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

    get hasSelection() {
        return !!this.args.selectedElement;
    }

    get element() {
        return this.args.selectedElement;
    }

    get elementType() {
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
        const value = event?.target ? event.target.value : event;
        if (this.args.onUpdateElement && this.element) {
            this.args.onUpdateElement(this.element.uuid, { [prop]: value });
        }
    }

    @action
    updateNumericProp(prop, event) {
        const raw = event?.target ? event.target.value : event;
        const value = raw === '' ? null : parseFloat(raw);
        if (this.args.onUpdateElement && this.element) {
            this.args.onUpdateElement(this.element.uuid, { [prop]: value });
        }
    }

    @action
    updateTemplateProp(prop, event) {
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
        return this.element?.columns ?? [];
    }

    get tableRows() {
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
        } else if (mode === 'query') {
            // Clear variable field when switching to query
            changes.data_source = null;
            // Seed empty query_params array if not already present
            if (!this.element.query_params) {
                changes.query_params = [];
            }
        }
        this.args.onUpdateElement(this.element.uuid, changes);
    }

    // ── Query data source helpers ────────────────────────────────────────────

    get queryParams() {
        return this.element?.query_params ?? [];
    }

    @action
    addQueryParam() {
        if (!this.args.onUpdateElement || !this.element) return;
        const params = [...this.queryParams, { key: '', value: '' }];
        this.args.onUpdateElement(this.element.uuid, { query_params: params });
    }

    @action
    removeQueryParam(index) {
        if (!this.args.onUpdateElement || !this.element) return;
        const params = this.queryParams.filter((_, i) => i !== index);
        this.args.onUpdateElement(this.element.uuid, { query_params: params });
    }

    @action
    updateQueryParamKey(index, event) {
        if (!this.args.onUpdateElement || !this.element) return;
        const params = this.queryParams.map((p, i) => (i === index ? { ...p, key: event.target.value } : p));
        this.args.onUpdateElement(this.element.uuid, { query_params: params });
    }

    @action
    updateQueryParamValue(index, event) {
        if (!this.args.onUpdateElement || !this.element) return;
        const params = this.queryParams.map((p, i) => (i === index ? { ...p, value: event.target.value } : p));
        this.args.onUpdateElement(this.element.uuid, { query_params: params });
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
