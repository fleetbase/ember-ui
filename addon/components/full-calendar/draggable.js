import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { Draggable } from '@fullcalendar/interaction';

export default class DraggableFullcalendarEventComponent extends Component {
    @tracked draggable;
    @tracked eventData = {};

    constructor() {
        super(...arguments);
        this.eventData = this.args.eventData ?? {};
    }

    @action makeDraggable(element) {
        this.draggable = new Draggable(element);
    }
}
