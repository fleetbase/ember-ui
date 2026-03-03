import Component from '@glimmer/component';
import { action } from '@ember/object';

/**
 * TemplateBuilderElementRendererComponent
 *
 * Renders a single template element on the canvas. Handles all element types:
 * text, image, table, line, shape, qr_code, barcode.
 *
 * Each element is absolutely positioned via inline style derived from its
 * stored x, y, width, height, rotation, and z_index properties.
 *
 * @argument {Object}   element       - The element object from template.content
 * @argument {Boolean}  isSelected    - Whether this element is currently selected
 * @argument {Number}   zoom          - Canvas zoom level
 * @argument {Function} onSelect      - Called when element is clicked
 * @argument {Function} onDidInsert   - Called with the DOM element after insert
 * @argument {Function} onWillDestroy - Called before DOM element is removed
 */
export default class TemplateBuilderElementRendererComponent extends Component {
    @action
    handleInsert(el) {
        // Sync stored x/y into data attributes for interact.js delta tracking
        el.dataset.x = this.args.element.x ?? 0;
        el.dataset.y = this.args.element.y ?? 0;

        if (this.args.onDidInsert) {
            this.args.onDidInsert(el);
        }
    }

    @action
    handleDestroy() {
        if (this.args.onWillDestroy) {
            this.args.onWillDestroy();
        }
    }

    @action
    handleClick(event) {
        event.stopPropagation();
        if (this.args.onSelect) {
            this.args.onSelect(event);
        }
    }

    get wrapperStyle() {
        const el = this.args.element;
        const parts = [
            `position: absolute`,
            `left: ${el.x ?? 0}px`,
            `top: ${el.y ?? 0}px`,
            `width: ${el.width ?? 100}px`,
            `height: ${el.height ?? 30}px`,
            `z-index: ${el.z_index ?? 1}`,
            `box-sizing: border-box`,
            `cursor: move`,
        ];
        if (el.rotation) {
            parts.push(`transform: rotate(${el.rotation}deg)`);
        }
        if (el.opacity !== undefined && el.opacity !== null) {
            parts.push(`opacity: ${el.opacity}`);
        }
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

    // -------------------------------------------------------------------------
    // Text element styles
    // -------------------------------------------------------------------------

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

    // -------------------------------------------------------------------------
    // Image element styles
    // -------------------------------------------------------------------------

    get imageStyle() {
        const el = this.args.element;
        const styles = [`width: 100%; height: 100%; display: block;`];
        if (el.object_fit) styles.push(`object-fit: ${el.object_fit}`);
        if (el.border_radius) styles.push(`border-radius: ${el.border_radius}px`);
        return styles.join('; ');
    }

    get imageSrc() {
        return this.args.element?.src ?? '';
    }

    get imageAlt() {
        return this.args.element?.alt ?? '';
    }

    // -------------------------------------------------------------------------
    // Table element
    // -------------------------------------------------------------------------

    get tableColumns() {
        return this.args.element?.columns ?? [];
    }

    get tableRows() {
        return this.args.element?.rows ?? [];
    }

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

    // -------------------------------------------------------------------------
    // Line element
    // -------------------------------------------------------------------------

    get lineStyle() {
        const el = this.args.element;
        const styles = [`width: 100%; height: 100%; display: flex; align-items: center;`];
        return styles.join('; ');
    }

    get lineInnerStyle() {
        const el = this.args.element;
        const styles = [`width: 100%;`];
        styles.push(`border-top: ${el.line_width ?? 1}px ${el.line_style ?? 'solid'} ${el.color ?? '#000000'}`);
        return styles.join('; ');
    }

    // -------------------------------------------------------------------------
    // Shape element
    // -------------------------------------------------------------------------

    get shapeStyle() {
        const el = this.args.element;
        const styles = [`width: 100%; height: 100%;`];
        if (el.background_color) styles.push(`background-color: ${el.background_color}`);
        if (el.border_width) styles.push(`border: ${el.border_width}px ${el.border_style ?? 'solid'} ${el.border_color ?? '#000000'}`);
        if (el.border_radius) styles.push(`border-radius: ${el.border_radius}px`);
        if (el.shape === 'circle') styles.push(`border-radius: 50%`);
        return styles.join('; ');
    }

    // -------------------------------------------------------------------------
    // QR Code / Barcode placeholder
    // -------------------------------------------------------------------------

    get codeLabel() {
        const el = this.args.element;
        return el.value ?? (this.isQrCode ? 'QR Code' : 'Barcode');
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    _baseContentStyles(el) {
        const styles = [];
        if (el.border_width) {
            styles.push(`border: ${el.border_width}px ${el.border_style ?? 'solid'} ${el.border_color ?? '#000000'}`);
        }
        if (el.border_radius) styles.push(`border-radius: ${el.border_radius}px`);
        return styles;
    }
}
