import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { guidFor } from '@ember/object/internals';

/**
 * TemplateBuilderCanvasComponent
 *
 * Renders the document canvas — a pixel-accurate representation of the
 * template page. Each element is rendered by an ElementRenderer component
 * that owns its own interact.js instance, drag/resize behaviour, and
 * selection tap handling.
 *
 * This component is intentionally thin:
 *   - Computes canvas dimensions and style from @template
 *   - Tracks which element is selected (by uuid primitive)
 *   - Handles deselect-all when the canvas background is clicked
 *   - Passes @canvasWidth / @canvasHeight to each ElementRenderer so it can
 *     clamp drag/resize to the canvas boundary
 *
 * It has no knowledge of interact.js, DOM nodes, or element data mutations.
 *
 * @argument {Object}   template         - The template object (width, height, unit, background_color, content)
 * @argument {Object}   selectedElement  - The currently selected element (or null)
 * @argument {Number}   zoom             - Zoom level (1 = 100%)
 * @argument {Function} onSelectElement  - Called with (element) when an element is tapped
 * @argument {Function} onMoveElement    - Called with (uuid, { x, y }) after a drag ends
 * @argument {Function} onResizeElement  - Called with (uuid, { x, y, width, height }) after a resize ends
 * @argument {Function} onDeselectAll    - Called when the canvas background is clicked
 */
export default class TemplateBuilderCanvasComponent extends Component {
    canvasId = `tb-canvas-${guidFor(this)}`;

    /**
     * Tracked UUID of the currently selected element. Using a primitive string
     * (not an object reference) ensures Glimmer detects the change and
     * re-renders only the affected ElementRenderer's selection ring.
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
        const w = this.canvasWidthPx * this.zoom;
        const h = this.canvasHeightPx * this.zoom;
        const bg = this.args.template?.background_color ?? '#ffffff';
        return `width:${w}px; height:${h}px; background:${bg}; position:relative; overflow:hidden;`;
    }

    get elements() {
        return this.args.template?.content ?? [];
    }

    get selectedUuid() {
        return this._selectedUuid;
    }

    // -------------------------------------------------------------------------
    // Selection
    // -------------------------------------------------------------------------

    @action
    handleSelectElement(element) {
        this._selectedUuid = element.uuid;
        if (this.args.onSelectElement) {
            this.args.onSelectElement(element);
        }
    }

    @action
    handleDeselectAll() {
        this._selectedUuid = null;
        if (this.args.onDeselectAll) {
            this.args.onDeselectAll();
        }
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    _unitToPx(value, unit) {
        const PPI = 96;
        switch (unit) {
            case 'mm': return Math.round((value / 25.4) * PPI);
            case 'cm': return Math.round((value / 2.54) * PPI);
            case 'in': return Math.round(value * PPI);
            case 'px':
            default:   return Math.round(value);
        }
    }
}
