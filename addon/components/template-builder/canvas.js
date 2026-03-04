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
 * via the `handle` option. This means any drag gesture on the element body
 * is unambiguously a move, not a resize.
 *
 * Re-render safety
 * ----------------
 * When `onUpdateElement` triggers a template re-render, Glimmer destroys
 * and recreates the element's DOM node. `teardownElement` (via will-destroy)
 * unsets the old interactable, and `setupElement` (via did-insert on the new
 * node) creates a fresh one — so the element is always interactive.
 *
 * @argument {Object}   template         - The template object (width, height, unit, orientation, content)
 * @argument {Object}   selectedElement  - The currently selected element (or null)
 * @argument {Function} onSelectElement  - Called with element when user clicks it
 * @argument {Function} onUpdateElement  - Called with (elementId, changes) when drag/resize completes
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
        // Destroy all interact.js instances to prevent memory leaks.
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
        // If a stale interactable exists for this uuid (e.g. after a re-render
        // recreated the DOM node), unset it before creating a new one.
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
        const zoom = this.zoom;

        // Helper: read the current translate values from the element's
        // data attributes (seeded in element-renderer.js handleInsert).
        const getPos = () => ({
            x: parseFloat(el.dataset.x) || 0,
            y: parseFloat(el.dataset.y) || 0,
        });

        // Helper: apply translate (+ optional rotation) to the element.
        const applyTransform = (x, y) => {
            const rotation = element.rotation ?? 0;
            el.style.transform = rotation
                ? `translate(${x}px, ${y}px) rotate(${rotation}deg)`
                : `translate(${x}px, ${y}px)`;
            el.dataset.x = x;
            el.dataset.y = y;
        };

        const interactable = interact(el)
            // ── Drag ──────────────────────────────────────────────────────────
            .draggable({
                // Require a small movement threshold before a drag starts.
                // This prevents accidental drags when the user intends to click.
                startAxis: 'xy',
                lockAxis: 'xy',
                listeners: {
                    move(event) {
                        const pos = getPos();
                        const x = pos.x + event.dx / zoom;
                        const y = pos.y + event.dy / zoom;
                        applyTransform(x, y);
                    },
                    end(event) {
                        const pos = getPos();
                        // Use onMoveElement (silent, no re-render) for positional
                        // updates from drag gestures so interact.js instances are
                        // not destroyed and recreated after every drag.
                        if (this.args?.onMoveElement) {
                            this.args.onMoveElement(element.uuid, { x: pos.x, y: pos.y });
                        }
                    }.bind(this),
                },
                modifiers: [
                    // 5 px grid snap
                    interact.modifiers.snap({
                        targets: [interact.snappers.grid({ x: 5, y: 5 })],
                        range: Infinity,
                        relativePoints: [{ x: 0, y: 0 }],
                    }),
                    // Keep element inside the canvas
                    interact.modifiers.restrict({
                        restriction: 'parent',
                        elementRect: { top: 0, left: 0, bottom: 1, right: 1 },
                        endOnly: false,
                    }),
                ],
            })
            // ── Resize ────────────────────────────────────────────────────────
            .resizable({
                // Restrict resize gestures to the four corner handle elements.
                // This is the key fix: without this, any drag on the element
                // body is ambiguously interpreted as a resize on the nearest
                // edge, which is why drag was broken.
                edges: {
                    top:    '.tb-handle-nw, .tb-handle-ne',
                    left:   '.tb-handle-nw, .tb-handle-sw',
                    bottom: '.tb-handle-sw, .tb-handle-se',
                    right:  '.tb-handle-ne, .tb-handle-se',
                },
                listeners: {
                    move(event) {
                        const pos = getPos();
                        // When resizing from the top or left, the element's
                        // origin shifts — we must update the translate too.
                        const x = pos.x + event.deltaRect.left / zoom;
                        const y = pos.y + event.deltaRect.top / zoom;
                        const w = event.rect.width / zoom;
                        const h = event.rect.height / zoom;

                        el.style.width  = `${w}px`;
                        el.style.height = `${h}px`;
                        applyTransform(x, y);
                    },
                    end(event) {
                        const pos = getPos();
                        const w = event.rect.width / zoom;
                        const h = event.rect.height / zoom;
                        if (this.args?.onMoveElement) {
                            this.args.onMoveElement(element.uuid, {
                                x: pos.x,
                                y: pos.y,
                                width: w,
                                height: h,
                            });
                        }
                    }.bind(this),
                },
                modifiers: [
                    interact.modifiers.restrictSize({
                        min: { width: 20, height: 10 },
                    }),
                    // 5 px grid snap for size too
                    interact.modifiers.snapSize({
                        targets: [interact.snappers.grid({ width: 5, height: 5 })],
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
