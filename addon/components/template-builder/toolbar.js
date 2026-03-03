import Component from '@glimmer/component';
import { action } from '@ember/object';
import { guidFor } from '@ember/object/internals';

/**
 * TemplateBuilderToolbarComponent
 *
 * Top toolbar for the template builder. Provides:
 * - Element type buttons (add text, image, table, line, shape, QR, barcode)
 * - Zoom controls
 * - Undo / Redo
 * - Preview and Save/Publish actions
 *
 * @argument {Number}   zoom          - Current zoom level (e.g. 1 = 100%)
 * @argument {Boolean}  canUndo       - Whether undo is available
 * @argument {Boolean}  canRedo       - Whether redo is available
 * @argument {Boolean}  isSaving      - Whether a save is in progress
 * @argument {Function} onAddElement  - Called with element type string
 * @argument {Function} onZoomIn      - Called when zoom in is clicked
 * @argument {Function} onZoomOut     - Called when zoom out is clicked
 * @argument {Function} onZoomReset   - Called when zoom reset is clicked
 * @argument {Function} onUndo        - Called when undo is clicked
 * @argument {Function} onRedo        - Called when redo is clicked
 * @argument {Function} onPreview     - Called when preview is clicked
 * @argument {Function} onSave        - Called when save is clicked
 */
export default class TemplateBuilderToolbarComponent extends Component {
    elementTypes = [
        { type: 'text',    icon: 'font',         label: 'Text' },
        { type: 'image',   icon: 'image',         label: 'Image' },
        { type: 'table',   icon: 'table',         label: 'Table' },
        { type: 'line',    icon: 'minus',         label: 'Line' },
        { type: 'shape',   icon: 'square',        label: 'Shape' },
        { type: 'qr_code', icon: 'qrcode',        label: 'QR Code' },
        { type: 'barcode', icon: 'barcode',       label: 'Barcode' },
    ];

    get zoomPercent() {
        return `${Math.round((this.args.zoom ?? 1) * 100)}%`;
    }

    @action
    addElement(type) {
        if (this.args.onAddElement) {
            this.args.onAddElement(type);
        }
    }

    @action
    zoomIn() {
        if (this.args.onZoomIn) this.args.onZoomIn();
    }

    @action
    zoomOut() {
        if (this.args.onZoomOut) this.args.onZoomOut();
    }

    @action
    zoomReset() {
        if (this.args.onZoomReset) this.args.onZoomReset();
    }

    @action
    undo() {
        if (this.args.onUndo) this.args.onUndo();
    }

    @action
    redo() {
        if (this.args.onRedo) this.args.onRedo();
    }

    @action
    preview() {
        if (this.args.onPreview) this.args.onPreview();
    }

    @action
    save() {
        if (this.args.onSave) this.args.onSave();
    }
}
