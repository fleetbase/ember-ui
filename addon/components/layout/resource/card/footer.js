import Component from '@glimmer/component';

export default class LayoutResourceCardFooterComponent extends Component {
    get model() {
        return this.args.model;
    }

    get footerClass() {
        const baseClasses = 'resource-card-footer px-2 py-1 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800';
        return this.args.class ? `${baseClasses} ${this.args.class}` : baseClasses;
    }
}
