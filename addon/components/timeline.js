import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { htmlSafe } from '@ember/template';

export default class TimelineComponent extends Component {
    @tracked startIndex = 0;
    @tracked endIndex = Math.min(2, this.args.activity.length - 1);
    @tracked visibleActivities = this.args.activity.slice(this.startIndex, this.endIndex + 1);

    @action setupComponent(timelineNode) {
        this.timelineNode = timelineNode;
        this.timelineWrapperNode = timelineNode.querySelector('.timeline-wrapper');
        this.timelineItemsContainerNode = this.timelineWrapperNode.firstElementChild;
    }

    @action previous() {
        if (this.startIndex > 0) {
            this.startIndex -= 1;
            this.endIndex -= 1;
            this.updateTimelinePosition();
        }
    }

    @action next() {
        if (this.endIndex < this.args.activity.length - 1) {
            this.startIndex += 1;
            this.endIndex += 1;
            this.updateTimelinePosition();
        }
    }

    updateTimelinePosition() {
        const translateX = `calc(-${this.startIndex * (100 / 3)}%)`; // Assuming each item takes up 33.33% of the width
        this.timelineItemsContainerNode.style.transform = `translateX(${translateX})`;
        this.visibleActivities = this.args.activity.slice(this.startIndex, this.endIndex + 1);
    }
}
