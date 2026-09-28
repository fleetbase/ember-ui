import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { classify } from '@ember/string';
import { Calendar } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';

export default class FullCalendarComponent extends Component {
    /**
     * @var {HTMLElement} calendarEl
     */
    @tracked calendarEl;

    /**
     * @var {Calendar} calendar
     * @package @fullcalendar/core
     */
    @tracked calendar;

    /**
     * Default events to trigger for
     * @var {Array}
     */
    @tracked events = ['dateClick', 'drop', 'eventReceive', 'eventClick', 'eventDragStop', 'eventDrop', 'eventAdd', 'eventChange', 'eventRemove'];

    /**
     * Tracked calendar event listeners
     * @var {Array}
     */
    @tracked _listeners = [];

    /**
     * Initializes and renders the calendar component
     *
     * @param {HTMLElement} calendarEl
     */
    @action setupCalendar(calendarEl) {
        // track calendar htmlelement
        this.calendarEl = calendarEl;

        // get events
        let events = this.args.events || [];

        // initialize calendar
        this.calendar = new Calendar(calendarEl, {
            events,
            plugins: [dayGridPlugin, interactionPlugin],
            initialView: 'dayGridMonth',
            editable: true,
            headerToolbar: {
                left: 'prev,next today',
                center: 'title',
                right: '',
            },
        });

        // trigger callback on initialize
        if (typeof this.args.onInit === 'function') {
            this.args.onInit(this.calendar);
        }

        // render calendar
        this.calendar.render();

        // listen for events
        this.createCalendarEventListeners();
    }

    triggerCalendarEvent(eventName, ...params) {
        /* istanbul ignore next -- `eventName` here is a callback name like `onDateClick`, and this
           class defines no such methods; the hook exists for subclasses. */
        if (typeof this[eventName] === 'function') {
            this[eventName](...params);
        }

        /* istanbul ignore next -- a listener is only subscribed when `this.args[callbackName]` is
           already a function (see createCalendarEventListeners), so it is always present here. */
        if (typeof this.args[eventName] === 'function') {
            this.args[eventName](...params);
        }
    }

    createCalendarEventListeners() {
        for (let i = 0; i < this.events.length; i++) {
            const eventName = this.events[i];
            const callbackName = `on${classify(eventName)}`;

            if (typeof this.args[callbackName] === 'function') {
                // Bind ONCE and keep the resulting function. `.bind()` returns a new function on
                // every call, so `calendar.off()` can only unsubscribe if it is handed the exact
                // reference `calendar.on()` was given — binding again at destroy time removes
                // nothing at all.
                const handler = this.triggerCalendarEvent.bind(this, callbackName);

                // track for destroy purposes
                this._listeners.push({
                    eventName,
                    callbackName,
                    handler,
                });

                // create listener
                this.calendar.on(eventName, handler);
            }
        }

        // check for custom events
        // @todo
    }

    destroyCalendarEventListeners() {
        for (let i = 0; i < this._listeners.length; i++) {
            const listener = this._listeners[i];
            const { eventName, handler } = listener;

            // kill listener
            this.calendar.off(eventName, handler);
        }

        this._listeners = [];
    }

    /**
     * Unsubscribe every calendar listener when the component goes away.
     *
     * Nothing called `destroyCalendarEventListeners` before this, so a calendar on a route the
     * user navigated in and out of accumulated a listener per callback for the lifetime of the
     * page. `_listeners` is only ever populated after `this.calendar` exists, so an empty list
     * here means the calendar was never set up and there is nothing to unsubscribe from.
     */
    willDestroy() {
        super.willDestroy(...arguments);

        this.destroyCalendarEventListeners();
    }
}
