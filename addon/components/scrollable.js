import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

export default class ScrollableComponent extends Component {
    @tracked horizontal = false;
    @tracked vertical = true;
    @tracked nodeRef;

    @action setupComponent(element) {
        const { onSetup, horizontal, vertical } = this.args;

        this.nodeRef = element;
        this.horizontal = horizontal;
        this.vertical = vertical;

        if (typeof onSetup === 'function') {
            onSetup(...arguments);
        }

        this.makeScrollable(element);
    }

    @action makeScrollable(element) {
        this.setComputedSize(element);

        const resizeObserver = new ResizeObserver(this.onResize);
        resizeObserver.observe(element);
    }

    @action setComputedSize(element) {
        const { clientHeight } = element;

        element.style.height = `${clientHeight}px`;
        element.style.overflowY = 'scroll';
    }

    @action onResize([entry]) {
        console.log('elemen has been resized! #entry', entry);
    }
}
