import Component from '@glimmer/component';
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
 * `moveElement` (the silent positional sync) must NOT write to any @tracked
 * property that causes a Glimmer re-render, because re-rendering destroys
 * and recreates DOM nodes, which breaks interact.js. In particular,
 * `selectedElement` must NOT be updated inside `moveElement`.
 *
 * The only time interact.js instances are torn down and rebuilt is when
 * `teardownElement` fires (will-destroy) followed by `setupElement`
 * (did-insert) — which happens when `updateElement` triggers a full
 * re-render (e.g. property panel changes). This is correct and expected.
 *
 * @argument {Object}   template         - The template object (width, height, unit, orientation, content)
 * @argument {Object}   selectedElement  - The currently selected element (or null)
 * @argument {Function} onSelectElement  - Called with element when user clicks it
 * @argument {Function} onUpdateElement  - Called with (elementId, changes) when drag/resize completes
 * @argument {Function} onMoveElement    - Called with (elementId, {x,y,width?,height?}) silently
 * @argument {Function} onDeselectAll    - Called when user clicks the canvas background
 * @argument {Number}   zoom             - Zoom level (1 = 100%)
 */
export default class TemplateBuilderCanvasComponent extends Component {
    canvasId = `tb-canvas-${guidFor(this)}`;

    /** @type {Map<string, import('interactjs').Interactable>} */
    _interactables = new Map();

    /** @type {HTMLElement|null} */
    _canvasEl = null;

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
        const w = this.canvasWidthPx * this.zoom;
        const h = this.canvasHeightPx * this.zoom;
        const bg = this.args.template?.background_color ?? '#ffffff';
        return `width:${w}px; height:${h}px; background:${bg}; position:relative; overflow:hidden;`;
    }

    get elements() {
        return this.args.template?.content ?? [];
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
        event.stopPropagation();
        if (this.args.onSelectElement) {
            this.args.onSelectElement(element);
        }
    }

    @action
    deselectAll() {
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
        // These are seeded by element-renderer.js handleInsert and kept in sync
        // by the move/end listeners below.
        const getPos = () => ({
            x: parseFloat(el.dataset.x) || 0,
            y: parseFloat(el.dataset.y) || 0,
        });

        // Write a new translate (+ optional rotation) to the element's style
        // and update the data attributes so getPos() stays accurate.
        const applyTransform = (x, y) => {
            const rotation = element.rotation ?? 0;
            el.style.transform = rotation
                ? `translate(${x}px, ${y}px) rotate(${rotation}deg)`
                : `translate(${x}px, ${y}px)`;
            el.dataset.x = x;
            el.dataset.y = y;
        };

        // ── Zoom accessor ──────────────────────────────────────────────────────
        // Read zoom from args at event time (not captured at setup time) so
        // that zoom changes are reflected without needing to re-create the
        // interactable.
        const getZoom = () => this.args.zoom ?? 1;

        // ── Interactable ───────────────────────────────────────────────────────
        const interactable = interact(el)

            // ── Drag ──────────────────────────────────────────────────────────
            .draggable({
                // No modifiers — modifiers that use relativePoints or restrict
                // cause the pointer to snap to the element origin (center-snap
                // feel) and introduce jank. Free movement is smooth and accurate.
                listeners: {
                    move: (event) => {
                        const zoom = getZoom();
                        const pos  = getPos();
                        // Divide interact.js deltas by zoom so the element
                        // moves at the same speed as the pointer regardless of
                        // the current zoom level.
                        const x = pos.x + event.dx / zoom;
                        const y = pos.y + event.dy / zoom;
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
                // Each edge value is a CSS selector matched against the pointer
                // target. The corner handles each match two adjacent edges so
                // they resize in both directions simultaneously.
                edges: {
                    top:    '.tb-handle-nw, .tb-handle-ne',
                    left:   '.tb-handle-nw, .tb-handle-sw',
                    bottom: '.tb-handle-sw, .tb-handle-se',
                    right:  '.tb-handle-ne, .tb-handle-se',
                },
                listeners: {
                    move: (event) => {
                        const zoom = getZoom();
                        const pos  = getPos();

                        // When resizing from the top or left edge the element's
                        // origin shifts — update the translate to compensate.
                        const x = pos.x + event.deltaRect.left / zoom;
                        const y = pos.y + event.deltaRect.top  / zoom;
                        const w = event.rect.width  / zoom;
                        const h = event.rect.height / zoom;

                        el.style.width  = `${w}px`;
                        el.style.height = `${h}px`;
                        applyTransform(x, y);
                    },
                    end: (event) => {
                        const zoom = getZoom();
                        const pos  = getPos();
                        const w = event.rect.width  / zoom;
                        const h = event.rect.height / zoom;
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
                modifiers: [
                    // Enforce a minimum element size so elements cannot be
                    // collapsed to zero. No snap modifier — same reasoning as drag.
                    interact.modifiers.restrictSize({
                        min: { width: 20, height: 10 },
                    }),
                ],
            });

        this._interactables.set(element.uuid, interactable);
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    _unitToPx(value, unit) {
        const PPI = 96; // CSS pixels per inch
        switch (unit) {
            case 'mm': return Math.round((value / 25.4) * PPI);
            case 'cm': return Math.round((value / 2.54)  * PPI);
            case 'in': return Math.round(value * PPI);
            case 'px':
            default:   return Math.round(value);
        }
    }

    @action
    isSelected(element) {
        return this.args.selectedElement?.uuid === element.uuid;
    }
}
