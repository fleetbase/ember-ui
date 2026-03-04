import Component from '@glimmer/component';
import { action } from '@ember/object';
import interact from 'interactjs';

/**
 * TemplateBuilderElementRendererComponent
 *
 * Renders a single template element on the canvas and owns all interaction
 * behaviour for that element: drag, resize, and selection.
 *
 * Responsibilities
 * ----------------
 * - Sets up and tears down its own interact.js instance in did-insert /
 *   will-destroy. No parent component needs to know about interact.js.
 * - Emits @onMove(uuid, { x, y }) when a drag gesture ends.
 * - Emits @onResize(uuid, { x, y, width, height }) when a resize gesture ends.
 * - Emits @onSelect(element) when the element is tapped/clicked.
 *
 * Positioning strategy
 * --------------------
 * The wrapper div is placed at `left: 0; top: 0` and positioned exclusively
 * via `transform: translate(x, y)`. interact.js updates this transform
 * imperatively during drag/resize. Glimmer's wrapperStyle deliberately omits
 * the transform so Glimmer re-renders never overwrite interact.js's live values.
 *
 * Canvas boundary clamping
 * ------------------------
 * @canvasWidth and @canvasHeight (in unscaled template pixels) are passed from
 * the canvas so the element cannot be dragged or resized outside the canvas.
 * @zoom is used to convert interact.js screen-pixel deltas to template pixels.
 *
 * @argument {Object}   element      - The element data object from template.content
 * @argument {Boolean}  isSelected   - Whether this element is currently selected
 * @argument {Number}   zoom         - Canvas zoom level (1 = 100%)
 * @argument {Number}   canvasWidth  - Canvas width in unscaled template pixels
 * @argument {Number}   canvasHeight - Canvas height in unscaled template pixels
 * @argument {Function} onSelect     - Called with (element) when element is tapped
 * @argument {Function} onMove       - Called with (uuid, { x, y }) after drag ends
 * @argument {Function} onResize     - Called with (uuid, { x, y, width, height }) after resize ends
 */
export default class TemplateBuilderElementRendererComponent extends Component {
    /** @type {import('interactjs').Interactable|null} */
    _interactable = null;

    // -------------------------------------------------------------------------
    // Lifecycle
    // -------------------------------------------------------------------------

    @action
    handleInsert(el) {
        // Seed position data-attributes from the element data model.
        el.dataset.x = this.args.element.x ?? 0;
        el.dataset.y = this.args.element.y ?? 0;

        // Apply the initial CSS transform so the element appears at the correct
        // position immediately, before any interact.js event fires.
        this._applyTransform(el);

        // Set up interact.js on this element's DOM node.
        this._setupInteract(el);
    }

    @action
    handleUpdate(el) {
        // Glimmer has just re-rendered the style attribute (e.g. after a z_index
        // change via reorderElement). The style attribute does not include the
        // CSS transform — that is managed imperatively by interact.js and
        // _applyTransform. Re-apply it now so the element stays at its current
        // position rather than snapping to 0,0.
        this._applyTransform(el);
    }

    @action
    handleDestroy(el) {
        if (this._interactable) {
            try {
                this._interactable.unset();
            } catch (_) {
                // ignore
            }
            this._interactable = null;
        }
    }

    // -------------------------------------------------------------------------
    // Interaction setup
    // -------------------------------------------------------------------------

    _setupInteract(el) {
        // ── Helpers ────────────────────────────────────────────────────────────

        const getPos = () => ({
            x: parseFloat(el.dataset.x) || 0,
            y: parseFloat(el.dataset.y) || 0,
        });

        const applyTransform = (x, y) => {
            // Read rotation from the data-attribute so it stays current even
            // after property-panel updates (which re-render @element but do not
            // recreate the interact.js instance).
            const rotation = parseFloat(el.dataset.rotation) || 0;
            el.style.transform = rotation
                ? `translate(${x}px, ${y}px) rotate(${rotation}deg)`
                : `translate(${x}px, ${y}px)`;
            el.dataset.x = x;
            el.dataset.y = y;
        };

        // Read zoom and canvas dimensions at event time so changes are reflected
        // without needing to recreate the interactable.
        const getZoom = () => this.args.zoom ?? 1;
        const getCanvas = () => ({
            w: this.args.canvasWidth ?? Infinity,
            h: this.args.canvasHeight ?? Infinity,
        });

        // ── Interactable ───────────────────────────────────────────────────────
        this._interactable = interact(el)
            // Tap fires for clicks/taps even when interact.js has consumed the
            // underlying pointer events for drag detection.
            .on('tap', (event) => {
                event.stopPropagation();
                if (this.args.onSelect) {
                    this.args.onSelect(this.args.element);
                }
            })

            // ── Drag ──────────────────────────────────────────────────────────
            .draggable({
                listeners: {
                    move: (event) => {
                        const zoom = getZoom();
                        const canvas = getCanvas();
                        const pos = getPos();

                        let x = pos.x + event.dx / zoom;
                        let y = pos.y + event.dy / zoom;

                        // Clamp so the element cannot leave the canvas.
                        const elW = parseFloat(el.style.width) || (this.args.element.width ?? 100);
                        const elH = parseFloat(el.style.height) || (this.args.element.height ?? 30);
                        x = Math.max(0, Math.min(x, canvas.w - elW));
                        y = Math.max(0, Math.min(y, canvas.h - elH));

                        applyTransform(x, y);
                    },
                    end: () => {
                        const pos = getPos();
                        if (this.args.onMove) {
                            this.args.onMove(this.args.element.uuid, {
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
                    top: '.tb-handle-nw, .tb-handle-ne',
                    left: '.tb-handle-nw, .tb-handle-sw',
                    bottom: '.tb-handle-sw, .tb-handle-se',
                    right: '.tb-handle-ne, .tb-handle-se',
                },
                listeners: {
                    move: (event) => {
                        const zoom = getZoom();
                        const canvas = getCanvas();
                        const pos = getPos();

                        let x = pos.x + event.deltaRect.left / zoom;
                        let y = pos.y + event.deltaRect.top / zoom;
                        let w = event.rect.width / zoom;
                        let h = event.rect.height / zoom;

                        w = Math.max(20, w);
                        h = Math.max(10, h);

                        x = Math.max(0, Math.min(x, canvas.w - w));
                        y = Math.max(0, Math.min(y, canvas.h - h));

                        el.style.width = `${w}px`;
                        el.style.height = `${h}px`;
                        applyTransform(x, y);
                    },
                    end: (event) => {
                        const zoom = getZoom();
                        const pos = getPos();
                        const w = Math.max(20, event.rect.width / zoom);
                        const h = Math.max(10, event.rect.height / zoom);
                        if (this.args.onResize) {
                            this.args.onResize(this.args.element.uuid, {
                                x: Math.round(pos.x),
                                y: Math.round(pos.y),
                                width: Math.round(w),
                                height: Math.round(h),
                            });
                        }
                    },
                },
            });
    }

    // -------------------------------------------------------------------------
    // Transform helper
    // -------------------------------------------------------------------------

    /**
     * Apply the full CSS transform to a DOM element, reading x/y from its
     * data-attributes (kept current by interact.js) and rotation from the
     * element data model. Also writes data-rotation so the interact.js closure
     * can read the current rotation without a stale object reference.
     */
    _applyTransform(el) {
        const x = parseFloat(el.dataset.x) || 0;
        const y = parseFloat(el.dataset.y) || 0;
        const rotation = this.args.element.rotation ?? 0;
        el.dataset.rotation = rotation;
        el.style.transform = rotation
            ? `translate(${x}px, ${y}px) rotate(${rotation}deg)`
            : `translate(${x}px, ${y}px)`;
    }

    // -------------------------------------------------------------------------
    // Computed styles and content
    // -------------------------------------------------------------------------

    get wrapperStyle() {
        const el = this.args.element;
        const parts = [
            `position: absolute`,
            `left: 0`,
            `top: 0`,
            `width: ${el.width ?? 100}px`,
            `height: ${el.height ?? 30}px`,
            `z-index: ${el.z_index ?? 1}`,
            `box-sizing: border-box`,
            `cursor: move`,
        ];
        if (el.opacity !== undefined && el.opacity !== null) {
            parts.push(`opacity: ${el.opacity}`);
        }
        // transform is intentionally omitted — it is managed imperatively by
        // handleInsert and interact.js so Glimmer re-renders never overwrite it.
        return parts.join('; ');
    }

    get selectionClass() {
        return this.args.isSelected
            ? 'ring-2 ring-blue-500 ring-offset-0'
            : 'hover:ring-1 hover:ring-blue-300 hover:ring-offset-0';
    }

    get elementType() {
        return this.args.element?.type ?? 'text';
    }

    get isText() { return this.elementType === 'text'; }
    get isImage() { return this.elementType === 'image'; }
    get isTable() { return this.elementType === 'table'; }
    get isLine() { return this.elementType === 'line'; }
    get isShape() { return this.elementType === 'shape'; }
    get isQrCode() { return this.elementType === 'qr_code'; }
    get isBarcode() { return this.elementType === 'barcode'; }

    // ── Text ──────────────────────────────────────────────────────────────────

    get textStyle() {
        const el = this.args.element;
        const styles = this._baseContentStyles(el);
        if (el.font_size) styles.push(`font-size: ${el.font_size}px`);
        if (el.font_family) styles.push(`font-family: ${el.font_family}`);
        if (el.font_weight) styles.push(`font-weight: ${el.font_weight}`);
        if (el.font_style) styles.push(`font-style: ${el.font_style}`);
        if (el.text_align) styles.push(`text-align: ${el.text_align}`);
        if (el.text_decoration) styles.push(`text-decoration: ${el.text_decoration}`);
        if (el.line_height) styles.push(`line-height: ${el.line_height}`);
        if (el.letter_spacing) styles.push(`letter-spacing: ${el.letter_spacing}px`);
        if (el.color) styles.push(`color: ${el.color}`);
        if (el.background_color) styles.push(`background-color: ${el.background_color}`);
        if (el.padding) styles.push(`padding: ${el.padding}px`);
        styles.push(`width: 100%; height: 100%; overflow: hidden; word-wrap: break-word;`);
        return styles.join('; ');
    }

    get textContent() {
        return this.args.element?.content ?? '';
    }

    // ── Image ─────────────────────────────────────────────────────────────────

    get imageStyle() {
        const el = this.args.element;
        const styles = [`width: 100%; height: 100%; display: block;`];
        if (el.object_fit) styles.push(`object-fit: ${el.object_fit}`);
        if (el.border_radius) styles.push(`border-radius: ${el.border_radius}px`);
        return styles.join('; ');
    }

    get imageSrc() { return this.args.element?.src ?? ''; }
    get imageAlt() { return this.args.element?.alt ?? ''; }

    // ── Table ─────────────────────────────────────────────────────────────────

    get tableColumns() { return this.args.element?.columns ?? []; }
    get tableRows() { return this.args.element?.rows ?? []; }

    get tableHeaderStyle() {
        const el = this.args.element;
        const styles = [];
        if (el.header_background) styles.push(`background-color: ${el.header_background}`);
        if (el.header_color) styles.push(`color: ${el.header_color}`);
        if (el.header_font_size) styles.push(`font-size: ${el.header_font_size}px`);
        if (el.header_font_weight) styles.push(`font-weight: ${el.header_font_weight}`);
        return styles.join('; ');
    }

    get tableCellStyle() {
        const el = this.args.element;
        const styles = [];
        if (el.cell_padding) styles.push(`padding: ${el.cell_padding}px`);
        if (el.cell_font_size) styles.push(`font-size: ${el.cell_font_size}px`);
        if (el.border_color) styles.push(`border-color: ${el.border_color}`);
        return styles.join('; ');
    }

    // ── Line ──────────────────────────────────────────────────────────────────

    get lineStyle() {
        return `width: 100%; height: 100%; display: flex; align-items: center;`;
    }

    get lineInnerStyle() {
        const el = this.args.element;
        return `width: 100%; border-top: ${el.line_width ?? 1}px ${el.line_style ?? 'solid'} ${el.color ?? '#000000'}`;
    }

    // ── Shape ─────────────────────────────────────────────────────────────────

    get shapeStyle() {
        const el = this.args.element;
        const styles = [`width: 100%; height: 100%;`];
        if (el.background_color) styles.push(`background-color: ${el.background_color}`);
        if (el.border_width) styles.push(`border: ${el.border_width}px ${el.border_style ?? 'solid'} ${el.border_color ?? '#000000'}`);
        if (el.border_radius) styles.push(`border-radius: ${el.border_radius}px`);
        if (el.shape === 'circle') styles.push(`border-radius: 50%`);
        return styles.join('; ');
    }

    // ── QR / Barcode ──────────────────────────────────────────────────────────

    get codeLabel() {
        const el = this.args.element;
        return el.value ?? (this.isQrCode ? 'QR Code' : 'Barcode');
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    _baseContentStyles(el) {
        const styles = [];
        if (el.border_width) {
            styles.push(`border: ${el.border_width}px ${el.border_style ?? 'solid'} ${el.border_color ?? '#000000'}`);
        }
        if (el.border_radius) styles.push(`border-radius: ${el.border_radius}px`);
        return styles;
    }
}
