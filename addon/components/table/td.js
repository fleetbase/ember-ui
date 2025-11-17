import TableCellComponent from './cell';
import { action } from '@ember/object';

export default class TableTdComponent extends TableCellComponent {
    get isSticky() {
        const { column, sticky } = this.args;
        // Support sticky for checkbox column or regular columns
        if (sticky && !column) {
            return true;
        }
        return column?.sticky === true || column?.sticky === 'left' || column?.sticky === 'right';
    }

    get stickyPosition() {
        const { column, sticky } = this.args;
        // Checkbox column defaults to left
        if (sticky && !column) {
            return 'left';
        }
        return column?._stickyPosition || (column?.sticky === 'right' ? 'right' : 'left');
    }

    get stickyOffset() {
        const { column, sticky } = this.args;
        // Checkbox column is always first (offset 0)
        if (sticky && !column) {
            return 0;
        }
        return column?._stickyOffset || 0;
    }

    get stickyZIndex() {
        const { column } = this.args;
        // Body cells have lower z-index than header cells
        return column?._stickyZIndex || 15;
    }

    @action setupComponent(tableCellNode) {
        this.tableCellNode = tableCellNode;
        this.setupTableCellNode(tableCellNode);
    }

    @action setupTableCellNode(tableCellNode) {
        const { column, width } = this.args;

        if (column?.width) {
            tableCellNode.style.width = typeof column.width === 'number' ? `${column.width}px` : column.width;
        }

        if (width) {
            tableCellNode.style.width = typeof width === 'number' ? `${width}px` : width;
        }

        // Apply sticky positioning
        if (this.isSticky) {
            tableCellNode.style.position = 'sticky';
            // Body cells don't need top positioning (only horizontal sticky)
            tableCellNode.style[this.stickyPosition] = `${this.stickyOffset}px`;
            tableCellNode.style.zIndex = this.stickyZIndex;
            tableCellNode.classList.add('is-sticky', `sticky-${this.stickyPosition}`);

            // Add data attribute for column identification
            if (column?.valuePath) {
                tableCellNode.setAttribute('data-column-id', column.valuePath);
            }
        }
    }
}
