import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action, computed } from '@ember/object';

export default class TableCellDropdownComponent extends Component {
    @tracked tableCellNode;
    defaultButtonText = 'Actions';

    @computed('args.column.ddButtonText', 'defaultButtonText') get buttonText() {
        const { ddButtonText } = this.args.column;

        if (ddButtonText === undefined) {
            return this.defaultButtonText;
        }

        if (ddButtonText === false) {
            return null;
        }

        return ddButtonText;
    }

    @action setupComponent(dropdownWrapperNode) {
        const tableCellNode = this.getOwnerTableCell(dropdownWrapperNode);
        tableCellNode.style.overflow = 'visible';
        this.tableCellNode = tableCellNode;
    }

    @action onOpen() {
        this.tableCellNode.style.zIndex = parseInt(this.tableCellNode.style.zIndex) + 1;
    }

    @action onClose() {
        this.tableCellNode.style.zIndex = parseInt(this.tableCellNode.style.zIndex) - 1;
    }

    @action getOwnerTableCell(dropdownWrapperNode) {
        while (dropdownWrapperNode) {
            dropdownWrapperNode = dropdownWrapperNode.parentNode;

            if (dropdownWrapperNode.tagName.toLowerCase() === 'td') {
                return dropdownWrapperNode;
            }
        }

        return undefined;
    }

    @action onDropdownItemClick(columnAction, row, dd) {
        if (typeof dd?.actions?.close === 'function') {
            dd.actions.close();
        }

        if (typeof columnAction?.fn === 'function') {
            columnAction.fn(row);
        }
    }

    @action calculatePosition(trigger, content) {
        const triggerRect = trigger.getBoundingClientRect();
        const contentRect = content?.getBoundingClientRect?.();
        const contentWidth = contentRect?.width || 224;

        let style = {
            position: 'fixed',
            marginTop: '0px',
            left: `${triggerRect.left - contentWidth - 3}px`,
            top: `${triggerRect.top}px`,
        };

        return { style };
    }
}
