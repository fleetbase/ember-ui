import Component from '@glimmer/component';
import { action, computed, get } from '@ember/object';

export default class TableCellMediaNameComponent extends Component {
    @computed('args.row', 'args.column.{mediaPath,photoPath}') get mediaUrl() {
        const { row, column } = this.args;
        let path = 'photo_url';

        if (typeof column?.mediaPath === 'string') {
            path = column.mediaPath;
        }

        if (typeof column?.photoPath === 'string') {
            path = column.photoPath;
        }

        // Ember's `get` asserts on a nullish target, which would take down the
        // whole table render for a cell that has no row yet.
        return row ? get(row, path) : undefined;
    }

    @computed('args.row', 'args.column.{altText,altTextPath}') get altText() {
        const { row, column } = this.args;

        if (typeof column?.altText === 'string') {
            return column.altText;
        }

        if (typeof column?.altTextPath === 'string') {
            return row ? get(row, column.altTextPath) : '';
        }

        return '';
    }

    @action onClick(event) {
        const { row, column, onClick } = this.args;

        if (typeof onClick === 'function') {
            onClick(row, event);
        }

        if (typeof column?.onClick === 'function') {
            column.onClick(row, event);
        }

        if (typeof column?.action === 'function') {
            column.action(row, event);
        }
    }
}
