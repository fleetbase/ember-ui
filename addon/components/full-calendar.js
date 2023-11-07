import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
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
     * Initializes and renders the calendar component
     * 
     * @param {HTMLElement} calendarEl 
     */
    @action setupCalendar(calendarEl) {
        // track calendar htmlelement
        this.calendarEl = calendarEl;

        // initialize calendar
        this.calendar = new Calendar(calendarEl, {
            plugins: [dayGridPlugin, interactionPlugin],
            initialView: 'dayGridMonth',
            headerToolbar: {
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,listWeek',
            },
        });

        // render calendar
        this.calendar.render();
    }
}
