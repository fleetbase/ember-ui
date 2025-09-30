import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

export default class QueryBuilderJoinsComponent extends Component {
    @tracked joins = [];

    constructor() {
        super(...arguments);
        this.joins = this.args.joins || [];
    }

    get relationships() {
        if (!this.args.relationships) return [];

        return Object.keys(this.args.relationships).map((key) => {
            const relationship = this.args.relationships[key];
            return {
                key,
                table: key,
                ...relationship,
                columns: this.getColumnsForTable(key),
            };
        });
    }

    get totalJoinedColumns() {
        return this.joins.reduce((total, join) => total + (join.selectedColumns?.length || 0), 0);
    }

    getColumnsForTable(tableName) {
        // Get columns from the schema registry or args
        if (this.args.getTableColumns) {
            return this.args.getTableColumns(tableName);
        }

        // Fallback to mock columns for development
        const mockColumns = {
            drivers: [
                { name: 'uuid', label: 'ID', type: 'string' },
                { name: 'name', label: 'Driver Name', type: 'string' },
                { name: 'email', label: 'Email', type: 'string' },
                { name: 'phone', label: 'Phone', type: 'string' },
                { name: 'status', label: 'Status', type: 'string' },
                { name: 'online', label: 'Online Status', type: 'boolean' },
                { name: 'created_at', label: 'Created At', type: 'datetime' },
                { name: 'updated_at', label: 'Updated At', type: 'datetime' },
            ],
            vehicles: [
                { name: 'uuid', label: 'ID', type: 'string' },
                { name: 'make', label: 'Make', type: 'string' },
                { name: 'model', label: 'Model', type: 'string' },
                { name: 'year', label: 'Year', type: 'number' },
                { name: 'vin', label: 'VIN', type: 'string' },
                { name: 'plate_number', label: 'Plate Number', type: 'string' },
                { name: 'status', label: 'Status', type: 'string' },
                { name: 'created_at', label: 'Created At', type: 'datetime' },
            ],
            contacts: [
                { name: 'uuid', label: 'ID', type: 'string' },
                { name: 'name', label: 'Contact Name', type: 'string' },
                { name: 'email', label: 'Email', type: 'string' },
                { name: 'phone', label: 'Phone', type: 'string' },
                { name: 'type', label: 'Contact Type', type: 'string' },
                { name: 'created_at', label: 'Created At', type: 'datetime' },
            ],
            places: [
                { name: 'uuid', label: 'ID', type: 'string' },
                { name: 'name', label: 'Place Name', type: 'string' },
                { name: 'street1', label: 'Street Address', type: 'string' },
                { name: 'city', label: 'City', type: 'string' },
                { name: 'province', label: 'Province/State', type: 'string' },
                { name: 'country', label: 'Country', type: 'string' },
                { name: 'postal_code', label: 'Postal Code', type: 'string' },
            ],
        };

        return mockColumns[tableName] || [];
    }

    getCommonColumns(tableName) {
        // Return commonly used columns for quick selection
        const commonColumnNames = ['name', 'status', 'email', 'phone', 'created_at'];
        const allColumns = this.getColumnsForTable(tableName);

        return allColumns.filter((column) => commonColumnNames.includes(column.name) || column.name.includes('name') || column.name.includes('status'));
    }

    @action
    isJoined(relationshipKey) {
        return this.joins.some((join) => join.key === relationshipKey);
    }

    @action
    getJoinedRelationship(relationshipKey) {
        return this.joins.find((join) => join.key === relationshipKey);
    }

    @action
    toggleJoin(relationship) {
        const isJoined = this.isJoined(relationship.key);

        if (isJoined) {
            // Remove join
            this.joins = this.joins.filter((join) => join.key !== relationship.key);
        } else {
            // Add join with empty column selection
            const newJoin = {
                ...relationship,
                selectedColumns: [],
                columnAliases: {},
            };
            this.joins = [...this.joins, newJoin];
        }

        this.notifyChange();
    }

    @action
    toggleJoinColumn(relationshipKey, column) {
        const joinIndex = this.joins.findIndex((join) => join.key === relationshipKey);
        if (joinIndex === -1) return;

        const updatedJoins = [...this.joins];
        const join = { ...updatedJoins[joinIndex] };

        const isSelected = join.selectedColumns.some((col) => col.name === column.name);

        if (isSelected) {
            // Remove column
            join.selectedColumns = join.selectedColumns.filter((col) => col.name !== column.name);
            // Remove alias if exists
            if (join.columnAliases && join.columnAliases[column.name]) {
                delete join.columnAliases[column.name];
            }
        } else {
            // Add column with full path information
            const columnWithPath = {
                ...column,
                table: relationshipKey,
                full: `${relationshipKey}.${column.name}`,
                label: `${join.label} - ${column.label || column.name}`,
            };
            join.selectedColumns = [...join.selectedColumns, columnWithPath];
        }

        updatedJoins[joinIndex] = join;
        this.joins = updatedJoins;
        this.notifyChange();
    }

    @action
    selectAllJoinColumns(relationshipKey) {
        const joinIndex = this.joins.findIndex((join) => join.key === relationshipKey);
        if (joinIndex === -1) return;

        const updatedJoins = [...this.joins];
        const join = { ...updatedJoins[joinIndex] };
        const relationship = this.relationships.find((rel) => rel.key === relationshipKey);

        join.selectedColumns = relationship.columns.map((column) => ({
            ...column,
            table: relationshipKey,
            full: `${relationshipKey}.${column.name}`,
            label: `${join.label} - ${column.label || column.name}`,
        }));

        updatedJoins[joinIndex] = join;
        this.joins = updatedJoins;
        this.notifyChange();
    }

    @action
    selectNoneJoinColumns(relationshipKey) {
        const joinIndex = this.joins.findIndex((join) => join.key === relationshipKey);
        if (joinIndex === -1) return;

        const updatedJoins = [...this.joins];
        const join = { ...updatedJoins[joinIndex] };

        join.selectedColumns = [];
        join.columnAliases = {};

        updatedJoins[joinIndex] = join;
        this.joins = updatedJoins;
        this.notifyChange();
    }

    @action
    selectCommonJoinColumns(relationshipKey) {
        const joinIndex = this.joins.findIndex((join) => join.key === relationshipKey);
        if (joinIndex === -1) return;

        const updatedJoins = [...this.joins];
        const join = { ...updatedJoins[joinIndex] };
        const commonColumns = this.getCommonColumns(relationshipKey);

        join.selectedColumns = commonColumns.map((column) => ({
            ...column,
            table: relationshipKey,
            full: `${relationshipKey}.${column.name}`,
            label: `${join.label} - ${column.label || column.name}`,
        }));

        updatedJoins[joinIndex] = join;
        this.joins = updatedJoins;
        this.notifyChange();
    }

    @action
    updateJoinColumnAlias(relationshipKey, columnName, event) {
        const joinIndex = this.joins.findIndex((join) => join.key === relationshipKey);
        if (joinIndex === -1) return;

        const updatedJoins = [...this.joins];
        const join = { ...updatedJoins[joinIndex] };

        if (!join.columnAliases) {
            join.columnAliases = {};
        }

        const aliasValue = event.target.value.trim();
        if (aliasValue) {
            join.columnAliases[columnName] = aliasValue;
        } else {
            delete join.columnAliases[columnName];
        }

        // Update the selectedColumns array with the alias
        join.selectedColumns = join.selectedColumns.map((col) => {
            if (col.name === columnName) {
                return {
                    ...col,
                    alias: aliasValue || null,
                };
            }
            return col;
        });

        updatedJoins[joinIndex] = join;
        this.joins = updatedJoins;
        this.notifyChange();
    }

    @action
    getColumnAlias(relationshipKey, columnName) {
        const join = this.joins.find((join) => join.key === relationshipKey);
        return join?.columnAliases?.[columnName] || '';
    }

    /**
     * Get all selected columns including main table and joined columns
     * This is used by other components (conditions, group-by, sort-by)
     */
    getAllSelectedColumns() {
        const allColumns = [];

        // Add main table columns (from args.selectedColumns)
        if (this.args.selectedColumns?.length) {
            allColumns.push(...this.args.selectedColumns);
        }

        // Add joined table columns
        this.joins.forEach((join) => {
            if (join.selectedColumns?.length) {
                allColumns.push(...join.selectedColumns);
            }
        });

        return allColumns;
    }

    notifyChange() {
        if (this.args.onChange) {
            this.args.onChange(this.joins);
        }

        // Also notify about all selected columns for other components
        if (this.args.onAllColumnsChange) {
            this.args.onAllColumnsChange(this.getAllSelectedColumns());
        }
    }
}
