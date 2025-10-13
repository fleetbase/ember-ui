import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import { guidFor } from '@ember/object/internals';
import { underscore } from '@ember/string';
import { isEmpty } from '@ember/utils';

function coerceValue(value, targetType) {
    switch (targetType) {
        case 'number': {
            if (isEmpty(value)) return '';
            const num = Number(value);
            return isNaN(num) ? '' : num;
        }
        case 'boolean':
            return Boolean(value);
        case 'text':
        default:
            return value == null ? '' : String(value);
    }
}

class MetadataRow {
    @tracked key = '';
    @tracked value = '';
    @tracked type = 'text';
    @tracked error = null;

    constructor(data = {}) {
        this.id = guidFor(this);
        this.key = data.key || '';
        this.value = data.value || '';
        this.type = data.type || this.#getValueType(data.value) || 'text';
        this.error = null;
    }

    updateKey(newKey) {
        this.key = newKey;
    }

    updateValue(newValue) {
        this.value = newValue;
    }

    updateType(newType) {
        this.type = newType;
        this.value = coerceValue(this.value, newType);
    }

    setError(error) {
        this.error = error;
    }

    get isValid() {
        return !this.error;
    }

    toOutput() {
        if (!this.isValid) return null;
        return {
            key: this.key,
            value: coerceValue(this.value, this.type),
        };
    }

    #getValueType(value) {
        if (typeof value === 'number') return 'number';
        if (typeof value === 'boolean') return 'boolean';
        return 'text';
    }
}

export default class MetadataEditorComponent extends Component {
    @service modalsManager;
    @tracked rows = [];
    @tracked filterText = '';
    @tracked preservedData = {};

    constructor(owner, args) {
        super(owner, args);
        this.initializeFromValue();
    }

    get label() {
        return this.args.label ?? 'Metadata';
    }

    get allowBoolean() {
        return this.args.allowBoolean !== false;
    }

    get filteredRows() {
        if (isEmpty(this.filterText)) {
            return this.rows;
        }

        const filter = this.filterText.toLowerCase();
        return this.rows.filter((row) => row.key.toLowerCase().includes(filter));
    }

    get hasErrors() {
        return this.rows.some((row) => !row.isValid);
    }

    initializeFromValue() {
        const inputValue = this.args.value || {};
        const newRows = [];
        const preserved = {};

        Object.entries(inputValue).forEach(([key, value]) => {
            if (this.#isPrimitive(value)) {
                newRows.push(new MetadataRow({ key, value }));
            } else {
                preserved[key] = value;
            }
        });

        this.rows = newRows;
        this.preservedData = preserved;
        this.validateAllRows();
        // this.emitChange();
    }

    validateAllRows() {
        const allKeys = this.rows.map((row) => ({ key: row.key, id: row.id }));

        this.rows.forEach((row) => {
            const error = this.#validateKey(row.key, allKeys, row.id);
            row.setError(error);
        });
    }

    emitChange() {
        const output = this.getOutput();

        if (typeof this.args.onChange === 'function') {
            this.args.onChange(output);
        }

        return output;
    }

    getOutput() {
        const output = { ...this.preservedData };

        this.rows.forEach((row) => {
            const rowOutput = row.toOutput();
            if (rowOutput && (row.type !== 'boolean' || this.allowBoolean)) {
                output[rowOutput.key] = rowOutput.value;
            }
        });

        return output;
    }

    @action addRow() {
        const newRow = new MetadataRow();
        this.rows = [...this.rows, newRow];
        this.validateAllRows();
        this.emitChange();
    }

    @action removeRow(targetRow) {
        this.rows = this.rows.filter((row) => row !== targetRow);
        this.validateAllRows();
        this.emitChange();
    }

    @action onKeyInput(row, event) {
        const rawInput = event.target.value || '';
        const snakeCaseKey = this.#toSnakeCase(rawInput);

        // Update the DOM input to show snake_case formatting
        event.target.value = snakeCaseKey;

        // Update the row
        row.updateKey(snakeCaseKey);

        // Validate and emit
        this.validateAllRows();
        this.emitChange();
    }

    @action onValueInput(row, event) {
        let newValue;

        if (event.target.type === 'checkbox') {
            newValue = event.target.checked;
        } else {
            newValue = event.target.value;
        }

        // Apply type coercion for numbers
        if (row.type === 'number') {
            newValue = coerceValue(newValue, 'number');
        }

        row.updateValue(newValue);
        this.emitChange();
    }

    @action onTypeChange(row, event) {
        const newType = event.target.value;
        row.updateType(newType);
        this.emitChange();
    }

    @action onFilter(event) {
        this.filterText = event.target.value;
    }

    @action clearAll() {
        this.rows = [];
        this.emitChange();
    }

    @action preview() {
        this.modalsManager.show('modals/view-raw-metadata', {
            title: 'Preview metadata',
            metadata: this.getOutput(),
            acceptButtonText: 'Done',
            hideDeclineButton: true,
        });
    }

    #toSnakeCase(input) {
        if (isEmpty(input)) return '';

        // Use Ember's underscore utility which handles spaces, camelCase, etc.
        let result = underscore(String(input));

        // Ensure it starts with a letter, prefix with 'k_' if it starts with a number
        if (result && /^\d/.test(result)) {
            result = `k_${result}`;
        }

        return result;
    }

    #isPrimitive(value) {
        const type = typeof value;
        return type === 'string' || type === 'number' || type === 'boolean';
    }

    #validateKey(key, allKeys, currentId) {
        if (isEmpty(key)) {
            return 'Key is required';
        }

        if (!/^[a-z][a-z0-9_]*$/.test(key)) {
            return 'Must be snake_case (start with a letter, a-z0-9_)';
        }

        const duplicateExists = allKeys.some(({ key: otherKey, id }) => id !== currentId && otherKey === key);

        if (duplicateExists) {
            return 'Key must be unique';
        }

        return null;
    }
}
