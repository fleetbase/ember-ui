import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action, set } from '@ember/object';

export default class TableExpandableRowComponent extends Component {
    @tracked isExpanded = false;

    @action toggle() {
        this.isExpanded = !this.isExpanded;
        set(this.args.row, 'expanded', this.isExpanded);
    }

    // expand() and collapse() are an imperative API for a host application that subclasses this
    // component: the template drives everything through toggle(), and neither is yielded.
    /* istanbul ignore next */
    @action expand() {
        this.isExpanded = true;
        set(this.args.row, 'expanded', this.isExpanded);
    }

    /* istanbul ignore next */
    @action collapse() {
        this.isExpanded = false;
        set(this.args.row, 'expanded', this.isExpanded);
    }
}
