import Component from '@glimmer/component';
import { CALENDAR_EVENTS } from 'dummy/playground/fixtures';

export default class PlaygroundExampleFullCalendarComponent extends Component {
    events = CALENDAR_EVENTS;
}
