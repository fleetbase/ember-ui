import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action, set } from '@ember/object';
import { isArray } from '@ember/array';
import { later } from '@ember/runloop';
import { filter } from '@ember/object/computed';

export default class TableComponent extends Component {
    @tracked allRowsSelected = false;
    @tracked tableNode;
    @tracked rows = [];
    @tracked columns = [];
    @filter('columns.@each.hidden', (column) => !column.hidden) visibleColumns;
    @filter('rows.@each.checked', (row) => row.checked) selectedRows;

    @action setupComponent(tableNode) {
        const { onSetup, rows, columns } = this.args;

        this.tableNode = tableNode;
        this.setRows(rows);
        this.setColumns(columns);

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

    @action setColumns(columns = []) {
        if (typeof columns?.toArray === 'function') {
            this.columns = columns.toArray();
        } else {
            this.columns = columns;
        }
        return this;
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

    @action setRows(rows = []) {
        if (typeof rows?.toArray === 'function') {
            this.rows = rows.toArray();
        } else {
            this.rows = rows;
        }
        return this;
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
