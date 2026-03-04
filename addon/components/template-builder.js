import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { guidFor } from '@ember/object/internals';
import { inject as service } from '@ember/service';
import { next } from '@ember/runloop';

/**
 * TemplateBuilderComponent
 *
 * The top-level template builder component. Composes the toolbar, layers panel,
 * canvas, and properties panel into a full-screen editor.
 *
 * State architecture
 * ------------------
 * Template-level fields (name, paper_size, orientation, width, height, unit,
 * background_color, …) are stored in `@tracked _meta` — a plain object.
 *
 * The element list is stored in `@tracked _content` — a plain JS array of
 * element objects. This array is the single source of truth for what is
 * rendered in the `{{#each}}` loop on the canvas.
 *
 * The critical invariant is: **existing element objects must keep their JS
 * identity across renders**. Glimmer's `{{#each}}` loop reuses a component
 * instance as long as its item reference is the same object. If the reference
 * changes, Glimmer destroys the old component (firing will-destroy →
 * teardownElement → interactable.unset()) and creates a new one. This is why
 * the previous implementation — which did JSON.parse(JSON.stringify(...)) on
 * the entire content array for every operation — caused all interact.js
 * instances to be destroyed whenever any element was added, deleted, or
 * updated.
 *
 * Rules:
 *   addElement    → push a new object onto _content; existing objects unchanged
 *   moveElement   → Object.assign onto the existing object; no _content write
 *   updateElement → Object.assign onto the existing object; then replace
 *                   _content with a new array (same objects) to trigger
 *                   reactivity for the properties panel and layers panel
 *   deleteElement → filter _content to a new array without the target object
 *   undo/redo     → replace _content with deep-cloned snapshots (full re-render
 *                   is acceptable here since it is an explicit user action)
 *
 * Usage:
 *   <TemplateBuilder
 *       @template={{this.template}}
 *       @contextSchemas={{this.contextSchemas}}
 *       @onSave={{this.saveTemplate}}
 *       @onPreview={{this.previewTemplate}}
 *   />
 *
 * @argument {Object}   template        - The template object to edit.
 *                                        Shape: { uuid, name, context_type, paper_size, orientation,
 *                                                 width, height, unit, background_color, content: [] }
 * @argument {Array}    contextSchemas  - Variable schema array from GET /api/v1/templates/context-schemas
 * @argument {Boolean}  isSaving        - Whether a save is in progress (controls toolbar spinner)
 * @argument {Function} onSave          - Called with the updated template object when Save is clicked
 * @argument {Function} onPreview       - Called with the current template object when Preview is clicked
 */
export default class TemplateBuilderComponent extends Component {
    @service fetch;
    @service notifications;

    // -------------------------------------------------------------------------
    // State
    // -------------------------------------------------------------------------

    /** @type {Object|null} Currently selected element */
    @tracked selectedElement = null;

    /** @type {Number} Canvas zoom level (1 = 100%) */
    @tracked zoom = 1;

    /** @type {Boolean} Whether the variable picker modal is open */
    @tracked variablePickerOpen = false;

    /** @type {String|null} The element property the variable picker is targeting */
    @tracked variablePickerTargetProp = null;

    /** @type {Function|null} Callback to call with the chosen variable/formula string */
    @tracked variablePickerCallback = null;

    /** @type {String} Which tab is active in the left panel: 'layers' or 'queries' */
    @tracked leftPanelTab = 'layers';

    /** @type {Array} TemplateQuery records for the current template */
    @tracked queries = [];

    /** @type {Array} Undo history stack — each entry is a deep-cloned content snapshot */
    _undoStack = [];

    /** @type {Array} Redo history stack */
    _redoStack = [];

    /**
     * Non-content template fields (name, paper_size, orientation, width, height,
     * unit, background_color, uuid, context_type, …). Stored separately from
     * _content so that canvas-level changes do not require touching the element
     * array at all.
     * @type {Object}
     */
    @tracked _meta = null;

    /**
     * The live element array. Each object in this array is mutated in-place
     * during drag/resize/property-update operations. The array reference itself
     * is replaced (to trigger Glimmer reactivity) only when elements are added
     * or deleted.
     * @type {Array}
     */
    @tracked _content = [];

    // -------------------------------------------------------------------------
    // Lifecycle
    // -------------------------------------------------------------------------

    constructor(owner, args) {
        super(owner, args);
        const cloned = this._cloneTemplate(args.template);
        const { content, queries, ...meta } = cloned;
        this._meta    = meta;
        this._content = Array.isArray(content) ? content : [];
        // Seed queries from the template relationship (loaded via hasMany).
        // When the template is new (unsaved), this will be an empty array.
        this.queries  = Array.isArray(queries) ? queries : [];
    }

    // -------------------------------------------------------------------------
    // Computed
    // -------------------------------------------------------------------------

    /**
     * Reconstituted full template object — used for save, preview, and passing
     * to child components that need the complete shape (canvas, properties panel).
     */
    get template() {
        // Include queries in the save payload so the backend can upsert them
        // in a single request alongside the template record.
        return { ...this._meta, content: this._content, queries: this.queries };
    }

    get elements() {
        return this._content;
    }

    get contextSchemas() {
        return this.args.contextSchemas ?? [];
    }

    /**
     * Context schemas enriched with a "Queries" section derived from the saved
     * TemplateQuery records. This is passed to the variable picker so users can
     * insert query variable tokens (e.g. {recent_orders}) into element properties.
     */
    get enrichedContextSchemas() {
        const base = this.contextSchemas;
        if (!this.queries.length) return base;

        const queriesSchema = {
            namespace: '__queries__',
            label:     'Queries',
            icon:      'database',
            variables: this.queries.map((q) => ({
                path:    q.variable_name,
                label:   q.label,
                type:    'array',
                example: `[{ ... }]  (${q.resource_type_label ?? q.model_type ?? ''})`,
            })),
        };

        return [queriesSchema, ...base];
    }

    get canUndo() {
        return this._undoStack.length > 0;
    }

    get canRedo() {
        return this._redoStack.length > 0;
    }

    // -------------------------------------------------------------------------
    // Element CRUD
    // -------------------------------------------------------------------------

    @action
    addElement(type) {
        this._pushUndo();

        const defaults = this._defaultsForType(type);
        const newElement = {
            uuid:     guidFor({}),
            type,
            label:    null,
            visible:  true,
            x:        20,
            y:        20,
            width:    defaults.width,
            height:   defaults.height,
            z_index:  this._content.length + 1,
            rotation: 0,
            opacity:  1,
            ...defaults.props,
        };

        // Push onto the existing array and replace the reference so Glimmer
        // detects the change. Existing element objects are NOT replaced — only
        // the new element is added. This means Glimmer will create exactly one
        // new ElementRenderer component and leave all existing ones untouched.
        this._content = [...this._content, newElement];
        this.selectedElement = newElement;
    }

    @action
    selectElement(element) {
        this.selectedElement = element;
    }

    @action
    deselectAll() {
        this.selectedElement = null;
    }

    /**
     * Update element properties from the properties panel (or any other source
     * that needs a re-render, e.g. undo-able changes).
     *
     * Mutates the element object in-place so its JS identity is preserved, then
     * replaces _content with a new array (same object references) to trigger
     * Glimmer reactivity. This causes the canvas {{#each}} to re-evaluate, but
     * since the item references are identical, Glimmer reuses every existing
     * ElementRenderer component — no DOM nodes are destroyed.
     */
    @action
    updateElement(uuid, changes) {
        this._pushUndo();

        const el = this._content.find((e) => e.uuid === uuid);
        if (!el) return;

        // Mutate in-place to preserve object identity
        Object.assign(el, changes);

        // Replace the array reference to notify Glimmer that _content changed.
        // Because the item objects are the same references, {{#each}} will NOT
        // destroy/recreate any ElementRenderer components.
        this._content = [...this._content];

        // Sync selectedElement so the properties panel reflects the new values.
        // Writing to selectedElement triggers a re-render of the properties panel
        // only — the canvas {{#each}} is unaffected because _content items are
        // the same objects.
        if (this.selectedElement?.uuid === uuid) {
            this.selectedElement = el;
        }
    }

    /**
     * Silently sync the position/size of an element after a drag or resize
     * gesture completes. Does NOT trigger any Glimmer re-render.
     */
    @action
    moveElement(uuid, changes) {
        const el = this._content.find((e) => e.uuid === uuid);
        if (!el) return;
        // Mutate in-place only. No _content replacement, no selectedElement write.
        // Zero re-renders. interact.js instances remain alive.
        Object.assign(el, changes);
    }

    /**
     * Rotate an element by a delta in degrees (e.g. +90 or -90).
     * Uses updateElement so the change is tracked in undo history and
     * the properties panel rotation input updates immediately.
     */
    @action
    rotateElement(uuid, deltaDegrees) {
        const el = this._content.find((e) => e.uuid === uuid);
        if (!el) return;
        const current = el.rotation ?? 0;
        // Normalise to [0, 360)
        const next = ((current + deltaDegrees) % 360 + 360) % 360;
        this.updateElement(uuid, { rotation: next });
    }

    @action
    deleteElement(uuid) {
        this._pushUndo();
        this._content = this._content.filter((el) => el.uuid !== uuid);
        if (this.selectedElement?.uuid === uuid) {
            this.selectedElement = null;
        }
    }

    @action
    reorderElement(uuid, direction) {
        this._pushUndo();

        const elements = this._content;
        const element  = elements.find((el) => el.uuid === uuid);
        if (!element) return;

        const currentZ = element.z_index ?? 1;
        const sorted   = [...elements].sort((a, b) => (a.z_index ?? 0) - (b.z_index ?? 0));
        const sortedIndex = sorted.findIndex((el) => el.uuid === uuid);

        let swapElement = null;
        if (direction === 'up' && sortedIndex < sorted.length - 1) {
            swapElement = sorted[sortedIndex + 1];
        } else if (direction === 'down' && sortedIndex > 0) {
            swapElement = sorted[sortedIndex - 1];
        }

        if (!swapElement) return;

        const swapZ = swapElement.z_index ?? 1;

        // Mutate z_index in-place on both objects
        element.z_index     = swapZ;
        swapElement.z_index = currentZ;

        // Replace array reference to trigger reactivity
        this._content = [...this._content];
    }

    // -------------------------------------------------------------------------
    // Template-level updates (non-content fields)
    // -------------------------------------------------------------------------

    @action
    updateTemplate(changes) {
        this._pushUndo();
        this._updateMeta(changes);
    }

    // -------------------------------------------------------------------------
    // Zoom
    // -------------------------------------------------------------------------

    @action
    zoomIn() {
        this.zoom = Math.min(3, parseFloat((this.zoom + 0.1).toFixed(1)));
    }

    @action
    zoomOut() {
        this.zoom = Math.max(0.25, parseFloat((this.zoom - 0.1).toFixed(1)));
    }

    @action
    zoomReset() {
        this.zoom = 1;
    }

    // -------------------------------------------------------------------------
    // Undo / Redo
    // -------------------------------------------------------------------------

    @action
    undo() {
        if (!this.canUndo) return;
        const snapshot = this._undoStack.pop();
        this._redoStack.push(this._cloneContent(this._content));
        // Restore from snapshot — new object references, so full re-render.
        // This is acceptable: undo is an explicit user action.
        this._content = snapshot;
        this.selectedElement = null;
    }

    @action
    redo() {
        if (!this.canRedo) return;
        const snapshot = this._redoStack.pop();
        this._undoStack.push(this._cloneContent(this._content));
        this._content = snapshot;
        this.selectedElement = null;
    }

    // -------------------------------------------------------------------------
    // Variable Picker
    // -------------------------------------------------------------------------

    @action
    openVariablePicker(targetProp, callback) {
        this.variablePickerTargetProp = targetProp;
        this.variablePickerCallback   = callback;
        this.variablePickerOpen       = true;
    }

    @action
    closeVariablePicker() {
        this.variablePickerOpen       = false;
        this.variablePickerTargetProp = null;
        this.variablePickerCallback   = null;
    }

    @action
    handleVariableInsert(token) {
        if (this.variablePickerCallback) {
            this.variablePickerCallback(token);
        }
        this.closeVariablePicker();
    }

    // -------------------------------------------------------------------------
    // Left panel tab
    // -------------------------------------------------------------------------

    @action
    setLeftPanelTab(tab) {
        this.leftPanelTab = tab;
    }

    // -------------------------------------------------------------------------
    // Queries
    // -------------------------------------------------------------------------

    /**
     * Called by QueriesPanel whenever the queries list changes (load, add, edit,
     * delete). Updates the local queries array so enrichedContextSchemas stays
     * in sync with the variable picker.
     */
    @action
    handleQueriesChange(queries) {
        this.queries = queries ?? [];
    }

    // -------------------------------------------------------------------------
    // Save / Preview
    // -------------------------------------------------------------------------

    @action
    save() {
        if (this.args.onSave) {
            this.args.onSave(this.template);
        }
    }

    @action
    preview() {
        if (this.args.onPreview) {
            this.args.onPreview(this.template);
        }
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    /**
     * Update non-content template fields. Resolves paper_size + orientation
     * into width/height/unit automatically.
     */
    _updateMeta(changes) {
        const merged = Object.assign({}, this._meta, changes);

        if (changes.paper_size !== undefined || changes.orientation !== undefined) {
            const dims = this._dimensionsForPaperSize(
                merged.paper_size ?? 'A4',
                merged.orientation ?? 'portrait'
            );
            if (dims) {
                merged.width  = dims.width;
                merged.height = dims.height;
                merged.unit   = dims.unit;
            }
        }

        // Defer to avoid "modified tracked value during render" assertion
        next(this, () => {
            this._meta = merged;
        });
    }

    /**
     * Returns { width, height, unit } for a given paper size and orientation.
     * Dimensions are in mm (portrait). Landscape swaps width and height.
     */
    _dimensionsForPaperSize(paperSize, orientation) {
        const sizes = {
            A4:     { width: 210, height: 297 },
            A3:     { width: 297, height: 420 },
            A5:     { width: 148, height: 210 },
            Letter: { width: 216, height: 279 },
            Legal:  { width: 216, height: 356 },
        };
        const base = sizes[paperSize];
        if (!base) return null;
        const isLandscape = orientation === 'landscape';
        return {
            width:  isLandscape ? base.height : base.width,
            height: isLandscape ? base.width  : base.height,
            unit:   'mm',
        };
    }

    _pushUndo() {
        this._undoStack.push(this._cloneContent(this._content));
        if (this._undoStack.length > 50) {
            this._undoStack.shift();
        }
        this._redoStack = [];
    }

    _cloneContent(content) {
        return JSON.parse(JSON.stringify(content ?? []));
    }

    _cloneTemplate(template) {
        if (!template) return {};

        const isEmberModel = template && typeof template.eachAttribute === 'function';
        if (isEmberModel) {
            const plain = {};
            template.eachAttribute((name) => {
                const val = template[name];
                plain[name] = val !== null && val !== undefined
                    ? JSON.parse(JSON.stringify(val))
                    : val;
            });
            plain.uuid = template.uuid ?? template.id ?? null;
            return plain;
        }

        return JSON.parse(JSON.stringify(template));
    }

    _defaultsForType(type) {
        const map = {
            text:    { width: 200, height: 40,  props: { content: 'Text', font_size: 14, font_family: 'Inter, sans-serif', font_weight: '400', color: '#000000', text_align: 'left' } },
            image:   { width: 150, height: 100, props: { src: '', alt: '', object_fit: 'cover' } },
            table:   { width: 400, height: 200, props: { columns: [], rows: [], border_color: '#e5e7eb', header_background: '#f9fafb', header_color: '#111827', cell_padding: 6 } },
            line:    { width: 200, height: 2,   props: { color: '#000000', line_width: 1, line_style: 'solid' } },
            shape:   { width: 100, height: 100, props: { shape: 'rectangle', background_color: '#e5e7eb', border_width: 0, border_color: '#000000', border_radius: 0 } },
            qr_code: { width: 80,  height: 80,  props: { value: '' } },
            barcode: { width: 200, height: 60,  props: { value: '', barcode_format: 'CODE128' } },
        };
        return map[type] ?? { width: 100, height: 40, props: {} };
    }
}
