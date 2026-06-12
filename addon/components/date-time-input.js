import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { parse, format, isValid } from 'date-fns';

export default class DateTimeInputComponent extends Component {
    @tracked timeFormat = 'HH:mm';
    @tracked dateFormat = 'yyyy-MM-dd';
    @tracked dateTimeFormat = 'yyyy-MM-dd HH:mm';
    @tracked date;
    @tracked time;

    constructor() {
        super(...arguments);

        const value = this.parseValue(this.args.value);

        this.date = value ? format(value, this.dateFormat) : null;
        this.time = value ? format(value, this.timeFormat) : null;
    }

    parseValue(value) {
        if (value instanceof Date && isValid(value)) {
            return value;
        }

        if (typeof value === 'string') {
            const parsedValue = parse(value, this.dateTimeFormat, new Date());

            if (isValid(parsedValue)) {
                return parsedValue;
            }
        }

        return null;
    }

    /**
     * Update component value
     *
     * @param {*} prop
     * @param {*} { target }
     * @memberof DateTimeInputComponent
     */
    @action update(prop, { target }) {
        const { onUpdate } = this.args;
        let { dateTimeFormat, date, time } = this;
        let { value } = target;
        let dateTime, dateTimeInstance;

        if (prop === 'time') {
            if (date) {
                dateTimeInstance = parse(`${date} ${value}`, dateTimeFormat, new Date());
            } else {
                dateTimeInstance = parse(`${value}`, this.timeFormat, new Date());
            }
        }

        if (prop === 'date') {
            if (time) {
                dateTimeInstance = parse(`${value} ${time}`, dateTimeFormat, new Date());
            } else {
                dateTimeInstance = parse(`${value}`, this.dateFormat, new Date());
            }
        }

        dateTime = format(dateTimeInstance, dateTimeFormat);

        if (typeof onUpdate === 'function') {
            onUpdate(dateTimeInstance, dateTime);
        }
    }
}
