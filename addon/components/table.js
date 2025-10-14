import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action, set } from '@ember/object';
import { inject as service } from '@ember/service';
import { isArray } from '@ember/array';
import { later } from '@ember/runloop';
import { filter, alias } from '@ember/object/computed';
import { isEqual } from '@fleetbase/ember-core/decorators/is-equal';

export default class TableComponent extends Component {
    @service tableContext;
    @tracked tableNode;
    @tracked allRowsToggled = false;
    @alias('args.rows') rows;
    @alias('args.columns') columns;
    @filter('args.columns.@each.hidden', (column) => !column.hidden) visibleColumns;
    @filter('args.rows.@each.checked', (row) => row.checked) selectedRows;
    @isEqual('selectedRows.length', 'rows.length') allRowsSelected;

    @action setupComponent(tableNode) {
        const { onSetup } = this.args;

        this.tableNode = tableNode;
        this.tableContext.node = tableNode;
        this.tableContext.table = this;

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
        this.allRowsToggled = !this.allRowsToggled;

        for (let i = 0; i < this.rows.length; i++) {
            const row = this.rows.objectAt(i);
            set(row, 'checked', this.allRowsToggled);
        }
    }

    @action untoggleAllRows() {
        this.untoggleSelectAll();

        for (let i = 0; i < this.rows.length; i++) {
            const row = this.rows.objectAt(i);
            set(row, 'checked', false);
        }
    }

    @action untoggleSelected() {
        this.untoggleSelectAll();

        for (let i = 0; i < this.selectedRows.length; i++) {
            const row = this.selectedRows.objectAt(i);
            set(row, 'checked', false);
        }
    }

    @action untoggleSelectAll() {
        this.allRowsToggled = false;
    }

    @action toggleSelectAll() {
        this.allRowsToggled = true;
    }

    getSelectedIds() {
        return this.selectedRows.map((_) => _.id);
    }
}
