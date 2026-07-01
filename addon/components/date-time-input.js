import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { parse, parseISO, format, isValid } from 'date-fns';

export default class DateTimeInputComponent extends Component {
    @tracked timeFormat = 'HH:mm';
    @tracked dateFormat = 'yyyy-MM-dd';
    @tracked dateTimeFormat = 'yyyy-MM-dd HH:mm';
    @tracked date;
    @tracked time;

    constructor() {
        super(...arguments);

        this.syncValue(this.args.value);
    }

    syncValue(value) {
        const parsedValue = this.parseValue(value);

        this.date = parsedValue ? format(parsedValue, this.dateFormat) : null;
        this.time = parsedValue ? format(parsedValue, this.timeFormat) : null;
    }

    parseValue(value) {
        if (value instanceof Date && isValid(value)) {
            return value;
        }

        if (typeof value === 'string') {
            const dateTimeValue = parse(value, this.dateTimeFormat, new Date());

            if (isValid(dateTimeValue)) {
                return dateTimeValue;
            }

            const isoLocalValue = value.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);

            if (isoLocalValue) {
                const localDateTimeValue = parse(`${isoLocalValue[1]} ${isoLocalValue[2]}`, this.dateTimeFormat, new Date());

                if (isValid(localDateTimeValue)) {
                    return localDateTimeValue;
                }
            }

            const isoValue = parseISO(value);

            if (isValid(isoValue)) {
                return isoValue;
            }
        }

        return null;
    }

    @action updateValue(value) {
        this.syncValue(value);
    }

    /**
     * Update component value.
     *
     * @param {*} prop
     * @param {*} { target }
     * @memberof DateTimeInputComponent
     */
    @action update(prop, { target }) {
        const { onUpdate, onChange } = this.args;
        let { dateTimeFormat, date, time } = this;
        let { value } = target;
        let dateTimeInstance;

        this[prop] = value;

        if (prop === 'time') {
            time = value;
            dateTimeInstance = date ? parse(`${date} ${time}`, dateTimeFormat, new Date()) : parse(`${time}`, this.timeFormat, new Date());
        }

        if (prop === 'date') {
            date = value;
            dateTimeInstance = time ? parse(`${date} ${time}`, dateTimeFormat, new Date()) : parse(`${date}`, this.dateFormat, new Date());
        }

        if (!dateTimeInstance || !isValid(dateTimeInstance)) {
            if (typeof onUpdate === 'function') {
                onUpdate(null, null);
            }

            if (typeof onChange === 'function') {
                onChange(null, null);
            }

            return;
        }

        const dateTime = format(dateTimeInstance, dateTimeFormat);

        if (typeof onUpdate === 'function') {
            onUpdate(dateTimeInstance, dateTime);
        }

        if (typeof onChange === 'function') {
            onChange(dateTimeInstance, dateTime);
        }
    }
}
