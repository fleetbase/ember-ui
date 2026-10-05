import Component from '@glimmer/component';
import AirDatepicker from 'air-datepicker';
import localeEn from 'air-datepicker/locale/en';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { isArray } from '@ember/array';
import { parse, isValid } from 'date-fns';

export default class DatePickerComponent extends Component {
    @tracked nodeRef;
    @tracked airDatePickerRef;

    defaultOptions = {
        inline: false,
        locale: localeEn,
        dateFormat: 'yyyy-MM-dd',
    };

    get dateFormat() {
        return this.args.dateFormat || this.defaultOptions.dateFormat;
    }

    @action setupComponent(node) {
        this.nodeRef = node;
        this.airDatePickerRef = new AirDatepicker(node, this.getOptions());
    }

    /**
     * The field accepts typing as well as picking. A complete, valid date in the picker's format
     * is selected and reported exactly like a click in the calendar; an empty field clears the
     * selection; anything else is reverted so the field never shows text the picker does not hold.
     */
    @action handleTypedValue(event) {
        const picker = this.airDatePickerRef;
        /* istanbul ignore if -- the listener is attached to the element the picker was created on */
        if (!picker) {
            return;
        }

        const text = event.target.value.trim();

        // The picker writes its own selection into the field, so leaving the field after picking in
        // the calendar fires `change` with text the picker already holds. That is not a new choice.
        if (text === this.selectionText(picker)) {
            return;
        }

        // Reaching here with an empty field means there was a selection to clear.
        if (text === '') {
            picker.clear({ silent: true });
            this.report({ date: undefined, formattedDate: '', datepicker: picker });
            return;
        }

        const date = this.parseText(text);
        if (date) {
            picker.setViewDate(date);
            picker.selectDate(date);
            return;
        }

        event.target.value = this.selectionText(picker);
    }

    /**
     * Keeps the picker in step with a value that changes after the field was set up (a record that
     * finishes loading, a reset). Silent: the change came from the consumer, so it is not reported.
     */
    @action syncValue(element, [value]) {
        const picker = this.airDatePickerRef;
        /* istanbul ignore if -- `did-update` only runs after `did-insert` created the picker */
        if (!picker) {
            return;
        }

        // `<Input>` echoes typed text back through `@value` on every keystroke; while the field has
        // focus the text is still being typed and `handleTypedValue` settles it on change.
        if (document.activeElement === element) {
            return;
        }

        const dates = this.toDates(value);
        const current = picker.selectedDates;
        const same = dates.length === current.length && dates.every((date, index) => date.getTime() === current[index].getTime());
        if (same) {
            return;
        }

        picker.clear({ silent: true });
        if (dates.length) {
            picker.setViewDate(dates[0]);
            picker.selectDate(dates, { silent: true });
        }
        element.value = dates.map((date) => this.format(date)).join(', ');
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
            options.selectedDates = this.toDates(value);
        }

        /* istanbul ignore next -- `nodeRef` is assigned by the insert hook before the picker is
           ever configured. */
        if (this.nodeRef) {
            options.container = this.nodeRef.parentNode;
        }

        Object.keys(this.args).forEach((key) => {
            if (key === 'value' || key === 'onSelect') {
                return;
            }

            if (this.args[key]) {
                options[key] = this.args[key];
            }
        });

        options.onSelect = (selection) => this.report(selection);

        return options;
    }

    /** Reports a selection through every handler the consumer gave, as the calendar does. */
    report(selection, ...rest) {
        if (typeof this.args.onSelect === 'function') {
            this.args.onSelect(selection, ...rest);
        }

        if (typeof this.args.onChange === 'function') {
            this.args.onChange(selection.date, selection, ...rest);
        }

        if (typeof this.args.onDateChanged === 'function') {
            this.args.onDateChanged(selection.formattedDate, selection, ...rest);
        }
    }

    parseValue(value) {
        if (isArray(value)) {
            return value;
        }

        if (typeof value === 'string' && value.includes(',')) {
            return value.split(',');
        }

        return [value];
    }

    /** The incoming value as Date objects: Dates, timestamps, strings in the picker's format or ISO. */
    toDates(value) {
        return this.parseValue(value)
            .map((item) => this.toDate(item))
            .filter(Boolean);
    }

    toDate(value) {
        if (value instanceof Date) {
            return isValid(value) ? value : null;
        }

        if (typeof value === 'number') {
            return new Date(value);
        }

        if (typeof value === 'string' && value.trim() !== '') {
            return this.parseText(value.trim()) ?? this.nativeDate(value);
        }

        return null;
    }

    nativeDate(value) {
        const date = new Date(value);
        return isValid(date) ? date : null;
    }

    /** Text in the picker's format -> Date, or null when it is not a complete valid date. */
    parseText(text) {
        const date = parse(text, this.dateFormat, new Date());
        return isValid(date) ? date : null;
    }

    /** The selection as the picker writes it into the field. */
    selectionText(picker) {
        return picker.selectedDates.map((date) => this.format(date)).join(picker.opts.multipleDatesSeparator);
    }

    format(date) {
        return this.airDatePickerRef.formatDate(date, this.dateFormat);
    }
}
