import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { guidFor } from '@ember/object/internals';

/**
 * TemplateBuilderCanvasComponent
 *
 * Renders the document canvas — a pixel-accurate representation of the
 * template page. Each element is absolutely positioned and can be dragged
 * and resized via interact.js (loaded lazily from the host app or CDN).
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

    /** @type {any} interact.js instance map keyed by element uuid */
    _interactables = {};

    /** @type {HTMLElement} */
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
        // Destroy all interact.js instances to prevent memory leaks
        Object.values(this._interactables).forEach((interactable) => {
            try {
                interactable.unset();
            } catch (_) {
                // ignore
            }
        });
        this._interactables = {};
    }

    // -------------------------------------------------------------------------
    // Element interaction
    // -------------------------------------------------------------------------

    @action
    setupElement(element, el) {
        this._setupInteract(element, el);
    }

    @action
    teardownElement(element) {
        const interactable = this._interactables[element.uuid];
        if (interactable) {
            try {
                interactable.unset();
            } catch (_) {
                // ignore
            }
            delete this._interactables[element.uuid];
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
        // interact.js is loaded as a peer dependency in the host application.
        // We access it via window.interact (UMD build) or dynamic import.
        const interact = window.interact;
        if (!interact) {
            // Gracefully degrade — elements are still visible, just not draggable
            return;
        }

        const zoom = this.zoom;

        const interactable = interact(el)
            .draggable({
                listeners: {
                    move: (event) => {
                        const x = ((parseFloat(el.dataset.x) || 0) + event.dx / zoom);
                        const y = ((parseFloat(el.dataset.y) || 0) + event.dy / zoom);
                        el.style.transform = `translate(${x}px, ${y}px) rotate(${element.rotation ?? 0}deg)`;
                        el.dataset.x = x;
                        el.dataset.y = y;
                    },
                    end: (event) => {
                        const x = parseFloat(el.dataset.x) || 0;
                        const y = parseFloat(el.dataset.y) || 0;
                        if (this.args.onUpdateElement) {
                            this.args.onUpdateElement(element.uuid, { x, y });
                        }
                    },
                },
                modifiers: [
                    interact.modifiers.snap({
                        targets: [interact.snappers.grid({ x: 1, y: 1 })],
                        range: Infinity,
                        relativePoints: [{ x: 0, y: 0 }],
                    }),
                    interact.modifiers.restrict({
                        restriction: 'parent',
                        elementRect: { top: 0, left: 0, bottom: 1, right: 1 },
                    }),
                ],
            })
            .resizable({
                edges: { left: true, right: true, bottom: true, top: true },
                listeners: {
                    move: (event) => {
                        const x = (parseFloat(el.dataset.x) || 0) + event.deltaRect.left / zoom;
                        const y = (parseFloat(el.dataset.y) || 0) + event.deltaRect.top / zoom;
                        el.style.width = `${event.rect.width / zoom}px`;
                        el.style.height = `${event.rect.height / zoom}px`;
                        el.style.transform = `translate(${x}px, ${y}px) rotate(${element.rotation ?? 0}deg)`;
                        el.dataset.x = x;
                        el.dataset.y = y;
                    },
                    end: (event) => {
                        const x = parseFloat(el.dataset.x) || 0;
                        const y = parseFloat(el.dataset.y) || 0;
                        const width = event.rect.width / zoom;
                        const height = event.rect.height / zoom;
                        if (this.args.onUpdateElement) {
                            this.args.onUpdateElement(element.uuid, { x, y, width, height });
                        }
                    },
                },
                modifiers: [
                    interact.modifiers.restrictSize({
                        min: { width: 20, height: 10 },
                    }),
                ],
            });

        this._interactables[element.uuid] = interactable;
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    _unitToPx(value, unit) {
        const PPI = 96; // CSS pixels per inch
        switch (unit) {
            case 'mm':
                return Math.round((value / 25.4) * PPI);
            case 'cm':
                return Math.round((value / 2.54) * PPI);
            case 'in':
                return Math.round(value * PPI);
            case 'px':
            default:
                return Math.round(value);
        }
    }

    @action
    isSelected(element) {
        return this.args.selectedElement?.uuid === element.uuid;
    }

    @action
    elementStyle(element) {
        const parts = [
            `position: absolute`,
            `left: ${element.x ?? 0}px`,
            `top: ${element.y ?? 0}px`,
            `width: ${element.width ?? 100}px`,
            `height: ${element.height ?? 30}px`,
            `z-index: ${element.z_index ?? 1}`,
        ];
        if (element.rotation) {
            parts.push(`transform: rotate(${element.rotation}deg)`);
        }
        return parts.join('; ');
    }
}
