import Component from '@glimmer/component';

export default class LayoutResourceCardComponent extends Component {
    get model() {
        return this.args.model;
    }

    get index() {
        return this.args.index;
    }

    get cardClass() {
        const baseClasses = 'bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden';
        return this.args.class ? `${baseClasses} ${this.args.class}` : baseClasses;
    }

    get headerClass() {
        const baseClasses = 'px-2 py-1.5 border-b border-gray-200 dark:border-gray-700';
        return this.args.headerClass ? `${baseClasses} ${this.args.headerClass}` : baseClasses;
    }

    get bodyClass() {
        const baseClasses = '';
        return this.args.bodyClass ? `${baseClasses} ${this.args.bodyClass}` : baseClasses;
    }

    get footerClass() {
        const baseClasses = 'px-2 py-1 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50';
        return this.args.footerClass ? `${baseClasses} ${this.args.footerClass}` : baseClasses;
    }
}
