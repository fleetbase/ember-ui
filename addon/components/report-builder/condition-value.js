import Component from '@glimmer/component';
import { action } from '@ember/object';

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

    @action change(val) {
        this.args.onChange?.({ value: val });
    }
}
