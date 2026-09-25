import Component from '@glimmer/component';
import { action } from '@ember/object';
import { guidFor } from '@ember/object/internals';

export default class ReportBuilderConditionValueComponent extends Component {
    get type() {
        // prefer explicit column.type from schema; fallback to string
        return this.args.column?.type || 'string';
    }

    get isBoolean() {
        return this.type === 'boolean';
    }
    get isNumber() {
        return this.type === 'integer' || this.type === 'number';
    }
    get isDate() {
        return this.type === 'date';
    }
    get isDateTime() {
        return this.type === 'datetime';
    }
    get isJSON() {
        return this.type === 'json';
    }

    /**
     * Each rendered condition needs its own radio group, or two boolean conditions in the same
     * report would share one and selecting in either would clear the other.
     */
    get booleanGroupName() {
        return `report-condition-boolean-${guidFor(this)}`;
    }

    /**
     * A saved report round-trips through JSON and query params, so a boolean condition can come
     * back as the string 'true' or the number 1 rather than a boolean. Normalise before comparing,
     * and return null when nothing has been chosen so neither radio shows as selected.
     */
    get booleanValue() {
        const { value } = this.args;

        if (value === true || value === 'true' || value === 1 || value === '1') {
            return true;
        }

        if (value === false || value === 'false' || value === 0 || value === '0') {
            return false;
        }

        return null;
    }

    @action change(val) {
        this.args.onChange?.({ value: val });
    }
}
