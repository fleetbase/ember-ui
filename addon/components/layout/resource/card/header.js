import Component from '@glimmer/component';

export default class LayoutResourceCardHeaderComponent extends Component {
    get model() {
        return this.args.model;
    }

    get headerClass() {
        const baseClasses = 'px-2 py-3 border-b border-gray-200 dark:border-gray-700';
        return this.args.class ? `${baseClasses} ${this.args.class}` : baseClasses;
    }
}
