import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

/**
 * TemplateBuilderPropertiesPanelComponent
 *
 * Right-side panel that shows and edits all properties of the currently
 * selected element. Sections are collapsed/expanded. When no element is
 * selected, shows template-level canvas settings.
 *
 * @argument {Object}   selectedElement  - Currently selected element (or null)
 * @argument {Object}   template         - The template object (for canvas settings)
 * @argument {Array}    contextSchemas   - Variable schemas from the API
 * @argument {Function} onUpdateElement  - Called with (uuid, changes)
 * @argument {Function} onUpdateTemplate - Called with changes to the template itself
 * @argument {Function} onOpenVariablePicker - Called to open the variable picker modal
 */
export default class TemplateBuilderPropertiesPanelComponent extends Component {
    @tracked openSections = new Set(['position', 'size', 'style', 'text', 'content']);

    get hasSelection() {
        return !!this.args.selectedElement;
    }

    get element() {
        return this.args.selectedElement;
    }

    get elementType() {
        return this.element?.type ?? null;
    }

    get isText() { return this.elementType === 'text'; }
    get isImage() { return this.elementType === 'image'; }
    get isTable() { return this.elementType === 'table'; }
    get isLine() { return this.elementType === 'line'; }
    get isShape() { return this.elementType === 'shape'; }
    get isQrCode() { return this.elementType === 'qr_code'; }
    get isBarcode() { return this.elementType === 'barcode'; }
    get hasTextContent() { return this.isText; }
    get hasBorderOptions() { return !this.isLine; }

    @action
    isSectionOpen(section) {
        return this.openSections.has(section);
    }

    @action
    toggleSection(section) {
        const next = new Set(this.openSections);
        if (next.has(section)) {
            next.delete(section);
        } else {
            next.add(section);
        }
        this.openSections = next;
    }

    @action
    updateProp(prop, event) {
        const value = event?.target ? event.target.value : event;
        if (this.args.onUpdateElement && this.element) {
            this.args.onUpdateElement(this.element.uuid, { [prop]: value });
        }
    }

    @action
    updateNumericProp(prop, event) {
        const raw = event?.target ? event.target.value : event;
        const value = raw === '' ? null : parseFloat(raw);
        if (this.args.onUpdateElement && this.element) {
            this.args.onUpdateElement(this.element.uuid, { [prop]: value });
        }
    }

    @action
    updateTemplateProp(prop, event) {
        const value = event?.target ? event.target.value : event;
        if (this.args.onUpdateTemplate) {
            this.args.onUpdateTemplate({ [prop]: value });
        }
    }

    @action
    openVariablePicker(targetProp) {
        if (this.args.onOpenVariablePicker) {
            this.args.onOpenVariablePicker(targetProp, (variable) => {
                if (this.args.onUpdateElement && this.element) {
                    const current = this.element[targetProp] ?? '';
                    this.args.onUpdateElement(this.element.uuid, { [targetProp]: current + variable });
                }
            });
        }
    }

    get fontWeightOptions() {
        return [
            { value: '300', label: 'Light' },
            { value: '400', label: 'Regular' },
            { value: '500', label: 'Medium' },
            { value: '600', label: 'Semi Bold' },
            { value: '700', label: 'Bold' },
            { value: '800', label: 'Extra Bold' },
            { value: '900', label: 'Black' },
        ];
    }

    get fontFamilyOptions() {
        return [
            { value: 'Inter, sans-serif', label: 'Inter' },
            { value: 'Arial, sans-serif', label: 'Arial' },
            { value: 'Helvetica, sans-serif', label: 'Helvetica' },
            { value: 'Georgia, serif', label: 'Georgia' },
            { value: 'Times New Roman, serif', label: 'Times New Roman' },
            { value: 'Courier New, monospace', label: 'Courier New' },
            { value: 'Roboto, sans-serif', label: 'Roboto' },
            { value: 'Open Sans, sans-serif', label: 'Open Sans' },
        ];
    }

    get textAlignOptions() {
        return [
            { value: 'left',    icon: 'align-left' },
            { value: 'center',  icon: 'align-center' },
            { value: 'right',   icon: 'align-right' },
            { value: 'justify', icon: 'align-justify' },
        ];
    }

    get lineStyleOptions() {
        return [
            { value: 'solid',  label: 'Solid' },
            { value: 'dashed', label: 'Dashed' },
            { value: 'dotted', label: 'Dotted' },
        ];
    }

    get objectFitOptions() {
        return [
            { value: 'cover',    label: 'Cover' },
            { value: 'contain',  label: 'Contain' },
            { value: 'fill',     label: 'Fill' },
            { value: 'none',     label: 'None' },
        ];
    }

    get shapeOptions() {
        return [
            { value: 'rectangle', label: 'Rectangle' },
            { value: 'circle',    label: 'Circle' },
        ];
    }

    get paperSizeOptions() {
        return [
            { value: 'A4',     label: 'A4 (210 × 297 mm)' },
            { value: 'A3',     label: 'A3 (297 × 420 mm)' },
            { value: 'A5',     label: 'A5 (148 × 210 mm)' },
            { value: 'Letter', label: 'Letter (216 × 279 mm)' },
            { value: 'Legal',  label: 'Legal (216 × 356 mm)' },
            { value: 'custom', label: 'Custom' },
        ];
    }

    get orientationOptions() {
        return [
            { value: 'portrait',  label: 'Portrait' },
            { value: 'landscape', label: 'Landscape' },
        ];
    }
}
