import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { isArray } from '@ember/array';
import { task, timeout } from 'ember-concurrency';

export default class QueryBuilderConditionsComponent extends Component {
    @tracked conditionGroups = [];

    constructor() {
        super(...arguments);
        this.initializeConditionGroups();
    }

    initializeConditionGroups() {
        if (this.args.conditions?.length) {
            // Convert flat conditions to grouped structure
            this.conditionGroups = [
                {
                    id: 'root',
                    isNested: false,
                    operator: 'and',
                    conditions: this.args.conditions,
                },
            ];
        } else {
            this.conditionGroups = [];
        }
    }

    /**
     * Get all available columns including main table and joined columns
     * This ensures conditions can only be applied to selected columns
     */
    get availableColumns() {
        // Use allSelectedColumns from parent if available, otherwise fall back to existing logic
        if (this.args.allSelectedColumns?.length) {
            return this.args.allSelectedColumns.map((column) => ({
                ...column,
                table: column.table || this.args.table?.name,
                full: column.full || `${column.table || this.args.table?.name}.${column.name}`,
                label: column.label || column.name,
                source: 'main',
            }));
        }

        // Existing fallback logic
        const columns = [];

        // Add columns from main table (only selected ones)
        if (this.args.selectedColumns?.length) {
            this.args.selectedColumns.forEach((column) => {
                columns.push({
                    ...column,
                    table: column.table || this.args.table?.name,
                    full: column.full || `${column.table || this.args.table?.name}.${column.name}`,
                    label: column.label || column.name,
                    source: 'main',
                });
            });
        }

        // Add columns from joined tables (only selected ones)
        if (this.args.joins?.length) {
            this.args.joins.forEach((join) => {
                if (join.selectedColumns?.length) {
                    join.selectedColumns.forEach((column) => {
                        columns.push({
                            ...column,
                            table: join.table,
                            full: column.full || `${join.table}.${column.name}`,
                            label: column.label || `${join.label} - ${column.name}`,
                            source: 'joined',
                        });
                    });
                }
            });
        }

        return columns;
    }

    get hasConditions() {
        return (this.conditionGroups ?? []).some((g) => (g?.conditions?.length ?? 0) > 0);
    }

    get conditionsSummary() {
        if (!this.hasConditions) return 'No conditions';

        const totalConditions = this.conditionGroups.reduce((total, group) => total + group.conditions.length, 0);
        const groupCount = this.conditionGroups.filter((group) => group.isNested).length;

        let summary = `${totalConditions} condition${totalConditions !== 1 ? 's' : ''}`;
        if (groupCount > 0) {
            summary += `, ${groupCount} group${groupCount !== 1 ? 's' : ''}`;
        }

        return summary;
    }

    get canAddConditions() {
        return this.availableColumns.length > 0;
    }

    get conditionsMessage() {
        if (!this.args.selectedColumns?.length && !this.args.joins?.length) {
            return 'Select columns first to enable filtering';
        }

        if (!this.canAddConditions) {
            return 'No selected columns available for filtering';
        }

        return null;
    }

    get booleanOptions() {
        return [
            { value: true, label: 'True' },
            { value: false, label: 'False' },
        ];
    }

    getOperatorsForField(field) {
        if (!field) return [];

        const baseOperators = [
            { value: '=', label: 'equals', icon: 'equals' },
            { value: '!=', label: 'not equals', icon: 'not-equal' },
            { value: 'is_null', label: 'is empty', icon: 'ban' },
            { value: 'is_not_null', label: 'is not empty', icon: 'check' },
        ];

        const stringOperators = [
            { value: 'like', label: 'contains', icon: 'search' },
            { value: 'not_like', label: 'does not contain', icon: 'search-minus' },
            { value: 'starts_with', label: 'starts with', icon: 'arrow-right' },
            { value: 'ends_with', label: 'ends with', icon: 'arrow-left' },
            { value: 'in', label: 'is one of', icon: 'list' },
            { value: 'not_in', label: 'is not one of', icon: 'list-slash' },
        ];

        const numberOperators = [
            { value: '>', label: 'greater than', icon: 'greater-than' },
            { value: '<', label: 'less than', icon: 'less-than' },
            { value: '>=', label: 'greater than or equal', icon: 'greater-than-equal' },
            { value: '<=', label: 'less than or equal', icon: 'less-than-equal' },
            { value: 'between', label: 'between', icon: 'arrows-left-right' },
            { value: 'not_between', label: 'not between', icon: 'arrows-left-right-slash' },
            { value: 'in', label: 'is one of', icon: 'list' },
            { value: 'not_in', label: 'is not one of', icon: 'list-slash' },
        ];

        const dateOperators = [
            { value: '>', label: 'after', icon: 'calendar-plus' },
            { value: '<', label: 'before', icon: 'calendar-minus' },
            { value: '>=', label: 'on or after', icon: 'calendar-check' },
            { value: '<=', label: 'on or before', icon: 'calendar-xmark' },
            { value: 'between', label: 'between dates', icon: 'calendar-range' },
            { value: 'not_between', label: 'not between dates', icon: 'calendar-range-slash' },
        ];

        switch (field.type) {
            case 'string':
            case 'text':
                return [...baseOperators, ...stringOperators];
            case 'number':
            case 'integer':
            case 'decimal':
            case 'float':
                return [...baseOperators, ...numberOperators];
            case 'date':
            case 'datetime':
            case 'timestamp':
                return [...baseOperators, ...dateOperators];
            case 'boolean':
                return baseOperators.filter((op) => ['=', '!=', 'is_null', 'is_not_null'].includes(op.value));
            default:
                return baseOperators;
        }
    }

    getOperatorIcon(operatorValue) {
        const iconMap = {
            '=': 'equals',
            '!=': 'not-equal',
            '>': 'greater-than',
            '<': 'less-than',
            '>=': 'greater-than-equal',
            '<=': 'less-than-equal',
            like: 'search',
            not_like: 'search-minus',
            in: 'list',
            not_in: 'list-slash',
            between: 'arrows-left-right',
            not_between: 'arrows-left-right-slash',
            is_null: 'ban',
            is_not_null: 'check',
            starts_with: 'arrow-right',
            ends_with: 'arrow-left',
        };

        return iconMap[operatorValue] || 'question';
    }

    getInputTypeForField(field) {
        if (!field) return 'text';

        switch (field.type) {
            case 'number':
            case 'integer':
            case 'decimal':
            case 'float':
                return 'number';
            case 'date':
                return 'date';
            case 'datetime':
            case 'timestamp':
                return 'datetime-local';
            case 'email':
                return 'email';
            case 'url':
                return 'url';
            default:
                return 'text';
        }
    }

    getValueOptionsForField(field) {
        if (!field) return [];

        // For enum fields, return the enum values
        if (field.enum_values) {
            return field.enum_values.map((value) => ({ value, label: value }));
        }

        // For status fields, return common status values
        if (field.name.includes('status')) {
            return ['active', 'inactive', 'pending', 'completed', 'cancelled', 'draft', 'published', 'archived', 'deleted'].map((value) => ({ value, label: value }));
        }

        // For boolean fields
        if (field.type === 'boolean') {
            return this.booleanOptions;
        }

        return [];
    }

    @action
    addCondition() {
        // Add to root group or create root group if none exists
        if (this.conditionGroups.length === 0) {
            this.conditionGroups = [
                {
                    id: 'root',
                    isNested: false,
                    operator: 'and',
                    conditions: [],
                },
            ];
        }

        this.addConditionToGroup(0);
    }

    @action
    addConditionToGroup(groupIndex) {
        const newCondition = {
            id: Date.now() + Math.random(),
            field: null,
            operator: null,
            value: null,
            logicalOperator: 'and',
        };

        const updatedGroups = [...this.conditionGroups];
        updatedGroups[groupIndex] = {
            ...updatedGroups[groupIndex],
            conditions: [...updatedGroups[groupIndex].conditions, newCondition],
        };

        this.conditionGroups = updatedGroups;
        this.notifyChange();
    }

    @action
    addConditionGroup() {
        const newGroup = {
            id: Date.now() + Math.random(),
            isNested: true,
            operator: 'and',
            conditions: [
                {
                    id: Date.now() + Math.random() + 1,
                    field: null,
                    operator: null,
                    value: null,
                    logicalOperator: 'and',
                },
            ],
        };

        this.conditionGroups = [...this.conditionGroups, newGroup];
        this.notifyChange();
    }

    @action
    removeCondition(groupIndex, conditionIndex) {
        const updatedGroups = [...this.conditionGroups];
        updatedGroups[groupIndex] = {
            ...updatedGroups[groupIndex],
            conditions: updatedGroups[groupIndex].conditions.filter((_, i) => i !== conditionIndex),
        };

        // Remove empty nested groups
        if (updatedGroups[groupIndex].isNested && updatedGroups[groupIndex].conditions.length === 0) {
            updatedGroups.splice(groupIndex, 1);
        }

        this.conditionGroups = updatedGroups;
        this.notifyChange();
    }

    @action
    removeConditionGroup(groupIndex) {
        this.conditionGroups = this.conditionGroups.filter((_, i) => i !== groupIndex);
        this.notifyChange();
    }

    @action
    updateConditionField(groupIndex, conditionIndex, field) {
        this.updateCondition(groupIndex, conditionIndex, (c) => {
            c.field = field;
            c.operator = null;
            c.value = null;
        });
    }

    @action
    updateConditionOperator(groupIndex, conditionIndex, operator) {
        this.updateCondition(groupIndex, conditionIndex, (c) => {
            if (typeof operator === 'string') {
                c.logicalOperator = operator;
                return;
            }
            c.operator = operator;
            const key = operator?.value;
            if (key === 'is_null' || key === 'is_not_null') c.value = null;
            else if (key === 'between' || key === 'not_between') c.value = [null, null];
            else if (key === 'in' || key === 'not_in') c.value = [];
            else c.value = null;
        });
    }

    @action
    updateConditionValue(groupIndex, conditionIndex, value) {
        const group = this.conditionGroups[groupIndex];
        const cond = group?.conditions?.[conditionIndex];
        if (!cond) return;

        if (value && typeof value === 'object' && 'target' in value) {
            cond.value = value.target.value;
        } else if (isArray(value)) {
            cond.value = [...value]; // replace the *value array* if needed
        } else {
            cond.value = value;
        }

        this.notifyDebounced.perform();
    }

    @action
    updateConditionRangeValue(groupIndex, conditionIndex, rangeIndex, event) {
        this.updateCondition(groupIndex, conditionIndex, (c) => {
            const next = isArray(c.value) ? [...c.value] : [null, null];
            next[rangeIndex] = event.target.value;
            c.value = next; // replace value array, not the condition object
        });
    }

    @action updateGroupOperator(groupIndex, operator) {
        // same immutable pattern for the group object
        const groups = [...this.conditionGroups];
        groups[groupIndex] = { ...groups[groupIndex], operator };
        this.conditionGroups = groups;
        this.notifyChange();
    }

    @action reorderConditionGroups({ sourceList, sourceIndex, targetList, targetIndex }) {
        // no change? bail
        if (sourceList === targetList && sourceIndex === targetIndex) return;

        // mutate the EmberArray in-place (per README)
        const item = sourceList.objectAt(sourceIndex);
        sourceList.removeAt(sourceIndex);
        targetList.insertAt(targetIndex, item);

        // ensure Glimmer sees a change even if it misses EmberArray observers
        this.conditionGroups = [...this.conditionGroups];

        this.notifyChange();
    }

    @action
    reorderConditions(groupIndex, { sourceList, sourceIndex, targetList, targetIndex }) {
        if (sourceList === targetList && sourceIndex === targetIndex) return;

        const item = sourceList.objectAt(sourceIndex);
        sourceList.removeAt(sourceIndex);
        targetList.insertAt(targetIndex, item);

        // force a tick for Glimmer just in case
        this.conditionGroups = [...this.conditionGroups];

        this.notifyChange();
    }

    /**
     * Validate existing conditions when available columns change
     */
    @action
    validateConditions() {
        if (!this.availableColumns.length) {
            // Clear all conditions if no columns available
            if (this.hasConditions) {
                this.conditionGroups = [];
                this.notifyChange();
            }
            return;
        }

        // Remove conditions for fields that are no longer available
        let hasChanges = false;
        const updatedGroups = this.conditionGroups
            .map((group) => {
                const validConditions = group.conditions.filter((condition) => {
                    if (!condition.field) return true; // Keep incomplete conditions

                    return this.availableColumns.some((col) => col.full === condition.field.full);
                });

                if (validConditions.length !== group.conditions.length) {
                    hasChanges = true;
                }

                return {
                    ...group,
                    conditions: validConditions,
                };
            })
            .filter((group) => group.conditions.length > 0 || !group.isNested);

        if (hasChanges) {
            this.conditionGroups = updatedGroups;
            this.notifyChange();
        }
    }

    updateCondition(groupIndex, conditionIndex, mutate) {
        // clone containers (so Glimmer sees a change)
        const groups = [...this.conditionGroups];
        const group = { ...groups[groupIndex] };
        const conditions = [...group.conditions];

        // IMPORTANT: keep item identity
        const condition = conditions[conditionIndex]; // do not clone
        // allow caller to mutate the existing condition object
        mutate(condition);

        // write back container identities
        group.conditions = conditions;
        groups[groupIndex] = group;
        this.conditionGroups = groups;

        this.notifyChange?.();
    }

    notifyChange() {
        if (this.args.onChange) {
            const flatConditions = (this.conditionGroups ?? []).reduce((acc, group) => {
                const conds = isArray(group?.conditions) ? group.conditions : [];
                return acc.concat(conds);
            }, []);

            this.args.onChange(flatConditions, this.conditionGroups ?? []);
        }
    }

    @task({ restartable: true }) *notifyDebounced() {
        yield timeout(200);
        this.notifyChange();
    }
}
