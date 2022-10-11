import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { computed, action } from '@ember/object';
import { isValid, parse, format } from 'date-fns';

export default class DateTimeInputComponent extends Component {
    @tracked timeFormat = 'HH:mm';
    @tracked dateFormat = 'yyyy-MM-dd';
    @tracked dateTimeFormat = 'yyyy-MM-dd HH:mm';
    @tracked _time;
    @tracked _date;

    /**
     * Getter for time
     *
     * @readonly
     * @memberof DateTimeInputComponent
     */
    @computed('args.value', '_time', 'timeFormat') get time() {
        const { timeFormat, _time } = this;
        const { value } = this.args;
        const instance = parse(value, timeFormat, new Date());
        let time;

        if (isValid(instance)) {
            time = format(instance, timeFormat);
        }

        if (_time) {
            time = _time;
        }

        return time;
    }

    /**
     * Setter for time
     *
     * @memberof DateTimeInputComponent
     */
    set time(time) {
        this._time = time;
    }

    /**
     * Getter for date
     *
     * @readonly
     * @memberof DateTimeInputComponent
     */
    @computed('args.value', '_date', 'dateFormat') get date() {
        const { dateFormat, _date } = this;
        const { value } = this.args;
        const instance = parse(value, dateFormat, new Date());
        let date;

        if (isValid(instance)) {
            date = format(instance, dateFormat);
        }

        if (_date) {
            date = _date;
        }

        return date;
    }

    /**
     * Setter for date
     *
     * @memberof DateTimeInputComponent
     */
    set date(date) {
        this._date = date;
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
        const { dateTimeFormat, date, time } = this;
        let { value } = target;
        let dateTime, dateTimeInstance;

        if (prop === 'time') {
            dateTimeInstance = parse(`${date} ${value}`, dateTimeFormat, new Date());
        }

        if (prop === 'date') {
            dateTimeInstance = parse(`${value} ${time}`, dateTimeFormat, new Date());
        }

        dateTime = format(dateTimeInstance, dateTimeFormat);

        if (typeof onUpdate === 'function') {
            this.args.onUpdate(dateTimeInstance, dateTime);
        }
    }
}
