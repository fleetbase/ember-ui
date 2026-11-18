import Component from '@glimmer/component';
import { filter } from '@ember/object/computed';
import { set, action } from '@ember/object';

export default class VisibleColumnPickerComponent extends Component {
    /**
     * Filter only columns that have a label.
     *
     * @memberof VisibleColumnPickerComponent
     */
    @filter('args.columns.@each.label', (column) => column.label) columnsWithLabels;

    /**
     * Labelled columns that belong to no group, listed first.
     *
     * @memberof VisibleColumnPickerComponent
     */
    get ungroupedColumns() {
        return this.columnsWithLabels.filter((column) => !column.group);
    }

    /**
     * Labelled columns that name a `group`, gathered under that heading in the
     * order the groups first appear. Extensions use it to keep the columns they
     * add to a table apart from the table's own.
     *
     * @memberof VisibleColumnPickerComponent
     */
    get columnGroups() {
        const groups = new Map();

        for (const column of this.columnsWithLabels) {
            if (!column.group) {
                continue;
            }

            if (!groups.has(column.group)) {
                groups.set(column.group, []);
            }

            groups.get(column.group).push(column);
        }

        return [...groups.entries()].map(([name, columns]) => ({ name, columns }));
    }

    /**
     * Callback to apply selection changes
     *
     * @memberof VisibleColumnPickerComponent
     */
    @action applyChanges() {
        const { onApply, columns } = this.args;

        if (typeof onApply === 'function') {
            onApply(columns);
        }
    }

    /**
     * Handle column selection
     *
     * @param {Object|Column} column
     * @param {Boolean} checked
     * @memberof VisibleColumnPickerComponent
     */
    @action selectColumn(column, checked) {
        const { onChange, columns } = this.args;

        // update column hidden state based on checkbox
        set(column, 'hidden', !checked);

        if (typeof onChange === 'function') {
            onChange(columns);
        }
    }
}
