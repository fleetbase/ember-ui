import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action, computed, set } from '@ember/object';
import { isArray } from '@ember/array';
import { htmlSafe } from '@ember/template';

export default class TimelineComponent extends Component {
    @tracked startIndex = 0;
    @tracked endIndex = Math.min(2, this.args.activity.length - 1);
    @tracked timelineNode;
    @tracked timelineWrapperNode;
    @tracked timelineItemWidth;

    context = {
        previous: this.previous,
        next: this.next,
        data: this.visibleTimelineData,
    };

    @computed('args.activity.length', 'endIndex', 'startIndex') get timelineActivity() {
        if (isArray(this.args.activity)) {
            return this.args.activity.map((activity, index) => {
                if (index === this.args.activity.length - 1) {
                    set(activity, 'isActive', true);
                }

                return activity;
            });
        }
        return [];
    }

    @computed('timelineActivity.@each.isActive', 'startIndex', 'endIndex') get visibleTimelineData() {
        return this.timelineActivity.slice(this.startIndex, this.endIndex + 1);
    }

    @computed('startIndex', 'timelineItemWidth') get wrapperStyle() {
        const translateX = `calc(-${this.startIndex} * ${this.timelineItemWidth}px)`;
        return htmlSafe(`transform: translateX(${translateX});`);
    }

    @action setupComponent(timelineNode) {
        this.timelineNode = timelineNode;
        this.timelineWrapperNode = timelineNode.querySelector('.timeline-wrapper');
        this.timelineItemWidth = this.timelineWrapperNode?.firstElementChild?.offsetWidth;
    }

    @action previous() {
        if (this.startIndex > 0) {
            this.startIndex--;
            this.endIndex--;
        }
    }

    @action next() {
        if (this.endIndex < this.args.activity.length - 1) {
            this.startIndex++;
            this.endIndex++;
        }
    }
}
