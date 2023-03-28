import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action, set } from '@ember/object';
import { isArray } from '@ember/array';
import { later } from '@ember/runloop';
import { filter, alias } from '@ember/object/computed';

export default class TableComponent extends Component {
    @tracked allRowsSelected = false;
    @tracked tableNode;
    @alias('args.rows') rows;
    @alias('args.columns') columns;
    @filter('args.columns.@each.hidden', (column) => !column.hidden) visibleColumns;
    @filter('args.rows.@each.checked', (row) => row.checked) selectedRows;

    @action setupComponent(tableNode) {
        const { onSetup } = this.args;

        this.tableNode = tableNode;

        later(
            this,
            () => {
                if (typeof onSetup === 'function') {
                    onSetup(this, tableNode);
                }
            },
            100
        );
    }

    @action addRow(row) {
        if (isArray(row)) {
            return this.addRows(row);
        }

        this.rows.pushObject(row);
        return this;
    }

    @action addRows(rows = []) {
        this.rows.pushObjects(rows);
        return this;
    }

    @action removeRow(row) {
        if (isArray(row)) {
            return this.removeRows(row);
        }

        this.rows.removeObject(row);
        return this.resetRowCheckboxes();
    }

    @action removeRows(rows = []) {
        this.rows.removeObjects(rows);
        return this.resetRowCheckboxes();
    }

    @action resetRowCheckboxes() {
        for (let i = 0; i < this.rows.length; i++) {
            const row = this.rows.objectAt(i);
            set(row, 'checked', row.checked === true);
        }

        return this;
    }

    @action selectAllRows() {
        this.allRowsSelected = !this.allRowsSelected;

        for (let i = 0; i < this.rows.length; i++) {
            const row = this.rows.objectAt(i);
            set(row, 'checked', this.allRowsSelected);
        }
    }
}
