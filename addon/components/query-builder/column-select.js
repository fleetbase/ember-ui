import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

export default class QueryBuilderColumnSelectComponent extends Component {
    @tracked selectedColumns = [];
    @tracked columnAliases = {};
    @tracked searchQuery = '';

    get filteredColumns() {
        const columns = this.args.columns ?? [];
        const query = (this.searchQuery ?? '').trim().toLowerCase();

        if (!query) {
            return columns;
        }

        return columns.filter((col) => {
            const name = String(col.name ?? '').toLowerCase();
            const label = String(col.label ?? '').toLowerCase();
            return name.includes(query) || label.includes(query);
        });
    }

    constructor() {
        super(...arguments);
        this.selectedColumns = this.args.selectedColumns || [];
        this.columnAliases = this.args.columnAliases || {};
    }

    @action selectColumn(column) {
        const isSelected = this.selectedColumns.includes(column);

        if (isSelected) {
            // Remove column and its alias
            this.selectedColumns = this.selectedColumns.filter((c) => c !== column);
            delete this.columnAliases[column.name];
            this.columnAliases = { ...this.columnAliases };
        } else {
            // Add column
            this.selectedColumns = [...this.selectedColumns, column];
        }

        this.notifyChange();
    }

    @action updateAlias(columnName, event) {
        const aliasValue = event.target.value.trim();

        if (aliasValue) {
            this.columnAliases = {
                ...this.columnAliases,
                [columnName]: aliasValue,
            };
        } else {
            // Remove alias if empty
            const newAliases = { ...this.columnAliases };
            delete newAliases[columnName];
            this.columnAliases = newAliases;
        }

        this.notifyChange();
    }

    @action selectAllColumns() {
        if (this.args.columns) {
            this.selectedColumns = [...this.args.columns];
            this.notifyChange();
        }
    }

    @action clearAllColumns() {
        this.selectedColumns = [];
        this.columnAliases = {};
        this.notifyChange();
    }

    notifyChange() {
        if (this.args.onChange) {
            // Create columns with alias information
            const columnsWithAliases = this.selectedColumns.map((column) => ({
                ...column,
                alias: this.columnAliases[column.name] || null,
            }));

            this.args.onChange(columnsWithAliases, this.columnAliases);
        }
    }
}
