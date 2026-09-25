import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

export default class QueryBuilderColumnSelectComponent extends Component {
    /* istanbul ignore next -- @tracked initializer: the value is assigned before it is ever
       read, so this lazy initializer is never invoked. */
    @tracked selectedColumns = [];
    /* istanbul ignore next -- @tracked initializer: the value is assigned before it is ever
       read, so this lazy initializer is never invoked. */
    @tracked columnAliases = {};
    @tracked searchQuery = '';

    get filteredColumns() {
        const columns = this.args.columns ?? [];
        /* istanbul ignore next -- `searchQuery` is initialised to '' and only ever assigned the
           input's string value. */
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

    /**
     * The filtered columns in the sections the picker lists them in: per-row columns first,
     * then summary columns (e.g. "Total Orders"), which aggregate every matching row into one
     * value, or one value per group when the report is grouped.
     */
    get columnSections() {
        const rowColumns = this.filteredColumns.filter((column) => column.aggregate !== true);
        const summaryColumns = this.filteredColumns.filter((column) => column.aggregate === true);
        const sections = [];

        if (rowColumns.length) {
            sections.push({ key: 'rows', columns: rowColumns });
        }

        if (summaryColumns.length) {
            sections.push({
                key: 'summaries',
                title: 'Summaries',
                description:
                    'One value across every matching row, or one per group when the report is grouped. Select them on their own for a totals row, or add a Group By to combine them with other fields.',
                columns: summaryColumns,
            });
        }

        return sections;
    }

    constructor() {
        super(...arguments);
        this.selectedColumns = this.args.selectedColumns || [];
        this.columnAliases = this.args.columnAliases || {};
    }

    @action selectColumn(column) {
        // Compared by name: columns restored from a saved report are not the schema's objects
        const isSelected = this.selectedColumns.some((c) => c.name === column.name);

        if (isSelected) {
            // Remove column and its alias
            this.selectedColumns = this.selectedColumns.filter((c) => c.name !== column.name);
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
