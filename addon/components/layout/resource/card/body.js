import Component from '@glimmer/component';

export default class LayoutResourceCardBodyComponent extends Component {
    get model() {
        return this.args.model;
    }

    get bodyClass() {
        const baseClasses = 'px-4 py-3';
        return this.args.class ? `${baseClasses} ${this.args.class}` : baseClasses;
    }
}
