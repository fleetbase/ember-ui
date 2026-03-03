import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

/**
 * TemplateBuilderLayersPanelComponent
 *
 * Left panel showing the element tree (layers). Supports:
 * - Selecting an element by clicking its row
 * - Toggling element visibility
 * - Deleting an element
 * - Reordering via z_index controls (move up/down)
 * - Renaming an element label
 *
 * @argument {Array}    elements         - The template content array (elements)
 * @argument {Object}   selectedElement  - Currently selected element
 * @argument {Function} onSelectElement  - Called with element when row is clicked
 * @argument {Function} onUpdateElement  - Called with (uuid, changes) to update an element
 * @argument {Function} onDeleteElement  - Called with uuid to delete an element
 * @argument {Function} onReorderElement - Called with (uuid, direction) — 'up' or 'down'
 */
export default class TemplateBuilderLayersPanelComponent extends Component {
    @tracked renamingUuid = null;
    @tracked renameValue = '';

    get sortedElements() {
        const elements = this.args.elements ?? [];
        // Sort descending by z_index so highest layer is at top of list (like Figma/Sketch)
        return [...elements].sort((a, b) => (b.z_index ?? 1) - (a.z_index ?? 1));
    }

    @action
    elementIcon(type) {
        const icons = {
            text:    'font',
            image:   'image',
            table:   'table',
            line:    'minus',
            shape:   'square',
            qr_code: 'qrcode',
            barcode: 'barcode',
        };
        return icons[type] ?? 'layer-group';
    }

    @action
    elementLabel(element) {
        if (element.label) return element.label;
        const typeLabels = {
            text:    'Text',
            image:   'Image',
            table:   'Table',
            line:    'Line',
            shape:   'Shape',
            qr_code: 'QR Code',
            barcode: 'Barcode',
        };
        return typeLabels[element.type] ?? 'Element';
    }

    @action
    isSelected(element) {
        return this.args.selectedElement?.uuid === element.uuid;
    }

    @action
    isVisible(element) {
        return element.visible !== false;
    }

    @action
    isRenaming(element) {
        return this.renamingUuid === element.uuid;
    }

    @action
    selectElement(element, event) {
        event.stopPropagation();
        if (this.args.onSelectElement) {
            this.args.onSelectElement(element);
        }
    }

    @action
    toggleVisibility(element, event) {
        event.stopPropagation();
        if (this.args.onUpdateElement) {
            this.args.onUpdateElement(element.uuid, { visible: !this.isVisible(element) });
        }
    }

    @action
    deleteElement(element, event) {
        event.stopPropagation();
        if (this.args.onDeleteElement) {
            this.args.onDeleteElement(element.uuid);
        }
    }

    @action
    moveUp(element, event) {
        event.stopPropagation();
        if (this.args.onReorderElement) {
            this.args.onReorderElement(element.uuid, 'up');
        }
    }

    @action
    moveDown(element, event) {
        event.stopPropagation();
        if (this.args.onReorderElement) {
            this.args.onReorderElement(element.uuid, 'down');
        }
    }

    @action
    startRename(element, event) {
        event.stopPropagation();
        this.renamingUuid = element.uuid;
        this.renameValue = this.elementLabel(element);
    }

    @action
    commitRename(element) {
        if (this.renameValue.trim() && this.args.onUpdateElement) {
            this.args.onUpdateElement(element.uuid, { label: this.renameValue.trim() });
        }
        this.renamingUuid = null;
        this.renameValue = '';
    }

    @action
    cancelRename() {
        this.renamingUuid = null;
        this.renameValue = '';
    }

    @action
    handleRenameKeydown(element, event) {
        if (event.key === 'Enter') {
            this.commitRename(element);
        } else if (event.key === 'Escape') {
            this.cancelRename();
        }
    }
}
