import Component from '@glimmer/component';
import { CALENDAR_EVENTS, REFERENCE_DATE } from 'dummy/playground/fixtures';

/**
 * The documentation page for this component also names ScheduleCalendar, which no longer exists
 * in the addon (deleted as dead code in e6a3903). See PLAYGROUND.md.
 */
export default class PlaygroundExampleEventCalendarComponent extends Component {
    events = CALENDAR_EVENTS;

    date = REFERENCE_DATE;
}
