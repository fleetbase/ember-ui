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

    /** @type {Array} Undo history stack (array of content snapshots) */
    _undoStack = [];

    /** @type {Array} Redo history stack */
    _redoStack = [];

    /** @type {Object} Internal mutable copy of the template being edited */
    @tracked _template = null;

    // -------------------------------------------------------------------------
    // Lifecycle
    // -------------------------------------------------------------------------

    constructor(owner, args) {
        super(owner, args);
        // Deep-clone the incoming template so we don't mutate the parent's object
        this._template = this._cloneTemplate(args.template);
    }

    // -------------------------------------------------------------------------
    // Computed
    // -------------------------------------------------------------------------

    get template() {
        return this._template ?? this.args.template;
    }

    get elements() {
        return this.template?.content ?? [];
    }

    get contextSchemas() {
        return this.args.contextSchemas ?? [];
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
            uuid: guidFor({}),
            type,
            label: null,
            visible: true,
            x: 20,
            y: 20,
            width: defaults.width,
            height: defaults.height,
            z_index: this.elements.length + 1,
            rotation: 0,
            opacity: 1,
            ...defaults.props,
        };

        this._updateTemplate({ content: [...this.elements, newElement] });
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

    @action
    updateElement(uuid, changes) {
        this._pushUndo();

        const updatedContent = this.elements.map((el) => {
            if (el.uuid !== uuid) return el;
            return { ...el, ...changes };
        });

        this._updateTemplate({ content: updatedContent });

        // Keep selectedElement reference in sync
        if (this.selectedElement?.uuid === uuid) {
            this.selectedElement = updatedContent.find((el) => el.uuid === uuid) ?? null;
        }
    }

    /**
     * Silently sync the position/size of an element after a drag or resize
     * gesture completes. Unlike `updateElement`, this mutates the element
     * object in-place rather than replacing the content array, so Glimmer
     * does NOT schedule a re-render. This prevents the DOM nodes from being
     * destroyed and recreated after every single drag, which would also
     * destroy and recreate the interact.js instances.
     *
     * Undo history is NOT pushed here — positional moves are considered
     * low-frequency enough that the user can undo them via the next explicit
     * action. If you want per-drag undo, call `updateElement` instead.
     */
    @action
    moveElement(uuid, changes) {
        const el = this.elements.find((e) => e.uuid === uuid);
        if (!el) return;
        // Mutate the element object in-place. The content array reference does
        // NOT change, so Glimmer does not schedule a re-render. This is
        // intentional — re-rendering would destroy and recreate the DOM nodes,
        // which would also destroy the interact.js instances and make the
        // element non-interactive.
        //
        // IMPORTANT: do NOT write to any @tracked property here (including
        // `this.selectedElement`). Even a "minimal" tracked write causes
        // Glimmer to re-render the canvas, which destroys the DOM nodes.
        // The properties panel will pick up the new values the next time the
        // user clicks the element (which calls selectElement → sets
        // selectedElement to the same mutated object).
        Object.assign(el, changes);
    }

    @action
    deleteElement(uuid) {
        this._pushUndo();
        const updatedContent = this.elements.filter((el) => el.uuid !== uuid);
        this._updateTemplate({ content: updatedContent });
        if (this.selectedElement?.uuid === uuid) {
            this.selectedElement = null;
        }
    }

    @action
    reorderElement(uuid, direction) {
        this._pushUndo();

        const elements = [...this.elements];
        const index = elements.findIndex((el) => el.uuid === uuid);
        if (index < 0) return;

        const element = elements[index];
        const currentZ = element.z_index ?? index + 1;

        // Find the element to swap with
        const sorted = [...elements].sort((a, b) => (a.z_index ?? 0) - (b.z_index ?? 0));
        const sortedIndex = sorted.findIndex((el) => el.uuid === uuid);

        let swapElement = null;
        if (direction === 'up' && sortedIndex < sorted.length - 1) {
            swapElement = sorted[sortedIndex + 1];
        } else if (direction === 'down' && sortedIndex > 0) {
            swapElement = sorted[sortedIndex - 1];
        }

        if (!swapElement) return;

        const swapZ = swapElement.z_index ?? 1;

        const updatedContent = elements.map((el) => {
            if (el.uuid === uuid) return { ...el, z_index: swapZ };
            if (el.uuid === swapElement.uuid) return { ...el, z_index: currentZ };
            return el;
        });

        this._updateTemplate({ content: updatedContent });
    }

    // -------------------------------------------------------------------------
    // Template-level updates
    // -------------------------------------------------------------------------

    @action
    updateTemplate(changes) {
        this._pushUndo();
        this._updateTemplate(changes);
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
        this._redoStack.push(this._cloneContent(this.template.content));
        this._template = { ...this.template, content: snapshot };
        this.selectedElement = null;
    }

    @action
    redo() {
        if (!this.canRedo) return;
        const snapshot = this._redoStack.pop();
        this._undoStack.push(this._cloneContent(this.template.content));
        this._template = { ...this.template, content: snapshot };
        this.selectedElement = null;
    }

    // -------------------------------------------------------------------------
    // Variable Picker
    // -------------------------------------------------------------------------

    @action
    openVariablePicker(targetProp, callback) {
        this.variablePickerTargetProp = targetProp;
        this.variablePickerCallback = callback;
        this.variablePickerOpen = true;
    }

    @action
    closeVariablePicker() {
        this.variablePickerOpen = false;
        this.variablePickerTargetProp = null;
        this.variablePickerCallback = null;
    }

    @action
    handleVariableInsert(token) {
        if (this.variablePickerCallback) {
            this.variablePickerCallback(token);
        }
        this.closeVariablePicker();
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

    _updateTemplate(changes) {
        // Defer the tracked write to afterRender to avoid Glimmer's
        // "you modified a tracked value after it was consumed during render"
        // assertion. Actions triggered by user interaction (click, drag) can
        // fire while a render pass is still in progress on the same runloop
        // tick. Scheduling to afterRender ensures the write happens cleanly.
        const merged = Object.assign({}, this.template, changes);

        // Whenever paper_size or orientation changes, resolve the canonical
        // width/height/unit so the canvas reacts immediately.
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

        const clean = JSON.parse(JSON.stringify(merged));
        next(this, () => {
            this._template = clean;
        });
    }

    /**
     * Returns { width, height, unit } for a given paper size and orientation.
     * Dimensions are in mm (portrait). Landscape swaps width and height.
     */
    _dimensionsForPaperSize(paperSize, orientation) {
        const sizes = {
            A4:     { width: 210,  height: 297  },
            A3:     { width: 297,  height: 420  },
            A5:     { width: 148,  height: 210  },
            Letter: { width: 216,  height: 279  },
            Legal:  { width: 216,  height: 356  },
        };
        const base = sizes[paperSize];
        if (!base) return null; // custom — leave width/height unchanged
        const isLandscape = orientation === 'landscape';
        return {
            width:  isLandscape ? base.height : base.width,
            height: isLandscape ? base.width  : base.height,
            unit:   'mm',
        };
    }

    _pushUndo() {
        this._undoStack.push(this._cloneContent(this.template.content));
        // Cap undo stack at 50 entries
        if (this._undoStack.length > 50) {
            this._undoStack.shift();
        }
        // Clear redo stack on new action
        this._redoStack = [];
    }

    _cloneContent(content) {
        return JSON.parse(JSON.stringify(content ?? []));
    }

    _cloneTemplate(template) {
        if (!template) return {};

        // If this is an Ember Data model instance, extract plain attribute values
        // directly rather than relying on JSON.stringify (which cannot serialise
        // tracked prototype getters).
        const isEmberModel = template && typeof template.eachAttribute === 'function';
        if (isEmberModel) {
            const plain = {};
            template.eachAttribute((name) => {
                const val = template[name];
                // Deep-clone arrays/objects so the editor works on its own copy
                plain[name] = val !== null && val !== undefined
                    ? JSON.parse(JSON.stringify(val))
                    : val;
            });
            // Always include uuid / id
            plain.uuid = template.uuid ?? template.id ?? null;
            return plain;
        }

        // Plain object — safe to JSON round-trip
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
