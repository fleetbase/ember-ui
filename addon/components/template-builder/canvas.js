import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { guidFor } from '@ember/object/internals';
import interact from 'interactjs';

/**
 * TemplateBuilderCanvasComponent
 *
 * Renders the document canvas — a pixel-accurate representation of the
 * template page. Each element is absolutely positioned and can be dragged
 * and resized via interact.js.
 *
 * Positioning strategy
 * --------------------
 * All elements use `left: 0; top: 0` in their wrapper style and are
 * positioned exclusively via `transform: translate(x, y)`. This gives
 * interact.js a single source of truth for element position and prevents
 * the jump-on-first-drag bug that occurs when both `left/top` and
 * `transform` carry offset information simultaneously.
 *
 * Drag vs. resize separation
 * --------------------------
 * Resize is restricted to the four corner handle elements (.tb-handle-*)
 * via per-edge CSS selectors. Any drag gesture on the element body is
 * therefore unambiguously a move, not a resize.
 *
 * Re-render safety
 * ----------------
 * interact.js instances are stored in `_interactables` keyed by element uuid.
 * They are only torn down when `teardownElement` fires (will-destroy), which
 * happens when an element is deleted or when undo/redo replaces the content
 * array with new object references. For all other operations (drag, resize,
 * property updates, adding new elements) the existing DOM nodes and interact.js
 * instances are reused.
 *
 * Selection reactivity
 * --------------------
 * `@isSelected` is passed as `(eq element.uuid this.selectedUuid)` — a
 * primitive boolean derived from two primitive strings. Glimmer tracks
 * argument changes by value, so when `selectedUuid` changes the affected
 * ElementRenderer components re-render their selection ring correctly.
 *
 * @argument {Object}   template         - The template object (width, height, unit, orientation, content)
 * @argument {Object}   selectedElement  - The currently selected element (or null)
 * @argument {Function} onSelectElement  - Called with element when user clicks it
 * @argument {Function} onMoveElement    - Called with (elementId, {x,y,width?,height?}) silently
 * @argument {Function} onUpdateElement  - Called with (elementId, changes) for property-panel updates
 * @argument {Function} onDeselectAll    - Called when user clicks the canvas background
 * @argument {Number}   zoom             - Zoom level (1 = 100%)
 */
export default class TemplateBuilderCanvasComponent extends Component {
    canvasId = `tb-canvas-${guidFor(this)}`;

    /** @type {Map<string, import('interactjs').Interactable>} */
    _interactables = new Map();

    /** @type {HTMLElement|null} */
    _canvasEl = null;

    /**
     * Tracked UUID of the currently selected element.
     * Using a primitive string (not an object reference) ensures Glimmer
     * detects the change and re-renders the affected ElementRenderer components.
     */
    @tracked _selectedUuid = null;

    // -------------------------------------------------------------------------
    // Canvas dimensions
    // -------------------------------------------------------------------------

    get zoom() {
        return this.args.zoom ?? 1;
    }

    get canvasWidthPx() {
        const { template } = this.args;
        if (!template) return 794;
        return this._unitToPx(template.width ?? 210, template.unit ?? 'mm');
    }

    get canvasHeightPx() {
        const { template } = this.args;
        if (!template) return 1123;
        return this._unitToPx(template.height ?? 297, template.unit ?? 'mm');
    }

    get canvasStyle() {
        const w  = this.canvasWidthPx * this.zoom;
        const h  = this.canvasHeightPx * this.zoom;
        const bg = this.args.template?.background_color ?? '#ffffff';
        return `width:${w}px; height:${h}px; background:${bg}; position:relative; overflow:hidden;`;
    }

    get elements() {
        return this.args.template?.content ?? [];
    }

    /**
     * Keep _selectedUuid in sync with the @selectedElement argument.
     * This getter is evaluated by Glimmer whenever @selectedElement changes,
     * which keeps the local tracked UUID up to date for the {{#each}} loop.
     */
    get selectedUuid() {
        const uuid = this.args.selectedElement?.uuid ?? null;
        // Sync the tracked property so ElementRenderer @isSelected updates.
        if (this._selectedUuid !== uuid) {
            this._selectedUuid = uuid;
        }
        return this._selectedUuid;
    }

    // -------------------------------------------------------------------------
    // Lifecycle
    // -------------------------------------------------------------------------

    @action
    didInsertCanvas(el) {
        this._canvasEl = el;
    }

    @action
    willDestroyCanvas() {
        this._interactables.forEach((interactable) => {
            try { interactable.unset(); } catch (_) { /* ignore */ }
        });
        this._interactables.clear();
    }

    // -------------------------------------------------------------------------
    // Element interaction setup / teardown
    // -------------------------------------------------------------------------

    @action
    setupElement(element, el) {
        // Unset any stale interactable for this uuid before creating a new one.
        const stale = this._interactables.get(element.uuid);
        if (stale) {
            try { stale.unset(); } catch (_) { /* ignore */ }
            this._interactables.delete(element.uuid);
        }
        this._setupInteract(element, el);
    }

    @action
    teardownElement(element) {
        const interactable = this._interactables.get(element.uuid);
        if (interactable) {
            try { interactable.unset(); } catch (_) { /* ignore */ }
            this._interactables.delete(element.uuid);
        }
    }

    @action
    selectElement(element, event) {
        if (event) event.stopPropagation();
        this._selectedUuid = element.uuid;
        if (this.args.onSelectElement) {
            this.args.onSelectElement(element);
        }
    }

    @action
    deselectAll() {
        this._selectedUuid = null;
        if (this.args.onDeselectAll) {
            this.args.onDeselectAll();
        }
    }

    // -------------------------------------------------------------------------
    // interact.js setup
    // -------------------------------------------------------------------------

    _setupInteract(element, el) {
        // ── Helpers ────────────────────────────────────────────────────────────

        // Read the current translate values from the element's data attributes.
        const getPos = () => ({
            x: parseFloat(el.dataset.x) || 0,
            y: parseFloat(el.dataset.y) || 0,
        });

        // Write a new translate (+ optional rotation) to the element's style.
        const applyTransform = (x, y) => {
            const rotation = element.rotation ?? 0;
            el.style.transform = rotation
                ? `translate(${x}px, ${y}px) rotate(${rotation}deg)`
                : `translate(${x}px, ${y}px)`;
            el.dataset.x = x;
            el.dataset.y = y;
        };

        // Read zoom from args at event time so zoom changes are reflected
        // without needing to recreate the interactable.
        const getZoom = () => this.args.zoom ?? 1;

        // Canvas dimensions in unscaled (template) pixels — used for boundary
        // clamping. We read these at event time too so paper-size changes work.
        const getCanvasDims = () => ({
            w: this.canvasWidthPx,
            h: this.canvasHeightPx,
        });

        // ── Interactable ───────────────────────────────────────────────────────
        const interactable = interact(el)

            // ── Tap (select) ──────────────────────────────────────────────────
            // interact.js intercepts pointer events for drag/resize detection.
            // Using interact's own `tap` event guarantees selection fires even
            // when interact.js has consumed the underlying pointer events.
            .on('tap', (event) => {
                event.stopPropagation();
                this.selectElement(element, null);
            })

            // ── Drag ──────────────────────────────────────────────────────────
            .draggable({
                listeners: {
                    move: (event) => {
                        const zoom   = getZoom();
                        const canvas = getCanvasDims();
                        const pos    = getPos();

                        // Divide interact.js deltas by zoom so the element
                        // moves at the same speed as the pointer.
                        let x = pos.x + event.dx / zoom;
                        let y = pos.y + event.dy / zoom;

                        // Clamp to canvas bounds (element cannot leave the canvas).
                        const elW = parseFloat(el.style.width)  || (element.width  ?? 100);
                        const elH = parseFloat(el.style.height) || (element.height ?? 30);
                        x = Math.max(0, Math.min(x, canvas.w - elW));
                        y = Math.max(0, Math.min(y, canvas.h - elH));

                        applyTransform(x, y);
                    },
                    end: () => {
                        const pos = getPos();
                        if (this.args.onMoveElement) {
                            this.args.onMoveElement(element.uuid, {
                                x: Math.round(pos.x),
                                y: Math.round(pos.y),
                            });
                        }
                    },
                },
            })

            // ── Resize ────────────────────────────────────────────────────────
            .resizable({
                edges: {
                    top:    '.tb-handle-nw, .tb-handle-ne',
                    left:   '.tb-handle-nw, .tb-handle-sw',
                    bottom: '.tb-handle-sw, .tb-handle-se',
                    right:  '.tb-handle-ne, .tb-handle-se',
                },
                listeners: {
                    move: (event) => {
                        const zoom   = getZoom();
                        const canvas = getCanvasDims();
                        const pos    = getPos();

                        let x = pos.x + event.deltaRect.left / zoom;
                        let y = pos.y + event.deltaRect.top  / zoom;
                        let w = event.rect.width  / zoom;
                        let h = event.rect.height / zoom;

                        // Enforce minimum size
                        w = Math.max(20, w);
                        h = Math.max(10, h);

                        // Clamp position so the element stays inside the canvas
                        x = Math.max(0, Math.min(x, canvas.w - w));
                        y = Math.max(0, Math.min(y, canvas.h - h));

                        el.style.width  = `${w}px`;
                        el.style.height = `${h}px`;
                        applyTransform(x, y);
                    },
                    end: (event) => {
                        const zoom = getZoom();
                        const pos  = getPos();
                        const w    = Math.max(20, event.rect.width  / zoom);
                        const h    = Math.max(10, event.rect.height / zoom);
                        if (this.args.onMoveElement) {
                            this.args.onMoveElement(element.uuid, {
                                x:      Math.round(pos.x),
                                y:      Math.round(pos.y),
                                width:  Math.round(w),
                                height: Math.round(h),
                            });
                        }
                    },
                },
            });

        this._interactables.set(element.uuid, interactable);
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    _unitToPx(value, unit) {
        const PPI = 96;
        switch (unit) {
            case 'mm': return Math.round((value / 25.4) * PPI);
            case 'cm': return Math.round((value / 2.54)  * PPI);
            case 'in': return Math.round(value * PPI);
            case 'px':
            default:   return Math.round(value);
        }
    }
}
