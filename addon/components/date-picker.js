import Component from '@glimmer/component';
import AirDatepicker from 'air-datepicker';
import localeEn from 'air-datepicker/locale/en';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { isArray } from '@ember/array';

export default class DatePickerComponent extends Component {
    @tracked nodeRef;
    @tracked airDatePickerRef;

    defaultOptions = {
        inline: false,
        locale: localeEn,
        dateFormat: 'yyyy-MM-dd',
    };

    @action setupComponent(node) {
        this.nodeRef = node;
        this.airDatePickerRef = new AirDatepicker(node, this.getOptions());
    }

    getOptions() {
        const options = this.defaultOptions;
        const { value, dateFormat, inline } = this.args;

        if (inline) {
            options.inline = inline;
        }

        if (dateFormat) {
            options.dateFormat = dateFormat;
        }

        if (value) {
            options.selectedDates = this.parseValue(value);
        }

        if (this.nodeRef) {
            options.container = this.nodeRef.parentNode;
        }

        const onSelect = function (selection) {
            if (typeof this.args.onSelect === 'function') {
                this.args.onSelect(...arguments);
            }

            if (typeof this.args.onChange === 'function') {
                this.args.onChange(selection.date, ...arguments);
            }

            if (typeof this.args.onDateChanged === 'function') {
                this.args.onDateChanged(selection.formattedDate, ...arguments);
            }
        };

        Object.keys(this.args).forEach((key) => {
            if (key === 'value' || key === 'onSelect') {
                return;
            }

            if (this.args[key]) {
                options[key] = this.args[key];
            }
        });

        options.onSelect = onSelect.bind(this);

        return options;
    }

    parseValue(value) {
        if (isArray(value)) {
            return value;
        }

        if (typeof value === 'string' && value.includes(',')) {
            value = value.split(',').map((date) => new Date(date));
        }

        return [value];
    }
}
