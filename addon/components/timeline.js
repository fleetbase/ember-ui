import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { isArray } from '@ember/array';

export default class TimelineComponent extends Component {
    // The constructor assigns all four before anything reads them.
    /* istanbul ignore next */
    @tracked startIndex = 0;
    /* istanbul ignore next */
    @tracked endIndex = 0;
    /* istanbul ignore next */
    @tracked visibleActivities = [];
    /* istanbul ignore next */
    @tracked activity = [];

    constructor(owner, { activity }) {
        super(...arguments);
        this.activity = isArray(activity) ? activity : [];
        this.startIndex = 0;
        this.endIndex = Math.min(2, this.activity.length - 1);
        this.visibleActivities = this.activity.slice(this.startIndex, this.endIndex + 1);
    }

    @action setupComponent(timelineNode) {
        this.timelineNode = timelineNode;
        this.timelineWrapperNode = timelineNode.querySelector('.timeline-wrapper');
        this.timelineItemsContainerNode = this.timelineWrapperNode.firstElementChild;
    }

    @action previous() {
        /* istanbul ignore else -- timeline.hbs disables the left arrow while startIndex is 0 */
        if (this.startIndex > 0) {
            this.setTimelinePosition(this.startIndex - 1, this.endIndex - 1);
        }
    }

    @action next() {
        /* istanbul ignore else -- timeline.hbs disables the right arrow once endIndex has reached
           the last activity */
        if (this.endIndex < this.activity.length - 1) {
            this.setTimelinePosition(this.startIndex + 1, this.endIndex + 1);
        }
    }

    setTimelinePosition(startIndex, endIndex) {
        this.startIndex = startIndex;
        this.endIndex = endIndex;
        this.updateTimelineContainerStyle({
            transform: `translateX(calc(-${this.startIndex * (100 / 3)}%))`,
        });
        this.visibleActivities = this.activity.slice(this.startIndex, this.endIndex + 1);
    }

    // The only caller passes an object literal, and every value in it is an interpolated string.
    updateTimelineContainerStyle(/* istanbul ignore next */ style = {}) {
        const styleProperties = Object.keys(style);

        for (let i = 0; i < styleProperties.length; i++) {
            const styleProp = styleProperties[i];
            const value = style[styleProp];

            /* istanbul ignore else -- see above: the one property passed always has a value */
            if (value) {
                this.timelineItemsContainerNode.style[styleProp] = value;
            }
        }
    }
}
